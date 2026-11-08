import { CosmeticsConfig } from '../core/types';
import { getDecayFadeFactor } from '../core/ppt-constants';

export interface KineticParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  life: number;
  maxLife: number;
  drag?: number;
}

export interface ShockwaveRing {
  x: number;
  y: number;
  currentRadius: number;
  initialRadius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  initialAlpha: number;
  progress: number;
  durationMs: number;
  elapsedMs: number;
  lineWidth: number;
}

export interface PhosphorGhost {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  decayRate: number;
  vx: number;
}

const COLOR_CACHE = new Map<string, [number, number, number]>();

export function parseColorToRgb(color: string): [number, number, number] {
  const cached = COLOR_CACHE.get(color);
  if (cached) return cached;

  let r = 1, g = 1, b = 1;
  if (color.startsWith('#')) {
    const clean = color.replace('#', '');
    if (clean.length === 3) {
      r = parseInt(clean[0] + clean[0], 16) / 255;
      g = parseInt(clean[1] + clean[1], 16) / 255;
      b = parseInt(clean[2] + clean[2], 16) / 255;
    } else {
      r = (parseInt(clean.substring(0, 2), 16) || 255) / 255;
      g = (parseInt(clean.substring(2, 4), 16) || 255) / 255;
      b = (parseInt(clean.substring(4, 6), 16) || 255) / 255;
    }
  } else if (color.startsWith('rgb')) {
    const parts = color.match(/\d+/g);
    if (parts && parts.length >= 3) {
      r = Number(parts[0]) / 255;
      g = Number(parts[1]) / 255;
      b = Number(parts[2]) / 255;
    }
  }
  const result: [number, number, number] = [r, g, b];
  if (COLOR_CACHE.size < 128) {
    COLOR_CACHE.set(color, result);
  }
  return result;
}

export class CosmeticsEngine {
  private static readonly GRAIN_PATTERNS_COUNT = 6;
  private static readonly GRAIN_PATTERN_SIZE = 160;

  private grainCanvases: HTMLCanvasElement[] = [];
  private currentPatternIndex: number = 0;
  private grainFrame: number = 0;

  public static readonly MAX_GPU_PARTICLES = 2048;

  private particles: KineticParticle[] = [];
  private shockwaves: ShockwaveRing[] = [];
  private ghosts: PhosphorGhost[] = [];
  private scanlinePatternMap: Map<number, CanvasPattern | null> = new Map();

  // Preallocated GPU particle buffer: 2048 particles * 8 floats
  // [x, y, radius, alpha, r, g, b, coreRatio]
  private gpuParticleBuffer = new Float32Array(CosmeticsEngine.MAX_GPU_PARTICLES * 8);

  constructor() {
    this.initGrain();
  }

  private ensureParticleCapacity(needed: number): void {
    const max = CosmeticsEngine.MAX_GPU_PARTICLES;
    const overflow = (this.particles.length + needed) - max;
    if (overflow > 0) {
      const pruneCount = Math.min(this.particles.length, overflow);
      this.particles.splice(0, pruneCount);
    }
  }

  private getScanlinePattern(ctx: CanvasRenderingContext2D, step: number): CanvasPattern | null {
    if (this.scanlinePatternMap.has(step)) {
      return this.scanlinePatternMap.get(step) ?? null;
    }

    if (typeof document !== 'undefined' && document.createElement) {
      try {
        const offscreen = document.createElement('canvas');
        offscreen.width = 4;
        offscreen.height = step;
        const offCtx = offscreen.getContext('2d');
        if (offCtx) {
          offCtx.fillStyle = '#000000';
          offCtx.fillRect(0, 0, 4, 1);
          const pattern = ctx.createPattern(offscreen, 'repeat');
          if (pattern) {
            this.scanlinePatternMap.set(step, pattern);
            return pattern;
          }
        }
      } catch {
        // Fall back to direct drawing
      }
    }
    this.scanlinePatternMap.set(step, null);
    return null;
  }

  private initGrain() {
    if (typeof document === 'undefined') return;
    const size = CosmeticsEngine.GRAIN_PATTERN_SIZE;

    for (let p = 0; p < CosmeticsEngine.GRAIN_PATTERNS_COUNT; p++) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      const imgData = ctx.createImageData(size, size);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = (Math.random() * 45 + 12) | 0;
      }
      ctx.putImageData(imgData, 0, 0);
      this.grainCanvases.push(canvas);
    }
  }

  public spawnNoteSparks(
    cx: number,
    cy: number,
    color: string,
    velocity: number = 0.8,
    baseCount: number = 16,
    sizeMultiplier: number = 1.0,
    volumeMultiplier: number = 1.0,
    gravity: number = 0.15
  ) {
    const totalCount = Math.max(2, Math.round(baseCount * volumeMultiplier * (0.6 + velocity * 0.8)));
    this.ensureParticleCapacity(totalCount);

    for (let i = 0; i < totalCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 3.5 + 1.2) * (0.7 + velocity * 0.8);
      const life = Math.random() * 40 + 20;
      const radius = (Math.random() * 2.5 + 1.0) * sizeMultiplier;

      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity,
        radius,
        color,
        alpha: 1.0,
        decay: 1.0 / life,
        life: 0,
        maxLife: life,
      });
    }
  }

  public spawnFluidDroplets(
    x: number,
    y: number,
    color: string,
    velocity: number = 0.8,
    count: number = 20,
    sizeMultiplier: number = 1.0,
    speedMultiplier: number = 1.0,
    gravity: number = 0.22
  ) {
    const totalCount = Math.max(2, Math.round(count * (0.4 + Math.pow(velocity, 1.35) * 1.5)));
    this.ensureParticleCapacity(totalCount);

    for (let i = 0; i < totalCount; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.55;
      const speed = (Math.random() * 4.5 + 2.0) * speedMultiplier * (0.5 + velocity * 0.8);
      const life = Math.random() * 45 + 25;
      const radius = (Math.random() * 2.5 + 1.2) * sizeMultiplier;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity,
        radius,
        color,
        alpha: 1.0,
        decay: 1.0 / life,
        life: 0,
        maxLife: life,
        drag: 0.982,
      });
    }
  }

  public triggerShockwave(
    x: number,
    y: number,
    color: string,
    maxRadius: number = 70,
    durationMs: number = 650,
    initialRadius: number = 8
  ) {
    if (this.shockwaves.length >= 8) {
      this.shockwaves.shift();
    }
    this.shockwaves.push({
      x,
      y,
      currentRadius: initialRadius,
      initialRadius,
      maxRadius,
      color,
      alpha: 1.0,
      initialAlpha: 1.0,
      progress: 0.0,
      durationMs,
      elapsedMs: 0,
      lineWidth: 2.5,
    });
  }

  public getActiveShockwaves(): ShockwaveRing[] {
    return this.shockwaves;
  }

  public update(dtMs: number): void {
    const dtFactor = Math.min(2.5, dtMs / 16.667);

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dtFactor;
      if (p.drag) {
        p.vx *= Math.pow(p.drag, dtFactor);
        p.vy *= Math.pow(p.drag, dtFactor);
      }
      p.vy += p.gravity * dtFactor;
      p.x += p.vx * dtFactor;
      p.y += p.vy * dtFactor;
      p.alpha = Math.max(0, 1.0 - p.life / p.maxLife);

      if (p.life >= p.maxLife || p.alpha <= 0.01) {
        this.particles.splice(i, 1);
      }
    }

    // Update shockwaves with Hann window decay
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.elapsedMs += dtMs;
      sw.progress = Math.min(1.0, sw.elapsedMs / sw.durationMs);
      const ease = 1 - Math.pow(1 - sw.progress, 3);
      sw.currentRadius = sw.initialRadius + (sw.maxRadius - sw.initialRadius) * ease;
      sw.alpha = getDecayFadeFactor(sw.progress);

      if (sw.progress >= 1.0 || sw.alpha <= 0.01) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  public populateGpuParticleBuffer(): { buffer: Float32Array; count: number } {
    const count = Math.min(this.particles.length, CosmeticsEngine.MAX_GPU_PARTICLES);
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const offset = i * 8;
      const rgb = parseColorToRgb(p.color);

      this.gpuParticleBuffer[offset] = p.x;
      this.gpuParticleBuffer[offset + 1] = p.y;
      this.gpuParticleBuffer[offset + 2] = p.radius;
      this.gpuParticleBuffer[offset + 3] = p.alpha;
      this.gpuParticleBuffer[offset + 4] = rgb[0];
      this.gpuParticleBuffer[offset + 5] = rgb[1];
      this.gpuParticleBuffer[offset + 6] = rgb[2];
      this.gpuParticleBuffer[offset + 7] = 0.4;
    }
    return { buffer: this.gpuParticleBuffer, count };
  }

  public render2DFallback(ctx: CanvasRenderingContext2D, width: number, height: number, config: CosmeticsConfig): void {
    if (config.performanceProfile === 'eco') return;

    // Render 2D shockwaves
    if (config.shockwavesEnabled && this.shockwaves.length > 0) {
      ctx.save();
      for (const sw of this.shockwaves) {
        if (sw.alpha <= 0.01) continue;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha * 0.7;
        ctx.lineWidth = sw.lineWidth;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Render 2D particles
    if (config.sparksEnabled && this.particles.length > 0) {
      ctx.save();
      for (const p of this.particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Render 2D scanlines
    if (config.scanlinesEnabled && config.scanlineIntensity > 0) {
      const step = config.scanlineDensity <= 1 ? 2 : config.scanlineDensity <= 2 ? 3 : 4;
      const pattern = this.getScanlinePattern(ctx, step);
      if (pattern) {
        ctx.save();
        ctx.globalAlpha = config.scanlineIntensity * 0.45;
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }

    // Render 2D film grain
    if (config.filmGrainEnabled && this.grainCanvases.length > 0 && config.filmGrainIntensity > 0) {
      this.grainFrame++;
      if (this.grainFrame % 2 === 0) {
        this.currentPatternIndex = (this.currentPatternIndex + 1) % this.grainCanvases.length;
      }
      const grainCanvas = this.grainCanvases[this.currentPatternIndex];
      const pattern = ctx.createPattern(grainCanvas, 'repeat');
      if (pattern) {
        ctx.save();
        ctx.globalAlpha = config.filmGrainIntensity * 0.25;
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }
  }

  public getGhosts(): PhosphorGhost[] {
    return this.ghosts;
  }

  public clear(): void {
    this.particles = [];
    this.shockwaves = [];
    this.ghosts = [];
  }
}
