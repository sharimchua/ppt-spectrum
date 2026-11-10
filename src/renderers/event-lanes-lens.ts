import { Scene } from '../core/types';
import { evaluatePlacedShape, resolveDuMetricOffsetToken } from '../core/shape';
import { calculateCoincidenceCycle } from '../core/alignment';
import { resolveDuPeriodAddress, dToFreq } from '../core/axis';
import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS } from '../core/ppt-constants';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';
import { shouldUseDutyGain } from './filter-render-utils';
import { evaluateOnsetGain, PartialContext } from '../core/filter-eval';

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

    const isCompactSuperCycle = coincidence.isCompactSuperCycle;
    const windowTurns = isCompactSuperCycle ? coincidence.rootTurnsToAlign : 4;
    const windowStartTurn = Math.floor(Math.max(0, unwrappedRootTurns) / windowTurns) * windowTurns;

    const phaseProgress = isCompactSuperCycle
      ? (((unwrappedRootTurns % windowTurns) + windowTurns) % windowTurns) / windowTurns
      : (Math.max(0, unwrappedRootTurns) - windowStartTurn) / windowTurns;

    const isCompact = width < 480;

    // Header label
    ctx.save();
    ctx.fillStyle = '#38bdf8';
    ctx.font = isCompact ? 'bold 8px JetBrains Mono, monospace' : 'bold 9px JetBrains Mono, monospace';
    const headerText = coincidence.isAperiodic
      ? (isCompact ? `EVENT LANES • ${windowTurns}-TURN (APERIODIC)` : `EVENT LANES • ROLLING ${windowTurns}-TURN WINDOW (APERIODIC)`)
      : !isCompactSuperCycle
      ? (isCompact ? `EVENT LANES • ${windowTurns}-TURN (${coincidence.rootTurnsToAlign}x)` : `EVENT LANES • ROLLING ${windowTurns}-TURN WINDOW (${coincidence.rootTurnsToAlign}x SUPER-CYCLE)`)
      : windowTurns === 1
      ? (isCompact ? 'EVENT LANES (1 ROOT TURN)' : 'EVENT LANES & COMPOSITE RIPPLE (1 ROOT TURN)')
      : `EVENT LANES • SUPER-CYCLE (${windowTurns} TURNS)`;
    ctx.fillText(headerText, isCompact ? 12 : 20, 22);

    const topMargin = 36;
    const bottomMargin = 36;
    const availableHeight = height - topMargin - bottomMargin;
    const numLanes = activePartials.length;
    const laneHeight = Math.max(14, availableHeight / Math.max(1, numLanes));

    const leftX = isCompact ? 76 : 110;
    const rightX = width - (isCompact ? 16 : 25);
    const laneWidth = rightX - leftX;

    // Draw Root Turn subdivision lines when window spans multiple Root Turns
    if (windowTurns > 1) {
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

        if (b < windowTurns) {
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
    for (let i = 0; i < numLanes; i++) {
      const p = activePartials[i];
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
      ctx.font = isCompact ? 'bold 8.5px JetBrains Mono, monospace' : 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      const phaseTag = !isCompact && p.phase > 0.001 ? ` @${resolveDuMetricOffsetToken(p.phase).token}` : '';
      const laneText = isCompact
        ? `${addr.syllable} ${p.ratioValue.toFixed(2)}x`
        : `${addr.formatted}${phaseTag} (${p.ratioValue.toFixed(2)}x)`;
      ctx.fillText(laneText, leftX - 6, y + laneHeight / 2 + 3);

      const ctxPartial: PartialContext = {
        partialD: p.d,
        sceneD: placement.d,
        placementD: placement.d,
        ratio: p.ratio,
        phase: p.phase,
        anchorRatio: p.anchorRatio,
        tplHz: scene.anchors.tplFrequencyHz,
        ratioToScene: 1.0,
      };
      const isHighFreq = shouldUseDutyGain(p.freqHz);

      if (isCompactSuperCycle) {
        // Exact integer events across the D-turn Super-Cycle
        const eventsPerSuperCycle = Math.max(1, Math.round(p.ratioValue * windowTurns));
        const hitTol = Math.min(0.02, 0.35 / Math.max(1, eventsPerSuperCycle));

        for (let e = 0; e < eventsPerSuperCycle; e++) {
          const eventFrac = ((e / eventsPerSuperCycle) + (p.phase / windowTurns)) % 1.0;
          const tickX = leftX + eventFrac * laneWidth;
          const tickDist = Math.abs(eventFrac - phaseProgress);
          const isHit = isAudioActive && (tickDist < hitTol || tickDist > 1.0 - hitTol);

          const onsetSceneTurns = windowStartTurn + eventFrac * windowTurns;
          const onsetGain = isHighFreq
            ? (p.amp > 0.001 ? p.filteredAmp / p.amp : 0)
            : evaluateOnsetGain(scene.filter, ctxPartial, onsetSceneTurns);

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

            const tickH = (laneHeight * 0.45) * (isHit ? 1.4 : 1.0);
            ctx.fillStyle = isHit ? '#ffffff' : col;
            ctx.beginPath();
            ctx.roundRect(tickX - (isHit ? 2 : 1), y + (laneHeight - tickH) / 2, isHit ? 4 : 2, tickH, 2);
            ctx.fill();

            if (isHit) {
              this.dynamicLights.push({
                x: tickX,
                y: y + laneHeight / 2,
                velocity: 1.0,
                colorHex: neonCol,
              });
            }
          }
        }
      } else {
        // Rolling window for Aperiodic / Inharmonic or High-D (> 12) shapes:
        // Plot exact physical event timestamps t_k = (k + p.phase) / p.ratioValue within [windowStartTurn, windowStartTurn + windowTurns]
        const rVal = Math.max(0.01, p.ratioValue);
        const kMin = Math.floor(windowStartTurn * rVal - p.phase);
        const kMax = Math.ceil((windowStartTurn + windowTurns) * rVal - p.phase);

        for (let k = kMin; k <= kMax; k++) {
          const eventTurn = (k + p.phase) / rVal;
          if (eventTurn < windowStartTurn - 0.0001 || eventTurn > windowStartTurn + windowTurns + 0.0001) continue;

          const eventFrac = (eventTurn - windowStartTurn) / windowTurns;
          const tickX = leftX + eventFrac * laneWidth;
          const tickDist = Math.abs(eventFrac - phaseProgress);
          const isHit = isAudioActive && tickDist < 0.018;

          const onsetGain = isHighFreq
            ? (p.amp > 0.001 ? p.filteredAmp / p.amp : 0)
            : evaluateOnsetGain(scene.filter, ctxPartial, eventTurn);

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

            const tickH = (laneHeight * 0.45) * (isHit ? 1.4 : 1.0);
            ctx.fillStyle = isHit ? '#ffffff' : col;
            ctx.beginPath();
            ctx.roundRect(tickX - (isHit ? 2 : 1), y + (laneHeight - tickH) / 2, isHit ? 4 : 2, tickH, 2);
            ctx.fill();

            if (isHit) {
              this.dynamicLights.push({
                x: tickX,
                y: y + laneHeight / 2,
                velocity: 1.0,
                colorHex: neonCol,
              });
            }
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
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('COMPOSITE', leftX - 10, compositeY + 3);

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
