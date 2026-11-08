import { Scene } from '../core/types';
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
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, scene: Scene, transportTime: number) => void;
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

  private registeredLenses: Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; renderer: RegisteredLensRenderer }> = new Map();

  // Governor & Focus management
  private consecutiveSlowFrames: number = 0;
  private isFocused: boolean = true;

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
  }

  public getPostProcessingCanvas(): HTMLCanvasElement | null {
    return this.postProcessingCanvas;
  }

  public registerLens(id: string, canvas: HTMLCanvasElement, renderer: RegisteredLensRenderer): void {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      this.registeredLenses.set(id, { canvas, ctx, renderer });
    }
  }

  public unregisterLens(id: string): void {
    this.registeredLenses.delete(id);
  }

  public setScene(scene: Scene): void {
    const bgChanged = scene.cosmetics.backgroundTheme !== this.scene.cosmetics.backgroundTheme;
    this.scene = scene;
    if (bgChanged) {
      this.renderBackground();
    }
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
    const dtMs = Math.min(100, now - this.lastFrameTime);
    this.lastFrameTime = now;

    // Frame-time governor
    if (dtMs > 20.0) {
      this.consecutiveSlowFrames++;
      if (this.consecutiveSlowFrames > 45 && this.scene.cosmetics.performanceProfile === 'max') {
        this.scene.cosmetics.performanceProfile = 'balanced';
      } else if (this.consecutiveSlowFrames > 90 && this.scene.cosmetics.performanceProfile === 'balanced') {
        this.scene.cosmetics.performanceProfile = 'eco';
      }
    } else {
      this.consecutiveSlowFrames = Math.max(0, this.consecutiveSlowFrames - 1);
    }

    if (this.isFocused || !this.scene.cosmetics.focusModeEnabled) {
      this.renderFrame(dtMs, now / 1000.0);
    }

    this.animId = requestAnimationFrame(this.loop);
  };

  private renderFrame(dtMs: number, transportTime: number): void {
    this.cosmeticsEngine.update(dtMs);

    const dynamicLights: PostProcessingLight[] = [];

    // Render each lens cell
    for (const { canvas, ctx, renderer } of this.registeredLenses.values()) {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      renderer.render(ctx, w, h, this.scene, transportTime);
      ctx.restore();

      if (renderer.getDynamicLights) {
        dynamicLights.push(...renderer.getDynamicLights());
      }
    }

    // Render 2D effects fallback
    if (this.effectsCanvas && this.effectsCtx) {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const w = this.effectsCanvas.width / dpr;
      const h = this.effectsCanvas.height / dpr;
      this.effectsCtx.save();
      this.effectsCtx.scale(dpr, dpr);
      this.effectsCtx.clearRect(0, 0, w, h);
      this.cosmeticsEngine.render2DFallback(this.effectsCtx, w, h, this.scene.cosmetics);
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
      this.webglPipeline.render(this.scene.cosmetics, dynamicLights, sw, particleBufferData);
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
