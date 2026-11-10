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
    const isPitchSpace = f0 >= 20;
    const windowCycles = 2.5;

    // Run Unified Realignment & Coincidence Analysis across all active voice anchors and partials
    const analysis: RealignmentAnalysis = calculateRealignmentAnalysis(
      shape,
      placement,
      scene.filter,
      windowCycles,
      Math.min(320, Math.max(128, Math.floor(width / 2)))
    );

    ctx.save();

    const isCompact = width < 480;
    const isShort = height < 300;

    // 1. Header & Metric Cards
    ctx.fillStyle = '#38bdf8';
    ctx.font = isCompact ? 'bold 8px JetBrains Mono, monospace' : 'bold 9px JetBrains Mono, monospace';
    ctx.fillText(
      isCompact ? 'REALIGNMENT & COINCIDENCE METER' : 'REALIGNMENT & COINCIDENCE METER • UNIFIED CONSONANCE',
      isCompact ? 14 : 20,
      isShort ? 16 : 20
    );

    const padX = isCompact ? 12 : 20;
    const gapX = isCompact ? 6 : 10;
    const boxY = isShort ? 24 : 32;
    const boxH = isShort ? 36 : 44;
    const boxW = (width - padX * 2 - gapX * 2) / 3;

    // Metric 1: Realignment Coherence Score
    const coherencePercent = Math.round(analysis.coherenceScore * 100);
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
    ctx.fillText(isCompact ? 'COHERENCE' : 'REALIGNMENT COHERENCE', padX + 6, boxY + 12);

    ctx.fillStyle = coherenceColor;
    ctx.font = isCompact ? 'bold 11px JetBrains Mono, monospace' : 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(`${coherencePercent}%`, padX + 6, boxY + (isShort ? 26 : 30));

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
      : `${analysis.coincidenceStride.toFixed(1)}x Turn`;
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
    const archText = `${analysis.activeVoicesCount}V • ${analysis.activePartialsCount}P`;
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
          ? `${track.name.slice(0, isCompact ? 9 : 15)}…`
          : track.name;
        ctx.fillText(labelText, padX, rowCenterY + 3);

        // Track timeline wire
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plotLeft, rowCenterY);
        ctx.lineTo(plotRight, rowCenterY);
        ctx.stroke();

        // Draw individual pulse hit markers along timeline
        for (const p of track.partials) {
          for (const hitTau of p.hits) {
            if (hitTau < 0 || hitTau > windowCycles) continue;
            const hx = plotLeft + (hitTau / windowCycles) * plotW;

            // Vertical tick needle
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(hx, rowCenterY - 4);
            ctx.lineTo(hx, rowCenterY + 4);
            ctx.stroke();

            // Luminous pulse head
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(hx, rowCenterY, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // 3. Composite Realignment Convergence Wave
    // Coordinate grid and integer cycle downbeat lines
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
      ctx.strokeStyle = c === 0 ? 'rgba(251, 191, 36, 0.45)' : 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.moveTo(cx, waveTop - 4);
      ctx.lineTo(cx, waveBottom);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = c === 0 ? '#fbbf24' : '#64748b';
      ctx.font = '7.5px JetBrains Mono, monospace';
      const cycleLabel = c === 0 ? 'τ=0 (Downbeat)' : `τ=${c} (${c}x Cycle)`;
      ctx.fillText(cycleLabel, cx - (c === 0 ? 0 : 18), waveBottom + (isShort ? 10 : 12));
    }
    ctx.restore();

    // Plot constructive interference filled area
    const samples = analysis.samplePoints;
    const numS = samples.length;

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
      grad.addColorStop(0, analysis.isAperiodic ? 'rgba(251, 113, 133, 0.25)' : 'rgba(56, 189, 248, 0.28)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0.02)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Neon stroke line
      ctx.strokeStyle = analysis.isAperiodic ? '#fb7185' : '#38bdf8';
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

    // Convergence Diamond Markers
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

      // Peak badge
      if (peak.value >= 0.75) {
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

    // Live animated transport playhead
    if (isAudioActive || audioPhase > 0) {
      const playheadTau = ((audioPhase * windowCycles) % windowCycles + windowCycles) % windowCycles;
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

    // Status label at bottom-left
    ctx.fillStyle = coherenceColor;
    ctx.font = 'bold 7.5px JetBrains Mono, monospace';
    const domainLabel = isPitchSpace ? 'PITCH SPACE' : 'RHYTHM SPACE';
    ctx.fillText(`${domainLabel} • ${coherenceStatus}`, padX, height - 6);

    ctx.restore();
  }
}
