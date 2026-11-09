import { Scene } from '../core/types';
import { evaluatePlacedShape } from '../core/shape';
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
    const numCyclesDrawn = 2.5;

    for (let x = 0; x <= waveWidth; x += 2) {
      const t = (x / waveWidth) * numCyclesDrawn;
      let ySum = 0;
      let ampNorm = 0;

      for (const p of partials) {
        if (p.filteredAmp <= 0.001) continue;
        // Travel wave continuously with transportTime * effectiveVisualRate
        const wavePhase = (t - rotationTurns) * p.ratioValue + p.phase;
        ySum += Math.sin(2 * Math.PI * wavePhase) * p.filteredAmp;
        ampNorm += p.filteredAmp;
      }

      const normalizedY = ampNorm > 0 ? (ySum / ampNorm) * waveAmpScale : 0;
      const plotX = 20 + x;
      const plotY = waveCenterY - normalizedY;

      if (x === 0) ctx.moveTo(plotX, plotY);
      else ctx.lineTo(plotX, plotY);
    }
    ctx.stroke();

    // 1b. Mark "Sam" / Cycle Repetition Boundaries on the Waveform
    const startCycle = Math.floor(-rotationTurns);
    const endCycle = Math.ceil(numCyclesDrawn - rotationTurns);
    let currentFrameHitWall = false;
    let hitWallY = waveCenterY;

    for (let c = startCycle; c <= endCycle; c++) {
      const tBoundary = c + rotationTurns;
      if (tBoundary >= 0 && tBoundary <= numCyclesDrawn) {
        const bx = 20 + (tBoundary / numCyclesDrawn) * waveWidth;

        // Calculate wave Y at boundary point
        let samYSum = 0;
        let samNorm = 0;
        for (const p of partials) {
          if (p.filteredAmp <= 0.001) continue;
          const phaseAtSam = (tBoundary - rotationTurns) * p.ratioValue + p.phase;
          samYSum += Math.sin(2 * Math.PI * phaseAtSam) * p.filteredAmp;
          samNorm += p.filteredAmp;
        }
        const samY = waveCenterY - (samNorm > 0 ? (samYSum / samNorm) * waveAmpScale : 0);

        // Detect when the Sam boundary line approaches or strikes the right edge
        const distToEnd = (20 + waveWidth) - bx;
        const isApproachingWall = distToEnd >= 0 && distToEnd <= 25;
        const lineImpactIntensity = isApproachingWall ? Math.max(0, 1 - distToEnd / 25) : 0;

        if (distToEnd >= 0 && distToEnd <= 18 && isAudioActive) {
          currentFrameHitWall = true;
          hitWallY = samY;
        }

        const effectiveFlash = Math.max(lineImpactIntensity, this.afterglowIntensity);

        // Vertical boundary line
        ctx.save();
        if (effectiveFlash > 0.05) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + 0.6 * effectiveFlash})`;
          ctx.lineWidth = 1.5 + effectiveFlash * 1.5;
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

        // Sam marker label
        ctx.fillStyle = effectiveFlash > 0.2 ? '#ffffff' : '#E13610';
        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`SAM / CYCLE`, bx, waveCenterY - waveAmpScale - 18);

        // Waveform node with soft luminous halo (smooth afterglow, no tacky starburst rays)
        const nodeRadius = 4.5 + effectiveFlash * 2.0;
        if (effectiveFlash > 0.05) {
          const haloRadius = nodeRadius * 2.6;
          const haloGrad = ctx.createRadialGradient(bx, samY, 0, bx, samY, haloRadius);
          haloGrad.addColorStop(0, `rgba(255, 255, 255, ${0.8 * effectiveFlash})`);
          haloGrad.addColorStop(0.45, `rgba(255, 77, 77, ${0.45 * effectiveFlash})`);
          haloGrad.addColorStop(1, 'rgba(255, 77, 77, 0)');
          ctx.fillStyle = haloGrad;
          ctx.beginPath();
          ctx.arc(bx, samY, haloRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = effectiveFlash > 0.1 ? '#ffffff' : '#FF4D4D';
        ctx.beginPath();
        ctx.arc(bx, samY, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = effectiveFlash > 0.1 ? '#FF4D4D' : '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        this.dynamicLights.push({
          x: bx,
          y: samY,
          velocity: effectiveFlash > 0.2 ? 1.0 : 0.95,
          colorHex: effectiveFlash > 0.2 ? '#FFFFFF' : '#FF4D4D',
        });
      }
    }

    if (currentFrameHitWall) {
      this.afterglowIntensity = 1.0;
      this.afterglowY = hitWallY;
    }

    // 1c. Persistent Onset Horizon Afterglow at Waveform End Wall
    if (this.afterglowIntensity > 0.02) {
      const xEnd = 20 + waveWidth;
      const glowY = this.afterglowY || waveCenterY;
      const glowAmt = this.afterglowIntensity;

      ctx.save();
      // Luminous end-wall line with smooth decaying afterglow
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * glowAmt})`;
      ctx.lineWidth = 2 + glowAmt * 3;
      ctx.beginPath();
      ctx.moveTo(xEnd, waveCenterY - waveAmpScale - 16);
      ctx.lineTo(xEnd, waveCenterY + waveAmpScale + 16);
      ctx.stroke();

      // Soft phosphorescent radial afterglow aura along the wall
      const auraRadius = 14 + glowAmt * 28;
      const auraGrad = ctx.createRadialGradient(xEnd, glowY, 0, xEnd, glowY, auraRadius);
      auraGrad.addColorStop(0, `rgba(255, 255, 255, ${0.65 * glowAmt})`);
      auraGrad.addColorStop(0.4, `rgba(255, 77, 77, ${0.45 * glowAmt})`);
      auraGrad.addColorStop(1, 'rgba(255, 77, 77, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(xEnd, glowY, auraRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Dynamic light for WebGL post-processing optical bloom
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

    let cx = phasorCenterX;
    let cy = phasorCenterY;

    for (const p of partials) {
      if (p.filteredAmp <= 0.001) continue;

      const r = (p.filteredAmp / Math.max(1, partials[0]?.filteredAmp || 1)) * (maxPhasorR * 0.55);
      const addr = resolveDuPeriodAddress(p.d);
      const col = SOLFEGE_COLORS[addr.semitoneIndex] || '#E13610';
      const neonCol = SOLFEGE_NEON_COLORS[addr.semitoneIndex] || col;

      // Active rotating phasor angle derived from master phase
      const currentAngleTurns = (rotationTurns * p.ratioValue + p.phase) % 1.0;
      const angle = (currentAngleTurns * Math.PI * 2) - Math.PI / 2;
      const nx = cx + r * Math.cos(angle);
      const ny = cy + r * Math.sin(angle);

      // Apex coincidence proximity flash (when reaching 12 o'clock top of orbit)
      const distToApex = Math.min(currentAngleTurns, 1.0 - currentAngleTurns);
      const isFlashing = isAudioActive && distToApex < 0.045;
      const flashFactor = isFlashing ? Math.max(0, 1.0 - distToApex / 0.045) : 0;

      // Circle orbit track
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Subtle 12 o'clock apex tick on this orbit
      ctx.strokeStyle = 'rgba(255, 77, 77, 0.35)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - r - 2);
      ctx.lineTo(cx, cy - r + 3);
      ctx.stroke();

      // Phasor arm vector
      ctx.strokeStyle = isFlashing ? '#ffffff' : col;
      ctx.lineWidth = isFlashing ? 2.2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      // Node dot with flash animation
      const baseNodeRadius = 3.5 + p.filteredAmp * 2.0;
      const nodeRadius = baseNodeRadius * (1.0 + flashFactor * 0.9);

      // Flashing aura/sparkle
      if (isFlashing) {
        ctx.save();
        ctx.strokeStyle = neonCol;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(nx, ny, nodeRadius * 1.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(nx, ny, nodeRadius * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = isFlashing ? '#ffffff' : neonCol;
      ctx.beginPath();
      ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      this.dynamicLights.push({
        x: nx,
        y: ny,
        velocity: p.filteredAmp * (1.0 + flashFactor * 1.5),
        colorHex: isFlashing ? '#ffffff' : neonCol,
      });

      cx = nx;
      cy = ny;
    }

    ctx.fillStyle = '#E13610';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ROTATING PHASORS', phasorCenterX, 30);
    ctx.restore();
  }
}
