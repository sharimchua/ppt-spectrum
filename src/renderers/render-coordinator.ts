import { Scene, PerformanceProfile, CosmeticsConfig } from '../core/types';
import { dToFreq } from '../core/axis';
import { LensLabelMode } from '../core/layout-models';
import { CosmeticsEngine } from './cosmetics';
import { WebGLPostProcessingPipeline, PostProcessingLight } from './webgl-post-processing';

export interface CachedRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RegisteredLensRenderer {
  id: string;
  render: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scene: Scene,
    transportTime: number,
    audioPhase?: number,
    isAudioActive?: boolean,
    labelMode?: LensLabelMode,
    configOverrides?: Record<string, unknown>,
    noteAge?: number
  ) => void;
  getDynamicLights?: () => PostProcessingLight[];
}

export class RenderCoordinator {
  public readonly cosmeticsEngine: CosmeticsEngine;
  private webglPipeline: WebGLPostProcessingPipeline | null = null;

  private scene: Scene;
  private isRunning: boolean = false;
  private animId: number | null = null;
  private lastFrameTime: number = performance.now();

  private effectsCanvas: HTMLCanvasElement | null = null;
  private effectsCtx: CanvasRenderingContext2D | null = null;
  private postProcessingCanvas: HTMLCanvasElement | null = null;
  private bgCanvas: HTMLCanvasElement | null = null;
  private bgCtx: CanvasRenderingContext2D | null = null;

  private registeredLenses: Map<
    string,
    {
      canvas: HTMLCanvasElement;
      ctx: CanvasRenderingContext2D;
      renderer: RegisteredLensRenderer;
      labelMode?: LensLabelMode;
      configOverrides?: Record<string, unknown>;
    }
  > = new Map();

  // Governor & Focus management
  private consecutiveSlowFrames: number = 0;
  private throttledProfile: PerformanceProfile | null = null;
  private isFocused: boolean = true;
  private edgeGlowAlpha: number = 0;

  // Cached DOM Rects to eliminate per-frame layout reflow
  private cachedPpRect: CachedRect | null = null;
  private cachedLensRects: Map<string, CachedRect> = new Map();
  private lastRectUpdateTime: number = 0;

  // Audio Sync Telemetry
  private audioPhaseProvider: ((shapeId: string) => number) | null = null;
  private isAudioActiveProvider: (() => boolean) | null = null;
  private noteAgeProvider: ((shapeId: string) => number) | null = null;
  private internalNoteAge: number = 0;

  constructor(initialScene: Scene) {
    this.scene = initialScene;
    this.cosmeticsEngine = new CosmeticsEngine();

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => { this.isFocused = true; });
      window.addEventListener('blur', () => {
        this.isFocused = false;
        if (this.scene.cosmetics.focusModeEnabled) {
          this.cosmeticsEngine.clear();
        }
      });
    }
  }

  public registerBgCanvas(canvas: HTMLCanvasElement): void {
    this.bgCanvas = canvas;
    this.bgCtx = canvas.getContext('2d');
    this.renderBackground();
  }

  public registerEffectsCanvas(canvas: HTMLCanvasElement): void {
    this.effectsCanvas = canvas;
    this.effectsCtx = canvas.getContext('2d');
  }

  public registerPostProcessingCanvas(canvas: HTMLCanvasElement): void {
    this.postProcessingCanvas = canvas;
    this.webglPipeline = new WebGLPostProcessingPipeline(canvas);
    this.invalidateRectCaches();
  }

  public getPostProcessingCanvas(): HTMLCanvasElement | null {
    return this.postProcessingCanvas;
  }

  public invalidateRectCaches(): void {
    this.cachedPpRect = null;
    this.cachedLensRects.clear();
  }

  public registerLens(
    id: string,
    canvas: HTMLCanvasElement,
    renderer: RegisteredLensRenderer,
    labelMode?: LensLabelMode,
    configOverrides?: Record<string, unknown>
  ): void {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      this.registeredLenses.set(id, { canvas, ctx, renderer, labelMode, configOverrides });
      this.invalidateRectCaches();
    }
  }

  public unregisterLens(id: string): void {
    this.registeredLenses.delete(id);
    this.invalidateRectCaches();
  }

  public setAudioPhaseProvider(provider: ((shapeId: string) => number) | null): void {
    this.audioPhaseProvider = provider;
  }

  public setIsAudioActiveProvider(provider: (() => boolean) | null): void {
    this.isAudioActiveProvider = provider;
  }

  public setNoteAgeProvider(provider: ((shapeId: string) => number) | null): void {
    this.noteAgeProvider = provider;
  }

  public triggerNoteStrike(): void {
    this.internalNoteAge = 0;
  }

  public setScene(scene: Scene): void {
    const bgChanged = scene.cosmetics.backgroundTheme !== this.scene.cosmetics.backgroundTheme;
    const profileChanged = scene.cosmetics.performanceProfile !== this.scene.cosmetics.performanceProfile;
    this.scene = scene;
    if (profileChanged) {
      this.throttledProfile = null;
      this.consecutiveSlowFrames = 0;
    }
    if (bgChanged) {
      this.renderBackground();
    }
  }

  public getEffectivePerformanceProfile(): PerformanceProfile {
    return this.throttledProfile ?? this.scene.cosmetics.performanceProfile;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;
    const now = performance.now();
    const elapsedMs = now - this.lastFrameTime;

    // Detect handheld mobile touch devices vs desktop environments with precision pointers
    const hasFinePointer = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;
    const isMobile = !hasFinePointer && typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const minFrameInterval = isMobile ? 15.5 : 7.5; // ~60 FPS mobile, ~120 FPS desktop

    // Throttle idle frame rate to ~30 FPS only on mobile touch devices when audio is paused to keep battery cool;
    // on desktop with GPU, maintain high refresh responsiveness
    const isAudioActive = this.isAudioActiveProvider ? this.isAudioActiveProvider() : false;
    const hasActiveShockwaves = this.cosmeticsEngine.getActiveShockwaves().length > 0;
    const targetInterval = (isMobile && !isAudioActive && !hasActiveShockwaves) ? 31.0 : minFrameInterval;

    if (elapsedMs < targetInterval) {
      this.animId = requestAnimationFrame(this.loop);
      return;
    }

    const dtMs = Math.min(100, elapsedMs);
    this.lastFrameTime = now;

    if (this.isFocused || !this.scene.cosmetics.focusModeEnabled) {
      const renderStart = performance.now();
      this.renderFrame(dtMs, now / 1000.0);
      const renderCostMs = performance.now() - renderStart;

      // Frame-time governor: measure actual CPU/GPU render execution time (not intentional idle sleep interval!)
      // so idle 30 FPS power-saving never false-triggers the governor into toggling effects off and on.
      if (renderCostMs > 18.0) {
        this.consecutiveSlowFrames++;
        if (this.consecutiveSlowFrames > 60 && this.getEffectivePerformanceProfile() === 'max') {
          this.throttledProfile = 'balanced';
        } else if (this.consecutiveSlowFrames > 120 && this.getEffectivePerformanceProfile() === 'balanced') {
          this.throttledProfile = 'eco';
        }
      } else {
        this.consecutiveSlowFrames = Math.max(0, this.consecutiveSlowFrames - 1);
      }
    }

    this.animId = requestAnimationFrame(this.loop);
  };

  private renderFrame(dtMs: number, transportTime: number): void {
    this.cosmeticsEngine.update(dtMs);

    const dynamicLights: PostProcessingLight[] = [];
    const primaryPlacement = this.scene.placements[0];
    const primaryShapeId = primaryPlacement?.shapeId;
    const d = primaryPlacement?.d ?? 0;
    const f0 = dToFreq(d, this.scene.anchors.tplFrequencyHz);
    const audioPhase = (primaryShapeId && this.audioPhaseProvider) ? this.audioPhaseProvider(primaryShapeId) : 0;
    const isAudioActive = this.isAudioActiveProvider ? this.isAudioActiveProvider() : false;

    this.internalNoteAge += dtMs / 1000;
    const noteAge = (primaryShapeId && this.noteAgeProvider) ? this.noteAgeProvider(primaryShapeId) : this.internalNoteAge;

    const now = performance.now();
    // Refresh cached bounding rects at most once every 600ms or when invalidated, eliminating synchronous layout reflows
    const shouldRefreshRects = !this.cachedPpRect || (now - this.lastRectUpdateTime > 600);
    if (shouldRefreshRects) {
      if (this.postProcessingCanvas) {
        const r = this.postProcessingCanvas.getBoundingClientRect();
        this.cachedPpRect = { left: r.left, top: r.top, width: r.width, height: r.height };
      } else {
        this.cachedPpRect = { left: 0, top: 0, width: 0, height: 0 };
      }
      this.lastRectUpdateTime = now;
      this.cachedLensRects.clear();
    }

    // Render each lens cell
    for (const [cellId, { canvas, ctx, renderer, labelMode, configOverrides }] of this.registeredLenses.entries()) {
      let cellRect = this.cachedLensRects.get(cellId);
      if (!cellRect || cellRect.width === 0 || cellRect.height === 0) {
        const r = canvas.getBoundingClientRect();
        cellRect = { left: r.left, top: r.top, width: r.width, height: r.height };
        this.cachedLensRects.set(cellId, cellRect);
      }

      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const w = cellRect.width > 0 ? cellRect.width : canvas.width / dpr;
      const h = cellRect.height > 0 ? cellRect.height : canvas.height / dpr;
      const scaleX = w > 0 ? canvas.width / w : dpr;
      const scaleY = h > 0 ? canvas.height / h : dpr;

      ctx.save();
      ctx.scale(scaleX, scaleY);
      ctx.clearRect(0, 0, w, h);
      renderer.render(ctx, w, h, this.scene, transportTime, audioPhase, isAudioActive, labelMode, configOverrides, noteAge);
      ctx.restore();

      if (renderer.getDynamicLights) {
        const rawLights = renderer.getDynamicLights();
        if (rawLights.length > 0) {
          const ppLeft = this.cachedPpRect ? this.cachedPpRect.left : 0;
          const ppTop = this.cachedPpRect ? this.cachedPpRect.top : 0;
          const offsetX = cellRect.left - ppLeft;
          const offsetY = cellRect.top - ppTop;

          for (const l of rawLights) {
            dynamicLights.push({
              x: l.x + offsetX,
              y: l.y + offsetY,
              velocity: l.velocity,
              colorHex: l.colorHex,
            });
          }
        }
      }
    }

    const effectiveProfile = this.getEffectivePerformanceProfile();
    const effectiveCosmetics: CosmeticsConfig = effectiveProfile !== this.scene.cosmetics.performanceProfile
      ? { ...this.scene.cosmetics, performanceProfile: effectiveProfile }
      : this.scene.cosmetics;

    // Render 2D effects fallback
    if (this.effectsCanvas && this.effectsCtx) {
      const ppW = this.cachedPpRect?.width || this.effectsCanvas.clientWidth || this.effectsCanvas.width;
      const ppH = this.cachedPpRect?.height || this.effectsCanvas.clientHeight || this.effectsCanvas.height;
      const effScaleX = ppW > 0 ? this.effectsCanvas.width / ppW : 1;
      const effScaleY = ppH > 0 ? this.effectsCanvas.height / ppH : 1;
      this.effectsCtx.save();
      this.effectsCtx.scale(effScaleX, effScaleY);
      this.effectsCtx.clearRect(0, 0, ppW, ppH);
      this.cosmeticsEngine.render2DFallback(this.effectsCtx, ppW, ppH, effectiveCosmetics);
      this.renderViewportEdgeGlow(this.effectsCtx, ppW, ppH, d, audioPhase, f0, isAudioActive, dtMs, transportTime);
      this.effectsCtx.restore();
    }

    // Render WebGL Post-processing Shader
    if (this.webglPipeline) {
      const sw = this.cosmeticsEngine.getActiveShockwaves().map((s) => ({
        x: s.x,
        y: s.y,
        radius: s.currentRadius,
        alpha: s.alpha,
        colorHex: s.color,
      }));
      const particleBufferData = this.cosmeticsEngine.populateGpuParticleBuffer();
      this.webglPipeline.render(effectiveCosmetics, dynamicLights, sw, particleBufferData);
    }
  }

  public renderBackground(): void {
    if (!this.bgCanvas || !this.bgCtx) return;
    const ctx = this.bgCtx;
    const w = this.bgCanvas.width;
    const h = this.bgCanvas.height;

    ctx.save();
    switch (this.scene.cosmetics.backgroundTheme) {
      case 'studio-obsidian':
        ctx.fillStyle = '#080a0f';
        ctx.fillRect(0, 0, w, h);
        break;
      case 'cosmic-abyss': {
        const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h));
        grad.addColorStop(0, '#101426');
        grad.addColorStop(1, '#05070d');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'velvet-dark':
        ctx.fillStyle = '#0f0a14';
        ctx.fillRect(0, 0, w, h);
        break;
      case 'carbon-grid':
      default: {
        ctx.fillStyle = '#0b0d13';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        const step = 40;
        ctx.beginPath();
        for (let x = 0; x < w; x += step) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        for (let y = 0; y < h; y += step) {
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  /**
   * Renders a subtle edge glow around the viewport perimeter.
   * - In rhythm space (d >= 0): pulsed downbeat glow locked to master phase.
   * - In pitch space (d < 0): organic shimmer linked to fundamental pitch frequency.
   * - Only active when audio is actively playing.
   */
  private renderViewportEdgeGlow(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    d: number,
    audioPhase: number,
    f0: number,
    isAudioActive: boolean,
    dtMs: number,
    transportTime: number
  ): void {
    const targetAlpha = isAudioActive ? 1.0 : 0.0;
    this.edgeGlowAlpha += (targetAlpha - this.edgeGlowAlpha) * Math.min(1.0, dtMs / 120);

    if (this.edgeGlowAlpha < 0.005) return;

    // Rhythm realm (d >= 0) vs Pitch realm (d < 0)
    const isRhythm = d >= 0;
    let glowIntensity = 0;
    let r = 56;
    let g = 189;
    let b = 248;

    if (isRhythm) {
      // Downbeat pulse synced to master audio beat phase (theta in [0, 1))
      const wrappedPhase = ((audioPhase % 1.0) + 1.0) % 1.0;
      const beatEnv = Math.exp(-wrappedPhase * 4.5);
      glowIntensity = (0.06 + 0.30 * beatEnv) * this.edgeGlowAlpha;
      // Warm rhythmic amber on downbeats
      r = 251;
      g = 146;
      b = 60;
    } else {
      // Pitch space: subtle organic shimmer linked to fundamental pitch frequency
      const shimmerFreq = Math.min(50, Math.max(6, f0 * 0.12));
      const shimmer = Math.sin(transportTime * shimmerFreq * Math.PI * 2) * 0.05;
      const microFlicker = Math.cos(transportTime * shimmerFreq * 2.1) * 0.03;
      glowIntensity = (0.14 + shimmer + microFlicker) * this.edgeGlowAlpha;
      // Ethereal Solfège-tinted cyan-blue in pitch space
      r = 56;
      g = 189;
      b = 248;
    }

    if (glowIntensity <= 0.001) return;

    ctx.save();
    const glowThickness = Math.max(16, Math.min(32, Math.min(w, h) * 0.04));

    // Top border glow
    const gradTop = ctx.createLinearGradient(0, 0, 0, glowThickness);
    gradTop.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${glowIntensity})`);
    gradTop.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = gradTop;
    ctx.fillRect(0, 0, w, glowThickness);

    // Bottom border glow
    const gradBottom = ctx.createLinearGradient(0, h, 0, h - glowThickness);
    gradBottom.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${glowIntensity})`);
    gradBottom.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = gradBottom;
    ctx.fillRect(0, h - glowThickness, w, glowThickness);

    // Left border glow
    const gradLeft = ctx.createLinearGradient(0, 0, glowThickness, 0);
    gradLeft.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${glowIntensity})`);
    gradLeft.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = gradLeft;
    ctx.fillRect(0, 0, glowThickness, h);

    // Right border glow
    const gradRight = ctx.createLinearGradient(w, 0, w - glowThickness, 0);
    gradRight.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${glowIntensity})`);
    gradRight.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = gradRight;
    ctx.fillRect(w - glowThickness, 0, glowThickness, h);

    ctx.restore();
  }

  public destroy(): void {
    this.stop();
    if (this.webglPipeline) {
      this.webglPipeline.destroy();
      this.webglPipeline = null;
    }
    this.registeredLenses.clear();
  }
}
