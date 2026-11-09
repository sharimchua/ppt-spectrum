import { Scene } from '../core/types';
import { LensLabelMode, RingClockDensityMode } from '../core/layout-models';
import { evaluatePlacedShape } from '../core/shape';
import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS, SOLFEGE_SYLLABLES } from '../core/ppt-constants';
import { resolveDuPeriodAddress, dToBpm, dToFreq, freqToPitchRegister } from '../core/axis';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';

/**
 * Calculates the DuPeriod band bounds [bandMin, bandMax] for the Concentric Ring Clock.
 * Enforces a configurable minimum ring count (default 4) and compacts dynamically
 * around active shape partials to maintain visual legibility across all form factors.
 */
export function calculateRingClockBands(
  scene: Scene,
  mode: RingClockDensityMode = 'auto-compact',
  minRings: number = 4
): { bandMin: number; bandMax: number } {
  if (mode === 'full') {
    return { bandMin: -8, bandMax: 8 };
  }

  if (mode === 'standard') {
    const primaryD = Math.round(scene.placements[0]?.d ?? 0);
    let bandMin = Math.round(primaryD - 3.5);
    let bandMax = bandMin + 7;
    if (bandMin < -8) {
      bandMin = -8;
      bandMax = Math.min(8, bandMin + 7);
    }
    if (bandMax > 8) {
      bandMax = 8;
      bandMin = Math.max(-8, bandMax - 7);
    }
    return { bandMin, bandMax };
  }

  // 'auto-compact' mode: dynamically bounded by active partials with minimum ring guarantee
  const partialDs: number[] = [];
  for (const pl of scene.placements) {
    const shape = scene.shapes.find((s) => s.id === pl.shapeId);
    if (shape && shape.partials.length > 0) {
      for (const p of shape.partials) {
        if (p.amp <= 0.001) continue;
        const ratioVal = typeof p.ratio === 'object' && p.ratio.kind === 'rational'
          ? p.ratio.num / p.ratio.den
          : typeof p.ratio === 'object' && p.ratio.kind === 'real'
          ? p.ratio.value
          : 1;
        const partialD = pl.d - Math.log2(Math.max(0.001, ratioVal));
        partialDs.push(partialD);
      }
    } else {
      partialDs.push(pl.d);
    }
  }

  if (partialDs.length === 0) {
    partialDs.push(0);
  }

  const minD = Math.min(...partialDs);
  const maxD = Math.max(...partialDs);
  let bMin = Math.floor(minD);
  let bMax = Math.ceil(maxD);
  const targetMinRings = Math.max(4, Math.floor(minRings));

  // If Limen (d = 0) is nearby (within 2 octaves), encompass it for context
  if (bMin > 0 && bMin <= 2) {
    bMin = 0;
  }
  if (bMax < 0 && bMax >= -2) {
    bMax = 0;
  }

  // Expand bounds symmetrically or towards 0 to guarantee minimum ring count
  while ((bMax - bMin + 1) < targetMinRings && (bMin > -8 || bMax < 8)) {
    if (bMin > 0 && bMin > -8) {
      bMin--;
    } else if (bMax < 0 && bMax < 8) {
      bMax++;
    } else {
      if (bMin > -8 && (bMax >= 8 || ((bMax - bMin) % 2 === 0))) {
        bMin--;
      } else if (bMax < 8) {
        bMax++;
      } else if (bMin > -8) {
        bMin--;
      } else {
        break;
      }
    }
  }

  // Add 1 ring padding for margin if range is still compact (< 8) and within bounds
  if ((bMax - bMin + 1) < 8) {
    if (bMin > -8 && bMin > 0) bMin--;
    else if (bMax < 8 && bMax < 0) bMax++;
  }

  bMin = Math.max(-8, bMin);
  bMax = Math.min(8, bMax);

  return { bandMin: bMin, bandMax: bMax };
}

/**
 * Formats a ring band label based on the active LensLabelMode.
 */
function formatRingBandLabel(
  bandVal: number,
  labelMode: LensLabelMode = 'duperiod',
  scene: Scene
): string {
  const isLimen = bandVal === 0;
  if (isLimen && labelMode === 'duperiod') {
    return 'TPL (0)';
  }

  switch (labelMode) {
    case 'bpm': {
      const bpm = dToBpm(bandVal, scene.anchors.tplFrequencyHz);
      return `${Math.round(bpm)} BPM`;
    }
    case 'pitch': {
      const freq = dToFreq(bandVal, scene.anchors.tplFrequencyHz);
      const p = freqToPitchRegister(freq, scene.anchors.tuningA4Hz);
      return `${p.note}${p.octave}`;
    }
    case 'solfege': {
      const addr = resolveDuPeriodAddress(bandVal);
      return addr.syllable;
    }
    case 'duperiod':
    default:
      return bandVal > 0 ? `+${bandVal}` : `${bandVal}`;
  }
}

export class RingClockLensRenderer implements RegisteredLensRenderer {
  public id = 'ring-clock';
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
    _audioPhase: number = 0,
    _isAudioActive: boolean = false,
    labelMode: LensLabelMode = 'duperiod',
    configOverrides?: Record<string, unknown>
  ): void {
    this.dynamicLights = [];

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(centerX, centerY) * 0.88;
    const minRadius = maxRadius * 0.16;

    // Determine ring density mode and minimum rings
    const ringMode: RingClockDensityMode =
      (configOverrides?.ringClockMode as RingClockDensityMode) || 'auto-compact';
    const minRings: number =
      typeof configOverrides?.minRings === 'number' ? configOverrides.minRings : 4;

    const { bandMin, bandMax } = calculateRingClockBands(scene, ringMode, minRings);
    const bandCount = Math.max(1, bandMax - bandMin + 1);
    const ringSpacing = (maxRadius - minRadius) / Math.max(1, bandCount - 1);

    const getRadiusForD = (d: number): number => {
      if (bandMax === bandMin) return (minRadius + maxRadius) / 2;
      // Slower (positive d / rhythm) on outer rings, faster (negative d / pitch) on inner rings
      const norm = (d - bandMin) / (bandMax - bandMin);
      const clamped = Math.max(0, Math.min(1, norm));
      return minRadius + clamped * (maxRadius - minRadius);
    };

    const isLimenVisible = bandMin <= 0 && bandMax >= 0;

    // 1. Draw Regime Shading & DuPeriod band rings
    ctx.save();

    if (isLimenVisible) {
      const rLimen = getRadiusForD(0.0);
      // Rhythmic Macro Regime Background (outer of Limen)
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, rLimen, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(238, 54, 16, 0.03)';
      ctx.fill();

      // Tonal Micro Pitch Regime Background (inner of Limen)
      ctx.beginPath();
      ctx.arc(centerX, centerY, rLimen, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, minRadius, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.03)';
      ctx.fill();
    } else if (bandMin > 0) {
      // Entire visible range is in Rhythmic Macro regime
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, minRadius, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(238, 54, 16, 0.03)';
      ctx.fill();
    } else {
      // Entire visible range is in Tonal Micro Pitch regime
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, minRadius, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.03)';
      ctx.fill();
    }

    // Concentric rings
    for (let i = 0; i < bandCount; i++) {
      const bandVal = bandMin + i;
      const r = minRadius + i * ringSpacing;
      const isLimen = bandVal === 0;

      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);

      if (isLimen) {
        // Glowing TPL Limen ring
        ctx.strokeStyle = '#E13610';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 77, 77, 0.3)';
        ctx.lineWidth = 6;
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Band label formatted to current label scale
      ctx.fillStyle = isLimen ? '#E13610' : 'rgba(255, 255, 255, 0.45)';
      ctx.font = isLimen ? 'bold 9px JetBrains Mono, monospace' : '8px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      const label = formatRingBandLabel(bandVal, labelMode, scene);
      ctx.fillText(label, centerX - r - 4, centerY + 3);
    }

    // Limen title banner or off-screen beacon
    if (isLimenVisible) {
      const rLimen = getRadiusForD(0.0);
      ctx.fillStyle = '#E13610';
      ctx.font = 'bold 8px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TEMPORAL-PLACE LIMEN (25.8 Hz / 38.7 ms)', centerX, centerY - rLimen - 5);
    } else if (bandMin > 0) {
      // Limen is inward toward centre hub
      const octavesInward = bandMin;
      ctx.fillStyle = '#E13610';
      ctx.font = 'bold 8px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('◄ TPL LIMEN (0)', centerX, centerY - 6);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '7px JetBrains Mono, monospace';
      ctx.fillText(`${octavesInward} OCT INWARD`, centerX, centerY + 6);

      ctx.strokeStyle = 'rgba(225, 54, 16, 0.35)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, minRadius * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (bandMax < 0) {
      // Limen is outward beyond perimeter
      const octavesOutward = Math.abs(bandMax);
      ctx.fillStyle = '#E13610';
      ctx.font = 'bold 8px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`TPL LIMEN (0) — ${octavesOutward} OCT OUTWARD ►`, centerX, centerY - maxRadius - 8);
    }

    // 2. 12 Solfège spokes (Do at 12 o'clock, clockwise)
    for (let st = 0; st < 12; st++) {
      const angle = (st / 12) * Math.PI * 2 - Math.PI / 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(centerX + minRadius * cosA, centerY + minRadius * sinA);
      ctx.lineTo(centerX + maxRadius * cosA, centerY + maxRadius * sinA);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Solfège Syllable around outer perimeter
      const labelR = maxRadius + 14;
      ctx.fillStyle = SOLFEGE_COLORS[st] || '#94a3b8';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SOLFEGE_SYLLABLES[st], centerX + labelR * cosA, centerY + labelR * sinA);
    }
    ctx.restore();

    // 3. Render placed shapes as dots & spiral chords
    for (const placement of scene.placements) {
      const shape = scene.shapes.find((s) => s.id === placement.shapeId);
      if (!shape) continue;

      const partials = evaluatePlacedShape(shape, placement, scene.filter);

      // Draw connecting ray/polygon between partials
      if (partials.length > 1) {
        ctx.save();
        ctx.beginPath();
        let first = true;
        for (const p of partials) {
          if (p.filteredAmp <= 0.001) continue;
          const r = getRadiusForD(p.d);
          const addr = resolveDuPeriodAddress(p.d);
          // Angle proportional to semitone offset within band
          const angle = (addr.semitoneOffset / 12) * Math.PI * 2 - Math.PI / 2;
          const px = centerX + r * Math.cos(angle);
          const py = centerY + r * Math.sin(angle);
          if (first) {
            ctx.moveTo(px, py);
            first = false;
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(225, 54, 16, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = 'rgba(225, 54, 16, 0.06)';
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Draw individual partial nodes
      for (const p of partials) {
        if (p.filteredAmp <= 0.001) continue;
        const r = getRadiusForD(p.d);
        const addr = resolveDuPeriodAddress(p.d);
        const angle = (addr.semitoneOffset / 12) * Math.PI * 2 - Math.PI / 2;
        const px = centerX + r * Math.cos(angle);
        const py = centerY + r * Math.sin(angle);

        const col = SOLFEGE_COLORS[addr.semitoneIndex] || '#ffffff';
        const neonCol = SOLFEGE_NEON_COLORS[addr.semitoneIndex] || col;
        const nodeRadius = 3.5 + p.filteredAmp * 4.5;

        ctx.save();
        ctx.fillStyle = neonCol;
        ctx.beginPath();
        ctx.arc(px, py, nodeRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.label || addr.syllable, px, py - nodeRadius - 3);
        ctx.restore();

        this.dynamicLights.push({
          x: px,
          y: py,
          velocity: p.filteredAmp,
          colorHex: neonCol,
        });
      }
    }
  }
}
