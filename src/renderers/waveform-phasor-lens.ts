import { Scene } from '../core/types';
import { evaluatePlacedShape } from '../core/shape';
import { calculateCoincidenceCycle } from '../core/alignment';
import { dToFreq } from '../core/axis';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';

export class WaveformPhasorLensRenderer implements RegisteredLensRenderer {
  public id = 'waveform-phasor';
  private dynamicLights: PostProcessingLight[] = [];
  private afterglowIntensity: number = 0;
  private afterglowY: number = 0;
  private lastTransportTime: number = 0;
  private lastDistToEnd: number = 999;
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

    const partials = evaluatePlacedShape(shape, placement, scene.filter, placement.d, scene.anchors.tplFrequencyHz);
    const f0 = dToFreq(placement.d, scene.anchors.tplFrequencyHz);
    const coincidence = calculateCoincidenceCycle(shape, f0);

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

    // 1. Composite Waveform (Full width of cell)
    ctx.save();
    const waveCenterY = height * 0.5;
    const waveAmpScale = height * 0.32;
    const waveWidth = width - 40;
    const xEnd = width - 20;

    // Baseline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(20, waveCenterY);
    ctx.lineTo(xEnd, waveCenterY);
    ctx.stroke();

    // Waveform path (sum of sinusoids traveling smoothly over time)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.beginPath();

    const numCyclesDrawn = 2.0;
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

    // 1b. Mark Root Cycle & Super-Cycle "Sam" Repetition Boundaries on the Waveform
    const startCycle = Math.floor(-rotationTurns);
    const endCycle = Math.ceil(numCyclesDrawn - rotationTurns);
    let currentFrameHitWall = false;
    let hitWallY = waveCenterY;
    const superD = coincidence.isAperiodic ? Infinity : coincidence.rootTurnsToAlign;

    for (let c = startCycle; c <= endCycle; c++) {
      const tBoundary = c + rotationTurns;
      if (tBoundary >= 0 && tBoundary <= numCyclesDrawn) {
        const bx = 20 + (tBoundary / numCyclesDrawn) * waveWidth;
        const rootTurnIndex = Math.round(-c);
        const isSuperSam = !coincidence.isAperiodic && ((rootTurnIndex % superD) + superD) % superD === 0;

        // Calculate wave Y at boundary point
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

        if (isTouchingTerminus && isSuperSam) {
          currentFrameHitWall = true;
          hitWallY = samY;
        }
        if (isSuperSam) {
          this.lastDistToEnd = distToEnd;
        }

        const isAtContact = distToEnd >= 0 && distToEnd <= 4;

        // Vertical boundary line (prominent red for Super-Sam coincidence, subtle slate/cyan for intermediate Root turns)
        ctx.save();
        if (isSuperSam) {
          if (isAtContact) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.lineWidth = 2.0;
          } else {
            ctx.strokeStyle = 'rgba(225, 54, 16, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
          }
        } else {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
          ctx.lineWidth = 1.0;
          ctx.setLineDash([2, 4]);
        }
        ctx.beginPath();
        ctx.moveTo(bx, waveCenterY - waveAmpScale - 14);
        ctx.lineTo(bx, waveCenterY + waveAmpScale + 14);
        ctx.stroke();
        ctx.setLineDash([]);

        // Boundary label
        ctx.fillStyle = isSuperSam ? (isAtContact ? '#ffffff' : '#E13610') : 'rgba(148, 163, 184, 0.75)';
        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        const turnWithinSuper = !coincidence.isAperiodic
          ? (((rootTurnIndex % superD) + superD) % superD) + 1
          : Math.abs(rootTurnIndex) + 1;
        const boundaryLabel = isSuperSam
          ? (superD > 1 ? `SAM (1/${superD})` : 'SAM / APEX')
          : (coincidence.isAperiodic ? `ROOT #${turnWithinSuper}` : `ROOT ${turnWithinSuper}/${superD}`);
        ctx.fillText(boundaryLabel, bx, waveCenterY - waveAmpScale - 18);

        // Travelling waveform node
        const nodeRadius = isSuperSam ? (isAtContact ? 5.5 : 4.5) : 3.2;
        ctx.fillStyle = isSuperSam ? (isAtContact ? '#ffffff' : '#FF4D4D') : '#38bdf8';
        ctx.beginPath();
        ctx.arc(bx, samY, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isSuperSam ? (isAtContact ? '#FF4D4D' : '#ffffff') : 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        this.dynamicLights.push({
          x: bx,
          y: samY,
          velocity: isSuperSam ? (isAtContact ? 1.0 : 0.8) : 0.35,
          colorHex: isSuperSam ? (isAtContact ? '#FFFFFF' : '#FF4D4D') : '#38bdf8',
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

    ctx.restore();
  }
}
