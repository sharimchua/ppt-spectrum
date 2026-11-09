import { primeFactors } from './rational';

export interface RhythmDecompositionCandidate {
  name: string;
  ratios: number[];
  cyclePeriodSec: number;
  complexityScore: number;
}

/**
 * Quantises an onset phase t/T into an 11-limit smooth fraction p/q.
 * Denominators q must only have prime factors in {2, 3, 5, 7, 11}.
 */
export function quantisePhaseTo11Limit(phaseFraction: number, maxDenominator: number = 16): { p: number; q: number; error: number } {
  let bestP = 0;
  let bestQ = 1;
  let minError = 999;

  for (let q = 1; q <= maxDenominator; q++) {
    const factors = primeFactors(q);
    const is11Limit = factors.every((f) => [2, 3, 5, 7, 11].includes(f));
    if (!is11Limit) continue;

    const p = Math.round(phaseFraction * q);
    const approx = p / q;
    const err = Math.abs(phaseFraction - approx);

    if (err < minError) {
      minError = err;
      bestP = p;
      bestQ = q;
    }
  }

  return { p: bestP, q: bestQ, error: minError };
}

/**
 * Infers possible polyrhythmic layer decompositions from a series of tap timestamps.
 */
export function decomposeTapIntervals(
  timestampsSec: number[]
): RhythmDecompositionCandidate[] {
  if (timestampsSec.length < 3) return [];

  // Compute inter-onset intervals (IOIs)
  const iois = [];
  for (let i = 1; i < timestampsSec.length; i++) {
    iois.push(timestampsSec[i] - timestampsSec[i - 1]);
  }

  const avgIoi = iois.reduce((a, b) => a + b, 0) / iois.length;
  const totalDuration = timestampsSec[timestampsSec.length - 1] - timestampsSec[0];

  const candidates: RhythmDecompositionCandidate[] = [
    {
      name: 'Steady Pulse (1:1)',
      ratios: [1],
      cyclePeriodSec: avgIoi,
      complexityScore: 1,
    },
    {
      name: 'Duple Subdivision (1:2)',
      ratios: [1, 2],
      cyclePeriodSec: avgIoi * 2,
      complexityScore: 2,
    },
    {
      name: '3 against 2 (Hemiola)',
      ratios: [2, 3],
      cyclePeriodSec: totalDuration > 1.2 ? totalDuration / 2 : avgIoi * 3,
      complexityScore: 3,
    },
    {
      name: '4 against 3',
      ratios: [3, 4],
      cyclePeriodSec: totalDuration > 1.5 ? totalDuration : avgIoi * 4,
      complexityScore: 4,
    },
  ];

  return candidates;
}
