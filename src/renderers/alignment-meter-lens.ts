import { Scene } from '../core/types';
import { evaluatePlacedShape } from '../core/shape';
import { calculatePlompLevelt, calculateTenneyHeight, calculateGhostFundamental } from '../core/alignment';
import { rationalise } from '../core/rational';
import { dToFreq } from '../core/axis';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';

export class AlignmentMeterLensRenderer implements RegisteredLensRenderer {
  public id = 'alignment-meter';
  private dynamicLights: PostProcessingLight[] = [];

  public getDynamicLights(): PostProcessingLight[] {
    return this.dynamicLights;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scene: Scene
  ): void {
    this.dynamicLights = [];

    const placement = scene.placements[0];
    if (!placement) return;
    const shape = scene.shapes.find((s) => s.id === placement.shapeId);
    if (!shape) return;

    const f0 = dToFreq(placement.d, scene.anchors.tplFrequencyHz);
    const partials = evaluatePlacedShape(shape, placement, scene.filter);
    const activePartials = partials.filter((p) => p.filteredAmp > 0.001);

    // Compute internal pairwise Plomp-Levelt roughness
    let internalRoughness = 0;
    for (let i = 0; i < activePartials.length; i++) {
      for (let j = i + 1; j < activePartials.length; j++) {
        internalRoughness += calculatePlompLevelt(
          activePartials[i].freqHz,
          activePartials[i].filteredAmp,
          activePartials[j].freqHz,
          activePartials[j].filteredAmp
        );
      }
    }

    // Compute average Tenney height
    let totalTenney = 0;
    let tenneyCount = 0;
    for (const p of activePartials) {
      const r = rationalise(p.ratioValue);
      totalTenney += calculateTenneyHeight(r.num, r.den);
      tenneyCount++;
    }
    const avgTenney = tenneyCount > 0 ? totalTenney / tenneyCount : 0;
    const ghost = calculateGhostFundamental(shape, f0);

    ctx.save();

    // 1. Header & Metric Badges
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.fillText('ALIGNMENT & HARMONIC CONSONANCE METER', 20, 24);

    const boxY = 40;
    const boxH = 46;
    const boxW = (width - 60) / 3;

    // Metric 1: Roughness
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(20, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.fillText('SENSORY ROUGHNESS', 28, boxY + 16);
    ctx.fillStyle = internalRoughness > 0.4 ? '#fb7185' : '#34d399';
    ctx.font = 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(internalRoughness.toFixed(3), 28, boxY + 36);

    // Metric 2: Tenney Complexity
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.beginPath();
    ctx.roundRect(20 + boxW + 10, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.fillText('TENNEY COMPLEXITY', 28 + boxW + 10, boxY + 16);
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(avgTenney.toFixed(2), 28 + boxW + 10, boxY + 36);

    // Metric 3: Ghost Fundamental Period
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.beginPath();
    ctx.roundRect(20 + (boxW + 10) * 2, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.fillText('GHOST PERIOD (SAM)', 28 + (boxW + 10) * 2, boxY + 16);
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(`${(ghost.cycleDurationSec * 1000).toFixed(1)} ms`, 28 + (boxW + 10) * 2, boxY + 36);

    // 2. Plomp-Levelt Roughness Curve across interval ratios 1.0 to 2.0
    const curveTop = 110;
    const curveBottom = height - 30;
    const curveH = curveBottom - curveTop;
    const plotLeft = 40;
    const plotRight = width - 30;
    const plotW = plotRight - plotLeft;

    // Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(plotLeft, curveTop);
    ctx.lineTo(plotLeft, curveBottom);
    ctx.lineTo(plotRight, curveBottom);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.fillText('INTERVAL RATIO (1/1 to 2/1)', plotLeft, curveBottom + 16);
    ctx.fillText('DISSONANCE', 10, curveTop - 8);

    // Compute and draw theoretical Plomp-Levelt curve
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();

    const testFundamental = Math.max(20, Math.min(440, f0));
    let maxRoughInPlot = 0.001;
    const points: { x: number; rough: number }[] = [];

    for (let i = 0; i <= plotW; i += 3) {
      const ratio = 1.0 + (i / plotW); // 1.0 to 2.0
      let rSum = 0;
      for (const p of activePartials) {
        const fInterv = testFundamental * ratio * p.ratioValue;
        rSum += calculatePlompLevelt(p.freqHz, p.filteredAmp, fInterv, 0.8);
      }
      if (rSum > maxRoughInPlot) maxRoughInPlot = rSum;
      points.push({ x: plotLeft + i, rough: rSum });
    }

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const normY = curveBottom - (pt.rough / maxRoughInPlot) * (curveH * 0.85);
      if (i === 0) ctx.moveTo(pt.x, normY);
      else ctx.lineTo(pt.x, normY);
    }
    ctx.stroke();

    // Mark current shape's internal roughness point
    const markerY = curveBottom - Math.min(1.0, internalRoughness / maxRoughInPlot) * (curveH * 0.85);
    const markerX = plotLeft + 30;

    ctx.fillStyle = '#E13610';
    ctx.beginPath();
    ctx.arc(markerX, markerY, 5, 0, Math.PI * 2);
    ctx.fill();

    this.dynamicLights.push({
      x: markerX,
      y: markerY,
      velocity: 0.9,
      colorHex: '#FF4D4D',
    });

    ctx.restore();
  }
}
