import { Scene } from '../core/types';
import { evaluatePlacedShape } from '../core/shape';
import { calculateGhostFundamental } from '../core/alignment';
import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS } from '../core/ppt-constants';
import { resolveDuPeriodAddress, dToFreq } from '../core/axis';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';

export class CycleWheelLensRenderer implements RegisteredLensRenderer {
  public id = 'cycle-wheel';
  private dynamicLights: PostProcessingLight[] = [];

  public getDynamicLights(): PostProcessingLight[] {
    return this.dynamicLights;
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number, scene: Scene): void {
    this.dynamicLights = [];

    const centerX = width / 2;
    const centerY = height / 2;
    const maxR = Math.min(centerX, centerY) * 0.85;

    const primaryPlacement = scene.placements[0];
    if (!primaryPlacement) return;

    const shape = scene.shapes.find((s) => s.id === primaryPlacement.shapeId);
    if (!shape) return;

    const f0 = dToFreq(primaryPlacement.d, scene.anchors.tplFrequencyHz);
    const ghost = calculateGhostFundamental(shape, f0);
    const partials = evaluatePlacedShape(shape, primaryPlacement, scene.filter);

    // 1. Ghost fundamental cycle boundary (the "Sam" / common bar)
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(225, 54, 16, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 12 o'clock coincidence marker
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - maxR - 8);
    ctx.lineTo(centerX, centerY - maxR + 8);
    ctx.strokeStyle = '#E13610';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#E13610';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`CYCLE / SAM (${(ghost.cycleDurationSec * 1000).toFixed(1)} ms)`, centerX, centerY - maxR - 14);
    ctx.restore();

    // 2. Concentric rings for each partial layer
    const numPartials = partials.length;
    const innerR = maxR * 0.25;
    const ringStep = (maxR - innerR) / Math.max(1, numPartials);

    for (let i = 0; i < numPartials; i++) {
      const p = partials[i];
      if (p.filteredAmp <= 0.001) continue;

      const r = innerR + (i + 0.5) * ringStep;

      // Track ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Event dots around the ring: count = ratio rounded or pulses per cycle
      const ratioCount = Math.max(1, Math.round(p.ratioValue));
      const addr = resolveDuPeriodAddress(p.d);
      const col = SOLFEGE_COLORS[addr.semitoneIndex] || '#38bdf8';
      const neonCol = SOLFEGE_NEON_COLORS[addr.semitoneIndex] || col;

      for (let dot = 0; dot < ratioCount; dot++) {
        // Angle starts at 12 o'clock (-PI/2) plus dot phase
        const angle = (dot / ratioCount) * Math.PI * 2 - Math.PI / 2 + p.phase * Math.PI * 2;
        const px = centerX + r * Math.cos(angle);
        const py = centerY + r * Math.sin(angle);
        const dotRadius = 3.0 + p.filteredAmp * 3.5;

        ctx.save();
        ctx.fillStyle = neonCol;
        ctx.beginPath();
        ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // If at top alignment (dot === 0), draw coincidence spoke to center
        if (dot === 0) {
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(px, py);
          ctx.strokeStyle = 'rgba(225, 54, 16, 0.25)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();

        this.dynamicLights.push({
          x: px,
          y: py,
          velocity: p.filteredAmp * 0.8,
          colorHex: neonCol,
        });
      }
    }
  }
}
