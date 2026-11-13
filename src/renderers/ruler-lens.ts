import { Scene } from '../core/types';
import { evaluatePlacedShape, evaluatePartialAdsr } from '../core/shape';
import { evaluateRhythmEnvelopeGain } from '../core/envelope-presets';
import { calculateGhostFundamental } from '../core/alignment';
import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS } from '../core/ppt-constants';
import { resolveDuPeriodAddress, dToFreq, dToBpm, freqToPitchRegister } from '../core/axis';
import { LensLabelMode } from '../core/layout-models';
import { RegisteredLensRenderer, HeldMidiNote } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';
import { getApertureColours, endpointToRulerD } from './filter-render-utils';
import { evaluateDutyGain } from '../core/filter-eval';
import { formatEndpoint } from '../core/endpoint-parse';
import { RangeCondition } from '../core/filter-types';

export class RulerLensRenderer implements RegisteredLensRenderer {
  public id = 'ruler';
  private dynamicLights: PostProcessingLight[] = [];
  private cachedApertureGains: Float32Array = new Float32Array(0);
  private cachedApertureCount: number = 0;
  private cachedFilterRef: Scene['filter'] | null = null;
  private cachedFundamentalD: number = NaN;
  private cachedTplHz: number = NaN;
  private cachedWidth: number = NaN;

  public getDynamicLights(): PostProcessingLight[] {
    return this.dynamicLights;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scene: Scene,
    transportTime: number = 0,
    audioPhase: number = 0,
    isAudioActive: boolean = false,
    labelMode: LensLabelMode = 'duperiod',
    _configOverrides?: Record<string, unknown>,
    noteAge: number = 0
  ): void {
    this.dynamicLights = [];

    // Axis d range mapping: center d=0 at center x=width/2, span ±8 DuPeriods
    const dMin = -8;
    const dMax = 8;
    const dSpan = dMax - dMin;

    const dToX = (d: number): number => {
      // Faster / negative d to the right (x = -d)
      return width / 2 - (d / (dSpan / 2)) * (width * 0.45);
    };

    const xToD = (x: number): number => {
      return ((width / 2 - x) / (width * 0.45)) * (dSpan / 2);
    };

    const isCompact = width < 520;
    const isShort = height < 280;
    const baselineY = isShort ? height * 0.76 : height * 0.72;

    // 1. Shaded TPL Transition Zone (10 Hz to 40 Hz => d ≈ +1.37 to -0.63)
    const x10Hz = dToX(1.367);
    const x40Hz = dToX(-0.632);
    const xTPL = dToX(0.0);

    const leftX = Math.min(x10Hz, x40Hz);
    const zoneW = Math.abs(x40Hz - x10Hz);

    ctx.save();
    ctx.fillStyle = 'rgba(238, 54, 16, 0.08)';
    ctx.fillRect(leftX, 0, zoneW, height);

    // TPL boundary line
    ctx.strokeStyle = '#E13610';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xTPL, 16);
    ctx.lineTo(xTPL, height - 16);
    ctx.stroke();
    ctx.setLineDash([]);

    // TPL Label
    ctx.fillStyle = '#E13610';
    ctx.font = isCompact ? 'bold 8.5px JetBrains Mono, monospace' : 'bold 10px JetBrains Mono, monospace';
    ctx.fillText(isCompact ? 'TPL (25.8Hz)' : 'TPL (25.8 Hz / 38.7 ms)', xTPL + 5, isShort ? 22 : 30);
    ctx.restore();

    // 2. Main baseline ruler
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, baselineY);
    ctx.lineTo(width - 14, baselineY);
    ctx.stroke();

    // Octave / DuPeriod band ticks (on compact widths, label every 2nd band + 0 so text never collides)
    for (let bandD = -7; bandD <= 7; bandD++) {
      const tx = dToX(bandD);
      if (tx < 16 || tx > width - 16) continue;

      ctx.beginPath();
      ctx.moveTo(tx, baselineY - 6);
      ctx.lineTo(tx, baselineY + 6);
      ctx.strokeStyle = bandD === 0 ? '#E13610' : 'rgba(255, 255, 255, 0.3)';
      ctx.stroke();

      if (isCompact && bandD % 2 !== 0 && bandD !== 0) continue;

      const addr = resolveDuPeriodAddress(bandD);
      ctx.fillStyle = bandD === 0 ? '#E13610' : 'rgba(255, 255, 255, 0.55)';
      ctx.font = isCompact ? '8px JetBrains Mono, monospace' : '9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(addr.formatted, tx, baselineY + (isShort ? 16 : 21));
    }
    ctx.restore();

    // 2b. Visual Band Filter / Acoustic Aperture Overlay (when filter enabled)
    if (scene.filter && scene.filter.enabled) {
      ctx.save();
      const filter = scene.filter;
      const primaryPlacement = scene.placements[0];
      const fundamentalD = primaryPlacement?.d ?? 0;
      const colours = getApertureColours(filter.action ?? 'keep');

      const apertureMaxH = height * 0.56;

      const step = 3;
      const sampleCount = Math.floor(width / step) + 1;
      const cacheValid =
        this.cachedFilterRef === filter &&
        this.cachedFundamentalD === fundamentalD &&
        this.cachedTplHz === scene.anchors.tplFrequencyHz &&
        this.cachedWidth === width &&
        this.cachedApertureCount === sampleCount;

      if (!cacheValid) {
        if (this.cachedApertureGains.length < sampleCount) {
          this.cachedApertureGains = new Float32Array(sampleCount);
        }
        let idx = 0;
        for (let x = 0; x <= width; x += step) {
          const d = xToD(x);
          this.cachedApertureGains[idx++] = evaluateDutyGain(filter, {
            partialD: d,
            sceneD: fundamentalD,
            tplHz: scene.anchors.tplFrequencyHz,
          });
        }
        this.cachedApertureCount = idx;
        this.cachedFilterRef = filter;
        this.cachedFundamentalD = fundamentalD;
        this.cachedTplHz = scene.anchors.tplFrequencyHz;
        this.cachedWidth = width;
      }

      // Draw shaded transmission aperture polygon
      ctx.beginPath();
      ctx.moveTo(0, baselineY);
      for (let i = 0; i < this.cachedApertureCount; i++) {
        const x = i * step;
        const fy = baselineY - this.cachedApertureGains[i] * apertureMaxH;
        ctx.lineTo(x, fy);
      }
      ctx.lineTo(width, baselineY);
      ctx.closePath();

      // Transmission / rejection fill
      ctx.fillStyle = colours.fill;
      ctx.fill();

      // Transmission envelope stroke (reuses cached gain samples)
      ctx.beginPath();
      for (let i = 0; i < this.cachedApertureCount; i++) {
        const x = i * step;
        const fy = baselineY - this.cachedApertureGains[i] * apertureMaxH;
        if (i === 0) {
          ctx.moveTo(x, fy);
        } else {
          ctx.lineTo(x, fy);
        }
      }
      ctx.strokeStyle = colours.stroke;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Range condition span boundaries & ratio/cents labels
      const rangeConditions = filter.conditions.filter((c): c is RangeCondition => c.kind === 'range');
      for (const rc of rangeConditions) {
        for (const span of rc.spans) {
          if (span.lo) {
            const loD = endpointToRulerD(span.lo, rc.reference, fundamentalD, fundamentalD, scene.anchors.tplFrequencyHz);
            const loX = dToX(loD);
            if (loX >= 0 && loX <= width) {
              ctx.strokeStyle = colours.landmark;
              ctx.lineWidth = 1;
              ctx.setLineDash([2, 3]);
              ctx.beginPath();
              ctx.moveTo(loX, baselineY);
              ctx.lineTo(loX, baselineY - apertureMaxH * 0.7);
              ctx.stroke();
              ctx.setLineDash([]);

              if (!isCompact && span.lo.unit !== 'd') {
                ctx.font = '7px JetBrains Mono, monospace';
                ctx.fillStyle = colours.text;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(formatEndpoint(span.lo), loX, baselineY - apertureMaxH * 0.7 - 2);
              }
            }
          }
          if (span.hi) {
            const hiD = endpointToRulerD(span.hi, rc.reference, fundamentalD, fundamentalD, scene.anchors.tplFrequencyHz);
            const hiX = dToX(hiD);
            if (hiX >= 0 && hiX <= width) {
              ctx.strokeStyle = colours.landmark;
              ctx.lineWidth = 1;
              ctx.setLineDash([2, 3]);
              ctx.beginPath();
              ctx.moveTo(hiX, baselineY);
              ctx.lineTo(hiX, baselineY - apertureMaxH * 0.7);
              ctx.stroke();
              ctx.setLineDash([]);

              if (!isCompact && span.hi.unit !== 'd') {
                ctx.font = '7px JetBrains Mono, monospace';
                ctx.fillStyle = colours.text;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(formatEndpoint(span.hi), hiX, baselineY - apertureMaxH * 0.7 - 2);
              }
            }
          }
        }
      }

      // Aperture Centre Landmark line
      const effectiveFilterCenterD = filter.trackingMode === 'relative'
        ? fundamentalD + filter.centreD
        : filter.centreD;
      const filterCenterX = dToX(effectiveFilterCenterD);
      if (filterCenterX >= 0 && filterCenterX <= width) {
        ctx.strokeStyle = colours.landmark;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(filterCenterX, baselineY);
        ctx.lineTo(filterCenterX, baselineY - apertureMaxH - 14);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Filter Mode / Aperture Badge
      const actionLabel = (filter.action === 'remove' ? 'REJECT' : (filter.mode ?? 'PASS')).toUpperCase();
      const isRelative = filter.trackingMode === 'relative' || rangeConditions.some((c) => c.reference !== 'absolute');
      const trackingLabel = isRelative ? 'REL' : 'FIX';
      const condCount = filter.conditions.length;
      const badgeText = isCompact
        ? `${actionLabel} [${trackingLabel}] (${condCount})`
        : `ACOUSTIC APERTURE: ${actionLabel} [${trackingLabel}] ${Math.round((filter.depth ?? 1) * 100)}% DEPTH (${condCount} COND)`;

      ctx.font = 'bold 8px JetBrains Mono, monospace';
      const bWidth = ctx.measureText(badgeText).width;
      const badgeX = Math.max(bWidth / 2 + 8, Math.min(width - bWidth / 2 - 8, filterCenterX));
      const badgeY = Math.max(14, baselineY - apertureMaxH - 8);

      ctx.fillStyle = 'rgba(11, 14, 23, 0.9)';
      ctx.fillRect(badgeX - bWidth / 2 - 4, badgeY - 6, bWidth + 8, 13);
      ctx.strokeStyle = colours.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(badgeX - bWidth / 2 - 4, badgeY - 6, bWidth + 8, 13);

      ctx.fillStyle = colours.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, badgeX, badgeY);

      ctx.restore();
    }

    // 3. Render placed shapes & partials
    for (const placement of scene.placements) {
      const shape = scene.shapes.find((s) => s.id === placement.shapeId);
      if (!shape) continue;

      const partials = evaluatePlacedShape(shape, placement, scene.filter, scene.placements[0]?.d, scene.anchors.tplFrequencyHz);
      const f0 = dToFreq(placement.d, scene.anchors.tplFrequencyHz);
      const ghost = calculateGhostFundamental(shape, f0, scene.anchors.tplFrequencyHz);

      // Render Ghost Fundamental / Common Sam Anchor only when there is no physical partial on that frequency
      const hasPhysicalPartialAtGhost = partials.some(
        (p) => p.filteredAmp > 0.001 && Math.abs(p.d - ghost.ghostD) < 0.04
      );

      const gx = dToX(ghost.ghostD);
      if (!hasPhysicalPartialAtGhost && gx >= 0 && gx <= width) {
        const ghostH = height * 0.52;
        const gy = baselineY - ghostH;

        ctx.save();
        ctx.strokeStyle = '#E13610';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(gx, baselineY);
        ctx.lineTo(gx, gy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Diamond marker at the top of Ghost Fundamental
        ctx.fillStyle = '#E13610';
        ctx.beginPath();
        ctx.moveTo(gx, gy - 6);
        ctx.lineTo(gx + 5, gy);
        ctx.lineTo(gx, gy + 6);
        ctx.lineTo(gx - 5, gy);
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GHOST (SAM)', gx, gy - 12);
        ctx.fillStyle = 'rgba(238, 54, 16, 0.7)';
        ctx.font = '7px JetBrains Mono, monospace';
        ctx.fillText(
          ghost.ghostFreqHz < 25
            ? `${(ghost.cycleDurationSec * 1000).toFixed(0)} ms`
            : `${ghost.ghostFreqHz.toFixed(1)} Hz`,
          gx,
          gy - 3
        );
        ctx.restore();

        this.dynamicLights.push({
          x: gx,
          y: gy,
          velocity: 0.85,
          colorHex: '#FF4D4D',
        });
      }

      const inPitchSpace = f0 > 25.8;
      const envEnabled = scene.envelope ? scene.envelope.enabled : true;
      const adsr = envEnabled ? (scene.envelope?.adsr ?? shape?.adsr) : undefined;
      const isRhythmSupercycle =
        !inPitchSpace &&
        envEnabled &&
        scene.envelope?.rhythmMode === 'supercycle';
      const envTurns = audioPhase > 0 ? audioPhase : transportTime * f0;
      const labelledDs: number[] = [];

      for (const p of partials) {
        if (p.filteredAmp <= 0.001 && p.amp <= 0.001) continue;

        const px = dToX(p.d);
        if (px < 0 || px > width) continue;

        const addr = resolveDuPeriodAddress(p.d);
        const col = SOLFEGE_COLORS[addr.semitoneIndex] || '#ffffff';
        const neonCol = SOLFEGE_NEON_COLORS[addr.semitoneIndex] || col;

        const maxH = height * 0.45;
        const ceilingBarH = p.filteredAmp * maxH;
        const rawBarH = p.amp * maxH;

        // Structural bar resting height (invariant across TPL and when transport is paused)
        const py = baselineY - ceilingBarH;
        const pyRaw = baselineY - rawBarH;

        ctx.save();

        // 1. If filter attenuated this partial, draw unattenuated ghosted extent
        if (scene.filter && scene.filter.enabled && rawBarH > ceilingBarH + 2) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = 1.0;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, pyRaw);
          ctx.stroke();
          ctx.setLineDash([]);

          // Ghosted cap marker at original unattenuated amplitude
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(px - 2, pyRaw - 1, 4, 2);
        }

        // 2. Base structural partial bar (maintains constant geometric shape)
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px, baselineY);
        ctx.lineTo(px, py);
        ctx.stroke();

        // 3. Resting structural tip circle
        ctx.fillStyle = neonCol;
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // 4. Dynamic Level Overlay Effect (Pitch ADSR or Rhythm Supercycle Envelope when actively sounding)
        let activeLightY = py;
        let activeLightVelocity = ceilingBarH / maxH;

        const envMultiplier = isAudioActive
          ? inPitchSpace && adsr
            ? evaluatePartialAdsr(adsr, p.ratioValue, noteAge)
            : isRhythmSupercycle
            ? evaluateRhythmEnvelopeGain(scene.envelope, envTurns, p.ratioValue)
            : -1
          : -1;

        if (envMultiplier >= 0) {
          if (envMultiplier > 0.005) {
            const dynamicBarH = ceilingBarH * envMultiplier;
            const pyLevel = baselineY - dynamicBarH;
            activeLightY = pyLevel;
            activeLightVelocity = dynamicBarH / maxH;

            // Inner luminous level core
            ctx.save();
            ctx.strokeStyle = neonCol;
            ctx.lineWidth = 3.5;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(px, baselineY);
            ctx.lineTo(px, pyLevel);
            ctx.stroke();

            // Bright white center filament
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.moveTo(px, baselineY);
            ctx.lineTo(px, pyLevel);
            ctx.stroke();

            // Sliding indicator bead on top of the dynamic level
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = neonCol;
            ctx.beginPath();
            ctx.arc(px, pyLevel, 4.0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px, pyLevel, 1.8, 0, Math.PI * 2);
            ctx.fill();

            // Horizontal indicator level tick
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px - 4, pyLevel - 1, 8, 2);
            ctx.restore();
          }
        }

        // Label anchored to structural tip (avoid overdrawing when partials are close on mobile)
        const minLabelGapD = isCompact ? 0.42 : 0.008;
        const alreadyLabelledAtD = labelledDs.some((dVal) => Math.abs(dVal - p.d) < minLabelGapD);
        if (!alreadyLabelledAtD) {
          labelledDs.push(p.d);
          let displayLabel = p.label || addr.syllable;
          if (labelMode === 'pitch') {
            const pReg = freqToPitchRegister(p.freqHz, scene.anchors.tuningA4Hz);
            displayLabel = isCompact ? `${pReg.note}${pReg.octave}` : pReg.formatted;
          } else if (labelMode === 'bpm') {
            displayLabel = isCompact
              ? `${dToBpm(p.d, scene.anchors.tplFrequencyHz).toFixed(0)}`
              : `${dToBpm(p.d, scene.anchors.tplFrequencyHz).toFixed(0)} BPM`;
          } else if (labelMode === 'solfege') {
            displayLabel = addr.formatted;
          } else if (labelMode === 'duperiod') {
            displayLabel = isCompact ? `${p.d.toFixed(1)}` : `d: ${p.d.toFixed(2)}`;
          }

          ctx.fillStyle = '#ffffff';
          ctx.font = isCompact ? '8px Inter, sans-serif' : '9px Inter, sans-serif';
          ctx.textAlign = 'center';
          const clampedX = Math.max(20, Math.min(width - 20, px));
          ctx.fillText(displayLabel, clampedX, Math.max(12, py - 7));
        }
        ctx.restore();

        // Add to dynamic lights for WebGL halation & lens flare
        this.dynamicLights.push({
          x: px,
          y: activeLightY,
          velocity: activeLightVelocity,
          colorHex: neonCol,
        });
      }
    }

    // 5. Polyphonic Held MIDI Note Ghosts (earlier keys still held while a newer key is primary)
    const ghostMidiNotes = _configOverrides?.ghostMidiNotes as HeldMidiNote[] | undefined;
    if (ghostMidiNotes && ghostMidiNotes.length > 0) {
      const primaryShape = scene.shapes.find((s) => s.id === scene.placements[0]?.shapeId);
      for (const gn of ghostMidiNotes) {
        if (gn.isPrimary) continue;
        const gx = dToX(gn.d);
        if (gx < 10 || gx > width - 10) continue;

        const gAddr = resolveDuPeriodAddress(gn.d);
        const gCol = SOLFEGE_NEON_COLORS[gAddr.semitoneIndex] || SOLFEGE_COLORS[gAddr.semitoneIndex] || '#38bdf8';
        const gFreq = dToFreq(gn.d, scene.anchors.tplFrequencyHz);
        const gPitch = freqToPitchRegister(gFreq, scene.anchors.tuningA4Hz);
        const ghostH = Math.max(24, height * 0.42 * gn.velocity);

        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = gCol;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(gx, baselineY);
        ctx.lineTo(gx, baselineY - ghostH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ghost partial markers if primary shape has overtones
        if (primaryShape) {
          for (let i = 1; i < primaryShape.partials.length; i++) {
            const p = primaryShape.partials[i];
            if (p.amp <= 0.01) continue;
            const rVal = p.ratio.kind === 'rational' ? p.ratio.num / p.ratio.den : p.ratio.value;
            const pd = gn.d - Math.log2(Math.max(0.01, rVal));
            const px = dToX(pd);
            if (px < 10 || px > width - 10) continue;
            const ph = Math.max(12, ghostH * p.amp);
            ctx.beginPath();
            ctx.moveTo(px, baselineY);
            ctx.lineTo(px, baselineY - ph);
            ctx.strokeStyle = gCol;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }

        ctx.fillStyle = gCol;
        ctx.beginPath();
        ctx.arc(gx, baselineY - ghostH, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.75;
        ctx.font = 'bold 8.5px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${gPitch.note}${gPitch.octave}`, gx, Math.max(12, baselineY - ghostH - 6));
        ctx.restore();
      }
    }
  }
}
