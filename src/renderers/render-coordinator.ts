import { Scene, PerformanceProfile, CosmeticsConfig } from '../core/types';
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

    // Detect mobile touch devices to cap frame rate at 60 FPS (preventing 120Hz ProMotion battery/thermal strain)
    const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const minFrameInterval = isMobile ? 15.5 : 7.5; // ~60 FPS mobile, ~120 FPS desktop

    // When audio is paused and no shockwaves are active, throttle to ~30 FPS to keep device cool
    const isAudioActive = this.isAudioActiveProvider ? this.isAudioActiveProvider() : false;
    const hasActiveShockwaves = this.cosmeticsEngine.getActiveShockwaves().length > 0;
    const targetInterval = (!isAudioActive && !hasActiveShockwaves) ? 31.0 : minFrameInterval;

    if (elapsedMs < targetInterval) {
      this.animId = requestAnimationFrame(this.loop);
      return;
    }

    const dtMs = Math.min(100, elapsedMs);
    this.lastFrameTime = now;

    // Frame-time governor (runtime throttle; never permanently mutates scene config)
    if (dtMs > 22.0) {
      this.consecutiveSlowFrames++;
      if (this.consecutiveSlowFrames > 45 && this.getEffectivePerformanceProfile() === 'max') {
        this.throttledProfile = 'balanced';
      } else if (this.consecutiveSlowFrames > 90 && this.getEffectivePerformanceProfile() === 'balanced') {
        this.throttledProfile = 'eco';
      }
    } else {
      this.consecutiveSlowFrames = Math.max(0, this.consecutiveSlowFrames - 1);
      if (this.consecutiveSlowFrames === 0 && this.throttledProfile !== null) {
        this.throttledProfile = null;
      }
    }

    if (this.isFocused || !this.scene.cosmetics.focusModeEnabled) {
      this.renderFrame(dtMs, now / 1000.0);
    }

    this.animId = requestAnimationFrame(this.loop);
  };

  private renderFrame(dtMs: number, transportTime: number): void {
    this.cosmeticsEngine.update(dtMs);

    const dynamicLights: PostProcessingLight[] = [];
    const primaryShapeId = this.scene.placements[0]?.shapeId;
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
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      renderer.render(ctx, w, h, this.scene, transportTime, audioPhase, isAudioActive, labelMode, configOverrides, noteAge);
      ctx.restore();

      if (renderer.getDynamicLights) {
        const rawLights = renderer.getDynamicLights();
        if (rawLights.length > 0) {
          let cellRect = this.cachedLensRects.get(cellId);
          if (!cellRect) {
            const r = canvas.getBoundingClientRect();
            cellRect = { left: r.left, top: r.top, width: r.width, height: r.height };
            this.cachedLensRects.set(cellId, cellRect);
          }

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
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const w = this.effectsCanvas.width / dpr;
      const h = this.effectsCanvas.height / dpr;
      this.effectsCtx.save();
      this.effectsCtx.scale(dpr, dpr);
      this.effectsCtx.clearRect(0, 0, w, h);
      this.cosmeticsEngine.render2DFallback(this.effectsCtx, w, h, effectiveCosmetics);
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

  public destroy(): void {
    this.stop();
    if (this.webglPipeline) {
      this.webglPipeline.destroy();
      this.webglPipeline = null;
    }
    this.registeredLenses.clear();
  }
}
