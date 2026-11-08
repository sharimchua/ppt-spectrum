import { Shape, Placement } from './types';
import { gcd, lcm, reduceRational, ratioToValue } from './rational';
import { dToFreq, freqToD } from './axis';
import { evaluatePlacedShape } from './shape';

/**
 * Calculates the exact ghost fundamental (greatest common divisor frequency) of rational partials.
 * For rational ratios r_i = n_i / d_i at fundamental f0:
 * D = lcm(d_i), m_i = n_i * D / d_i => g = f0 * gcd(m_i) / D
 */
export function calculateGhostFundamental(shape: Shape, f0: number): { ghostFreqHz: number; cycleDurationSec: number; ghostD: number } {
  const rationalPartials = shape.partials
    .filter((p) => p.amp > 0)
    .map((p) => {
      if (p.ratio.kind === 'rational') {
        return reduceRational(p.ratio.num, p.ratio.den);
      }
      // If real, approximate with small denominator
      const val = p.ratio.value;
      const rounded = Math.round(val * 100);
      return reduceRational(rounded, 100);
    });

  if (rationalPartials.length === 0) {
    return { ghostFreqHz: f0, cycleDurationSec: 1 / f0, ghostD: freqToD(f0) };
  }

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
  const cycleDurationSec = 1 / ghostFreqHz;
  const ghostD = freqToD(ghostFreqHz);

  return { ghostFreqHz, cycleDurationSec, ghostD };
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
