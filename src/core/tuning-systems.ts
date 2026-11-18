/**
 * Generalized Pure Tuning System & Tuning Subset (Sieve) Engine.
 * Separates:
 * 1. Tuning System (Period-based lattice via EDO, Ratio-Chain, or Explicit Degree Formula)
 * 2. Tuning Subset / Sieve (Scale / Key mask over the Tuning System's steps)
 * 3. Relative vs Absolute DuPeriod projection helpers
 */

import { TPL_FREQUENCY_HZ } from './ppt-constants';
import { reduceRational } from './rational';
import { dToBpm, dToFreq, freqToD, midiToFreq, resolveDuPeriodAddress } from './axis';
import type {
  MidiNoteMappingResult,
  MidiTuningConfig,
  PrimeFamilyLabel,
  TplPolarity,
} from './midi-tuning';

export type TuningSystemMode = 'chromatic-12' | 'pythagorean-chain' | '31edo' | 'custom-system';
export type Edo31SubsetId = 'chromatic' | 'meantone-7' | 'pentatonic-5' | 'septimal';
export type ProjectionMode = 'nearest-12' | 'step-system' | 'step-subset';

export type TuningSubsetId =
  | 'all'
  | 'pentatonic'
  | 'blues'
  | 'whole-tone'
  | 'heptatonic'
  | 'octatonic'
  | 'nonatonic'
  | 'meantone'
  | 'septimal'
  | 'rast'
  | 'bayati'
  | 'hijaz'
  | 'pathet-nem'
  | 'pathet-barang';

export interface ExplicitDegreeSpec {
  label: string;
  subLabel?: string;
  ratioValue: number;
  rational?: { num: number; den: number } | null;
  primeFamily?: PrimeFamilyLabel;
}

export type TuningSystemSpec =
  | { kind: 'edo'; divisions: number; periodRatio?: number; id?: string }
  | {
      kind: 'ratio-chain';
      generatorNum: number;
      generatorDen: number;
      chainLength: number;
      centered?: boolean;
      periodRatio?: number;
      id?: string;
    }
  | { kind: 'explicit'; degrees: ExplicitDegreeSpec[]; periodRatio?: number; id?: string };

export type DegreeHighlightRole = 'root' | 'consonant' | 'semitone' | 'tritone' | 'septimal';

export interface TuningDegree {
  index: number;
  label: string;
  subLabel: string;
  chainStep?: number;
  edoStep?: number;
  ratioValue: number;
  rational: { num: number; den: number } | null;
  cents: number;
  active: boolean;
  highlightRole?: DegreeHighlightRole;
  primeFamily?: PrimeFamilyLabel;
}

const TPL_POLARITY_EPSILON_D = 1e-4;

/**
 * Computes the period-reduced [1/1, periodRatio) rational ratio for k stacked generator steps.
 */
export function pythagoreanFifthStep(
  k: number,
  generatorNum: number = 3,
  generatorDen: number = 2,
  periodRatio: number = 2.0
): { num: number; den: number; ratioValue: number; chainStep: number } {
  const absK = Math.abs(k);
  let num = k >= 0 ? Math.pow(generatorNum, absK) : Math.pow(generatorDen, absK);
  let den = k >= 0 ? Math.pow(generatorDen, absK) : Math.pow(generatorNum, absK);
  // Keep integers exact when periodRatio === 2 and values are within safe integer range
  if (periodRatio === 2.0 && absK <= 30) {
    while (num / den >= 2) den *= 2;
    while (num / den < 1) num *= 2;
    const reduced = reduceRational(num, den);
    return { num: reduced.num, den: reduced.den, ratioValue: reduced.num / reduced.den, chainStep: k };
  }
  let val = num / den;
  while (val >= periodRatio) val /= periodRatio;
  while (val < 1) val *= periodRatio;
  return { num: 1, den: 1, ratioValue: val, chainStep: k };
}

/**
 * Builds a Ratio-Chain Tuning System sorted ascending in pitch [1/1, periodRatio).
 */
export function buildRatioChainDegrees(
  chainLength: number = 12,
  generatorNum: number = 3,
  generatorDen: number = 2,
  periodRatio: number = 2.0,
  subsetId: TuningSubsetId = 'all',
  activeMask?: boolean[],
  centered: boolean = false
): TuningDegree[] {
  const clampedLen = Math.max(2, Math.min(53, Math.round(chainLength)));
  const startK = centered ? -Math.floor((clampedLen - 1) / 2) : 0;
  const rawSteps = Array.from({ length: clampedLen }, (_, i) =>
    pythagoreanFifthStep(startK + i, generatorNum, generatorDen, periodRatio)
  );
  rawSteps.sort((a, b) => a.ratioValue - b.ratioValue);

  const subsetCount = subsetId === 'pentatonic' ? 5 : subsetId === 'heptatonic' ? 7 : clampedLen;

  return rawSteps.map((step, index) => {
    const cents = Math.round(Math.log2(step.ratioValue) * 12000) / 10;
    const defaultActive = centered
      ? subsetId === 'pentatonic'
        ? step.chainStep >= 0 && step.chainStep <= 4
        : subsetId === 'heptatonic'
        ? step.chainStep >= -1 && step.chainStep <= 5
        : true
      : step.chainStep < subsetCount;
    const active = activeMask && activeMask.length === clampedLen ? Boolean(activeMask[index]) : defaultActive;

    let highlightRole: DegreeHighlightRole | undefined;
    if (step.chainStep === 0) highlightRole = 'root';
    else if (Math.abs(step.chainStep) < 5) highlightRole = 'consonant';
    else if (Math.abs(step.chainStep) === 6) highlightRole = 'tritone';
    else if (Math.abs(step.chainStep) === 5 || Math.abs(step.chainStep) === 7) highlightRole = 'semitone';

    const useExact = periodRatio === 2.0 && Math.abs(step.chainStep) <= 16;
    const kLabel = step.chainStep > 0 ? `+${step.chainStep}` : `${step.chainStep}`;
    return {
      index,
      label: useExact ? `${step.num}/${step.den}` : `${Math.round(cents)}¢`,
      subLabel: step.chainStep === 0 ? 'Root' : `${kLabel}×${generatorNum}:${generatorDen}`,
      chainStep: step.chainStep,
      ratioValue: step.ratioValue,
      rational: useExact ? { num: step.num, den: step.den } : null,
      cents,
      active,
      highlightRole,
      primeFamily: 'Tri',
    };
  });
}

/**
 * Legacy-compatible alias for Pythagorean 3:2 chains.
 */
export function buildPythagoreanChainDegrees(
  chainLength: number = 5,
  activeMask?: boolean[]
): TuningDegree[] {
  const subsetId: TuningSubsetId =
    chainLength <= 5 ? 'pentatonic' : chainLength <= 7 ? 'heptatonic' : 'all';
  return buildRatioChainDegrees(12, 3, 2, 2.0, subsetId, activeMask);
}

const EDO_SUBSET_STEPS: Record<number, Partial<Record<TuningSubsetId, number[]>>> = {
  12: {
    pentatonic: [0, 2, 4, 7, 9],
    blues: [0, 3, 5, 6, 7, 10],
    'whole-tone': [0, 2, 4, 6, 8, 10],
    heptatonic: [0, 2, 4, 5, 7, 9, 11],
    octatonic: [0, 2, 3, 5, 6, 8, 9, 11],
    nonatonic: [0, 2, 3, 4, 5, 7, 9, 10, 11],
  },
  24: {
    pentatonic: [0, 4, 7, 14, 18],
    rast: [0, 4, 7, 10, 14, 18, 21],
    bayati: [0, 3, 6, 10, 14, 16, 20],
    hijaz: [0, 2, 7, 10, 14, 16, 22],
  },
  31: {
    pentatonic: [0, 5, 10, 18, 23],
    meantone: [0, 5, 10, 13, 18, 23, 28],
    heptatonic: [0, 5, 10, 13, 18, 23, 28],
    septimal: [0, 7, 10, 18, 25],
  },
  53: {
    pentatonic: [0, 9, 18, 31, 40],
    heptatonic: [0, 9, 18, 22, 31, 40, 49],
    meantone: [0, 8, 17, 22, 31, 39, 48],
  },
  13: {
    // Bohlen-Pierce Lambda / Tritave 9-step scale
    heptatonic: [0, 2, 3, 4, 6, 7, 9, 10, 12],
  },
};

const EDO31_LANDMARKS: Record<number, { label: string; role?: DegreeHighlightRole }> = {
  0: { label: '1/1', role: 'root' },
  5: { label: 'M2', role: 'consonant' },
  7: { label: '~7/6', role: 'septimal' },
  8: { label: '~6/5', role: 'consonant' },
  10: { label: '~5/4', role: 'consonant' },
  13: { label: '~4/3', role: 'consonant' },
  15: { label: '~7/5', role: 'tritone' },
  18: { label: '~3/2', role: 'consonant' },
  20: { label: '~8/5', role: 'consonant' },
  23: { label: '~5/3', role: 'consonant' },
  25: { label: '~7/4', role: 'septimal' },
  28: { label: '~15/8', role: 'semitone' },
};

/**
 * Builds an Equal-Division Tuning System (any N-EDO and periodRatio).
 */
export function buildEdoDegrees(
  divisions: number,
  periodRatio: number = 2.0,
  subsetId: TuningSubsetId = 'all',
  activeMask?: boolean[]
): TuningDegree[] {
  const N = Math.max(2, Math.min(72, Math.round(divisions)));
  const subsetList = EDO_SUBSET_STEPS[N]?.[subsetId];
  const activeSet = subsetList ? new Set(subsetList) : null;

  return Array.from({ length: N }, (_, k) => {
    const ratioValue = Math.pow(periodRatio, k / N);
    const cents = Math.round(Math.log2(ratioValue) * 12000) / 10;
    const landmark = N === 31 ? EDO31_LANDMARKS[k] : undefined;
    const defaultActive = activeSet ? activeSet.has(k) : true;
    const active = activeMask && activeMask.length === N ? Boolean(activeMask[k]) : defaultActive;

    return {
      index: k,
      label: `${k}\\${N}`,
      subLabel: landmark?.label ?? `${Math.round(cents)}¢`,
      edoStep: k,
      ratioValue,
      rational: null,
      cents,
      active,
      highlightRole: k === 0 ? 'root' : landmark?.role,
      primeFamily: '12TET',
    };
  });
}

/**
 * Legacy-compatible alias for 31-EDO subsets.
 */
export function build31EdoDegrees(
  subset: Edo31SubsetId = 'meantone-7',
  activeMask?: boolean[]
): TuningDegree[] {
  const subsetId: TuningSubsetId =
    subset === 'chromatic'
      ? 'all'
      : subset === 'meantone-7'
      ? 'meantone'
      : subset === 'pentatonic-5'
      ? 'pentatonic'
      : 'septimal';
  return buildEdoDegrees(31, 2.0, subsetId, activeMask);
}

/** Javanese Pelog 7-tone reference cents & Pathet subsets */
export const PELOG_DEGREES: ExplicitDegreeSpec[] = [
  { label: '1 (Bem)', subLabel: '0¢', ratioValue: 1.0 },
  { label: '2 (Gulu)', subLabel: '120¢', ratioValue: Math.pow(2, 120 / 1200) },
  { label: '3 (Dada)', subLabel: '270¢', ratioValue: Math.pow(2, 270 / 1200) },
  { label: '4 (Pelog)', subLabel: '540¢', ratioValue: Math.pow(2, 540 / 1200) },
  { label: '5 (Lima)', subLabel: '670¢', ratioValue: Math.pow(2, 670 / 1200) },
  { label: '6 (Nem)', subLabel: '785¢', ratioValue: Math.pow(2, 785 / 1200) },
  { label: '7 (Barang)', subLabel: '950¢', ratioValue: Math.pow(2, 950 / 1200) },
];

/** Javanese Slendro 5-tone reference cents */
export const SLENDRO_DEGREES: ExplicitDegreeSpec[] = [
  { label: '1 (Nem)', subLabel: '0¢', ratioValue: 1.0 },
  { label: '2 (Barang)', subLabel: '238¢', ratioValue: Math.pow(2, 238 / 1200) },
  { label: '3 (Gulu)', subLabel: '482¢', ratioValue: Math.pow(2, 482 / 1200) },
  { label: '5 (Dada)', subLabel: '722¢', ratioValue: Math.pow(2, 722 / 1200) },
  { label: '6 (Lima)', subLabel: '956¢', ratioValue: Math.pow(2, 956 / 1200) },
];

const EXPLICIT_SUBSET_INDICES: Record<string, Partial<Record<TuningSubsetId, number[]>>> = {
  pelog: {
    'pathet-nem': [0, 1, 2, 4, 5],
    'pathet-barang': [1, 2, 4, 5, 6],
  },
  '12-explicit': {
    pentatonic: [0, 2, 4, 7, 9],
    blues: [0, 3, 5, 6, 7, 10],
    'whole-tone': [0, 2, 4, 6, 8, 10],
    heptatonic: [0, 2, 4, 5, 7, 9, 11],
    octatonic: [0, 2, 3, 5, 6, 8, 9, 11],
    nonatonic: [0, 2, 3, 4, 5, 7, 9, 10, 11],
  },
};

/**
 * Returns the Tuning Subset options relevant to a given TuningSystemSpec.
 */
export function getAvailableSubsetsForSystem(
  spec: TuningSystemSpec
): Array<{ id: TuningSubsetId; label: string }> {
  if (spec.kind === 'ratio-chain') {
    return [
      { id: 'all', label: `All ${spec.chainLength}` },
      { id: 'pentatonic', label: 'Pentatonic (5)' },
      { id: 'heptatonic', label: 'Heptatonic (7)' },
    ];
  }
  if (spec.kind === 'edo') {
    if (spec.divisions === 31) {
      return [
        { id: 'all', label: 'All 31' },
        { id: 'meantone', label: 'Meantone (7)' },
        { id: 'pentatonic', label: 'Pentatonic (5)' },
        { id: 'septimal', label: 'Septimal (5)' },
      ];
    }
    if (spec.divisions === 24) {
      return [
        { id: 'all', label: 'All 24' },
        { id: 'rast', label: 'Maqam Rast (7)' },
        { id: 'bayati', label: 'Maqam Bayati (7)' },
        { id: 'hijaz', label: 'Maqam Hijaz (7)' },
        { id: 'pentatonic', label: 'Pentatonic (5)' },
      ];
    }
    if (spec.divisions === 53) {
      return [
        { id: 'all', label: 'All 53' },
        { id: 'heptatonic', label: 'Pyth. Diatonic (7)' },
        { id: 'meantone', label: 'Meantone (7)' },
        { id: 'pentatonic', label: 'Pentatonic (5)' },
      ];
    }
    if (spec.divisions === 13 && (spec.periodRatio ?? 2) > 2.5) {
      return [
        { id: 'all', label: 'All 13' },
        { id: 'heptatonic', label: 'Lambda (9)' },
      ];
    }
    if (spec.divisions === 12) {
      return [
        { id: 'all', label: 'All 12' },
        { id: 'pentatonic', label: 'Pentatonic (5)' },
        { id: 'blues', label: 'Blues (6)' },
        { id: 'whole-tone', label: 'Whole-Tone (6)' },
        { id: 'heptatonic', label: 'Diatonic (7)' },
        { id: 'octatonic', label: 'Octatonic (8)' },
        { id: 'nonatonic', label: 'Nonatonic (9)' },
      ];
    }
    return [
      { id: 'all', label: `All ${spec.divisions}` },
      { id: 'heptatonic', label: 'Diatonic (7)' },
      { id: 'pentatonic', label: 'Pentatonic (5)' },
    ];
  }
  if (spec.id === 'pelog') {
    return [
      { id: 'all', label: 'All 7' },
      { id: 'pathet-nem', label: 'Pathet Nem (5)' },
      { id: 'pathet-barang', label: 'Pathet Barang (5)' },
    ];
  }
  if (spec.degrees.length === 12) {
    return [
      { id: 'all', label: 'All 12' },
      { id: 'pentatonic', label: 'Pentatonic (5)' },
      { id: 'blues', label: 'Blues (6)' },
      { id: 'whole-tone', label: 'Whole-Tone (6)' },
      { id: 'heptatonic', label: 'Diatonic (7)' },
      { id: 'octatonic', label: 'Octatonic (8)' },
      { id: 'nonatonic', label: 'Nonatonic (9)' },
    ];
  }
  return [{ id: 'all', label: `All ${spec.degrees.length}` }];
}

/**
 * Resolves the effective TuningSystemSpec from a MidiTuningConfig.
 */
export function resolveSystemSpec(config: MidiTuningConfig): TuningSystemSpec {
  if (config.systemSpec) return config.systemSpec;
  if (config.systemMode === 'pythagorean-chain') {
    return { kind: 'ratio-chain', generatorNum: 3, generatorDen: 2, chainLength: 12, periodRatio: 2.0 };
  }
  if (config.systemMode === '31edo') {
    return { kind: 'edo', divisions: 31, periodRatio: 2.0 };
  }
  return { kind: 'edo', divisions: 12, periodRatio: 2.0 };
}

/**
 * Resolves the active TuningSubsetId from a MidiTuningConfig.
 */
export function resolveSubsetId(config: MidiTuningConfig): TuningSubsetId {
  if (config.subsetId) return config.subsetId;
  if (config.systemMode === 'pythagorean-chain') {
    const len = config.pythagoreanChainLength ?? 5;
    return len <= 5 ? 'pentatonic' : len <= 7 ? 'heptatonic' : 'all';
  }
  if (config.systemMode === '31edo') {
    const sub = config.edo31Subset ?? 'meantone-7';
    if (sub === 'chromatic') return 'all';
    if (sub === 'meantone-7') return 'meantone';
    if (sub === 'pentatonic-5') return 'pentatonic';
    return 'septimal';
  }
  return 'all';
}

/**
 * Resolves all degrees (active & inactive) for any MidiTuningConfig.
 */
export function resolveTuningDegrees(config: MidiTuningConfig): TuningDegree[] {
  const spec = resolveSystemSpec(config);
  const subsetId = resolveSubsetId(config);

  if (spec.kind === 'ratio-chain') {
    return buildRatioChainDegrees(
      spec.chainLength,
      spec.generatorNum,
      spec.generatorDen,
      spec.periodRatio ?? 2.0,
      subsetId,
      config.activeDegreeMask,
      spec.centered ?? false
    );
  }
  if (spec.kind === 'edo') {
    return buildEdoDegrees(spec.divisions, spec.periodRatio ?? 2.0, subsetId, config.activeDegreeMask);
  }

  const subsetKey = spec.id ?? (spec.degrees.length === 12 ? '12-explicit' : '');
  const subsetList = EXPLICIT_SUBSET_INDICES[subsetKey]?.[subsetId];
  const activeSet = subsetList ? new Set(subsetList) : null;

  return spec.degrees.map((deg, idx) => {
    const cents = Math.round(Math.log2(deg.ratioValue) * 12000) / 10;
    const defaultActive = activeSet ? activeSet.has(idx) : true;
    const active =
      config.activeDegreeMask && config.activeDegreeMask.length === spec.degrees.length
        ? Boolean(config.activeDegreeMask[idx])
        : defaultActive;
    return {
      index: idx,
      label: deg.label,
      subLabel: deg.subLabel ?? `${Math.round(cents)}¢`,
      ratioValue: deg.ratioValue,
      rational: deg.rational ?? null,
      cents,
      active,
      highlightRole: idx === 0 ? 'root' : undefined,
      primeFamily: deg.primeFamily ?? 'Tri',
    };
  });
}

/**
 * Finds the closest degree in `degrees` (by log2 distance) to a target ratioValue in [1, periodRatio).
 */
export function findNearestDegreeInSystem(targetRatioValue: number, degrees: TuningDegree[]): TuningDegree {
  let best = degrees[0];
  let bestDist = Math.abs(Math.log2(targetRatioValue / best.ratioValue));
  for (let i = 1; i < degrees.length; i++) {
    const dist = Math.abs(Math.log2(targetRatioValue / degrees[i].ratioValue));
    if (dist < bestDist) {
      bestDist = dist;
      best = degrees[i];
    }
  }
  return best;
}

/**
 * Maps a TuningDegree (with optional period offset) to an exact DuPeriod coordinate d
 * and full MidiNoteMappingResult, preserving TPL polarity.
 */
export function tuningDegreeToMapping(
  degree: TuningDegree,
  periodOffset: number,
  syntheticMidi: number,
  config: MidiTuningConfig,
  currentFundamentalD: number,
  a4Hz: number = 440,
  tplHz: number = TPL_FREQUENCY_HZ
): MidiNoteMappingResult {
  const polarity: TplPolarity = currentFundamentalD >= 0 ? 'rhythm' : 'pitch';
  const rootMidi = polarity === 'rhythm' ? config.rhythmRootMidi : config.pitchRootMidi;
  const periodRatio = resolveSystemSpec(config).periodRatio ?? 2.0;
  const fullMultiplier = degree.ratioValue * Math.pow(periodRatio, periodOffset);

  let d: number;
  if (polarity === 'rhythm') {
    d = config.rhythmAnchorBand - Math.log2(fullMultiplier);
  } else {
    const rootFreq = midiToFreq(rootMidi, a4Hz);
    d = freqToD(rootFreq * fullMultiplier, tplHz);
  }

  let clampedToPolarity = false;
  if (polarity === 'rhythm' && d < TPL_POLARITY_EPSILON_D) {
    d = TPL_POLARITY_EPSILON_D;
    clampedToPolarity = true;
  } else if (polarity === 'pitch' && d > -TPL_POLARITY_EPSILON_D) {
    d = -TPL_POLARITY_EPSILON_D;
    clampedToPolarity = true;
  }

  return {
    midi: syntheticMidi,
    d,
    freqHz: dToFreq(d, tplHz),
    bpm: dToBpm(d, tplHz),
    polarity,
    clampedToPolarity,
    semitone: degree.index,
    octavesFromRoot: periodOffset,
    ratioValue: degree.ratioValue,
    rational: degree.rational,
    primeFamily: degree.primeFamily ?? 'Tri',
    centsFromEdo: 0,
    address: resolveDuPeriodAddress(d),
  };
}

/**
 * Maps a TuningDegree relative to the current base frequency (`currentFundamentalD`).
 * Used by Scale Strip and Auto-Play so shifting the base frequency shifts the scale tonic.
 */
export function tuningDegreeToRelativeMapping(
  degree: TuningDegree,
  periodOffset: number,
  syntheticMidi: number,
  currentFundamentalD: number,
  tplHz: number = TPL_FREQUENCY_HZ,
  periodRatio: number = 2.0
): MidiNoteMappingResult {
  const polarity: TplPolarity = currentFundamentalD >= 0 ? 'rhythm' : 'pitch';
  const fullMultiplier = degree.ratioValue * Math.pow(periodRatio, periodOffset);
  let d = Math.max(-7.0, Math.min(7.0, currentFundamentalD - Math.log2(fullMultiplier)));

  let clampedToPolarity = false;
  if (polarity === 'rhythm' && d < TPL_POLARITY_EPSILON_D) {
    d = TPL_POLARITY_EPSILON_D;
    clampedToPolarity = true;
  } else if (polarity === 'pitch' && d > -TPL_POLARITY_EPSILON_D) {
    d = -TPL_POLARITY_EPSILON_D;
    clampedToPolarity = true;
  }

  return {
    midi: syntheticMidi,
    d,
    freqHz: dToFreq(d, tplHz),
    bpm: dToBpm(d, tplHz),
    polarity,
    clampedToPolarity,
    semitone: degree.index,
    octavesFromRoot: periodOffset,
    ratioValue: degree.ratioValue,
    rational: degree.rational,
    primeFamily: degree.primeFamily ?? 'Tri',
    centsFromEdo: 0,
    address: resolveDuPeriodAddress(d),
  };
}
