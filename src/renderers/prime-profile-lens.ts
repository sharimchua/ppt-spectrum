import { Scene } from '../core/types';
import { calculatePrimeProfile } from '../core/shape';
import { PRIME_FAMILY_COLORS } from '../core/ppt-constants';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';

export class PrimeProfileLensRenderer implements RegisteredLensRenderer {
  public id = 'prime-profile';
  private dynamicLights: PostProcessingLight[] = [];

  public getDynamicLights(): PostProcessingLight[] {
    return this.dynamicLights;
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number, scene: Scene): void {
    this.dynamicLights = [];

    const placement = scene.placements[0];
    if (!placement) return;
    const shape = scene.shapes.find((s) => s.id === placement.shapeId);
    if (!shape) return;

    const profile = calculatePrimeProfile(shape);
    const families = ['2', '3', '5', '7', '11', 'higher'] as const;
    const isCompact = width < 480;
    const isShort = height < 280;
    const familyLabels = isCompact
      ? {
          '2': '2-Prime (8ve)',
          '3': '3-Prime (5th)',
          '5': '5-Prime (3rd)',
          '7': '7-Prime (7th)',
          '11': '11-Prime',
          'higher': '>11 (Inharm)',
        }
      : {
          '2': '2-Prime (Octaves)',
          '3': '3-Prime (Fifths)',
          '5': '5-Prime (Thirds)',
          '7': '7-Prime (Septimal)',
          '11': '11-Prime (Neutral)',
          'higher': '>11 (Inharmonic)',
        };

    const barStartX = isCompact ? 16 : (width - width * 0.75) / 2;
    const labelColW = isCompact ? 96 : 160;
    const startY = isShort ? 14 : 24;
    const barSpacing = Math.max(18, (height - startY - (isShort ? 12 : 20)) / families.length);
    const barH = Math.min(16, Math.max(10, barSpacing - 6));
    const maxBarW = Math.max(60, width - barStartX * 2 - labelColW - 52);

    ctx.save();

    for (let i = 0; i < families.length; i++) {
      const fam = families[i];
      const weight = profile.familyWeights[fam];
      const ratio = profile.totalWeight > 0 ? weight / profile.totalWeight : 0;
      const barY = startY + i * barSpacing;
      const barW = Math.max(2, ratio * maxBarW);
      const col = PRIME_FAMILY_COLORS[fam] || '#ec4899';

      // Family label
      ctx.fillStyle = '#ffffff';
      ctx.font = isCompact ? '9px Inter, sans-serif' : '10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(familyLabels[fam], barStartX, barY + barH * 0.8);

      // Bar background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(barStartX + labelColW, barY, maxBarW, barH);

      // Filled bar
      ctx.fillStyle = col;
      ctx.fillRect(barStartX + labelColW, barY, barW, barH);

      // Percentage label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = isCompact ? '9px JetBrains Mono, monospace' : '10px JetBrains Mono, monospace';
      ctx.fillText(`${(ratio * 100).toFixed(1)}%`, barStartX + labelColW + 8 + barW, barY + barH * 0.8);

      if (barW > 10) {
        this.dynamicLights.push({
          x: barStartX + labelColW + barW,
          y: barY + barH / 2,
          velocity: ratio,
          colorHex: col,
        });
      }
    }
    ctx.restore();
  }
}
