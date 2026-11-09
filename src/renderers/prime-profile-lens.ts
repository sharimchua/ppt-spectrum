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
    const familyLabels = {
      '2': '2-Prime (Octaves)',
      '3': '3-Prime (Fifths)',
      '5': '5-Prime (Thirds)',
      '7': '7-Prime (Septimal)',
      '11': '11-Prime (Neutral)',
      'higher': '>11 (Inharmonic)',
    };

    const barAreaW = width * 0.75;
    const barStartX = (width - barAreaW) / 2;
    const startY = 80;
    const barSpacing = (height - startY - 40) / families.length;
    const maxBarW = barAreaW * 0.65;

    ctx.save();
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText(`PRIME SPECTRAL PROFILE — ${shape.name.toUpperCase()}`, barStartX, 45);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText('Amplitude-weighted energy distribution across prime factor families', barStartX, 60);

    for (let i = 0; i < families.length; i++) {
      const fam = families[i];
      const weight = profile.familyWeights[fam];
      const ratio = profile.totalWeight > 0 ? weight / profile.totalWeight : 0;
      const barY = startY + i * barSpacing;
      const barW = Math.max(2, ratio * maxBarW);
      const col = PRIME_FAMILY_COLORS[fam] || '#ec4899';

      // Family label
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(familyLabels[fam], barStartX, barY + 12);

      // Bar background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(barStartX + 160, barY, maxBarW, 16);

      // Filled bar
      ctx.fillStyle = col;
      ctx.fillRect(barStartX + 160, barY, barW, 16);

      // Percentage label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`${(ratio * 100).toFixed(1)}%`, barStartX + 170 + barW, barY + 12);

      if (barW > 10) {
        this.dynamicLights.push({
          x: barStartX + 160 + barW,
          y: barY + 8,
          velocity: ratio,
          colorHex: col,
        });
      }
    }
    ctx.restore();
  }
}
