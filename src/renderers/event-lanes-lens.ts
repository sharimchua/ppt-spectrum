import { Scene } from '../core/types';
import { evaluatePlacedShape, resolveDuMetricOffsetToken } from '../core/shape';
import { calculateCoincidenceCycle } from '../core/alignment';
import { resolveDuPeriodAddress, dToFreq } from '../core/axis';
import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS } from '../core/ppt-constants';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';
import { shouldUseDutyGain } from './filter-render-utils';
import { evaluateOnsetGain, PartialContext } from '../core/filter-eval';
import { truncateTextToFit, computeTickLabelStep } from './label-layout-utils';

export class EventLanesLensRenderer implements RegisteredLensRenderer {
  public id = 'event-lanes';
  private dynamicLights: PostProcessingLight[] = [];
  private lastTransportTime: number = 0;
  private visualPitchTurns: number = 0;

  public getDynamicLights(): PostProcessingLight[] {
    return this.dynamicLights;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scene: Scene,
    transportTime: number,
    audioPhase: number = 0,
    isAudioActive: boolean = false
  ): void {
    this.dynamicLights = [];

    const dt = this.lastTransportTime > 0
      ? Math.min(0.1, Math.max(0, transportTime - this.lastTransportTime))
      : 0.016;
    this.lastTransportTime = transportTime;

    const placement = scene.placements[0];
    if (!placement) return;
    const shape = scene.shapes.find((s) => s.id === placement.shapeId);
    if (!shape) return;

    const partials = evaluatePlacedShape(shape, placement, scene.filter, placement.d, scene.anchors.tplFrequencyHz);
    const activePartials = partials.filter((p) => p.amp > 0.001);
    if (activePartials.length === 0) return;

    const f0 = dToFreq(placement.d, scene.anchors.tplFrequencyHz);
    const coincidence = calculateCoincidenceCycle(shape, f0);

    // Unwrapped continuous root turns:
    let unwrappedRootTurns = 0;
    if (isAudioActive) {
      if (f0 <= 25.8) {
        unwrappedRootTurns = audioPhase;
        this.visualPitchTurns = audioPhase;
      } else {
        this.visualPitchTurns += dt * 1.0;
        unwrappedRootTurns = this.visualPitchTurns;
      }
    } else {
      this.visualPitchTurns = 0;
    }

    let filterSuperLength = 1;
    if (scene.filter && scene.filter.enabled) {
      for (const cond of scene.filter.conditions) {
        if (cond.enabled !== false && cond.supercycle && cond.supercycle.length > 1) {
          filterSuperLength = Math.max(filterSuperLength, cond.supercycle.length);
        }
      }
    }

    const isCompactSuperCycle = coincidence.isCompactSuperCycle;
    const cyclePeriodTurns = isCompactSuperCycle ? coincidence.rootTurnsToAlign : 1;
    const baseShapeTurns = isCompactSuperCycle ? coincidence.rootTurnsToAlign : 4;
    const windowTurns = isCompactSuperCycle
      ? Math.min(16, baseShapeTurns * filterSuperLength)
      : Math.min(16, Math.max(4, filterSuperLength));
    const windowStartTurn = Math.floor(Math.max(0, unwrappedRootTurns) / windowTurns) * windowTurns;

    const phaseProgress = (((unwrappedRootTurns - windowStartTurn) % windowTurns) + windowTurns) % windowTurns / windowTurns;

    const isCompact = width < 480;

    ctx.save();
    const measure = (s: string) => ctx.measureText(s).width;

    const topMargin = 18;
    const bottomMargin = 34;
    const availableHeight = Math.max(24, height - topMargin - bottomMargin);
    const minLaneHeight = isCompact ? 11 : 12;
    const maxVisibleLanes = Math.max(1, Math.floor(availableHeight / minLaneHeight));

    // When there are more partials than can fit without overflowing COMPOSITE,
    // keep the fundamental + highest-amplitude partials in their original order.
    let visiblePartials = activePartials;
    let hiddenCount = 0;
    if (activePartials.length > maxVisibleLanes) {
      hiddenCount = activePartials.length - maxVisibleLanes;
      const indexed = activePartials.map((p, idx) => ({ p, idx }));
      const selected = new Set<number>([0]);
      indexed
        .slice(1)
        .sort((a, b) => b.p.amp - a.p.amp)
        .slice(0, maxVisibleLanes - 1)
        .forEach((item) => selected.add(item.idx));
      visiblePartials = indexed.filter((item) => selected.has(item.idx)).map((item) => item.p);
    }

    const numLanes = visiblePartials.length;
    const laneHeight = availableHeight / Math.max(1, numLanes);

    const leftX = isCompact ? Math.min(76, Math.max(54, Math.floor(width * 0.26))) : 110;
    const rightX = width - (isCompact ? 14 : 25);
    const laneWidth = Math.max(40, rightX - leftX);
    const labelMaxW = Math.max(24, leftX - 10);

    // Draw Root Turn subdivision lines when window spans multiple Root Turns
    if (windowTurns > 1) {
      const turnLabelStep = computeTickLabelStep(windowTurns, laneWidth, isCompact ? 22 : 28);
      for (let b = 0; b <= windowTurns; b++) {
        const bx = leftX + (b / windowTurns) * laneWidth;
        ctx.strokeStyle = b === 0 || b === windowTurns
          ? 'rgba(225, 54, 16, 0.35)'
          : 'rgba(148, 163, 184, 0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx, topMargin - 4);
        ctx.lineTo(bx, height - 22);
        ctx.stroke();

        if (b < windowTurns && b % turnLabelStep === 0) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
          ctx.font = '7.5px JetBrains Mono, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`T${Math.round(windowStartTurn + b + 1)}`, bx + 3, topMargin - 6);
        }
      }
    }

    // Playhead marker vertical line
    const playheadX = leftX + phaseProgress * laneWidth;
    ctx.strokeStyle = 'rgba(238, 54, 16, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(playheadX, topMargin);
    ctx.lineTo(playheadX, height - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    let compositeHits = 0;

    // Render individual partial lanes
    const laneFontSize = laneHeight < 14 ? 7.5 : isCompact ? 8.5 : 10;
    for (let i = 0; i < numLanes; i++) {
      const p = visiblePartials[i];
      const isAttenuated = p.filteredAmp <= 0.001;
      const y = topMargin + i * laneHeight;
      const addr = resolveDuPeriodAddress(p.d);
      const col = SOLFEGE_COLORS[addr.semitoneIndex] || '#38bdf8';
      const neonCol = SOLFEGE_NEON_COLORS[addr.semitoneIndex] || col;

      // Lane track line
      ctx.strokeStyle = isAttenuated ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftX, y + laneHeight / 2);
      ctx.lineTo(rightX, y + laneHeight / 2);
      ctx.stroke();

      // Lane descriptor (dimmed if attenuated)
      ctx.fillStyle = isAttenuated ? 'rgba(148, 163, 184, 0.4)' : neonCol;
      ctx.font = `bold ${laneFontSize}px JetBrains Mono, monospace`;
      ctx.textAlign = 'right';
      const phaseTag = !isCompact && p.phase > 0.001 ? ` @${resolveDuMetricOffsetToken(p.phase).token}` : '';
      const laneText = isCompact
        ? `${addr.syllable} ${p.ratioValue.toFixed(2)}x`
        : `${addr.formatted}${phaseTag} (${p.ratioValue.toFixed(2)}x)`;
      ctx.fillText(truncateTextToFit(measure, laneText, labelMaxW), leftX - 6, y + laneHeight / 2 + 3);

      const ctxPartial: PartialContext = {
        partialD: p.d,
        sceneD: placement.d,
        placementD: placement.d,
        ratio: p.ratio,
        phase: p.phase,
        anchorRatio: p.anchorRatio,
        tplHz: scene.anchors.tplFrequencyHz,
        ratioToScene: 1.0,
        cyclePeriodTurns,
      };
      const isHighFreq = shouldUseDutyGain(p.freqHz);

      // Exact physical event timestamps t_k = (k / rVal) + p.phase within [windowStartTurn, windowStartTurn + windowTurns]
      const rVal = Math.max(0.001, p.ratioValue);
      const kMin = Math.ceil((windowStartTurn - p.phase) * rVal);
      const kMax = Math.floor((windowStartTurn + windowTurns - p.phase - 1e-5) * rVal);
      const totalEvents = Math.max(1, kMax - kMin + 1);
      const hitTol = Math.min(0.02, 0.35 / Math.max(1, totalEvents));

      for (let k = kMin; k <= kMax; k++) {
        const eventTurn = k / rVal + p.phase;
        const eventFrac = (eventTurn - windowStartTurn) / windowTurns;
        const tickX = leftX + eventFrac * laneWidth;
        const tickDist = Math.abs(eventFrac - phaseProgress);
        const isHit = isAudioActive && (tickDist < hitTol || tickDist > 1.0 - hitTol);

        const onsetGain = evaluateOnsetGain(scene.filter, ctxPartial, eventTurn);
        const isGatedOut = onsetGain < 0.05;

        if (isGatedOut) {
          // Attenuated tick drawn hollow at low alpha
          const tickH = laneHeight * 0.45;
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.strokeStyle = col;
          ctx.lineWidth = 1;
          ctx.strokeRect(tickX - 1, y + (laneHeight - tickH) / 2, 2, tickH);
          ctx.restore();
        } else {
          if (isHit) compositeHits++;

          const shouldFlash = isHit && !isHighFreq;
          const tickH = (laneHeight * 0.48) * (shouldFlash ? 1.35 : 1.0);
          ctx.save();
          ctx.fillStyle = shouldFlash ? '#ffffff' : col;
          ctx.beginPath();
          ctx.roundRect(tickX - (shouldFlash ? 2 : 1), y + (laneHeight - tickH) / 2, shouldFlash ? 4 : 2, tickH, 2);
          ctx.fill();
          ctx.restore();

          if (shouldFlash) {
            this.dynamicLights.push({
              x: tickX,
              y: y + laneHeight / 2,
              velocity: 0.85,
              colorHex: neonCol,
            });
          }
        }
      }
    }

    // Bottom Composite Collision / Ripple Track
    const compositeY = height - 25;
    ctx.strokeStyle = 'rgba(225, 54, 16, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftX, compositeY);
    ctx.lineTo(rightX, compositeY);
    ctx.stroke();

    ctx.fillStyle = '#E13610';
    ctx.font = isCompact ? 'bold 8px JetBrains Mono, monospace' : 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    const compositeLabel = hiddenCount > 0 ? `+${hiddenCount} · COMP` : (isCompact ? 'COMP' : 'COMPOSITE');
    ctx.fillText(truncateTextToFit(measure, compositeLabel, labelMaxW), leftX - 6, compositeY + 3);

    if (compositeHits > 0) {
      const dotRadius = Math.min(10, 4 + compositeHits * 2);
      ctx.fillStyle = compositeHits > 1 ? '#ffffff' : '#E13610';
      ctx.beginPath();
      ctx.arc(playheadX, compositeY, dotRadius, 0, Math.PI * 2);
      ctx.fill();

      this.dynamicLights.push({
        x: playheadX,
        y: compositeY,
        velocity: Math.min(1.0, 0.5 + compositeHits * 0.25),
        colorHex: compositeHits > 1 ? '#ffffff' : '#FF4D4D',
      });
    }

    ctx.restore();
  }
}
