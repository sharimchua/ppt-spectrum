import { Scene } from '../core/types';
import { dToFreq } from '../core/axis';
import {
  calculateRealignmentAnalysis,
  RealignmentAnalysis,
} from '../core/alignment';
import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS } from '../core/ppt-constants';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';

export class AlignmentMeterLensRenderer implements RegisteredLensRenderer {
  public id = 'alignment-meter';
  private dynamicLights: PostProcessingLight[] = [];
  private visualPitchTurns: number = 0;
  private lastTransportTime: number = 0;

  public getDynamicLights(): PostProcessingLight[] {
    return this.dynamicLights;
  }

  private evaluateCoincidence(analysis: RealignmentAnalysis, tau: number, useBase: boolean = false): number {
    let cosSum = 0;
    let pulseSum = 0;
    let tAmp = 0;
    const sigma = 0.038;
    const twoSigmaSq = 2 * sigma * sigma;

    for (const tr of analysis.tracks) {
      for (const pr of tr.partials) {
        const cp = pr.ratioValue * tau + pr.phase;
        const amp = useBase || !analysis.hasActiveFilter
          ? pr.amp
          : (pr.filteredAmp ?? pr.amp);
        cosSum += amp * Math.cos(2 * Math.PI * cp);
        const sv = Math.sin(Math.PI * cp);
        pulseSum += amp * Math.exp(-(sv * sv) / twoSigmaSq);
        tAmp += pr.amp;
      }
    }
    if (tAmp <= 0) return 0;
    return Math.max(0, Math.min(1.0, 0.45 * (Math.abs(cosSum) / tAmp) + 0.55 * (pulseSum / tAmp)));
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scene: Scene,
    transportTime: number = 0,
    audioPhase: number = 0,
    isAudioActive: boolean = false
  ): void {
    this.dynamicLights = [];

    const placement = scene.placements[0];
    if (!placement) return;
    const shape = scene.shapes.find((s) => s.id === placement.shapeId);
    if (!shape) return;

    const f0 = dToFreq(placement.d, scene.anchors.tplFrequencyHz);
    const isPitchSpace = f0 >= 20;

    // Synchronise unwrapped root turns with Event Lanes and Cycle Wheel
    const dt = this.lastTransportTime > 0 ? Math.min(0.1, Math.max(0, transportTime - this.lastTransportTime)) : 0.016;
    this.lastTransportTime = transportTime;

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

    // Run Unified Realignment & Coincidence Analysis across all active voice anchors and partials
    const analysis: RealignmentAnalysis = calculateRealignmentAnalysis(
      shape,
      placement,
      scene.filter,
      undefined,
      Math.min(320, Math.max(128, Math.floor(width / 2)))
    );
    const windowCycles = analysis.windowCycles;

    ctx.save();

    const isCompact = width < 480;
    const isShort = height < 300;

    // 1. Metric Cards
    const padX = isCompact ? 12 : 20;
    const gapX = isCompact ? 6 : 10;
    const boxY = isShort ? 8 : 12;
    const boxH = isShort ? 36 : 44;
    const boxW = (width - padX * 2 - gapX * 2) / 3;

    // Metric 1: Realignment Coherence Score
    const coherencePercent = Math.round(analysis.coherenceScore * 100);
    const baseCoherencePercent = analysis.baseCoherenceScore !== undefined ? Math.round(analysis.baseCoherenceScore * 100) : undefined;
    const coherenceColor =
      analysis.coherenceScore >= 0.7
        ? '#34d399'
        : analysis.coherenceScore >= 0.4
        ? '#f59e0b'
        : '#fb7185';
    const coherenceStatus =
      analysis.coherenceScore >= 0.7
        ? 'HARMONIC CADENCE'
        : analysis.coherenceScore >= 0.4
        ? 'COMPOUND STRIDE'
        : 'INHARMONIC DISPERSED';

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(padX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = isCompact ? '7px JetBrains Mono, monospace' : '7.5px JetBrains Mono, monospace';
    const coherenceLabel = analysis.hasActiveFilter && baseCoherencePercent !== undefined
      ? (isCompact ? `COHERENCE (BASE ${baseCoherencePercent}%)` : `REALIGNMENT COHERENCE • BASE ${baseCoherencePercent}%`)
      : (isCompact ? 'COHERENCE' : 'REALIGNMENT COHERENCE');
    ctx.fillText(coherenceLabel, padX + 6, boxY + 12);

    ctx.fillStyle = coherenceColor;
    ctx.font = isCompact ? 'bold 11px JetBrains Mono, monospace' : 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(`${coherencePercent}%`, padX + 6, boxY + (isShort ? 26 : 30));

    if (analysis.hasActiveFilter && baseCoherencePercent !== undefined && !isCompact && boxW > 110) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.fillText(`(Base: ${baseCoherencePercent}%)`, padX + 44, boxY + (isShort ? 26 : 30));
    }

    // Mini coherence status bar
    const barW = Math.max(20, boxW - 12);
    const barY = boxY + boxH - (isShort ? 6 : 8);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(padX + 6, barY, barW, 2.5);
    ctx.fillStyle = coherenceColor;
    ctx.fillRect(padX + 6, barY, barW * (analysis.coherenceScore), 2.5);

    // Metric 2: Cadence Stride
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(padX + boxW + gapX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = isCompact ? '7px JetBrains Mono, monospace' : '7.5px JetBrains Mono, monospace';
    ctx.fillText(isCompact ? 'STRIDE' : 'CADENCE STRIDE', padX + boxW + gapX + 6, boxY + 12);

    ctx.fillStyle = '#c084fc';
    ctx.font = isCompact ? 'bold 10px JetBrains Mono, monospace' : 'bold 12px JetBrains Mono, monospace';
    const strideText = analysis.isAperiodic
      ? '∞ Aperiodic'
      : analysis.coincidenceStride === 1
      ? '1 Root Turn'
      : `${analysis.coincidenceStride} Root Turns`;
    ctx.fillText(strideText, padX + boxW + gapX + 6, boxY + (isShort ? 26 : 30));

    // Metric 3: Active Architecture
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(padX + (boxW + gapX) * 2, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = isCompact ? '7px JetBrains Mono, monospace' : '7.5px JetBrains Mono, monospace';
    ctx.fillText(isCompact ? 'SPECTRUM' : 'ACTIVE ARCHITECTURE', padX + (boxW + gapX) * 2 + 6, boxY + 12);

    ctx.fillStyle = '#38bdf8';
    ctx.font = isCompact ? 'bold 10px JetBrains Mono, monospace' : 'bold 11px JetBrains Mono, monospace';
    const archText = analysis.hasActiveFilter
      ? `${analysis.activeVoicesCount}V • ${analysis.activePartialsCount}P (Filt)`
      : `${analysis.activeVoicesCount}V • ${analysis.activePartialsCount}P`;
    ctx.fillText(archText, padX + (boxW + gapX) * 2 + 6, boxY + (isShort ? 26 : 30));

    // Layout partitioning: Tracks area vs Convergence wave
    const mainTop = boxY + boxH + (isShort ? 8 : 12);
    const mainBottom = height - (isShort ? 16 : 22);
    const mainH = Math.max(60, mainBottom - mainTop);

    const plotLeft = isCompact ? 72 : 115;
    const plotRight = width - (isCompact ? 12 : 20);
    const plotW = Math.max(40, plotRight - plotLeft);

    const trackCount = Math.min(5, analysis.tracks.length);
    const trackAreaH = trackCount > 0 ? Math.min(mainH * 0.42, trackCount * (isShort ? 14 : 18)) : 0;
    const waveTop = mainTop + trackAreaH + (trackCount > 0 ? (isShort ? 6 : 10) : 0);
    const waveBottom = mainBottom - (isShort ? 12 : 16);
    const waveH = Math.max(30, waveBottom - waveTop);

    // Aperiodic dual-window geometry
    const isAperiodic = analysis.isAperiodic;
    const pickupW = isAperiodic ? Math.max(30, Math.min(48, Math.floor(plotW * 0.11))) : 0;
    const ongoingLeft = isAperiodic ? plotLeft + pickupW + 10 : plotLeft;
    const ongoingW = isAperiodic ? Math.max(30, plotRight - ongoingLeft) : plotW;
    const ongoingSpan = 3.0;
    const ongoingStartTurn = Math.floor(Math.max(0, unwrappedRootTurns) / ongoingSpan) * ongoingSpan;
    const ongoingProgress = (Math.max(0, unwrappedRootTurns) - ongoingStartTurn) / ongoingSpan;

    // 2. Cascade of Voice Tracks (Individual Pulse Crossings)
    if (trackCount > 0) {
      const trackRowH = trackAreaH / trackCount;

      for (let t = 0; t < trackCount; t++) {
        const track = analysis.tracks[t];
        const rowCenterY = mainTop + t * trackRowH + trackRowH * 0.5;
        const color = SOLFEGE_NEON_COLORS[track.semitoneIndex] || '#38bdf8';
        const baseColor = SOLFEGE_COLORS[track.semitoneIndex] || color;

        // Voice track label pill
        ctx.fillStyle = baseColor;
        ctx.font = isCompact ? 'bold 7.5px JetBrains Mono, monospace' : 'bold 8px JetBrains Mono, monospace';
        const labelText = track.name.length > (isCompact ? 10 : 16)
          ? `${track.name.slice(0, isCompact ? 9 : 15)}â€¦`
          : track.name;
        ctx.fillText(labelText, padX, rowCenterY + 3);

        if (isAperiodic) {
          // Aperiodic: Pickup wire + Ongoing wire
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(plotLeft, rowCenterY);
          ctx.lineTo(plotLeft + pickupW, rowCenterY);
          ctx.moveTo(ongoingLeft, rowCenterY);
          ctx.lineTo(plotRight, rowCenterY);
          ctx.stroke();

          // Hits in pickup bar (tau in [0, 0.35])
          for (const p of track.partials) {
            for (let hIdx = 0; hIdx < p.hits.length; hIdx++) {
              const hitTau = p.hits[hIdx];
              if (hitTau >= 0 && hitTau <= 0.35) {
                const hx = plotLeft + (hitTau / 0.35) * pickupW;
                const hitGain = p.hitGains ? (p.hitGains[hIdx] ?? 1.0) : 1.0;
                const isMuted = hitGain < 0.05;

                if (isMuted) {
                  ctx.save();
                  ctx.globalAlpha = 0.25;
                  ctx.strokeStyle = color;
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.moveTo(hx, rowCenterY - 3);
                  ctx.lineTo(hx, rowCenterY + 3);
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.arc(hx, rowCenterY, 1.4, 0, Math.PI * 2);
                  ctx.stroke();
                  ctx.restore();
                } else {
                  ctx.strokeStyle = color;
                  ctx.lineWidth = 1.2;
                  ctx.beginPath();
                  ctx.moveTo(hx, rowCenterY - 4);
                  ctx.lineTo(hx, rowCenterY + 4);
                  ctx.stroke();

                  ctx.fillStyle = '#ffffff';
                  ctx.beginPath();
                  ctx.arc(hx, rowCenterY, 1.5, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            }

            // Hits in ongoing window (tau in [ongoingStartTurn, ongoingStartTurn + ongoingSpan])
            const minK = Math.ceil(p.ratioValue * ongoingStartTurn + p.phase);
            const maxK = Math.floor(p.ratioValue * (ongoingStartTurn + ongoingSpan) + p.phase);
            const isPartialMuted = p.filteredAmp !== undefined && p.filteredAmp <= 0.001;

            for (let k = minK; k <= maxK; k++) {
              const hitTau = (k - p.phase) / p.ratioValue;
              const hx = ongoingLeft + ((hitTau - ongoingStartTurn) / ongoingSpan) * ongoingW;

              if (isPartialMuted) {
                ctx.save();
                ctx.globalAlpha = 0.25;
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(hx, rowCenterY - 3);
                ctx.lineTo(hx, rowCenterY + 3);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(hx, rowCenterY, 1.4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
              } else {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(hx, rowCenterY - 4);
                ctx.lineTo(hx, rowCenterY + 4);
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(hx, rowCenterY, 1.5, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        } else {
          // Periodic: Single timeline wire across supercycle window
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(plotLeft, rowCenterY);
          ctx.lineTo(plotRight, rowCenterY);
          ctx.stroke();

          for (const p of track.partials) {
            for (let hIdx = 0; hIdx < p.hits.length; hIdx++) {
              const hitTau = p.hits[hIdx];
              if (hitTau < 0 || hitTau > windowCycles) continue;
              const hx = plotLeft + (hitTau / windowCycles) * plotW;
              const hitGain = p.hitGains ? (p.hitGains[hIdx] ?? 1.0) : 1.0;
              const isMuted = hitGain < 0.05;

              if (isMuted) {
                ctx.save();
                ctx.globalAlpha = 0.25;
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(hx, rowCenterY - 3);
                ctx.lineTo(hx, rowCenterY + 3);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(hx, rowCenterY, 1.4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
              } else {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(hx, rowCenterY - 4);
                ctx.lineTo(hx, rowCenterY + 4);
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(hx, rowCenterY, 1.5, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
      }
    }

    // 3. Composite Realignment Convergence Wave
    if (analysis.isAperiodic) {
      // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // APERIODIC / INHARMONIC DUAL WINDOW:
      // Left: Compact Initial Onset / Pickup Bar (showing pristine strike at tau = 0)
      // Right: Ongoing Inharmonic Horizon (block-advancing wave showing non-realignment)
      // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plotLeft, waveBottom);
      ctx.lineTo(plotLeft + pickupW, waveBottom);
      ctx.stroke();

      // Double barline / boundary
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(plotLeft + pickupW + 3, mainTop);
      ctx.lineTo(plotLeft + pickupW + 3, waveBottom);
      ctx.moveTo(plotLeft + pickupW + 6, mainTop);
      ctx.lineTo(plotLeft + pickupW + 6, waveBottom);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 7px JetBrains Mono, monospace';
      ctx.fillText('ONSET ð„€ð„€', plotLeft + pickupW - (isCompact ? 28 : 36), waveTop + 8);
      ctx.fillText('Ï„=0 (Strike)', plotLeft, waveBottom + 10);

      // Render pickup curve from tau = 0 to tau = 0.35
      const pickupSamples = 24;
      ctx.beginPath();
      ctx.moveTo(plotLeft, waveBottom);
      for (let i = 0; i <= pickupSamples; i++) {
        const tau = (i / pickupSamples) * 0.35;
        const x = plotLeft + (i / pickupSamples) * pickupW;
        const val = this.evaluateCoincidence(analysis, tau);
        const y = waveBottom - val * waveH;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(plotLeft + pickupW, waveBottom);
      ctx.closePath();

      const pickupGrad = ctx.createLinearGradient(0, waveTop, 0, waveBottom);
      pickupGrad.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
      pickupGrad.addColorStop(1, 'rgba(15, 23, 42, 0.02)');
      ctx.fillStyle = pickupGrad;
      ctx.fill();

      // Stroke pickup curve
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i <= pickupSamples; i++) {
        const tau = (i / pickupSamples) * 0.35;
        const x = plotLeft + (i / pickupSamples) * pickupW;
        const val = this.evaluateCoincidence(analysis, tau);
        const y = waveBottom - val * waveH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Strike indicator diamond at tau = 0
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(plotLeft, waveBottom - waveH - 4);
      ctx.lineTo(plotLeft + 3.5, waveBottom - waveH);
      ctx.lineTo(plotLeft, waveBottom - waveH + 4);
      ctx.lineTo(plotLeft - 3.5, waveBottom - waveH);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 7px JetBrains Mono, monospace';
      ctx.fillText(isCompact ? '100%' : '100% STRIKE', plotLeft + 5, waveBottom - waveH + 3);

      // Section B: Ongoing Inharmonic Horizon (Block-advancing Window)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ongoingLeft, waveBottom);
      ctx.lineTo(plotRight, waveBottom);
      ctx.stroke();

      // Dashed 100% Realignment Threshold Line (Unreached)
      ctx.save();
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.35)';
      ctx.beginPath();
      ctx.moveTo(ongoingLeft, waveTop);
      ctx.lineTo(plotRight, waveTop);
      ctx.stroke();
      ctx.fillStyle = '#f87171';
      ctx.font = '7px JetBrains Mono, monospace';
      ctx.fillText(
        isCompact ? '100% UNREACHED' : '100% REALIGNMENT THRESHOLD (UNREACHED IN APERIODIC SPACE)',
        ongoingLeft + 6,
        waveTop + 8
      );
      ctx.restore();

      // Sample and draw the ongoing window
      const ongoingSamples = Math.min(180, Math.floor(ongoingW / 2));
      ctx.beginPath();
      ctx.moveTo(ongoingLeft, waveBottom);

      for (let i = 0; i <= ongoingSamples; i++) {
        const tau = ongoingStartTurn + (i / ongoingSamples) * ongoingSpan;
        const x = ongoingLeft + (i / ongoingSamples) * ongoingW;
        const val = this.evaluateCoincidence(analysis, tau);
        const y = waveBottom - val * waveH;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(plotRight, waveBottom);
      ctx.closePath();

      const ongoingGrad = ctx.createLinearGradient(0, waveTop, 0, waveBottom);
      ongoingGrad.addColorStop(0, 'rgba(251, 113, 133, 0.22)');
      ongoingGrad.addColorStop(1, 'rgba(15, 23, 42, 0.02)');
      ctx.fillStyle = ongoingGrad;
      ctx.fill();

      // Optional: Unfiltered Base Waveform Overlay in aperiodic ongoing horizon
      if (analysis.hasActiveFilter) {
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        for (let i = 0; i <= ongoingSamples; i++) {
          const tau = ongoingStartTurn + (i / ongoingSamples) * ongoingSpan;
          const x = ongoingLeft + (i / ongoingSamples) * ongoingW;
          const val = this.evaluateCoincidence(analysis, tau, true);
          const y = waveBottom - val * waveH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Ongoing wave stroke
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i <= ongoingSamples; i++) {
        const tau = ongoingStartTurn + (i / ongoingSamples) * ongoingSpan;
        const x = ongoingLeft + (i / ongoingSamples) * ongoingW;
        const val = this.evaluateCoincidence(analysis, tau);
        const y = waveBottom - val * waveH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Ongoing window bottom label
      ctx.fillStyle = '#64748b';
      ctx.font = '7.5px JetBrains Mono, monospace';
      ctx.fillText(
        isAudioActive
          ? `Ongoing Horizon: Ï„=${ongoingStartTurn.toFixed(0)} to ${(ongoingStartTurn + ongoingSpan).toFixed(0)}`
          : `Ongoing Horizon: Ï„=0 to ${ongoingSpan.toFixed(0)}`,
        ongoingLeft,
        waveBottom + 10
      );

      // Playhead scan line for Aperiodic Ongoing Window
      if (isAudioActive || unwrappedRootTurns > 0) {
        const playheadX = ongoingLeft + ongoingProgress * ongoingW;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(playheadX, mainTop);
        ctx.lineTo(playheadX, waveBottom);
        ctx.stroke();

        ctx.fillStyle = '#fb7185';
        ctx.beginPath();
        ctx.arc(playheadX, waveBottom, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // PERIODIC / HARMONIC HARMONY WINDOW:
      // Charts the full cycle window synchronized with the supercycle
      // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plotLeft, waveBottom);
      ctx.lineTo(plotRight, waveBottom);
      ctx.stroke();

      ctx.save();
      ctx.setLineDash([2, 3]);
      for (let c = 0; c <= Math.floor(windowCycles); c++) {
        const cx = plotLeft + (c / windowCycles) * plotW;
        ctx.strokeStyle = c === 0 || c === windowCycles ? 'rgba(251, 191, 36, 0.45)' : 'rgba(56, 189, 248, 0.25)';
        ctx.beginPath();
        ctx.moveTo(cx, waveTop - 4);
        ctx.lineTo(cx, waveBottom);
        ctx.stroke();

        ctx.fillStyle = c === 0 || c === windowCycles ? '#fbbf24' : '#64748b';
        ctx.font = '7.5px JetBrains Mono, monospace';
        const cycleLabel = c === 0
          ? 'Ï„=0 (Downbeat)'
          : c === windowCycles
          ? `Ï„=${c} (Realign)`
          : `Ï„=${c}`;
        ctx.fillText(cycleLabel, cx - (c === 0 ? 0 : (c === windowCycles ? 32 : 12)), waveBottom + (isShort ? 10 : 12));
      }
      ctx.restore();

      const samples = analysis.samplePoints;
      const numS = samples.length;

      // Optional: Unfiltered Base Waveform Overlay (when active filter shapes the coincidence)
      if (analysis.hasActiveFilter && analysis.baseSamplePoints && analysis.baseSamplePoints.length > 1) {
        const baseSamples = analysis.baseSamplePoints;
        const numBase = baseSamples.length;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(plotLeft, waveBottom);
        for (let s = 0; s < numBase; s++) {
          const sx = plotLeft + (s / (numBase - 1)) * plotW;
          const sy = waveBottom - baseSamples[s] * waveH;
          ctx.lineTo(sx, sy);
        }
        ctx.lineTo(plotRight, waveBottom);
        ctx.closePath();
        ctx.fillStyle = 'rgba(148, 163, 184, 0.05)';
        ctx.fill();

        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        for (let s = 0; s < numBase; s++) {
          const sx = plotLeft + (s / (numBase - 1)) * plotW;
          const sy = waveBottom - baseSamples[s] * waveH;
          if (s === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.restore();

        // Legend
        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.font = '7px JetBrains Mono, monospace';
        ctx.fillText('╌╌ Base Shape', plotRight - (isCompact ? 95 : 125), waveTop + 8);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('— Filtered Wave', plotRight - (isCompact ? 45 : 55), waveTop + 8);
      }

      if (numS > 1) {
        ctx.beginPath();
        ctx.moveTo(plotLeft, waveBottom);

        for (let s = 0; s < numS; s++) {
          const sx = plotLeft + (s / (numS - 1)) * plotW;
          const sy = waveBottom - samples[s] * waveH;
          ctx.lineTo(sx, sy);
        }
        ctx.lineTo(plotRight, waveBottom);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, waveTop, 0, waveBottom);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
        grad.addColorStop(1, 'rgba(15, 23, 42, 0.02)');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let s = 0; s < numS; s++) {
          const sx = plotLeft + (s / (numS - 1)) * plotW;
          const sy = waveBottom - samples[s] * waveH;
          if (s === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      // Convergence Diamond Markers for periodic shapes
      for (const peak of analysis.peaks) {
        if (peak.value < 0.62) continue;
        const px = plotLeft + (peak.tau / windowCycles) * plotW;
        const py = waveBottom - peak.value * waveH;

        ctx.fillStyle = peak.isDownbeat ? '#fbbf24' : '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(px, py - 4.5);
        ctx.lineTo(px + 3.5, py);
        ctx.lineTo(px, py + 4.5);
        ctx.lineTo(px - 3.5, py);
        ctx.closePath();
        ctx.fill();

        if (peak.value >= 0.72) {
          ctx.fillStyle = peak.isDownbeat ? '#fde047' : '#7dd3fc';
          ctx.font = 'bold 7px JetBrains Mono, monospace';
          ctx.fillText(peak.isDownbeat ? 'REALIGN' : 'COINCIDE', px - 12, py - 6);

          if (isAudioActive) {
            this.dynamicLights.push({
              x: px,
              y: py,
              velocity: peak.value,
              colorHex: peak.isDownbeat ? '#FBBF24' : '#38BDF8',
            });
          }
        }
      }

      // Synchronised Transport Playhead (Periodic Window)
      if (isAudioActive || unwrappedRootTurns > 0) {
        const playheadTau = ((unwrappedRootTurns % windowCycles) + windowCycles) % windowCycles;
        const playheadX = plotLeft + (playheadTau / windowCycles) * plotW;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(playheadX, mainTop);
        ctx.lineTo(playheadX, waveBottom);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(playheadX, waveBottom, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Status label at bottom-left
    ctx.fillStyle = coherenceColor;
    ctx.font = 'bold 7.5px JetBrains Mono, monospace';
    const domainLabel = isPitchSpace ? 'PITCH SPACE' : 'RHYTHM SPACE';
    ctx.fillText(`${domainLabel} â€¢ ${coherenceStatus}`, padX, height - 6);

    ctx.restore();
  }
}
