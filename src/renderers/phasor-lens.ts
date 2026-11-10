import { Scene } from '../core/types';
import { getShapeAnchors, multiplyRatios } from '../core/shape';
import { evaluateDutyGain } from '../core/filter-eval';
import { calculateCoincidenceCycle } from '../core/alignment';
import { ratioToValue } from '../core/rational';
import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS } from '../core/ppt-constants';
import { resolveDuPeriodAddress, dToFreq } from '../core/axis';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';

interface PhasorPartialEval {
  id: string;
  label?: string;
  ratioVal: number;
  phase: number;
  filteredAmp: number;
  d: number;
}

interface PhasorAnchorEval {
  id: string;
  name: string;
  voice?: string;
  offsetToken?: string;
  ratioVal: number;
  phaseOffset: number;
  d: number;
  partials: PhasorPartialEval[];
}

/**
 * Pure 2D canvas lens visualiser rendering hierarchical rotating epicyclic phasor arms.
 * Anchored to Voice Anchors radiating from the central origin, with nested harmonic overtones
 * branching from each anchor's tip.
 */
export class PhasorLensRenderer implements RegisteredLensRenderer {
  public id = 'phasor';
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

    const isCompact = width < 480;
    const isShort = height < 280;
    const f0 = dToFreq(placement.d, scene.anchors.tplFrequencyHz);
    const coincidence = calculateCoincidenceCycle(shape, f0);

    // Unwrapped continuous audio-visual phase synchronisation:
    // Keep rotationTurns unwrapped in [0, ∞) so non-integer and inharmonic ratios
    // continue smoothly along their circular orbits without jumping when the root (1/1) passes 1.0.
    let rotationTurns = 0;
    if (isAudioActive) {
      if (f0 <= 25.8) {
        rotationTurns = audioPhase;
        this.visualPitchTurns = audioPhase;
      } else {
        this.visualPitchTurns += dt * 1.2;
        rotationTurns = this.visualPitchTurns;
      }
    } else {
      this.visualPitchTurns = 0;
    }

    ctx.save();
    const phasorCenterX = width / 2;
    const phasorCenterY = height * (isShort ? 0.54 : 0.52);
    const maxPhasorR = Math.min(width / 2 - 24, (height - (isShort ? 36 : 48)) / 2) * 0.84;

    if (maxPhasorR <= 5) {
      ctx.restore();
      return;
    }

    // 1. Orbit outer perimeter circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(phasorCenterX, phasorCenterY, maxPhasorR, 0, Math.PI * 2);
    ctx.stroke();

    // 2. 12 o'clock Apex Coincidence Top Marker (Top of orbit)
    ctx.save();
    ctx.strokeStyle = '#E13610';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(phasorCenterX, phasorCenterY - maxPhasorR - 8);
    ctx.lineTo(phasorCenterX, phasorCenterY - maxPhasorR + 6);
    ctx.stroke();

    // Prominent Apex indicator notch/triangle
    ctx.fillStyle = '#E13610';
    ctx.beginPath();
    ctx.moveTo(phasorCenterX, phasorCenterY - maxPhasorR);
    ctx.lineTo(phasorCenterX - 5, phasorCenterY - maxPhasorR - 8);
    ctx.lineTo(phasorCenterX + 5, phasorCenterY - maxPhasorR - 8);
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('0° / APEX (SAM)', phasorCenterX, phasorCenterY - maxPhasorR - 12);
    ctx.restore();

    // 3. Central origin hub
    ctx.save();
    ctx.fillStyle = 'rgba(12, 16, 26, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(phasorCenterX, phasorCenterY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(phasorCenterX, phasorCenterY, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Evaluate each voice anchor and its partial components with acoustic filter & gain
    const anchors = getShapeAnchors(shape);
    const evaluatedAnchors: PhasorAnchorEval[] = [];
    let maxCumulativeReach = 0.001;

    for (const anchor of anchors) {
      const anchorRatioVal = ratioToValue(anchor.ratio);
      const anchorPhase = anchor.phaseOffset || 0;
      const anchorGain = anchor.mute ? 0 : anchor.gain;
      const anchorD = placement.d - Math.log2(Math.max(0.001, anchorRatioVal));

      const partialEvals: PhasorPartialEval[] = [];
      let anchorSumAmp = 0;

      for (const p of anchor.partials) {
        const combRatio = multiplyRatios(anchor.ratio, p.ratio);
        const combRatioVal = ratioToValue(combRatio);
        const combPhase = (((anchorPhase + (p.phase || 0)) % 1 + 1) % 1);
        const pD = placement.d - Math.log2(Math.max(0.001, combRatioVal));
        const fGain = scene.filter
          ? evaluateDutyGain(scene.filter, {
              partialD: pD,
              sceneD: scene.placements[0]?.d ?? placement.d,
              anchorRatio: anchor.ratio,
              placementD: placement.d,
              tplHz: scene.anchors.tplFrequencyHz,
            })
          : 1.0;
        const filteredAmp = p.amp * anchorGain * placement.gain * fGain;

        if (filteredAmp > 0.001) {
          partialEvals.push({
            id: `${anchor.id}_${p.id}`,
            label: p.label,
            ratioVal: combRatioVal,
            phase: combPhase,
            filteredAmp,
            d: pD,
          });
          anchorSumAmp += filteredAmp;
        }
      }

      if (partialEvals.length > 0) {
        evaluatedAnchors.push({
          id: anchor.id,
          name: anchor.name,
          voice: anchor.voice,
          offsetToken: anchor.offsetToken,
          ratioVal: anchorRatioVal,
          phaseOffset: anchorPhase,
          d: anchorD,
          partials: partialEvals,
        });
        if (anchorSumAmp > maxCumulativeReach) {
          maxCumulativeReach = anchorSumAmp;
        }
      }
    }

    const ampScale = (maxPhasorR * 0.88) / maxCumulativeReach;

    // 5. Render each Voice Anchor as a distinct main vector arm originating from the central origin
    for (const ea of evaluatedAnchors) {
      if (ea.partials.length === 0) continue;

      let cx = phasorCenterX;
      let cy = phasorCenterY;

      // 5a. Main Voice Anchor Arm (Fundamental / First Partial)
      const p0 = ea.partials[0];
      const rMain = p0.filteredAmp * ampScale;
      const currentAngleTurns = ((rotationTurns * p0.ratioVal + p0.phase) % 1.0 + 1.0) % 1.0;
      const angle = (currentAngleTurns * Math.PI * 2) - Math.PI / 2;
      const nx = cx + rMain * Math.cos(angle);
      const ny = cy + rMain * Math.sin(angle);

      // Apex coincidence proximity flash (when reaching 12 o'clock top of orbit)
      const distToApex = Math.min(currentAngleTurns, 1.0 - currentAngleTurns);
      const isFlashing = isAudioActive && distToApex < 0.045;
      const flashFactor = isFlashing ? Math.max(0, 1.0 - distToApex / 0.045) : 0;

      const addr = resolveDuPeriodAddress(p0.d);
      const col = SOLFEGE_COLORS[addr.semitoneIndex] || '#E13610';
      const neonCol = SOLFEGE_NEON_COLORS[addr.semitoneIndex] || col;

      // Orbit circle track for this Voice Anchor's fundamental
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, rMain, 0, Math.PI * 2);
      ctx.stroke();

      // Main Voice Anchor vector arm
      ctx.strokeStyle = isFlashing ? '#ffffff' : col;
      ctx.lineWidth = isFlashing ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      // Bright inner core filament on the main arm
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.0;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Fundamental tip node with pulse/flash
      const baseNodeRadius = 4.2 + (p0.filteredAmp / maxCumulativeReach) * 2.2;
      const nodeRadius = baseNodeRadius * (1.0 + flashFactor * 0.9);

      if (isFlashing) {
        ctx.strokeStyle = neonCol;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(nx, ny, nodeRadius * 1.6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(nx, ny, nodeRadius * 1.9, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = isFlashing ? '#ffffff' : neonCol;
      ctx.beginPath();
      ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Solfège / Voice badge label near the node
      const offsetTag = ea.offsetToken && ea.offsetToken !== 'Do' ? ` @${ea.offsetToken}` : '';
      const displayLabel = ea.partials.length > 1
        ? `${addr.syllable}${offsetTag}`
        : (p0.label || `${addr.syllable}${offsetTag}`);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8.5px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      const labelDist = nodeRadius + 9;
      const lx = nx + labelDist * Math.cos(angle);
      const ly = ny + labelDist * Math.sin(angle);
      ctx.fillText(displayLabel, lx, ly);
      ctx.restore();

      this.dynamicLights.push({
        x: nx,
        y: ny,
        velocity: p0.filteredAmp * (1.0 + flashFactor * 1.5),
        colorHex: isFlashing ? '#ffffff' : neonCol,
      });

      // 5b. Secondary Overtone Epicycles Branching Off This Voice Anchor's Tip
      cx = nx;
      cy = ny;

      for (let i = 1; i < ea.partials.length; i++) {
        const pSub = ea.partials[i];
        const rSub = pSub.filteredAmp * ampScale;
        const subTurns = ((rotationTurns * pSub.ratioVal + pSub.phase) % 1.0 + 1.0) % 1.0;
        const subAngle = (subTurns * Math.PI * 2) - Math.PI / 2;
        const nxSub = cx + rSub * Math.cos(subAngle);
        const nySub = cy + rSub * Math.sin(subAngle);

        const subAddr = resolveDuPeriodAddress(pSub.d);
        const subCol = SOLFEGE_COLORS[subAddr.semitoneIndex] || '#38bdf8';
        const subNeonCol = SOLFEGE_NEON_COLORS[subAddr.semitoneIndex] || subCol;

        const subDistToApex = Math.min(subTurns, 1.0 - subTurns);
        const isSubFlashing = isAudioActive && subDistToApex < 0.04;

        ctx.save();
        // Overtone orbit circle around the parent node
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(cx, cy, rSub, 0, Math.PI * 2);
        ctx.stroke();

        // Overtone phasor vector
        ctx.strokeStyle = subCol;
        ctx.lineWidth = isSubFlashing ? 1.8 : 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nxSub, nySub);
        ctx.stroke();

        // Overtone tip node
        const subRadius = 2.8 + (pSub.filteredAmp / maxCumulativeReach) * 1.5;
        ctx.fillStyle = isSubFlashing ? '#ffffff' : subNeonCol;
        ctx.beginPath();
        ctx.arc(nxSub, nySub, subRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();

        this.dynamicLights.push({
          x: nxSub,
          y: nySub,
          velocity: pSub.filteredAmp,
          colorHex: isSubFlashing ? '#ffffff' : subNeonCol,
        });

        cx = nxSub;
        cy = nySub;
      }
    }

    // 6. Header Title & Super-Cycle Status Subtitle
    ctx.fillStyle = '#E13610';
    ctx.font = isCompact ? 'bold 8.5px JetBrains Mono, monospace' : 'bold 9.5px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isCompact ? 'ROTATING PHASORS' : 'ROTATING PHASORS (EPICYCLIC HARMONICS)', phasorCenterX, 20);

    ctx.fillStyle = coincidence.isAperiodic ? '#f59e0b' : '#94a3b8';
    ctx.font = isCompact ? '7.5px JetBrains Mono, monospace' : '8px JetBrains Mono, monospace';
    const currentTurnInSuper = !coincidence.isAperiodic
      ? (Math.floor(Math.max(0, rotationTurns)) % coincidence.rootTurnsToAlign) + 1
      : Math.floor(Math.max(0, rotationTurns)) + 1;
    const phasorSubLabel = coincidence.isAperiodic
      ? (isCompact ? 'APERIODIC' : 'APERIODIC • CONTINUOUS TRAJECTORY')
      : coincidence.rootTurnsToAlign === 1
      ? (isCompact ? '1x TURN' : 'ALIGN: EVERY ROOT TURN')
      : isAudioActive
      ? (isCompact ? `TURN ${currentTurnInSuper}/${coincidence.rootTurnsToAlign}` : `SUPER-CYCLE: TURN ${currentTurnInSuper}/${coincidence.rootTurnsToAlign}`)
      : (isCompact ? `${coincidence.rootTurnsToAlign}x TURNS` : `ALIGN: EVERY ${coincidence.rootTurnsToAlign} ROOT TURNS`);
    ctx.fillText(phasorSubLabel, phasorCenterX, 31);

    ctx.restore();
  }
}
