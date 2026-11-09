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
    const minRadius = maxRadius * 0.15;

    // Dynamically calculate DuPeriod band range to encompass active shapes (span from -7 to +7 by default)
    let minD = -7;
    let maxD = 7;
    for (const pl of scene.placements) {
      const shape = scene.shapes.find((s) => s.id === pl.shapeId);
      if (shape) {
        for (const p of shape.partials) {
          const ratioVal = typeof p.ratio === 'object' && p.ratio.kind === 'rational'
            ? p.ratio.num / p.ratio.den
            : typeof p.ratio === 'object' && p.ratio.kind === 'real'
            ? p.ratio.value
            : 1;
          const partialD = pl.d - Math.log2(Math.max(0.001, ratioVal));
          minD = Math.min(minD, Math.floor(partialD));
          maxD = Math.max(maxD, Math.ceil(partialD));
        }
      }
    }

    const bandMin = Math.max(-8, Math.min(-6, minD));
    const bandMax = Math.min(8, Math.max(6, maxD));
    const bandCount = bandMax - bandMin + 1;
    const ringSpacing = (maxRadius - minRadius) / (bandCount - 1);

    const getRadiusForD = (d: number): number => {
      // Slower (positive d / rhythm) on outer rings, faster (negative d / pitch) on inner rings
      const norm = (d - bandMin) / (bandMax - bandMin);
      const clamped = Math.max(0, Math.min(1, norm));
      return minRadius + clamped * (maxRadius - minRadius);
    };

    const rLimen = getRadiusForD(0.0);

    // 1. Draw Regime Shading & DuPeriod band rings
    ctx.save();

    // Rhythmic Macro Regime Background (outer of Limen)
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, rLimen, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(238, 54, 16, 0.03)';
    ctx.fill();

    // Tonal Micro Pitch Regime Background (inner of Limen)
    ctx.beginPath();
    ctx.arc(centerX, centerY, rLimen, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, minRadius, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.03)';
    ctx.fill();

    for (let i = 0; i < bandCount; i++) {
      const bandVal = bandMin + i;
      const r = minRadius + i * ringSpacing;
      const isLimen = bandVal === 0;

      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);

      if (isLimen) {
        // Glowing TPL Limen ring
        ctx.strokeStyle = '#E13610';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 77, 77, 0.3)';
        ctx.lineWidth = 6;
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Band label
      ctx.fillStyle = isLimen ? '#E13610' : 'rgba(255, 255, 255, 0.35)';
      ctx.font = isLimen ? 'bold 9px JetBrains Mono, monospace' : '8px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      const label = isLimen ? 'TPL (0)' : bandVal > 0 ? `+${bandVal}` : `${bandVal}`;
      ctx.fillText(label, centerX - r - 4, centerY + 3);
    }

    // Limen title banner on the clock
    ctx.fillStyle = '#E13610';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TEMPORAL-PLACE LIMEN (25.8 Hz / 38.7 ms)', centerX, centerY - rLimen - 5);

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
