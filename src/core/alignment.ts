import { Shape, Placement } from './types';
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
