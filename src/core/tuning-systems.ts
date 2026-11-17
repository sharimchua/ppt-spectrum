/**
 * Pure Tuning System degree generators beyond 12-TET:
 * - Pythagorean 3:2 Fifths Chain (5-step Pentatonic -> 7-step Heptatonic -> 12-step Chromatic)
 * - 31-EDO Equal Divisions of the Octave (Chromatic, Meantone Diatonic, Pentatonic, Septimal)
 * - Unified degree resolution for any MidiTuningConfig (including 12-tone presets)
 */

import { TPL_FREQUENCY_HZ } from './ppt-constants';
import { reduceRational } from './rational';
import { dToBpm, dToFreq, freqToD, midiToFreq, resolveDuPeriodAddress } from './axis';
import {
  MidiNoteMappingResult,
  MidiTuningConfig,
  TplPolarity,
  getPolarityFromD,
  resolveSemitoneInterval,
} from './midi-tuning';

export type TuningSystemMode = 'chromatic-12' | 'pythagorean-chain' | '31edo';
export type Edo31SubsetId = 'chromatic' | 'meantone-7' | 'pentatonic-5' | 'septimal';

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
}

const TPL_POLARITY_EPSILON_D = 1e-4;

/**
 * Computes the octave-reduced [1/1, 2/1) rational ratio for k stacked 3:2 fifths.
 */
export function pythagoreanFifthStep(k: number): { num: number; den: number; chainStep: number } {
  let num = Math.pow(3, k);
  let den = Math.pow(2, k);
  while (num / den >= 2) den *= 2;
  while (num / den < 1) num *= 2;
  const reduced = reduceRational(num, den);
  return { num: reduced.num, den: reduced.den, chainStep: k };
}

/**
 * Builds the 12-step Pythagorean 3:2 chain sorted ascending in pitch [1/1, 2/1).
 * Steps 0..(chainLength-1) are marked active:
 * - chainLength = 5: Pentatonic (no minor 2nds, no tritones)
 * - chainLength = 7: Heptatonic (introduces 729/512 tritone and two 90.2¢ minor 2nds)
 * - chainLength = 12: Full 12-tone Pythagorean chromatic chain
 */
export function buildPythagoreanChainDegrees(
  chainLength: number = 5,
  activeMask?: boolean[]
): TuningDegree[] {
  const clampedLen = Math.max(1, Math.min(12, Math.round(chainLength)));
  const rawSteps = Array.from({ length: 12 }, (_, k) => pythagoreanFifthStep(k));
  rawSteps.sort((a, b) => a.num / a.den - b.num / b.den);

  return rawSteps.map((step, index) => {
    const ratioValue = step.num / step.den;
    const cents = Math.round(Math.log2(ratioValue) * 12000) / 10;
    const defaultActive = step.chainStep < clampedLen;
    const active = activeMask && activeMask.length === 12 ? Boolean(activeMask[index]) : defaultActive;

    let highlightRole: DegreeHighlightRole | undefined;
    if (step.chainStep === 0) highlightRole = 'root';
    else if (step.chainStep < 5) highlightRole = 'consonant';
    else if (step.chainStep === 6) highlightRole = 'tritone';
    else if (step.chainStep === 5 || step.chainStep === 7) highlightRole = 'semitone';

    return {
      index,
      label: `${step.num}/${step.den}`,
      subLabel: step.chainStep === 0 ? 'Root' : `+${step.chainStep}×3:2`,
      chainStep: step.chainStep,
      ratioValue,
      rational: { num: step.num, den: step.den },
      cents,
      active,
      highlightRole,
    };
  });
}

const EDO31_SUBSETS: Record<Edo31SubsetId, Set<number>> = {
  chromatic: new Set(Array.from({ length: 31 }, (_, i) => i)),
  'meantone-7': new Set([0, 5, 10, 13, 18, 23, 28]),
  'pentatonic-5': new Set([0, 5, 10, 18, 23]),
  septimal: new Set([0, 7, 10, 18, 25]),
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
 * Builds the 31-EDO degree array with the selected subset marked active.
 */
export function build31EdoDegrees(
  subset: Edo31SubsetId = 'meantone-7',
  activeMask?: boolean[]
): TuningDegree[] {
  const activeSet = EDO31_SUBSETS[subset] ?? EDO31_SUBSETS['meantone-7'];

  return Array.from({ length: 31 }, (_, k) => {
    const ratioValue = Math.pow(2, k / 31);
    const cents = Math.round(((k * 1200) / 31) * 10) / 10;
    const landmark = EDO31_LANDMARKS[k];
    const active = activeMask && activeMask.length === 31 ? Boolean(activeMask[k]) : activeSet.has(k);

    return {
      index: k,
      label: `${k}\\31`,
      subLabel: landmark?.label ?? `${Math.round(cents)}¢`,
      edoStep: k,
      ratioValue,
      rational: null,
      cents,
      active,
      highlightRole: landmark?.role,
    };
  });
}

const SEMITONE_SOLFEGE = ['Do', 'Ra', 'Re', 'Me', 'Mi', 'Fa', 'Fi', 'So', 'Le', 'La', 'Te', 'Ti'];

/**
 * Resolves all degrees (active & inactive) for any MidiTuningConfig.
 */
export function resolveTuningDegrees(config: MidiTuningConfig): TuningDegree[] {
  if (config.systemMode === 'pythagorean-chain') {
    return buildPythagoreanChainDegrees(config.pythagoreanChainLength ?? 5, config.activeDegreeMask);
  }
  if (config.systemMode === '31edo') {
    return build31EdoDegrees(config.edo31Subset ?? 'meantone-7', config.activeDegreeMask);
  }

  return Array.from({ length: 12 }, (_, s) => {
    const resolved = resolveSemitoneInterval(s, config.intervals);
    const cents = Math.round(Math.log2(resolved.ratioValue) * 12000) / 10;
    const active =
      config.activeDegreeMask && config.activeDegreeMask.length === 12
        ? Boolean(config.activeDegreeMask[s])
        : true;
    return {
      index: s,
      label: resolved.rational ? `${resolved.rational.num}/${resolved.rational.den}` : SEMITONE_SOLFEGE[s],
      subLabel: SEMITONE_SOLFEGE[s],
      ratioValue: resolved.ratioValue,
      rational: resolved.rational,
      cents,
      active,
      highlightRole: s === 0 ? 'root' : s === 6 ? 'tritone' : undefined,
    };
  });
}

/**
 * Maps a TuningDegree (with optional octave offset) to an exact DuPeriod coordinate d
 * and full MidiNoteMappingResult, preserving TPL polarity.
 */
export function tuningDegreeToMapping(
  degree: TuningDegree,
  octaveOffset: number,
  syntheticMidi: number,
  config: MidiTuningConfig,
  currentFundamentalD: number,
  a4Hz: number = 440,
  tplHz: number = TPL_FREQUENCY_HZ
): MidiNoteMappingResult {
  const polarity: TplPolarity = getPolarityFromD(currentFundamentalD);
  const rootMidi = polarity === 'rhythm' ? config.rhythmRootMidi : config.pitchRootMidi;
  const fullMultiplier = degree.ratioValue * Math.pow(2, octaveOffset);

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
    octavesFromRoot: octaveOffset,
    ratioValue: degree.ratioValue,
    rational: degree.rational,
    primeFamily: degree.edoStep !== undefined ? '12TET' : 'Tri',
    centsFromEdo: 0,
    address: resolveDuPeriodAddress(d),
  };
}
