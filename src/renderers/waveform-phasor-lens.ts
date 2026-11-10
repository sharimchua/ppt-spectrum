import { Scene } from '../core/types';
import { evaluatePlacedShape, getShapeAnchors, calculateFilterGain, multiplyRatios } from '../core/shape';
import { ratioToValue } from '../core/rational';
import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS } from '../core/ppt-constants';
import { resolveDuPeriodAddress, dToFreq } from '../core/axis';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';

export class WaveformPhasorLensRenderer implements RegisteredLensRenderer {
  public id = 'waveform-phasor';
  private dynamicLights: PostProcessingLight[] = [];
  private afterglowIntensity: number = 0;
  private afterglowY: number = 0;
  private lastTransportTime: number = 0;
  private lastDistToEnd: number = 999;

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

    // Decay the afterglow smoothly over ~400ms when audio is active
    if (!isAudioActive) {
      this.afterglowIntensity = 0;
    } else if (this.afterglowIntensity > 0) {
      this.afterglowIntensity = Math.max(0, this.afterglowIntensity - dt * 2.5);
    }

    const placement = scene.placements[0];
    if (!placement) return;
    const shape = scene.shapes.find((s) => s.id === placement.shapeId);
    if (!shape) return;

    const partials = evaluatePlacedShape(shape, placement, scene.filter);
    const splitX = width * 0.65;
    const f0 = dToFreq(placement.d, scene.anchors.tplFrequencyHz);

    // Audio-visual phase synchronization:
    // In rhythmic regime (f0 <= 25.8 Hz) when audio is running,
    // rotation turns lock directly to the worklet's master phase.
    // For high audio frequencies (> 25.8 Hz), rotate at 1.5 rev/sec to avoid optical Nyquist aliasing.
    // When audio is stopped, rotation parks cleanly.
    let rotationTurns = 0;
    if (isAudioActive) {
      if (f0 <= 25.8) {
        rotationTurns = audioPhase % 1.0;
      } else {
        rotationTurns = (transportTime * 1.5) % 1.0;
      }
    }

    // 1. Composite Waveform (Left 65% of viewport)
    ctx.save();
    const waveCenterY = height * 0.5;
    const waveAmpScale = height * 0.32;

    // Baseline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(20, waveCenterY);
    ctx.lineTo(splitX - 20, waveCenterY);
    ctx.stroke();

    // Waveform path (sum of sinusoids traveling smoothly over time)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.beginPath();

    const waveWidth = splitX - 40;
    const numCyclesDrawn = 2.0;
    const xEnd = 20 + waveWidth;
    const yTop = waveCenterY - waveAmpScale - 16;
    const yBottom = waveCenterY + waveAmpScale + 16;

    // 1a. Terminus Horizon Boundary Line (Right Edge - Always clearly visible)
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(xEnd, yTop);
    ctx.lineTo(xEnd, yBottom);
    ctx.stroke();

    // Terminus notch brackets
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.beginPath();
    ctx.moveTo(xEnd - 5, yTop);
    ctx.lineTo(xEnd, yTop);
    ctx.moveTo(xEnd - 5, yBottom);
    ctx.lineTo(xEnd, yBottom);
    ctx.stroke();

    // Terminus landmark label
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('TERMINUS ▌', xEnd - 6, yTop + 2);
    ctx.restore();

    for (let x = 0; x <= waveWidth; x += 2) {
      const t = (x / waveWidth) * numCyclesDrawn;
      let ySum = 0;
      let ampNorm = 0;

      for (const p of partials) {
        if (p.filteredAmp <= 0.001) continue;
        // Travel wave continuously with transportTime, aligned to 12 o'clock Apex crest
        const wavePhase = (t - rotationTurns) * p.ratioValue + p.phase;
        ySum += Math.cos(2 * Math.PI * wavePhase) * p.filteredAmp;
        ampNorm += p.filteredAmp;
      }

      const normalizedY = ampNorm > 0 ? (ySum / ampNorm) * waveAmpScale : 0;
      const plotX = 20 + x;
      const plotY = waveCenterY - normalizedY;

      if (x === 0) ctx.moveTo(plotX, plotY);
      else ctx.lineTo(plotX, plotY);
    }
    ctx.stroke();

    // 1b. Mark "Sam" / Cycle Repetition Boundaries on the Waveform (Aligned to 12 o'clock Apex)
    const startCycle = Math.floor(-rotationTurns);
    const endCycle = Math.ceil(numCyclesDrawn - rotationTurns);
    let currentFrameHitWall = false;
    let hitWallY = waveCenterY;

    for (let c = startCycle; c <= endCycle; c++) {
      const tBoundary = c + rotationTurns;
      if (tBoundary >= 0 && tBoundary <= numCyclesDrawn) {
        const bx = 20 + (tBoundary / numCyclesDrawn) * waveWidth;

        // Calculate wave Y at boundary point (12 o'clock Apex crest)
        let samYSum = 0;
        let samNorm = 0;
        for (const p of partials) {
          if (p.filteredAmp <= 0.001) continue;
          const phaseAtSam = (tBoundary - rotationTurns) * p.ratioValue + p.phase;
          samYSum += Math.cos(2 * Math.PI * phaseAtSam) * p.filteredAmp;
          samNorm += p.filteredAmp;
        }
        const samY = waveCenterY - (samNorm > 0 ? (samYSum / samNorm) * waveAmpScale : 0);

        const distToEnd = xEnd - bx;

        // Detect collision strictly when reaching the terminus line (within 4px or crosses it)
        const isTouchingTerminus = isAudioActive && (
          (distToEnd <= 4 && distToEnd >= -7) ||
          (this.lastDistToEnd > 0 && distToEnd <= 0)
        );

        if (isTouchingTerminus) {
          currentFrameHitWall = true;
          hitWallY = samY;
        }
        this.lastDistToEnd = distToEnd;

        const isAtContact = distToEnd >= 0 && distToEnd <= 4;

        // Vertical boundary line
        ctx.save();
        if (isAtContact) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.lineWidth = 2.0;
        } else {
          ctx.strokeStyle = 'rgba(225, 54, 16, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
        }
        ctx.beginPath();
        ctx.moveTo(bx, waveCenterY - waveAmpScale - 14);
        ctx.lineTo(bx, waveCenterY + waveAmpScale + 14);
        ctx.stroke();
        ctx.setLineDash([]);

        // Sam marker label - Aligned with Apex coincidence
        ctx.fillStyle = isAtContact ? '#ffffff' : '#E13610';
        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`SAM / APEX`, bx, waveCenterY - waveAmpScale - 18);

        // Traveling waveform node (clean, solid dot without premature radial burst)
        const nodeRadius = isAtContact ? 5.5 : 4.5;
        ctx.fillStyle = isAtContact ? '#ffffff' : '#FF4D4D';
        ctx.beginPath();
        ctx.arc(bx, samY, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isAtContact ? '#FF4D4D' : '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        this.dynamicLights.push({
          x: bx,
          y: samY,
          velocity: isAtContact ? 1.0 : 0.8,
          colorHex: isAtContact ? '#FFFFFF' : '#FF4D4D',
        });
      }
    }

    if (currentFrameHitWall) {
      this.afterglowIntensity = 1.0;
      this.afterglowY = hitWallY;
    }

    // 1c. Persistent Onset Horizon Afterglow Blooming OUT FROM THE TERMINUS LINE
    if (this.afterglowIntensity > 0.02) {
      const glowY = this.afterglowY || waveCenterY;
      const glowAmt = this.afterglowIntensity;

      ctx.save();
      // Glowing terminus line with smooth decaying afterglow
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * glowAmt})`;
      ctx.lineWidth = 2.0 + glowAmt * 3.0;
      ctx.beginPath();
      ctx.moveTo(xEnd, yTop);
      ctx.lineTo(xEnd, yBottom);
      ctx.stroke();

      // Soft phosphorescent radial afterglow aura blooming OUT FROM THE TERMINUS LINE
      const auraRadius = 14 + glowAmt * 28;
      const auraGrad = ctx.createRadialGradient(xEnd, glowY, 0, xEnd, glowY, auraRadius);
      auraGrad.addColorStop(0, `rgba(255, 255, 255, ${0.75 * glowAmt})`);
      auraGrad.addColorStop(0.35, `rgba(255, 77, 77, ${0.5 * glowAmt})`);
      auraGrad.addColorStop(1, 'rgba(255, 77, 77, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(xEnd, glowY, auraRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Dynamic light for WebGL post-processing optical bloom centered right at terminus
      this.dynamicLights.push({
        x: xEnd,
        y: glowY,
        velocity: glowAmt,
        colorHex: '#FF4D4D',
      });
    }

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.fillText('COMPOSITE WAVEFORM', 20, 30);
    ctx.restore();

    // 2. Rotating Phasors (Right 35% of viewport)
    // Structured hierarchically: one main arm per Voice Anchor radiating from the central origin,
    // with its own nested harmonic overtone series branching from the tip of that anchor's arm.
    ctx.save();
    const phasorCenterX = splitX + (width - splitX) / 2;
    const phasorCenterY = height / 2;
    const maxPhasorR = Math.min((width - splitX) / 2, height / 2) * 0.75;

    // Orbit outer perimeter
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(phasorCenterX, phasorCenterY, maxPhasorR, 0, Math.PI * 2);
    ctx.stroke();

    // 12 o'clock Apex Coincidence Top Marker (Top of orbit)
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
    ctx.fillText('0° / APEX', phasorCenterX, phasorCenterY - maxPhasorR - 12);
    ctx.restore();

    // Central hub
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

    const anchors = getShapeAnchors(shape);

    // Evaluate each voice anchor and its partial components with acoustic filter & gain
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
        const fGain = scene.filter ? calculateFilterGain(pD, scene.filter, placement.d) : 1.0;
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

    // Render each Voice Anchor as a distinct main arm originating from the central origin
    for (const ea of evaluatedAnchors) {
      if (ea.partials.length === 0) continue;

      let cx = phasorCenterX;
      let cy = phasorCenterY;

      // 2a. Main Voice Anchor Arm (Fundamental / First Partial)
      const p0 = ea.partials[0];
      const rMain = p0.filteredAmp * ampScale;
      const currentAngleTurns = (rotationTurns * p0.ratioVal + p0.phase) % 1.0;
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

      // 2b. Secondary Overtone Epicycles Branching Off This Voice Anchor's Tip
      cx = nx;
      cy = ny;

      for (let i = 1; i < ea.partials.length; i++) {
        const pSub = ea.partials[i];
        const rSub = pSub.filteredAmp * ampScale;
        const subTurns = (rotationTurns * pSub.ratioVal + pSub.phase) % 1.0;
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

    ctx.fillStyle = '#E13610';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ROTATING PHASORS', phasorCenterX, 30);
    ctx.restore();
  }
}
