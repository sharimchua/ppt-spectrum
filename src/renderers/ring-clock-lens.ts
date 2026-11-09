import { Scene } from '../core/types';
import { evaluatePlacedShape } from '../core/shape';
import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS, SOLFEGE_SYLLABLES } from '../core/ppt-constants';
import { resolveDuPeriodAddress } from '../core/axis';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';

export class RingClockLensRenderer implements RegisteredLensRenderer {
  public id = 'ring-clock';
  private dynamicLights: PostProcessingLight[] = [];

  public getDynamicLights(): PostProcessingLight[] {
    return this.dynamicLights;
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number, scene: Scene): void {
    this.dynamicLights = [];

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(centerX, centerY) * 0.88;
    const minRadius = maxRadius * 0.18;

    // Rings represent DuPeriod bands: -5 (pitch) to +5 (rhythm)
    const bandMin = -5;
    const bandMax = 5;
    const bandCount = bandMax - bandMin + 1;
    const ringSpacing = (maxRadius - minRadius) / (bandCount - 1);

    const getRadiusForD = (d: number): number => {
      // Slower (positive d / rhythm) on outer rings, faster (negative d / pitch) on inner rings
      const norm = (d - bandMin) / (bandMax - bandMin);
      const clamped = Math.max(0, Math.min(1, norm));
      return minRadius + clamped * (maxRadius - minRadius);
    };

    // 1. Draw concentric DuPeriod band rings
    ctx.save();
    for (let i = 0; i < bandCount; i++) {
      const bandVal = bandMin + i;
      const r = minRadius + i * ringSpacing;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.strokeStyle = bandVal === 0 ? 'rgba(225, 54, 16, 0.45)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = bandVal === 0 ? 1.5 : 1;
      ctx.stroke();

      // Band label
      ctx.fillStyle = bandVal === 0 ? '#E13610' : 'rgba(255, 255, 255, 0.25)';
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      const label = bandVal === 0 ? 'TPL (0)' : bandVal > 0 ? `+${bandVal}` : `${bandVal}`;
      ctx.fillText(label, centerX - r - 4, centerY + 3);
    }

    // 2. 12 Solfège spokes (Do at 12 o'clock, clockwise)
    for (let st = 0; st < 12; st++) {
      const angle = (st / 12) * Math.PI * 2 - Math.PI / 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(centerX + minRadius * cosA, centerY + minRadius * sinA);
      ctx.lineTo(centerX + maxRadius * cosA, centerY + maxRadius * sinA);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Solfège Syllable around outer perimeter
      const labelR = maxRadius + 14;
      ctx.fillStyle = SOLFEGE_COLORS[st] || '#94a3b8';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SOLFEGE_SYLLABLES[st], centerX + labelR * cosA, centerY + labelR * sinA);
    }
    ctx.restore();

    // 3. Render placed shapes as dots & spiral chords
    for (const placement of scene.placements) {
      const shape = scene.shapes.find((s) => s.id === placement.shapeId);
      if (!shape) continue;

      const partials = evaluatePlacedShape(shape, placement, scene.filter);

      // Draw connecting ray/polygon between partials
      if (partials.length > 1) {
        ctx.save();
        ctx.beginPath();
        let first = true;
        for (const p of partials) {
          if (p.filteredAmp <= 0.001) continue;
          const r = getRadiusForD(p.d);
          const addr = resolveDuPeriodAddress(p.d);
          // Angle proportional to semitone offset within band
          const angle = (addr.semitoneOffset / 12) * Math.PI * 2 - Math.PI / 2;
          const px = centerX + r * Math.cos(angle);
          const py = centerY + r * Math.sin(angle);
          if (first) {
            ctx.moveTo(px, py);
            first = false;
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(225, 54, 16, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = 'rgba(225, 54, 16, 0.06)';
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Draw individual partial nodes
      for (const p of partials) {
        if (p.filteredAmp <= 0.001) continue;
        const r = getRadiusForD(p.d);
        const addr = resolveDuPeriodAddress(p.d);
        const angle = (addr.semitoneOffset / 12) * Math.PI * 2 - Math.PI / 2;
        const px = centerX + r * Math.cos(angle);
        const py = centerY + r * Math.sin(angle);

        const col = SOLFEGE_COLORS[addr.semitoneIndex] || '#ffffff';
        const neonCol = SOLFEGE_NEON_COLORS[addr.semitoneIndex] || col;
        const nodeRadius = 3.5 + p.filteredAmp * 4.5;

        ctx.save();
        ctx.fillStyle = neonCol;
        ctx.beginPath();
        ctx.arc(px, py, nodeRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.label || addr.syllable, px, py - nodeRadius - 3);
        ctx.restore();

        this.dynamicLights.push({
          x: px,
          y: py,
          velocity: p.filteredAmp,
          colorHex: neonCol,
        });
      }
    }
  }
}
