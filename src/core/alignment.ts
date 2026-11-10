import { Shape, Placement, Filter, BandFilter } from './types';
import { gcd, lcm, reduceRational, rationalise, ratioToValue } from './rational';
import { freqToD } from './axis';
import { evaluatePlacedShape, getEffectivePartials } from './shape';

/**
 * Calculates the exact ghost fundamental (greatest common divisor frequency) of rational partials.
 * For rational ratios r_i = n_i / d_i at fundamental f0:
 * D = lcm(d_i), m_i = n_i * D / d_i => g = f0 * gcd(m_i) / D
 */
export function calculateGhostFundamental(
  shape: Shape,
  f0: number,
  tplHz?: number
): { ghostFreqHz: number; cycleDurationSec: number; ghostD: number } {
  const activePartials = getEffectivePartials(shape).filter((p) => p.amp > 0);
  if (activePartials.length === 0) {
    return { ghostFreqHz: f0, cycleDurationSec: 1 / f0, ghostD: freqToD(f0, tplHz) };
  }

  // 1. If the shape already contains a physical Root partial on the fundamental (1/1)
  // and has no sub-octave partials (< 1/1), the shape's fundamental IS f0.
  // This ensures that Harmony chords (1 : 5/4 : 3/2) and stretched strings (piano)
  // anchor directly on the scene's fundamental f0 without creating a displaced sub-harmonic Ghost Sam.
  const ratios = activePartials.map((p) => ratioToValue(p.ratio));
  const hasFundamental = ratios.some((r) => Math.abs(r - 1.0) < 0.06);
  const minRatio = Math.min(...ratios);

  if (hasFundamental && minRatio >= 0.92) {
    return { ghostFreqHz: f0, cycleDurationSec: 1 / f0, ghostD: freqToD(f0, tplHz) };
  }

  // 2. If all partials are purely rational (e.g. 2:3 Hemiola, 3:4 Fourth, 4:5 Third with missing 1/1),
  // compute exact GCD/LCM to find the implied Ghost Fundamental (Sam):
  const isPurelyRational = activePartials.every((p) => p.ratio.kind === 'rational');
  if (isPurelyRational) {
    const rationalPartials = activePartials.map((p) => {
      const r = p.ratio;
      return r.kind === 'rational' ? reduceRational(r.num, r.den) : { num: 1, den: 1 };
    });
    let D = 1;
    for (const r of rationalPartials) {
      D = lcm(D, r.den);
    }
    const m = rationalPartials.map((r) => Math.round((r.num * D) / r.den));
    let commonGcd = m[0];
    for (let i = 1; i < m.length; i++) {
      commonGcd = gcd(commonGcd, m[i]);
    }
    const ghostFreqHz = (f0 * commonGcd) / D;
    return { ghostFreqHz, cycleDurationSec: 1 / ghostFreqHz, ghostD: freqToD(ghostFreqHz, tplHz) };
  }

  // 3. For other real/microtonal shapes without a 1/1 root, map partials to nearest harmonic modes:
  const approxPartials = ratios.map((val) => {
    const nearestInt = Math.round(val);
    if (Math.abs(val - nearestInt) < 0.15) {
      return { num: nearestInt, den: 1 };
    }
    return rationalise(val, 0.05, 8);
  });

  let D = 1;
  for (const r of approxPartials) {
    D = lcm(D, r.den);
  }
  const m = approxPartials.map((r) => Math.round((r.num * D) / r.den));
  let commonGcd = m[0];
  for (let i = 1; i < m.length; i++) {
    commonGcd = gcd(commonGcd, m[i]);
  }
  const ghostFreqHz = (f0 * commonGcd) / D;
  return { ghostFreqHz, cycleDurationSec: 1 / ghostFreqHz, ghostD: freqToD(ghostFreqHz, tplHz) };
}

export interface CoincidenceCycleInfo {
  /** Number of Root (f0) turns required for all partials to simultaneously realign (D = lcm of denominators). Infinity if irrational/aperiodic. */
  rootTurnsToAlign: number;
  /** True when the shape has a finite, compact rational super-cycle (D <= maxCompactTurns) */
  isCompactSuperCycle: boolean;
  /** True when partials contain irrational/inharmonic real ratios that never exactly realign */
  isAperiodic: boolean;
  /** Total duration in seconds of the full coincidence super-cycle (rootTurnsToAlign / f0) */
  superCycleDurationSec: number;
  /** Human-readable badge description */
  badgeLabel: string;
}

/**
 * Calculates the exact Coincidence Super-Cycle (number of Root f0 turns required for all active
 * partials/anchors to simultaneously realign at the 12 o'clock Sam/Apex).
 * - For integer harmonics (1, 2, 3, 4): rootTurnsToAlign = 1.
 * - For rational intervals (e.g. Major Triad 1 : 5/4 : 3/2): rootTurnsToAlign = lcm(1, 4, 2) = 4.
 * - For Minor Triad (1 : 6/5 : 3/2): rootTurnsToAlign = lcm(1, 5, 2) = 10.
 * - For irrational/inharmonic shapes (piano, vibraphone, bell): rootTurnsToAlign = Infinity (isAperiodic = true).
 */
export function calculateCoincidenceCycle(
  shape: Shape,
  f0: number,
  maxCompactTurns: number = 12
): CoincidenceCycleInfo {
  const activePartials = getEffectivePartials(shape).filter((p) => p.amp > 0);
  if (activePartials.length === 0 || f0 <= 0) {
    return {
      rootTurnsToAlign: 1,
      isCompactSuperCycle: true,
      isAperiodic: false,
      superCycleDurationSec: f0 > 0 ? 1 / f0 : 1,
      badgeLabel: '1 Root Turn',
    };
  }

  const isPurelyRational = activePartials.every((p) => p.ratio.kind === 'rational');
  if (!isPurelyRational) {
    return {
      rootTurnsToAlign: Infinity,
      isCompactSuperCycle: false,
      isAperiodic: true,
      superCycleDurationSec: Infinity,
      badgeLabel: 'Aperiodic (Inharmonic)',
    };
  }

  let D = 1;
  for (const p of activePartials) {
    if (p.ratio.kind === 'rational') {
      const reduced = reduceRational(p.ratio.num, p.ratio.den);
      D = lcm(D, reduced.den);
    }
  }

  const isCompactSuperCycle = D <= maxCompactTurns;
  const superCycleDurationSec = D / f0;
  const badgeLabel = D === 1 ? '1 Root Turn' : `${D} Root Turns (${D}x Super-Cycle)`;

  return {
    rootTurnsToAlign: D,
    isCompactSuperCycle,
    isAperiodic: false,
    superCycleDurationSec,
    badgeLabel,
  };
}

/**
 * Calculates Tenney harmonic complexity / height: log2(num * den)
 */
export function calculateTenneyHeight(num: number, den: number): number {
  const r = reduceRational(num, den);
  return Math.log2(r.num * r.den);
}

/**
 * Plomp-Levelt sensory roughness model as parameterized by Sethares:
 * d(f1, f2, a1, a2) = a1 * a2 * (e^(-b1 * s * df) - e^(-b2 * s * df))
 * where s = D* / (s1 * min(f1, f2) + s2)
 * Standard constants: b1 = 3.5, b2 = 5.75, D* = 0.24, s1 = 0.0207, s2 = 18.96
 */
export function calculatePlompLevelt(f1: number, a1: number, f2: number, a2: number): number {
  if (f1 <= 0 || f2 <= 0 || a1 <= 0 || a2 <= 0) return 0;
  const fMin = Math.min(f1, f2);
  const fMax = Math.max(f1, f2);
  const df = fMax - fMin;
  if (df <= 0.0001) return 0;

  const s1 = 0.0207;
  const s2 = 18.96;
  const Dstar = 0.24;
  const s = Dstar / (s1 * fMin + s2);

  const b1 = 3.5;
  const b2 = 5.75;
  const x = s * df;

  const roughnessFactor = Math.exp(-b1 * x) - Math.exp(-b2 * x);
  return Math.max(0, a1 * a2 * roughnessFactor);
}

/**
 * Evaluates the total pairwise roughness between partials of two placed shapes.
 */
export function calculatePairwiseRoughness(
  shapeA: Shape,
  placementA: Placement,
  shapeB: Shape,
  placementB: Placement
): number {
  const partialsA = evaluatePlacedShape(shapeA, placementA);
  const partialsB = evaluatePlacedShape(shapeB, placementB);

  let totalRoughness = 0;
  for (const pa of partialsA) {
    if (pa.filteredAmp <= 0.001) continue;
    for (const pb of partialsB) {
      if (pb.filteredAmp <= 0.001) continue;
      totalRoughness += calculatePlompLevelt(pa.freqHz, pa.filteredAmp, pb.freqHz, pb.filteredAmp);
    }
  }

  return totalRoughness;
}

export interface ConsonantIntervalMarker {
  ratio: number;
  label: string;
  name: string;
}

export const CANONICAL_INTERVAL_MARKERS: ConsonantIntervalMarker[] = [
  { ratio: 1.0, label: '1/1', name: 'Unison' },
  { ratio: 1.2, label: '6/5', name: 'Minor 3rd' },
  { ratio: 1.25, label: '5/4', name: 'Major 3rd' },
  { ratio: 4 / 3, label: '4/3', name: 'Fourth' },
  { ratio: 1.5, label: '3/2', name: 'Fifth' },
  { ratio: 5 / 3, label: '5/3', name: 'Major 6th' },
  { ratio: 2.0, label: '2/1', name: 'Octave' },
];

/**
 * Calculates William Sethares' Sensory Dissonance & Consonance curve for a timbre swept across an octave of interval probes (1.0 to 2.0).
 * Anchored to a standardized acoustic reference fundamental (220 Hz) so the timbre's intrinsic harmonic consonance
 * and polyrhythmic coincidence profile remains scale-invariant across register sweeps, while fully capturing
 * the acoustic effects of inharmonic and aperiodic partials (such as piano string inharmonicity and bells).
 */
export function calculateSetharesCurve(
  activePartials: { freqHz: number; filteredAmp: number; ratioValue: number }[],
  _f0?: number,
  numPoints: number = 64
): { points: { ratio: number; roughness: number }[]; maxRoughness: number } {
  if (activePartials.length === 0) {
    return { points: [], maxRoughness: 0.001 };
  }

  const refF0 = 220;
  const points: { ratio: number; roughness: number }[] = [];
  let maxRoughness = 0.001;

  for (let i = 0; i <= numPoints; i++) {
    const ratio = 1.0 + i / numPoints; // 1.0 to 2.0
    let rSum = 0;

    for (const p of activePartials) {
      if (p.filteredAmp <= 0.001) continue;
      const f1 = refF0 * p.ratioValue;
      for (const probe of activePartials) {
        if (probe.filteredAmp <= 0.001) continue;
        const f2 = refF0 * ratio * probe.ratioValue;
        rSum += calculatePlompLevelt(f1, p.filteredAmp, f2, probe.filteredAmp * 0.85);
      }
    }

    if (rSum > maxRoughness) maxRoughness = rSum;
    points.push({ ratio, roughness: rSum });
  }

  return { points, maxRoughness };
}

export interface VoiceCoincidenceTrack {
  id: string;
  name: string;
  semitoneIndex: number;
  baseRatio: number;
  gain: number;
  colorHex?: string;
  partials: {
    ratioValue: number;
    amp: number;
    phase: number;
    hits: number[];
  }[];
}

export interface RealignmentAnalysis {
  coherenceScore: number;
  coincidenceStride: number;
  isAperiodic: boolean;
  activeVoicesCount: number;
  activePartialsCount: number;
  windowCycles: number;
  samplePoints: Float32Array;
  peaks: { tau: number; value: number; isDownbeat: boolean }[];
  tracks: VoiceCoincidenceTrack[];
}

/**
 * Calculates the Unified Realignment & Coincidence Analysis across all active voice anchors and partials.
 * Unifies chords (multi-voice anchors) and inharmonic timbres (non-integer partials) under the exact
 * same physical reality: how frequently and cleanly all active components achieve simultaneous constructive phase alignment.
 */
export function calculateRealignmentAnalysis(
  shape: Shape,
  placement?: Placement,
  _filter?: Filter | BandFilter,
  windowCycles?: number,
  numSamples: number = 256
): RealignmentAnalysis {
  const coincidence = calculateCoincidenceCycle(shape, 440);
  const isAperiodic = coincidence.isAperiodic;
  const coincidenceStride = isAperiodic ? Infinity : coincidence.rootTurnsToAlign;

  const effectiveWindowCycles =
    windowCycles !== undefined
      ? windowCycles
      : !isAperiodic
      ? Math.max(1, Math.min(12, coincidenceStride))
      : 3.5;

  const tracks: VoiceCoincidenceTrack[] = [];
  const placementGain = placement ? (placement.mute ? 0 : placement.gain) : 1.0;

  if (shape.anchors && shape.anchors.length > 1) {
    // Multi-voice chord or multi-anchor polyrhythm
    for (const anchor of shape.anchors) {
      const anchorGain = (anchor.mute ? 0 : anchor.gain) * placementGain;
      if (anchorGain <= 0.001) continue;
      const baseRatio = ratioToValue(anchor.ratio);
      const semitone = Math.round(12 * Math.log2(baseRatio));
      const semitoneIndex = ((semitone % 12) + 12) % 12;

      const trackPartials: VoiceCoincidenceTrack['partials'] = [];
      for (const p of anchor.partials) {
        if (p.amp <= 0.001) continue;
        const pRatio = ratioToValue(p.ratio);
        const effectiveRatio = baseRatio * pRatio;
        const effectivePhase = (((anchor.phaseOffset || 0) + (p.phase || 0)) % 1.0 + 1.0) % 1.0;
        const effectiveAmp = anchorGain * p.amp;

        const hits: number[] = [];
        const maxK = Math.ceil(effectiveRatio * effectiveWindowCycles + effectivePhase) + 1;
        for (let k = 0; k <= maxK; k++) {
          const tau = (k - effectivePhase) / effectiveRatio;
          if (tau >= -0.005 && tau <= effectiveWindowCycles + 0.005) {
            hits.push(Math.max(0, tau));
          }
        }

        trackPartials.push({
          ratioValue: effectiveRatio,
          amp: effectiveAmp,
          phase: effectivePhase,
          hits,
        });
      }

      if (trackPartials.length > 0) {
        tracks.push({
          id: anchor.id,
          name: anchor.name,
          semitoneIndex,
          baseRatio,
          gain: anchorGain,
          partials: trackPartials,
        });
      }
    }
  } else {
    // Single voice with harmonic, stretched, or inharmonic partials (e.g. Bell, Tibetan Bowl, Sawtooth)
    const rawPartials = getEffectivePartials(shape).filter((p) => p.amp > 0.001);
    const sorted = [...rawPartials].sort((a, b) => b.amp - a.amp);
    const primaryPartials = sorted.slice(0, 5); // display up to 5 individual mode tracks

    for (let i = 0; i < primaryPartials.length; i++) {
      const p = primaryPartials[i];
      const pRatio = ratioToValue(p.ratio);
      const semitone = Math.round(12 * Math.log2(pRatio));
      const semitoneIndex = ((semitone % 12) + 12) % 12;
      const effectiveAmp = p.amp * placementGain;
      const hits: number[] = [];
      const maxK = Math.ceil(pRatio * effectiveWindowCycles + p.phase) + 1;
      for (let k = 0; k <= maxK; k++) {
        const tau = (k - p.phase) / pRatio;
        if (tau >= -0.005 && tau <= effectiveWindowCycles + 0.005) {
          hits.push(Math.max(0, tau));
        }
      }

      tracks.push({
        id: `mode-${i}`,
        name: p.label || (Math.abs(pRatio - 1.0) < 0.01 ? 'Root Mode (1.00x)' : `Mode ${i + 1} (${pRatio.toFixed(2)}x)`),
        semitoneIndex,
        baseRatio: pRatio,
        gain: effectiveAmp,
        partials: [
          {
            ratioValue: pRatio,
            amp: effectiveAmp,
            phase: p.phase,
            hits,
          },
        ],
      });
    }
  }

  // Flatten all partials for composite constructive wave evaluation
  interface FlattenedComponent {
    ratio: number;
    amp: number;
    phase: number;
  }
  const allComponents: FlattenedComponent[] = [];
  let totalAmp = 0;

  if (shape.anchors && shape.anchors.length > 1) {
    for (const track of tracks) {
      for (const p of track.partials) {
        allComponents.push({
          ratio: p.ratioValue,
          amp: p.amp,
          phase: p.phase,
        });
        totalAmp += p.amp;
      }
    }
  } else {
    const rawPartials = getEffectivePartials(shape).filter((p) => p.amp > 0.001);
    for (const p of rawPartials) {
      const pRatio = ratioToValue(p.ratio);
      const effectiveAmp = p.amp * placementGain;
      allComponents.push({
        ratio: pRatio,
        amp: effectiveAmp,
        phase: p.phase,
      });
      totalAmp += effectiveAmp;
    }
  }

  if (totalAmp <= 0) totalAmp = 1.0;

  // Sample constructive interference and pulse coincidence across tau in [0, effectiveWindowCycles]
  const samplePoints = new Float32Array(numSamples);
  const sigma = 0.038;
  const twoSigmaSq = 2 * sigma * sigma;

  for (let s = 0; s < numSamples; s++) {
    const tau = (s / (numSamples - 1)) * effectiveWindowCycles;
    let cosSum = 0;
    let pulseSum = 0;

    for (let c = 0; c < allComponents.length; c++) {
      const comp = allComponents[c];
      const cyclePos = comp.ratio * tau + comp.phase;
      cosSum += comp.amp * Math.cos(2 * Math.PI * cyclePos);
      const sinVal = Math.sin(Math.PI * cyclePos);
      pulseSum += comp.amp * Math.exp(-(sinVal * sinVal) / twoSigmaSq);
    }

    const cosNorm = Math.abs(cosSum) / totalAmp;
    const pulseNorm = pulseSum / totalAmp;
    samplePoints[s] = Math.max(0, Math.min(1.0, 0.45 * cosNorm + 0.55 * pulseNorm));
  }

  // Detect convergence peaks
  const peaks: { tau: number; value: number; isDownbeat: boolean }[] = [];
  peaks.push({ tau: 0, value: samplePoints[0], isDownbeat: true });

  let highestSecondaryVal = 0;

  for (let s = 1; s < numSamples - 1; s++) {
    const prev = samplePoints[s - 1];
    const curr = samplePoints[s];
    const next = samplePoints[s + 1];
    if (curr > prev && curr >= next && curr > 0.4) {
      const tau = (s / (numSamples - 1)) * effectiveWindowCycles;
      if (tau >= 0.25) {
        const isDownbeat = Math.abs(tau - Math.round(tau)) < 0.08 && curr > 0.65;
        peaks.push({ tau, value: curr, isDownbeat });
        if (curr > highestSecondaryVal) {
          highestSecondaryVal = curr;
        }
      }
    }
  }

  // Right boundary downbeat marker for complete periodic supercycles
  if (!isAperiodic && samplePoints[numSamples - 1] > 0.6) {
    peaks.push({ tau: effectiveWindowCycles, value: samplePoints[numSamples - 1], isDownbeat: true });
  }

  let coherenceScore = 0;
  if (isAperiodic) {
    coherenceScore = Math.max(0.05, Math.min(0.38, highestSecondaryVal * 0.55));
  } else {
    // Exact harmonic cadence factor matching bipedal stride:
    // D=1 -> 1.0, D=2 -> 0.85, D=3 -> 0.74, D=4 -> 0.65, D=10 -> 0.38
    const harmonicCadenceFactor = 1.0 / (1.0 + 0.18 * Math.max(0, coincidenceStride - 1));
    const peakAlignment = Math.min(1.0, Math.max(highestSecondaryVal, samplePoints[0]));
    coherenceScore = Math.max(0.25, Math.min(1.0, 0.65 * harmonicCadenceFactor + 0.35 * peakAlignment));
  }

  return {
    coherenceScore,
    coincidenceStride,
    isAperiodic,
    activeVoicesCount: tracks.length,
    activePartialsCount: allComponents.length,
    windowCycles: effectiveWindowCycles,
    samplePoints,
    peaks,
    tracks,
  };
}

export interface SupercycleVoiceTimeline {
  voiceId: string;
  label: string;
  ratioValue: number;
  events: number[];
}

/**
 * Calculates normalized event pulse hit positions [0, 1) across a super-cycle window.
 */
export function calculateSupercycleTimeline(
  shape: Shape,
  rootTurns: number
): SupercycleVoiceTimeline[] {
  const activePartials = getEffectivePartials(shape).filter((p) => p.amp > 0);
  const turns = Math.max(1, rootTurns);

  return activePartials.map((p) => {
    const val = ratioToValue(p.ratio);
    const totalEvents = Math.max(1, Math.round(val * turns));
    const events: number[] = [];
    for (let e = 0; e < totalEvents; e++) {
      const frac = ((e / totalEvents) + (p.phase / turns)) % 1.0;
      events.push((frac + 1.0) % 1.0);
    }
    return {
      voiceId: p.voice || 'kick',
      label: p.label || `${val.toFixed(2)}x`,
      ratioValue: val,
      events,
    };
  });
}
