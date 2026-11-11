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

export const PRESET_FILTERS: Filter[] = [
  // ── 1. APERTURE (Acoustic Formant Windows & Spectral Filters) ──
  {
    id: 'filter-band-pass',
    name: 'Acoustic Band-Pass',
    origin: 'preset',
    category: 'aperture',
    description: 'Resonant formant aperture centred on the spectrum',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [createBandPassCondition('scene', 0.0, 4.0, 1.0, 'cond-band-pass')],
    focus: { conditionId: 'cond-band-pass', spanIndex: 0 },
    presetId: 'filter-band-pass',
    centreD: 0.0,
    widthD: 4.0,
    softnessD: 1.0,
    mode: 'band-pass',
    trackingMode: 'relative',
  },
  {
    id: 'filter-band-reject',
    name: 'Band Notch / Reject',
    origin: 'preset',
    category: 'aperture',
    description: 'Reductive notch carve removing a specific frequency region',
    enabled: true,
    action: 'remove',
    combine: 'all',
    depth: 1.0,
    conditions: [createBandPassCondition('scene', 0.0, 2.5, 0.75, 'cond-band-reject')],
    focus: { conditionId: 'cond-band-reject', spanIndex: 0 },
    presetId: 'filter-band-reject',
    centreD: 0.0,
    widthD: 2.5,
    softnessD: 0.75,
    mode: 'band-pass',
    trackingMode: 'relative',
  },
  {
    id: 'filter-sub-bass',
    name: 'Sub-Bass Low-Pass',
    origin: 'preset',
    category: 'aperture',
    description: 'Warm acoustic low-pass filtering higher overtones',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [
      {
        kind: 'range',
        id: 'cond-sub-bass',
        reference: 'scene',
        reductionPeriod: null,
        spans: [{ lo: null, hi: { unit: 'cents', value: 700 } }],
        softness: { value: 300, unit: 'cents' },
      },
    ],
    focus: { conditionId: 'cond-sub-bass', spanIndex: 0 },
    presetId: 'filter-sub-bass',
    centreD: 0.0,
    widthD: 4.0,
    softnessD: 1.0,
    mode: 'low-pass',
    trackingMode: 'relative',
  },
  {
    id: 'filter-high-shimmer',
    name: 'High Shimmer Shelf',
    origin: 'preset',
    category: 'aperture',
    description: 'Acoustic high-pass air shelf passing upper overtones and sparkle',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [createHighPassCondition('scene', -1.0, 0.5, 'cond-high-shimmer')],
    focus: { conditionId: 'cond-high-shimmer', spanIndex: 0 },
    presetId: 'filter-high-shimmer',
    centreD: -1.0,
    widthD: 4.0,
    softnessD: 0.5,
    mode: 'high-pass',
    trackingMode: 'relative',
  },
  {
    id: 'filter-vocal-formant',
    name: "Vocal Formant 'Aah'",
    origin: 'preset',
    category: 'aperture',
    description: 'Dual-band resonant formant aperture sculpting vowel timbre',
    enabled: true,
    action: 'keep',
    combine: 'any',
    depth: 1.0,
    conditions: [
      createBandPassCondition('anchor', -0.8, 1.2, 0.4, 'cond-formant-f1'),
      createBandPassCondition('anchor', -2.1, 1.4, 0.4, 'cond-formant-f2'),
    ],
    focus: { conditionId: 'cond-formant-f1', spanIndex: 0 },
    presetId: 'filter-vocal-formant',
    centreD: -1.5,
    widthD: 3.0,
    softnessD: 0.5,
    mode: 'band-pass',
    trackingMode: 'relative',
  },

  // ── 2. RHYTHM (Cultural Syncopations, Metric Sieves, & Euclidean Grooves) ──
  {
    id: 'filter-tresillo',
    name: 'Tresillo 3:8 Sieve',
    origin: 'preset',
    category: 'rhythm',
    description: 'Cuban 3+3+2 rhythm sieve gating off-grid partial pulses',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [createEuclideanCycleCondition(3, 8, 0, 'cond-tresillo')],
    focus: null,
    presetId: 'filter-tresillo',
    centreD: 0.0,
    widthD: 4.0,
    softnessD: 1.0,
    mode: 'band-pass',
    trackingMode: 'fixed',
  },
  {
    id: 'filter-cinquillo',
    name: 'Cinquillo 5:8 Sieve',
    origin: 'preset',
    category: 'rhythm',
    description: 'Afro-Cuban / Haitian 5:8 syncopated sieve [1, 0, 1, 1, 0, 1, 1, 0]',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [createEuclideanCycleCondition(5, 8, 0, 'cond-cinquillo')],
    focus: null,
    presetId: 'filter-cinquillo',
    centreD: 0.0,
    widthD: 4.0,
    softnessD: 1.0,
    mode: 'band-pass',
    trackingMode: 'fixed',
  },
  {
    id: 'filter-son-clave',
    name: 'Son Clave 3:2 (16-Step)',
    origin: 'preset',
    category: 'rhythm',
    description: 'Foundational Afro-Cuban 3:2 Son Clave sieve [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0]',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [
      {
        kind: 'cycle',
        id: 'cond-son-clave',
        divisions: 16,
        slotWeights: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0],
        rotation: 0,
        tolerance: 0.15,
        offGridMatch: 0.0,
        supercycle: null,
      },
    ],
    focus: null,
    presetId: 'filter-son-clave',
    centreD: 0.0,
    widthD: 4.0,
    softnessD: 1.0,
    mode: 'band-pass',
    trackingMode: 'fixed',
  },
  {
    id: 'filter-bossa-clave',
    name: 'Bossa Nova Clave (16-Step)',
    origin: 'preset',
    category: 'rhythm',
    description: 'Brazilian Bossa Nova syncopated sieve [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0]',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [
      {
        kind: 'cycle',
        id: 'cond-bossa-clave',
        divisions: 16,
        slotWeights: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
        rotation: 0,
        tolerance: 0.15,
        offGridMatch: 0.0,
        supercycle: null,
      },
    ],
    focus: null,
    presetId: 'filter-bossa-clave',
    centreD: 0.0,
    widthD: 4.0,
    softnessD: 1.0,
    mode: 'band-pass',
    trackingMode: 'fixed',
  },
  {
    id: 'filter-bembe-bell',
    name: 'Bembé 12/8 Bell Pattern',
    origin: 'preset',
    category: 'rhythm',
    description: 'Sacred Yoruba 7:12 polyrhythmic bell pattern [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [createEuclideanCycleCondition(7, 12, 0, 'cond-bembe-bell')],
    focus: null,
    presetId: 'filter-bembe-bell',
    centreD: 0.0,
    widthD: 4.0,
    softnessD: 1.0,
    mode: 'band-pass',
    trackingMode: 'fixed',
  },
  {
    id: 'filter-backbeat',
    name: 'Backbeat 2 & 4 Sieve',
    origin: 'preset',
    category: 'rhythm',
    description: 'Rock / Funk snare isolation sieve keeping only pulses on beats 2 and 4',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [
      {
        kind: 'cycle',
        id: 'cond-backbeat',
        divisions: 4,
        slotWeights: [0, 1, 0, 1],
        rotation: 0,
        tolerance: 0.15,
        offGridMatch: 0.0,
        supercycle: null,
      },
    ],
    focus: null,
    presetId: 'filter-backbeat',
    centreD: 0.0,
    widthD: 4.0,
    softnessD: 1.0,
    mode: 'band-pass',
    trackingMode: 'fixed',
  },
  {
    id: 'filter-reggae-skank',
    name: 'Reggae Offbeat Skank',
    origin: 'preset',
    category: 'rhythm',
    description: 'Reggae upbeat sieve passing only offbeat 8th-note partials',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [
      {
        kind: 'cycle',
        id: 'cond-reggae-skank',
        divisions: 8,
        slotWeights: [0, 1, 0, 1, 0, 1, 0, 1],
        rotation: 0,
        tolerance: 0.15,
        offGridMatch: 0.0,
        supercycle: null,
      },
    ],
    focus: null,
    presetId: 'filter-reggae-skank',
    centreD: 0.0,
    widthD: 4.0,
    softnessD: 1.0,
    mode: 'band-pass',
    trackingMode: 'fixed',
  },
  {
    id: 'filter-triple-grid',
    name: 'Tame the Clicks (Triple Grid)',
    origin: 'preset',
    category: 'rhythm',
    description: 'Subtractive filter keeping only onsets that align with a 3-grid',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [createGridCycleCondition(3, 0.0, 'cond-grid-3')],
    focus: null,
    presetId: 'filter-triple-grid',
    centreD: 0.0,
    widthD: 4.0,
    softnessD: 1.0,
    mode: 'band-pass',
    trackingMode: 'fixed',
  },

  // ── 3. HARMONIC (Harmonic Overtone Series & Prime Limit Sieves) ──
  {
    id: 'filter-odd-harmonics',
    name: 'Odd Harmonics Only (Clarinet)',
    origin: 'preset',
    category: 'harmonic',
    description: 'Acoustic comb filter passing odd partials (1, 3, 5, 7...)',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [createOddHarmonicsCondition(31, 'cond-odd-harmonics')],
    focus: { conditionId: 'cond-odd-harmonics', spanIndex: 0 },
    presetId: 'filter-odd-harmonics',
    centreD: 0.0,
    widthD: 4.0,
    softnessD: 1.0,
    mode: 'band-pass',
    trackingMode: 'relative',
  },
  {
    id: 'filter-5-limit',
    name: '5-Limit Just Sieve',
    origin: 'preset',
    category: 'harmonic',
    description: 'Retains strictly pure Just ratios factorable by 2, 3, and 5',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [createPrimeLimitCondition(5, 'cond-5-limit')],
    focus: { conditionId: 'cond-5-limit', spanIndex: 0 },
    presetId: 'filter-5-limit',
    centreD: 0.0,
    widthD: 4.0,
    softnessD: 1.0,
    mode: 'band-pass',
    trackingMode: 'relative',
  },
  {
    id: 'filter-7-limit',
    name: '7-Limit Septimal Blues Sieve',
    origin: 'preset',
    category: 'harmonic',
    description: 'Passes septimal 7-limit intervals and natural 7/4 harmonic 7ths',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [createPrimeLimitCondition(7, 'cond-7-limit')],
    focus: { conditionId: 'cond-7-limit', spanIndex: 0 },
    presetId: 'filter-7-limit',
    centreD: 0.0,
    widthD: 4.0,
    softnessD: 1.0,
    mode: 'band-pass',
    trackingMode: 'relative',
  },

  // ── 4. INTERVAL (Interval Windows & Microtonal Bridges) ──
  {
    id: 'filter-just-12tet-m3',
    name: 'Major 3rd Just ↔ 12-TET',
    origin: 'preset',
    category: 'interval',
    description: 'Narrow window capturing 5/4 (386.3¢) through 12-TET M3 (400¢)',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [createJustTo12TetCondition('M3', 'anchor')],
    focus: { conditionId: 'cond-just-12tet-M3', spanIndex: 0 },
    presetId: 'filter-just-12tet-m3',
    centreD: 0.0,
    widthD: 0.5,
    softnessD: 0.1,
    mode: 'band-pass',
    trackingMode: 'relative',
  },
  {
    id: 'filter-consonant-fifth',
    name: 'Consonant 5th Window (3/2)',
    origin: 'preset',
    category: 'interval',
    description: 'Interval aperture capturing pure fifth (3/2, 702¢) through 12-TET (700¢)',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [createJustTo12TetCondition('P5', 'anchor')],
    focus: { conditionId: 'cond-just-12tet-P5', spanIndex: 0 },
    presetId: 'filter-consonant-fifth',
    centreD: 0.0,
    widthD: 0.5,
    softnessD: 0.1,
    mode: 'band-pass',
    trackingMode: 'relative',
  },
  {
    id: 'filter-tritone-window',
    name: 'Tritone Window (Fi Axis · 7/5 · 45/32)',
    origin: 'preset',
    category: 'interval',
    description: 'Aperture capturing the PPT Du-Fractal axis (√2, 600¢) and septimal tritone (7/5, 582.5¢)',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [
      {
        kind: 'range',
        id: 'cond-tritone-window',
        reference: 'anchor',
        reductionPeriod: { kind: 'rational', num: 2, den: 1 },
        spans: [
          {
            lo: { unit: 'cents', value: 570 },
            hi: { unit: 'cents', value: 620 },
          },
        ],
        softness: { value: 30, unit: 'cents' },
      },
    ],
    focus: { conditionId: 'cond-tritone-window', spanIndex: 0 },
    presetId: 'filter-tritone-window',
    centreD: 0.0,
    widthD: 0.5,
    softnessD: 0.1,
    mode: 'band-pass',
    trackingMode: 'relative',
  },
  {
    id: 'filter-harmonic-7th',
    name: 'Harmonic 7th Window (7/4 Just ↔ 12-TET)',
    origin: 'preset',
    category: 'interval',
    description: 'Aperture capturing natural 7/4 Just (968.8¢) through 12-TET m7 (1000¢)',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [createJustTo12TetCondition('m7', 'anchor')],
    focus: { conditionId: 'cond-just-12tet-m7', spanIndex: 0 },
    presetId: 'filter-harmonic-7th',
    centreD: 0.0,
    widthD: 0.5,
    softnessD: 0.1,
    mode: 'band-pass',
    trackingMode: 'relative',
  },
];

export const STARTER_FILTERS: StarterFilterDefinition[] = PRESET_FILTERS.map((f) => ({
  id: f.id || 'filter-preset',
  name: f.name,
  description: f.description || '',
  build: () => ({
    ...f,
    conditions: f.conditions.map((c) => ({ ...c })),
  }),
}));
