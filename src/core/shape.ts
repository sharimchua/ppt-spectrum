import { Shape, Placement, PartialComponent, BandFilter } from './types';
import { ratioToValue, primeFactors } from './rational';
import { dToFreq } from './axis';

export interface EvaluatedPartial {
  id: string;
  originalIndex: number;
  d: number;
  freqHz: number;
  ratioValue: number;
  amp: number;
  filteredAmp: number;
  phase: number;
  primeFamily: '2' | '3' | '5' | '7' | '11' | 'higher';
  voice?: string;
  label?: string;
  derived?: boolean;
}

export function classifyPrimeFamily(ratioVal: number): '2' | '3' | '5' | '7' | '11' | 'higher' {
  // If close to an integer multiple, inspect prime factors
  const nearestInt = Math.round(ratioVal);
  if (Math.abs(ratioVal - nearestInt) < 0.05 && nearestInt > 1) {
    const factors = primeFactors(nearestInt);
    const maxP = Math.max(...factors);
    if (maxP === 2) return '2';
    if (maxP === 3) return '3';
    if (maxP === 5) return '5';
    if (maxP === 7) return '7';
    if (maxP === 11) return '11';
    return 'higher';
  }
  return 'higher';
}

/**
 * Calculates the raised-cosine attenuation factor g(d) for a BandFilter.
 * Returns value in [0, 1].
 */
export function calculateFilterGain(d: number, filter: BandFilter): number {
  if (!filter.enabled) return 1.0;
  const halfW = filter.widthD / 2;
  const dist = Math.abs(d - filter.centreD);
  const soft = Math.max(0.001, filter.softnessD);

  switch (filter.mode) {
    case 'band-pass': {
      if (dist <= halfW) return 1.0;
      if (dist >= halfW + soft) return 0.0;
      const x = (dist - halfW) / soft;
      return 0.5 * (1 + Math.cos(Math.PI * x));
    }
    case 'low-pass': {
      // In DuPeriod coordinates, low frequency is higher d (rhythm).
      // If we mean acoustic low-pass (keeping lower frequencies, i.e. d >= cutoffD):
      const cutoff = filter.centreD;
      if (d >= cutoff) return 1.0;
      if (d <= cutoff - soft) return 0.0;
      const x = (cutoff - d) / soft;
      return 0.5 * (1 + Math.cos(Math.PI * x));
    }
    case 'high-pass': {
      // Acoustic high-pass: keeping higher frequencies (smaller / negative d)
      const cutoff = filter.centreD;
      if (d <= cutoff) return 1.0;
      if (d >= cutoff + soft) return 0.0;
      const x = (d - cutoff) / soft;
      return 0.5 * (1 + Math.cos(Math.PI * x));
    }
    default:
      return 1.0;
  }
}

/**
 * Evaluates the absolute coordinates, frequencies, and filtered amplitudes of all partials in a placed shape.
 */
export function evaluatePlacedShape(
  shape: Shape,
  placement: Placement,
  filter?: BandFilter
): EvaluatedPartial[] {
  return shape.partials.map((p, idx) => {
    const ratioVal = ratioToValue(p.ratio);
    // d_i = p.d - log2(r_i)
    const partialD = placement.d - Math.log2(ratioVal);
    const freqHz = dToFreq(partialD);
    const filterGain = filter ? calculateFilterGain(partialD, filter) : 1.0;
    const effectiveAmp = p.amp * placement.gain * (placement.mute ? 0 : 1);

    return {
      id: p.id,
      originalIndex: idx,
      d: partialD,
      freqHz,
      ratioValue: ratioVal,
      amp: effectiveAmp,
      filteredAmp: effectiveAmp * filterGain,
      phase: p.phase,
      primeFamily: classifyPrimeFamily(ratioVal),
      voice: p.voice,
      label: p.label,
      derived: p.derived,
    };
  });
}

export interface PrimeProfile {
  familyWeights: Record<'2' | '3' | '5' | '7' | '11' | 'higher', number>;
  totalWeight: number;
}

/**
 * Calculates the amplitude-weighted Prime Spectral Profile of a shape.
 */
export function calculatePrimeProfile(shape: Shape): PrimeProfile {
  const familyWeights = {
    '2': 0,
    '3': 0,
    '5': 0,
    '7': 0,
    '11': 0,
    'higher': 0,
  };
  let totalWeight = 0;

  for (const p of shape.partials) {
    const rVal = ratioToValue(p.ratio);
    const fam = classifyPrimeFamily(rVal);
    familyWeights[fam] += p.amp;
    totalWeight += p.amp;
  }

  return { familyWeights, totalWeight };
}
