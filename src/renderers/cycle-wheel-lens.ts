import { Scene } from '../core/types';
import { evaluatePlacedShape } from '../core/shape';
import { calculateGhostFundamental, calculateCoincidenceCycle } from '../core/alignment';
import { lcm } from '../core/rational';
import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS } from '../core/ppt-constants';
import { resolveDuPeriodAddress, dToFreq } from '../core/axis';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';
import { shouldUseDutyGain } from './filter-render-utils';
import { evaluateOnsetGain, PartialContext } from '../core/filter-eval';
import { evaluateRhythmEnvelopeGain } from '../core/envelope-presets';

export class CycleWheelLensRenderer implements RegisteredLensRenderer {
  public id = 'cycle-wheel';
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

    const isCompact = width < 480;
    const topPad = 26;
    const bottomPad = 10;
    const availH = Math.max(60, height - topPad - bottomPad);
    const centerX = width / 2;
    const centerY = topPad + availH / 2;
    const maxR = Math.min(centerX - 16, availH / 2) * 0.88;

    const primaryPlacement = scene.placements[0];
    if (!primaryPlacement) return;

    const shape = scene.shapes.find((s) => s.id === primaryPlacement.shapeId);
    if (!shape) return;

    const f0 = dToFreq(primaryPlacement.d, scene.anchors.tplFrequencyHz);
    const ghost = calculateGhostFundamental(shape, f0, scene.anchors.tplFrequencyHz);
    const coincidence = calculateCoincidenceCycle(shape, f0);
    const partials = evaluatePlacedShape(shape, primaryPlacement, scene.filter, primaryPlacement.d, scene.anchors.tplFrequencyHz);

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

    const baseD = coincidence.isCompactSuperCycle ? coincidence.rootTurnsToAlign : 1;
    const combinedD = coincidence.isCompactSuperCycle ? lcm(baseD, filterSuperLength) : 1;
    const isCompactSuperCycle = coincidence.isCompactSuperCycle && combinedD <= 12;
    const superD = isCompactSuperCycle ? combinedD : baseD;

    // In compact Super-Cycle mode (D <= 12), 1 full sweep of the playhead spans D Root Turns
    // so fractional ratios (e.g. 4:5:6 over 4 turns, 10:12:15 over 10 turns) display their exact integer polygon complexity.
    const playheadAngleTurns = isCompactSuperCycle
      ? (((unwrappedRootTurns % superD) + superD) % superD) / superD
      : ((unwrappedRootTurns % 1.0) + 1.0) % 1.0;
    const playheadAngleRad = playheadAngleTurns * Math.PI * 2 - Math.PI / 2;

    // 1. Outer cycle boundary (the "Sam" / Super-Cycle perimeter)
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(225, 54, 16, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // If Super-Cycle spans multiple Root Turns (1 < D <= 12), mark each Root Turn sector around the perimeter
    if (isCompactSuperCycle && superD > 1) {
      for (let t = 1; t < superD; t++) {
        const sectorAngle = (t / superD) * Math.PI * 2 - Math.PI / 2;
        const sx1 = centerX + (maxR - 5) * Math.cos(sectorAngle);
        const sy1 = centerY + (maxR - 5) * Math.sin(sectorAngle);
        const sx2 = centerX + (maxR + 5) * Math.cos(sectorAngle);
        const sy2 = centerY + (maxR + 5) * Math.sin(sectorAngle);
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    // 12 o'clock coincidence top marker
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - maxR - 8);
    ctx.lineTo(centerX, centerY - maxR + 8);
    ctx.strokeStyle = '#E13610';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Sweep playhead (shown in compact Super-Cycle mode; in aperiodic mode each ring orbits independently)
    if (isCompactSuperCycle) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + maxR * Math.cos(playheadAngleRad), centerY + maxR * Math.sin(playheadAngleRad));
      ctx.strokeStyle = 'rgba(238, 54, 16, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      const phX = centerX + maxR * Math.cos(playheadAngleRad);
      const phY = centerY + maxR * Math.sin(playheadAngleRad);
      this.dynamicLights.push({
        x: phX,
        y: phY,
        velocity: 0.8,
        colorHex: '#FF4D4D',
      });
    }

    ctx.fillStyle = '#E13610';
    ctx.font = isCompact ? 'bold 8px JetBrains Mono, monospace' : 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    const headerTitle = coincidence.isAperiodic
      ? (isCompact ? 'APERIODIC ORBITS (Inharmonic)' : 'APERIODIC ORBITS (Inharmonic â€¢ Never Aligns)')
      : !isCompactSuperCycle
      ? `CONTINUOUS ORBITS (${coincidence.rootTurnsToAlign} Root Turns)`
      : superD === 1
      ? `CYCLE / SAM (${(ghost.cycleDurationSec * 1000).toFixed(1)} ms â€¢ 1 Turn)`
      : `SUPER-CYCLE (${(coincidence.superCycleDurationSec * 1000).toFixed(1)} ms â€¢ ${superD} Turns)`;
    ctx.fillText(headerTitle, centerX, Math.max(14, centerY - maxR - 12));
    ctx.restore();

    // Filter Supercycle Indicator (when any active condition has supercycle length > 1)
    const condWithSuper = scene.filter.enabled
      ? scene.filter.conditions.find(
          (c) => c.enabled !== false && !!c.supercycle && c.supercycle.length > 1
        )
      : undefined;

    if (condWithSuper?.supercycle) {
      const L = condWithSuper.supercycle.length;
      const curBar = ((Math.floor(unwrappedRootTurns) % L) + L) % L + 1;
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.font = isCompact ? 'bold 7.5px JetBrains Mono, monospace' : 'bold 8.5px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`FILTER SUPERCYCLE ${curBar}/${L}`, centerX, centerY + (isCompact ? 14 : 18));
      ctx.restore();
    }

    // 2. Concentric rings for each partial layer
    const numPartials = partials.length;
    const innerR = maxR * 0.25;
    const ringStep = (maxR - innerR) / Math.max(1, numPartials);

    for (let i = 0; i < numPartials; i++) {
      const p = partials[i];
      if (p.amp <= 0.001) continue;

      const isAttenuated = p.filteredAmp <= 0.001;
      const r = innerR + (i + 0.5) * ringStep;

      // Track ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.strokeStyle = isAttenuated ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      const addr = resolveDuPeriodAddress(p.d);
      const col = SOLFEGE_COLORS[addr.semitoneIndex] || '#38bdf8';
      const neonCol = SOLFEGE_NEON_COLORS[addr.semitoneIndex] || col;

      const ctxPartial: PartialContext = {
        partialD: p.d,
        sceneD: primaryPlacement.d,
        placementD: primaryPlacement.d,
        ratio: p.ratio,
        phase: p.phase,
        anchorRatio: p.anchorRatio,
        tplHz: scene.anchors.tplFrequencyHz,
        ratioToScene: 1.0,
      };
      const isHighFreq = shouldUseDutyGain(p.freqHz);

      if (isCompactSuperCycle) {
        // Exact pulses within the supercycle window [superCycleStartTurn, superCycleStartTurn + superD)
        const superCycleStartTurn = Math.floor(unwrappedRootTurns / superD) * superD;
        const rVal = Math.max(0.001, p.ratioValue);
        const kMin = Math.ceil((superCycleStartTurn - p.phase) * rVal);
        const kMax = Math.floor((superCycleStartTurn + superD - p.phase - 1e-5) * rVal);
        const superPulses = Math.max(1, kMax - kMin + 1);
        const densityScale = superPulses > 24 ? 0.55 : superPulses > 12 ? 0.75 : 1.0;

        for (let k = kMin; k <= kMax; k++) {
          const t_k = k / rVal + p.phase;
          const dotAngleFrac = (t_k - superCycleStartTurn) / superD;
          const angle = dotAngleFrac * Math.PI * 2 - Math.PI / 2;
          const px = centerX + r * Math.cos(angle);
          const py = centerY + r * Math.sin(angle);

          const angularDist = Math.abs((dotAngleFrac - playheadAngleTurns + 1.5) % 1.0 - 0.5);
          const strikeThreshold = Math.min(0.035, 0.35 / Math.max(1, superPulses));
          const isStrike = isAudioActive && angularDist < strikeThreshold;

          const onsetSceneTurns = t_k;
          const onsetGain = evaluateOnsetGain(scene.filter, ctxPartial, onsetSceneTurns);
          const isGatedOut = onsetGain < 0.05;

          ctx.save();
          if (isGatedOut) {
            // Hollow attenuated dot at low alpha for reductive sieve visibility
            const dotRadius = 2.8 * densityScale;
            ctx.globalAlpha = 0.25;
            ctx.strokeStyle = neonCol;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
            ctx.stroke();

            if (k === kMin) {
              ctx.beginPath();
              ctx.moveTo(centerX, centerY);
              ctx.lineTo(px, py);
              ctx.strokeStyle = 'rgba(225, 54, 16, 0.08)';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          } else {
            const envGain = evaluateRhythmEnvelopeGain(scene.envelope, onsetSceneTurns, p.ratioValue);
            const effectiveAmp = p.amp * onsetGain * envGain;
            const shouldFlash = isStrike && !isHighFreq && envGain > 0.05;
            const dotRadius = (2.4 + effectiveAmp * 3.6) * densityScale * (shouldFlash ? 1.65 : 1.0);

            ctx.globalAlpha = 0.22 + 0.78 * envGain;
            ctx.fillStyle = shouldFlash ? '#ffffff' : neonCol;
            ctx.beginPath();
            ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
            ctx.fill();

            if (k === kMin) {
              ctx.beginPath();
              ctx.moveTo(centerX, centerY);
              ctx.lineTo(px, py);
              ctx.strokeStyle = shouldFlash ? 'rgba(255, 255, 255, 0.7)' : 'rgba(225, 54, 16, 0.22)';
              ctx.lineWidth = shouldFlash ? 1.5 : 1;
              ctx.stroke();
            }

            if (shouldFlash || (!isHighFreq && superPulses <= 16)) {
              this.dynamicLights.push({
                x: px,
                y: py,
                velocity: shouldFlash ? 1.0 : effectiveAmp * 0.55,
                colorHex: shouldFlash ? '#ffffff' : neonCol,
              });
            }
          }
          ctx.restore();
        }
      } else {
        // Fallback for Aperiodic / Inharmonic or High-D (> 12) shapes:
        // Each ring orbits an independent runner at its true continuous unwrapped trajectory
        const runnerTurns = ((unwrappedRootTurns * p.ratioValue + p.phase) % 1.0 + 1.0) % 1.0;
        const angle = runnerTurns * Math.PI * 2 - Math.PI / 2;
        const px = centerX + r * Math.cos(angle);
        const py = centerY + r * Math.sin(angle);

        const distToApex = Math.min(runnerTurns, 1.0 - runnerTurns);
        const isStrike = isAudioActive && distToApex < 0.045;

        const onsetGain = evaluateOnsetGain(scene.filter, ctxPartial, unwrappedRootTurns);
        const isGatedOut = onsetGain < 0.05;

        ctx.save();
        if (isGatedOut) {
          ctx.globalAlpha = 0.25;
          ctx.strokeStyle = col;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(px, py);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const envGain = evaluateRhythmEnvelopeGain(scene.envelope, unwrappedRootTurns, p.ratioValue);
          const effectiveAmp = p.amp * onsetGain * envGain;
          const shouldFlash = isStrike && !isHighFreq && envGain > 0.05;
          const dotRadius = (2.8 + effectiveAmp * 3.7) * (shouldFlash ? 1.6 : 1.0);

          ctx.globalAlpha = 0.22 + 0.78 * envGain;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(px, py);
          ctx.strokeStyle = shouldFlash ? '#ffffff' : col;
          ctx.lineWidth = shouldFlash ? 2.0 : 1.2;
          ctx.stroke();

          ctx.fillStyle = shouldFlash ? '#ffffff' : neonCol;
          ctx.beginPath();
          ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
          ctx.fill();

          if (shouldFlash) {
            this.dynamicLights.push({
              x: px,
              y: py,
              velocity: 1.0,
              colorHex: '#ffffff',
            });
          }
        }
        ctx.restore();
      }
    }
  }
}
