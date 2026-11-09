import { Scene } from '../core/types';
import { evaluatePlacedShape } from '../core/shape';
import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS } from '../core/ppt-constants';
import { resolveDuPeriodAddress, dToFreq } from '../core/axis';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';

export class WaveformPhasorLensRenderer implements RegisteredLensRenderer {
  public id = 'waveform-phasor';
  private dynamicLights: PostProcessingLight[] = [];

  public getDynamicLights(): PostProcessingLight[] {
    return this.dynamicLights;
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number, scene: Scene, transportTime: number): void {
    this.dynamicLights = [];

    const placement = scene.placements[0];
    if (!placement) return;
    const shape = scene.shapes.find((s) => s.id === placement.shapeId);
    if (!shape) return;

    const partials = evaluatePlacedShape(shape, placement, scene.filter);
    const splitX = width * 0.65;
    const f0 = dToFreq(placement.d, scene.anchors.tplFrequencyHz);

    // Dynamic rotation angle: for high audio frequencies (>30Hz), clamp rotation to visually pleasing cadence (1.5 rev/sec)
    // so it doesn't alias into a blur; for rhythm rates (<30Hz), rotate strictly at f0 rate.
    const effectiveVisualRate = f0 > 30 ? 1.5 : f0;
    const rotationTurns = transportTime * effectiveVisualRate;

    // 1. Composite Waveform (Left 65% of viewport)
    ctx.save();
    const waveCenterY = height * 0.5;
    const waveAmpScale = height * 0.32;

    // Baseline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(20, waveCenterY);
    ctx.lineTo(splitX - 20, waveCenterY);
    ctx.stroke();

    // Waveform path (sum of sinusoids traveling smoothly over time)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.beginPath();

    const waveWidth = splitX - 40;
    const numCyclesDrawn = 2.5;

    for (let x = 0; x <= waveWidth; x += 2) {
      const t = (x / waveWidth) * numCyclesDrawn;
      let ySum = 0;
      let ampNorm = 0;

      for (const p of partials) {
        if (p.filteredAmp <= 0.001) continue;
        // Travel wave continuously with transportTime * effectiveVisualRate
        const wavePhase = (t - rotationTurns) * p.ratioValue + p.phase;
        ySum += Math.sin(2 * Math.PI * wavePhase) * p.filteredAmp;
        ampNorm += p.filteredAmp;
      }

      const normalizedY = ampNorm > 0 ? (ySum / ampNorm) * waveAmpScale : 0;
      const plotX = 20 + x;
      const plotY = waveCenterY - normalizedY;

      if (x === 0) ctx.moveTo(plotX, plotY);
      else ctx.lineTo(plotX, plotY);
    }
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.fillText('COMPOSITE WAVEFORM', 20, 30);
    ctx.restore();

    // 2. Rotating Phasors (Right 35% of viewport)
    ctx.save();
    const phasorCenterX = splitX + (width - splitX) / 2;
    const phasorCenterY = height / 2;
    const maxPhasorR = Math.min((width - splitX) / 2, height / 2) * 0.75;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(phasorCenterX, phasorCenterY, maxPhasorR, 0, Math.PI * 2);
    ctx.stroke();

    let cx = phasorCenterX;
    let cy = phasorCenterY;

    for (const p of partials) {
      if (p.filteredAmp <= 0.001) continue;

      const r = (p.filteredAmp / Math.max(1, partials[0]?.filteredAmp || 1)) * (maxPhasorR * 0.55);
      const addr = resolveDuPeriodAddress(p.d);
      const col = SOLFEGE_COLORS[addr.semitoneIndex] || '#E13610';
      const neonCol = SOLFEGE_NEON_COLORS[addr.semitoneIndex] || col;

      // Active rotating phasor angle derived from master phase
      const currentAngleTurns = (rotationTurns * p.ratioValue + p.phase) % 1.0;
      const angle = (currentAngleTurns * Math.PI * 2) - Math.PI / 2;
      const nx = cx + r * Math.cos(angle);
      const ny = cy + r * Math.sin(angle);

      // Circle orbit
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Phasor arm vector
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      // Node dot
      ctx.fillStyle = neonCol;
      ctx.beginPath();
      ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
      ctx.fill();

      this.dynamicLights.push({
        x: nx,
        y: ny,
        velocity: p.filteredAmp * 0.9,
        colorHex: neonCol,
      });

      cx = nx;
      cy = ny;
    }

    ctx.fillStyle = '#E13610';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ROTATING PHASORS', phasorCenterX, 30);
    ctx.restore();
  }
}
