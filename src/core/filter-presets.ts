/**
 * Filter presets and procedural condition generators.
 * Generates acoustic aperture formants, microtonal Just <-> 12-TET windows,
 * prime-limit and harmonic sieve sets, Euclidean polyrhythms, and supercycles.
 */

import {
  Filter,
  RangeCondition,
  RangeSpan,
  CycleCondition,
  FilterReference,
  MAX_SPANS,
} from './filter-types';
import { Ratio } from './types';
import { primeLimit, reduceRational } from './rational';

/**
 * Procedural Björklund Euclidean rhythm generator.
 * Distributes k pulses as evenly as possible across n grid slots.
 */
export function bjorklund(k: number, n: number): number[] {
  const steps = Math.max(1, Math.floor(n));
  const pulses = Math.max(0, Math.min(steps, Math.floor(k)));

  if (pulses === 0) return new Array(steps).fill(0);
  if (pulses === steps) return new Array(steps).fill(1);

  let a = Array.from({ length: pulses }, () => [1]);
  let b = Array.from({ length: steps - pulses }, () => [0]);

  while (b.length > 1) {
    const min = Math.min(a.length, b.length);
    for (let i = 0; i < min; i++) {
      a[i] = a[i].concat(b[i]);
    }
    b = b.slice(min);
    if (a.length > min) {
      const rem = a.slice(min);
      a = a.slice(0, min);
      b = rem;
    }
  }

  const result: number[] = [];
  for (const g of a) result.push(...g);
  for (const g of b) result.push(...g);
  return result;
}

/**
 * Procedural Xenakis residue sieve generator.
 * Combines residue classes (slot = residue mod modulus) via union.
 */
export function sieveWeights(
  divisions: number,
  clauses: Array<{ modulus: number; residue: number }>
): number[] {
  const weights = new Array(divisions).fill(0);
  for (let i = 0; i < divisions; i++) {
    for (const cl of clauses) {
      if (cl.modulus > 0 && i % cl.modulus === ((cl.residue % cl.modulus) + cl.modulus) % cl.modulus) {
        weights[i] = 1.0;
        break;
      }
    }
  }
  return weights;
}

/**
 * Creates a standard raised-cosine acoustic aperture band-pass condition.
 */
export function createBandPassCondition(
  reference: FilterReference = 'scene',
  centreD: number = 0.0,
  widthD: number = 4.0,
  softnessD: number = 1.0,
  id: string = 'cond-band-pass'
): RangeCondition {
  const halfW = widthD / 2.0;
  return {
    kind: 'range',
    id,
    reference,
    reductionPeriod: null,
    spans: [
      {
        lo: { unit: 'd', value: centreD + halfW },
        hi: { unit: 'd', value: centreD - halfW },
      },
    ],
    softness: { value: softnessD, unit: 'd' },
  };
}

/**
 * Creates an acoustic low-pass condition (attenuating higher frequencies / smaller d).
 */
export function createLowPassCondition(
  reference: FilterReference = 'scene',
  cutoffD: number = 0.0,
  softnessD: number = 1.0,
  id: string = 'cond-low-pass'
): RangeCondition {
  return {
    kind: 'range',
    id,
    reference,
    reductionPeriod: null,
    spans: [
      {
        lo: null,
        hi: { unit: 'd', value: cutoffD },
      },
    ],
    softness: { value: softnessD, unit: 'd' },
  };
}

/**
 * Creates an acoustic high-pass condition (attenuating lower frequencies / larger d).
 */
export function createHighPassCondition(
  reference: FilterReference = 'scene',
  cutoffD: number = 0.0,
  softnessD: number = 1.0,
  id: string = 'cond-high-pass'
): RangeCondition {
  return {
    kind: 'range',
    id,
    reference,
    reductionPeriod: null,
    spans: [
      {
        lo: { unit: 'd', value: cutoffD },
        hi: null,
      },
    ],
    softness: { value: softnessD, unit: 'd' },
  };
}

/**
 * Creates a Just <-> 12-TET interval window condition.
 * E.g. Major 3rd: [5/4 (386.31¢), 4\12 (400¢)].
 */
export function createJustTo12TetCondition(
  interval: 'm3' | 'M3' | 'P4' | 'P5' | 'M6' | 'm7',
  reference: FilterReference = 'anchor',
  id: string = `cond-just-12tet-${interval}`
): RangeCondition {
  const intervalDefs: Record<string, { just: Ratio; edoSteps: number; label: string }> = {
    m3: { just: { kind: 'rational', num: 6, den: 5 }, edoSteps: 3, label: 'Minor 3rd' },
    M3: { just: { kind: 'rational', num: 5, den: 4 }, edoSteps: 4, label: 'Major 3rd' },
    P4: { just: { kind: 'rational', num: 4, den: 3 }, edoSteps: 5, label: 'Perfect 4th' },
    P5: { just: { kind: 'rational', num: 3, den: 2 }, edoSteps: 7, label: 'Perfect 5th' },
    M6: { just: { kind: 'rational', num: 5, den: 3 }, edoSteps: 9, label: 'Major 6th' },
    m7: { just: { kind: 'rational', num: 7, den: 4 }, edoSteps: 10, label: 'Harmonic 7th' },
  };

  const def = intervalDefs[interval] || intervalDefs.M3;
  return {
    kind: 'range',
    id,
    reference,
    reductionPeriod: { kind: 'rational', num: 2, den: 1 },
    spans: [
      {
        lo: { unit: 'ratio', ratio: def.just },
        hi: { unit: 'edo', steps: def.edoSteps, divisions: 12 },
      },
    ],
    softness: { value: 6.0, unit: 'cents' },
  };
}

/**
 * Creates an Odd Harmonics condition (fundamental, 3rd, 5th, 7th, 9th, 11th...).
 */
export function createOddHarmonicsCondition(
  maxHarmonic: number = 31,
  id: string = 'cond-odd-harmonics'
): RangeCondition {
  const spans: RangeSpan[] = [];
  const limit = Math.min(maxHarmonic, MAX_SPANS * 2);
  for (let n = 1; n <= limit; n += 2) {
    spans.push({
      lo: { unit: 'cents' as const, value: Math.round(1200 * Math.log2(n) - 12) },
      hi: { unit: 'cents' as const, value: Math.round(1200 * Math.log2(n) + 12) },
    });
    if (spans.length >= MAX_SPANS) break;
  }

  return {
    kind: 'range',
    id,
    reference: 'anchor',
    reductionPeriod: null,
    spans,
    softness: { value: 8.0, unit: 'cents' },
  };
}

/**
 * Creates a prime-limit ratio condition (e.g. 5-limit, 7-limit, 11-limit).
 */
export function createPrimeLimitCondition(
  limit: 5 | 7 | 11 = 5,
  id: string = `cond-limit-${limit}`
): RangeCondition {
  const spans: RangeSpan[] = [];
  for (let den = 1; den <= 16; den++) {
    for (let num = den; num <= den * 2; num++) {
      const red = reduceRational(num, den);
      if (primeLimit(red.num) <= limit && primeLimit(red.den) <= limit) {
        const cents = 1200.0 * Math.log2(red.num / red.den);
        spans.push({
          lo: { unit: 'cents' as const, value: cents - 10.0 },
          hi: { unit: 'cents' as const, value: cents + 10.0 },
        });
        if (spans.length >= MAX_SPANS) break;
      }
    }
    if (spans.length >= MAX_SPANS) break;
  }

  return {
    kind: 'range',
    id,
    reference: 'anchor',
    reductionPeriod: { kind: 'rational', num: 2, den: 1 },
    spans,
    softness: { value: 5.0, unit: 'cents' },
  };
}

/**
 * Creates a Euclidean polyrhythm cycle condition.
 */
export function createEuclideanCycleCondition(
  k: number = 3,
  n: number = 8,
  rotation: number = 0,
  id: string = `cond-euclid-${k}-${n}`
): CycleCondition {
  const weights = bjorklund(k, n);
  return {
    kind: 'cycle',
    id,
    divisions: n,
    slotWeights: weights,
    rotation,
    tolerance: 0.25,
    offGridMatch: 0.0,
    supercycle: null,
  };
}

/**
 * Creates a grid sieve condition keeping only onsets that align with a specific subdivision.
 */
export function createGridCycleCondition(
  divisions: number = 3,
  offGridMatch: number = 0.0,
  id: string = `cond-grid-${divisions}`
): CycleCondition {
  return {
    kind: 'cycle',
    id,
    divisions,
    slotWeights: new Array(divisions).fill(1.0),
    rotation: 0,
    tolerance: 0.2,
    offGridMatch,
    supercycle: null,
  };
}

/**
 * Creates a supercycle condition (e.g. 3-of-4 cycles, last-of-4 fill).
 */
export function createSupercycleCondition(
  length: number = 4,
  activeCycles: number[] = [0, 1, 2],
  id: string = `cond-supercycle-${length}`
): CycleCondition {
  const cycleWeights = new Array(length).fill(0.0);
  for (const c of activeCycles) {
    if (c >= 0 && c < length) {
      cycleWeights[c] = 1.0;
    }
  }

  return {
    kind: 'cycle',
    id,
    divisions: 1,
    slotWeights: [1.0],
    rotation: 0,
    tolerance: 0.5,
    offGridMatch: 1.0,
    supercycle: {
      length,
      cycleWeights,
    },
  };
}

export interface StarterFilterDefinition {
  id: string;
  name: string;
  description: string;
  build: () => Filter;
}

export const STARTER_FILTERS: StarterFilterDefinition[] = [
  {
    id: 'starter-band-pass',
    name: 'Acoustic Band-Pass',
    description: 'Resonant formant aperture centred on the spectrum',
    build: () => ({
      enabled: true,
      name: 'Band-Pass Aperture',
      action: 'keep',
      combine: 'all',
      depth: 1.0,
      conditions: [createBandPassCondition('scene', 0.0, 4.0, 1.0)],
      focus: { conditionId: 'cond-band-pass', spanIndex: 0 },
      presetId: 'starter-band-pass',
      centreD: 0.0,
      widthD: 4.0,
      softnessD: 1.0,
      mode: 'band-pass',
      trackingMode: 'relative',
    }),
  },
  {
    id: 'starter-band-reject',
    name: 'Band Notch / Reject',
    description: 'Reductive notch carve removing a specific frequency region',
    build: () => ({
      enabled: true,
      name: 'Band Reject Notch',
      action: 'remove',
      combine: 'all',
      depth: 1.0,
      conditions: [createBandPassCondition('scene', 0.0, 2.5, 0.75)],
      focus: { conditionId: 'cond-band-pass', spanIndex: 0 },
      presetId: 'starter-band-reject',
      centreD: 0.0,
      widthD: 2.5,
      softnessD: 0.75,
      mode: 'band-pass',
      trackingMode: 'relative',
    }),
  },
  {
    id: 'starter-just-12tet-m3',
    name: 'Major 3rd Just ↔ 12-TET',
    description: 'Narrow window capturing 5/4 (386.3¢) through 12-TET M3 (400¢)',
    build: () => ({
      enabled: true,
      name: 'M3 Just ↔ 12-TET Window',
      action: 'keep',
      combine: 'all',
      depth: 1.0,
      conditions: [createJustTo12TetCondition('M3', 'anchor')],
      focus: { conditionId: 'cond-just-12tet-M3', spanIndex: 0 },
      presetId: 'starter-just-12tet-m3',
      centreD: 0.0,
      widthD: 0.5,
      softnessD: 0.1,
      mode: 'band-pass',
      trackingMode: 'relative',
    }),
  },
  {
    id: 'starter-tresillo',
    name: 'Tresillo 3:8 Reductive Sieve',
    description: 'Cuban 3+3+2 rhythm sieve gating off-grid partial pulses',
    build: () => ({
      enabled: true,
      name: 'Tresillo 3:8 Sieve',
      action: 'keep',
      combine: 'all',
      depth: 1.0,
      conditions: [createEuclideanCycleCondition(3, 8, 0, 'cond-tresillo')],
      focus: null,
      presetId: 'starter-tresillo',
      centreD: 0.0,
      widthD: 4.0,
      softnessD: 1.0,
      mode: 'band-pass',
      trackingMode: 'fixed',
    }),
  },
  {
    id: 'starter-triple-grid',
    name: 'Tame the Clicks (Triple Grid)',
    description: 'Subtractive filter keeping only onsets that align with a 3-grid',
    build: () => ({
      enabled: true,
      name: 'Triple Grid Sieve',
      action: 'keep',
      combine: 'all',
      depth: 1.0,
      conditions: [createGridCycleCondition(3, 0.0, 'cond-grid-3')],
      focus: null,
      presetId: 'starter-triple-grid',
      centreD: 0.0,
      widthD: 4.0,
      softnessD: 1.0,
      mode: 'band-pass',
      trackingMode: 'fixed',
    }),
  },
  {
    id: 'starter-odd-harmonics',
    name: 'Odd Harmonics Only (Clarinet)',
    description: 'Acoustic comb filter passing odd partials (1, 3, 5, 7...)',
    build: () => ({
      enabled: true,
      name: 'Odd Harmonics Sieve',
      action: 'keep',
      combine: 'all',
      depth: 1.0,
      conditions: [createOddHarmonicsCondition(31, 'cond-odd-harmonics')],
      focus: { conditionId: 'cond-odd-harmonics', spanIndex: 0 },
      presetId: 'starter-odd-harmonics',
      centreD: 0.0,
      widthD: 4.0,
      softnessD: 1.0,
      mode: 'band-pass',
      trackingMode: 'relative',
    }),
  },
];
