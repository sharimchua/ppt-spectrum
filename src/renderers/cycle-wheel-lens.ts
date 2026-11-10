import { Scene } from '../core/types';
import { evaluatePlacedShape } from '../core/shape';
import { calculateGhostFundamental, calculateCoincidenceCycle } from '../core/alignment';
import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS } from '../core/ppt-constants';
import { resolveDuPeriodAddress, dToFreq } from '../core/axis';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';

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

    const centerX = width / 2;
    const centerY = height / 2;
    const maxR = Math.min(centerX, centerY) * 0.84;

    const primaryPlacement = scene.placements[0];
    if (!primaryPlacement) return;

    const shape = scene.shapes.find((s) => s.id === primaryPlacement.shapeId);
    if (!shape) return;

    const f0 = dToFreq(primaryPlacement.d, scene.anchors.tplFrequencyHz);
    const ghost = calculateGhostFundamental(shape, f0, scene.anchors.tplFrequencyHz);
    const coincidence = calculateCoincidenceCycle(shape, f0);
    const partials = evaluatePlacedShape(shape, primaryPlacement, scene.filter, scene.anchors.tplFrequencyHz);

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
    const superD = isCompactSuperCycle ? coincidence.rootTurnsToAlign : 1;

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
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    const headerTitle = coincidence.isAperiodic
      ? 'APERIODIC ORBITS (Inharmonic • Never Aligns)'
      : !isCompactSuperCycle
      ? `CONTINUOUS ORBITS (${coincidence.rootTurnsToAlign} Root Turns)`
      : superD === 1
      ? `CYCLE / SAM (${(ghost.cycleDurationSec * 1000).toFixed(1)} ms • 1 Root Turn)`
      : `SUPER-CYCLE / SAM (${(coincidence.superCycleDurationSec * 1000).toFixed(1)} ms • ${superD} Root Turns)`;
    ctx.fillText(headerTitle, centerX, centerY - maxR - 14);
    ctx.restore();

    // 2. Concentric rings for each partial layer
    const numPartials = partials.length;
    const innerR = maxR * 0.25;
    const ringStep = (maxR - innerR) / Math.max(1, numPartials);

    for (let i = 0; i < numPartials; i++) {
      const p = partials[i];
      if (p.filteredAmp <= 0.001) continue;

      const r = innerR + (i + 0.5) * ringStep;

      // Track ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      const addr = resolveDuPeriodAddress(p.d);
      const col = SOLFEGE_COLORS[addr.semitoneIndex] || '#38bdf8';
      const neonCol = SOLFEGE_NEON_COLORS[addr.semitoneIndex] || col;

      if (isCompactSuperCycle) {
        // Exact integer number of pulses across the D-turn Super-Cycle (e.g. 4:5:6 for Major Triad, 10:12:15 for Minor Triad)
        const superPulses = Math.max(1, Math.round(p.ratioValue * superD));
        const densityScale = superPulses > 24 ? 0.55 : superPulses > 12 ? 0.75 : 1.0;

        for (let dot = 0; dot < superPulses; dot++) {
          const dotAngleFrac = ((dot / superPulses) + (p.phase / superD)) % 1.0;
          const angle = dotAngleFrac * Math.PI * 2 - Math.PI / 2;
          const px = centerX + r * Math.cos(angle);
          const py = centerY + r * Math.sin(angle);

          const angularDist = Math.abs((dotAngleFrac - playheadAngleTurns + 1.5) % 1.0 - 0.5);
          const strikeThreshold = Math.min(0.035, 0.35 / Math.max(1, superPulses));
          const isStrike = isAudioActive && angularDist < strikeThreshold;
          const dotRadius = (2.8 + p.filteredAmp * 3.2) * densityScale * (isStrike ? 1.65 : 1.0);

          ctx.save();
          ctx.fillStyle = isStrike ? '#ffffff' : neonCol;
          ctx.beginPath();
          ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
          ctx.fill();

          if (dot === 0) {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(px, py);
            ctx.strokeStyle = isStrike ? 'rgba(255, 255, 255, 0.7)' : 'rgba(225, 54, 16, 0.22)';
            ctx.lineWidth = isStrike ? 1.5 : 1;
            ctx.stroke();
          }
          ctx.restore();

          if (isStrike || superPulses <= 16) {
            this.dynamicLights.push({
              x: px,
              y: py,
              velocity: isStrike ? 1.0 : p.filteredAmp * 0.55,
              colorHex: isStrike ? '#ffffff' : neonCol,
            });
          }
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
        const dotRadius = (3.5 + p.filteredAmp * 3.0) * (isStrike ? 1.6 : 1.0);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(px, py);
        ctx.strokeStyle = isStrike ? '#ffffff' : col;
        ctx.lineWidth = isStrike ? 2.0 : 1.2;
        ctx.stroke();

        ctx.fillStyle = isStrike ? '#ffffff' : neonCol;
        ctx.beginPath();
        ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        this.dynamicLights.push({
          x: px,
          y: py,
          velocity: isStrike ? 1.0 : p.filteredAmp * 0.8,
          colorHex: isStrike ? '#ffffff' : neonCol,
        });
      }
    }
  }
}
