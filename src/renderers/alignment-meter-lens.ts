import { Scene } from '../core/types';
import { evaluatePlacedShape } from '../core/shape';
import {
  calculatePlompLevelt,
  calculateTenneyHeight,
  calculateGhostFundamental,
  calculateCoincidenceCycle,
  calculateSetharesCurve,
  calculateSupercycleTimeline,
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
    audioPhase: number = 0,
    isAudioActive: boolean = false
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

    if (isPitchSpace) {
      // 2. Pitch Space: Sethares Sensory Dissonance & Consonance Landscape across interval ratios 1.0 to 2.0
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
      ctx.fillText(isCompact ? 'INTERVAL (1/1 to 2/1)' : 'INTERVAL RATIO (1/1 to 2/1) • CONSONANCE VALLEYS', plotLeft, curveBottom + 16);
      ctx.fillText('DISSONANCE', 10, curveTop - 8);

      // Consonant interval guidelines
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
        ctx.fillText(m.label, gx - 6, curveBottom + 8);
      }
      ctx.restore();

      // Compute and draw Sethares curve
      const sethares = calculateSetharesCurve(activePartials, f0, Math.max(32, Math.floor(plotW / 3)));
      ctx.strokeStyle = '#38bdf8';
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

      // Determine active shape's primary overtone interval ratio
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
      ctx.fillText(`${clampedRatio.toFixed(2)}x`, markerX - 8, markerY - 8);

      this.dynamicLights.push({
        x: markerX,
        y: markerY,
        velocity: 0.9,
        colorHex: '#FF4D4D',
      });
    } else {
      // 2. Rhythm Space: Supercycle Coincidence & Polyrhythmic Timeline
      const timeTop = boxY + boxH + (isShort ? 14 : 20);
      const timeBottom = height - (isShort ? 16 : 22);
      const timeH = Math.max(40, timeBottom - timeTop);
      const plotLeft = isCompact ? 24 : 40;
      const plotRight = width - (isCompact ? 16 : 30);
      const plotW = plotRight - plotLeft;

      const turns = coincidence.isAperiodic ? 4 : coincidence.rootTurnsToAlign;
      const timelines = calculateSupercycleTimeline(shape, turns);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.fillText(
        isCompact
          ? `SUPERCYCLE (${turns}T • Sam Coincidence)`
          : `SUPERCYCLE COINCIDENCE TIMELINE (${turns} ROOT TURNS • SAM ALIGNMENT)`,
        plotLeft,
        timeTop - 6
      );

      // Render each voice lane
      const laneH = Math.min(28, timeH / Math.max(1, timelines.length));
      for (let l = 0; l < timelines.length; l++) {
        const line = timelines[l];
        const ly = timeTop + l * laneH + laneH * 0.5;

        // Lane baseline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plotLeft, ly);
        ctx.lineTo(plotRight, ly);
        ctx.stroke();

        // Voice label
        ctx.fillStyle = '#94a3b8';
        ctx.font = '7.5px JetBrains Mono, monospace';
        ctx.fillText(line.label, plotLeft, ly - 4);

        // Render pulse events
        for (const ev of line.events) {
          const ex = plotLeft + ev * plotW;
          const isSam = ev < 0.01 || ev > 0.99;

          ctx.fillStyle = isSam ? '#fbbf24' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(ex, ly, isSam ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fill();

          if (isSam) {
            this.dynamicLights.push({
              x: ex,
              y: ly,
              velocity: 0.8,
              colorHex: '#FBBF24',
            });
          }
        }
      }

      // Sam Downbeat Boundary Lines (0 and 1.0)
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(plotLeft, timeTop);
      ctx.lineTo(plotLeft, timeBottom);
      ctx.moveTo(plotRight, timeTop);
      ctx.lineTo(plotRight, timeBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#fbbf24';
      ctx.font = '7.5px JetBrains Mono, monospace';
      ctx.fillText('SAM (APEX)', plotLeft + 2, timeBottom + 10);
      ctx.fillText('SAM', plotRight - 18, timeBottom + 10);

      // Supercycle playhead
      if (isAudioActive) {
        const superPhase = ((audioPhase / turns) % 1.0 + 1.0) % 1.0;
        const playheadX = plotLeft + superPhase * plotW;
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, timeTop - 4);
        ctx.lineTo(playheadX, timeBottom + 4);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
