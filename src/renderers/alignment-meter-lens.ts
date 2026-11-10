import { Scene } from '../core/types';
import { evaluatePlacedShape } from '../core/shape';
import {
  calculatePlompLevelt,
  calculateTenneyHeight,
  calculateGhostFundamental,
  calculateCoincidenceCycle,
  calculateSetharesCurve,
  CANONICAL_INTERVAL_MARKERS,
} from '../core/alignment';
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
    scene: Scene,
    _transportTime: number = 0,
    _audioPhase: number = 0,
    _isAudioActive: boolean = false
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
    const ghost = calculateGhostFundamental(shape, f0, scene.anchors.tplFrequencyHz);
    const coincidence = calculateCoincidenceCycle(shape, f0);

    ctx.save();

    const isCompact = width < 480;
    const isShort = height < 280;

    // 1. Header & Metric Badges
    ctx.fillStyle = '#38bdf8';
    ctx.font = isCompact ? 'bold 8px JetBrains Mono, monospace' : 'bold 9px JetBrains Mono, monospace';
    ctx.fillText(isCompact ? 'ALIGNMENT & CONSONANCE METER' : 'ALIGNMENT & HARMONIC CONSONANCE METER', isCompact ? 14 : 20, 20);

    const padX = isCompact ? 14 : 20;
    const gapX = isCompact ? 6 : 10;
    const boxY = isShort ? 30 : 38;
    const boxH = isShort ? 38 : 46;
    const boxW = (width - padX * 2 - gapX * 2) / 3;

    // Metric 1: Roughness
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(padX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = isCompact ? '7.5px JetBrains Mono, monospace' : '8px JetBrains Mono, monospace';
    ctx.fillText(isCompact ? 'ROUGHNESS' : 'SENSORY ROUGHNESS', padX + 6, boxY + 14);
    ctx.fillStyle = internalRoughness > 0.4 ? '#fb7185' : '#34d399';
    ctx.font = isCompact ? 'bold 11px JetBrains Mono, monospace' : 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(internalRoughness.toFixed(3), padX + 6, boxY + (isShort ? 31 : 36));

    // Metric 2: Tenney Complexity
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.beginPath();
    ctx.roundRect(padX + boxW + gapX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = isCompact ? '7.5px JetBrains Mono, monospace' : '8px JetBrains Mono, monospace';
    ctx.fillText(isCompact ? 'TENNEY' : 'TENNEY COMPLEXITY', padX + boxW + gapX + 6, boxY + 14);
    ctx.fillStyle = '#c084fc';
    ctx.font = isCompact ? 'bold 11px JetBrains Mono, monospace' : 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(avgTenney.toFixed(2), padX + boxW + gapX + 6, boxY + (isShort ? 31 : 36));

    // Metric 3: Coincidence / Super-Cycle Period (Sam)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.beginPath();
    ctx.roundRect(padX + (boxW + gapX) * 2, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = isCompact ? '7.5px JetBrains Mono, monospace' : '8px JetBrains Mono, monospace';
    ctx.fillText(isCompact ? 'SAM PERIOD' : 'COINCIDENCE (SAM)', padX + (boxW + gapX) * 2 + 6, boxY + 14);
    ctx.fillStyle = '#f97316';
    ctx.font = isCompact ? 'bold 10px JetBrains Mono, monospace' : 'bold 12px JetBrains Mono, monospace';
    const samMetricText = coincidence.isAperiodic
      ? (isCompact ? '∞ Aper.' : '∞ (Aperiodic)')
      : coincidence.rootTurnsToAlign === 1
      ? `${(ghost.cycleDurationSec * 1000).toFixed(1)}ms`
      : `${(coincidence.superCycleDurationSec * 1000).toFixed(1)}ms (${coincidence.rootTurnsToAlign}x)`;
    ctx.fillText(samMetricText, padX + (boxW + gapX) * 2 + 6, boxY + (isShort ? 31 : 36));

    const isPitchSpace = f0 >= 20;

    // 2. Sethares Consonance & Coincidence Landscape across ratios 1.0 to 2.0
    // Faithfully models harmonic, inharmonic, and aperiodic timbres across both pitch and rhythm domains.
    const curveTop = boxY + boxH + (isShort ? 16 : 24);
    const curveBottom = height - (isShort ? 22 : 30);
    const curveH = Math.max(30, curveBottom - curveTop);
    const plotLeft = isCompact ? 24 : 40;
    const plotRight = width - (isCompact ? 16 : 30);
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
    const xLabel = isPitchSpace
      ? (isCompact ? 'INTERVAL (1/1 to 2/1)' : 'INTERVAL RATIO (1/1 to 2/1) • CONSONANCE VALLEYS')
      : (isCompact ? 'TEMPO RATIO (1:1 to 2:1)' : 'TEMPO RATIO (1:1 to 2:1) • POLYRHYTHMIC COINCIDENCE VALLEYS');
    ctx.fillText(xLabel, plotLeft, curveBottom + 16);
    ctx.fillText(isPitchSpace ? 'DISSONANCE' : 'INTERFERENCE', 10, curveTop - 8);

    // Consonant / Polyrhythmic interval guidelines
    ctx.save();
    ctx.setLineDash([2, 4]);
    for (const m of CANONICAL_INTERVAL_MARKERS) {
      const gx = plotLeft + (m.ratio - 1.0) * plotW;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.beginPath();
      ctx.moveTo(gx, curveTop);
      ctx.lineTo(gx, curveBottom);
      ctx.stroke();

      ctx.fillStyle = '#0284c7';
      ctx.font = '7.5px JetBrains Mono, monospace';
      const markLabel = isPitchSpace ? m.label : m.label.replace('/', ':');
      ctx.fillText(markLabel, gx - 6, curveBottom + 8);
    }
    ctx.restore();

    // Compute and draw Sethares curve
    const sethares = calculateSetharesCurve(activePartials, f0, Math.max(32, Math.floor(plotW / 3)));
    ctx.strokeStyle = isPitchSpace ? '#38bdf8' : '#f59e0b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();

    for (let i = 0; i < sethares.points.length; i++) {
      const pt = sethares.points[i];
      const px = plotLeft + (pt.ratio - 1.0) * plotW;
      const normY = curveBottom - (pt.roughness / sethares.maxRoughness) * (curveH * 0.85);
      if (i === 0) ctx.moveTo(px, normY);
      else ctx.lineTo(px, normY);
    }
    ctx.stroke();

    // Determine active shape's primary overtone interval / polyrhythm ratio
    const primaryOvertone = activePartials.find((p) => p.ratioValue > 1.02)?.ratioValue ?? 1.0;
    const clampedRatio = Math.min(2.0, Math.max(1.0, primaryOvertone));
    const markerX = plotLeft + (clampedRatio - 1.0) * plotW;

    let markerRoughness = internalRoughness;
    if (sethares.points.length > 0) {
      const closestPt = sethares.points.reduce((prev, curr) =>
        Math.abs(curr.ratio - clampedRatio) < Math.abs(prev.ratio - clampedRatio) ? curr : prev
      );
      markerRoughness = closestPt.roughness;
    }
    const markerY = curveBottom - Math.min(1.0, markerRoughness / sethares.maxRoughness) * (curveH * 0.85);

    ctx.fillStyle = '#E13610';
    ctx.beginPath();
    ctx.arc(markerX, markerY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Marker badge text
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    const markerText = isPitchSpace
      ? `${clampedRatio.toFixed(2)}x`
      : `${clampedRatio.toFixed(2)}:1`;
    ctx.fillText(markerText, markerX - 8, markerY - 8);

    this.dynamicLights.push({
      x: markerX,
      y: markerY,
      velocity: 0.9,
      colorHex: '#FF4D4D',
    });

    ctx.restore();
  }
}
