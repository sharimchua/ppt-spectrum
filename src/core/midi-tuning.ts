/**
 * Pure Prime Period Theory (PPT) MIDI tuning and polarity-aware DuPeriod mapping.
 * Mirrors the Harmonic Profiler tuning model across both Pitch Space (d < 0)
 * and Rhythm Space (d >= 0), preserving Temporal-Place Limen (TPL) polarity.
 */

import { TPL_FREQUENCY_HZ } from './ppt-constants';
import {
  DuPeriodAddress,
  dToBpm,
  dToFreq,
  freqToD,
  midiToFreq,
  resolveDuPeriodAddress,
} from './axis';

export type TriDuTuning = 'Tri' | 'Du';
export type TriQuiDuTuning = 'Tri' | 'Qui' | 'Du';
export type TriSepDuTuning = 'Tri' | 'Sep' | 'Du';
export type TritoneTuning = 'Undec' | 'Qui' | 'Tri' | 'Du';
export type PrimeFamilyLabel = 'Du' | 'Tri' | 'Qui' | 'Sep' | 'Undec';

export interface MidiIntervalTuningConfig {
  m2: TriDuTuning;
  M2: TriDuTuning;
  m3: TriQuiDuTuning;
  M3: TriQuiDuTuning;
  P4: TriDuTuning;
  TT: TritoneTuning;
  P5: TriDuTuning;
  m6: TriQuiDuTuning;
  M6: TriQuiDuTuning;
  m7: TriSepDuTuning;
  M7: TriQuiDuTuning;
}

export type MidiTuningPresetId =
  | '12tet'
  | '5-limit'
  | 'pythagorean'
  | '7-limit'
  | '11-limit'
  | 'custom';

export type TplPolarity = 'rhythm' | 'pitch';
export type MidiPhaseMode = 'sam-aligned' | 'key-strike';

export interface MidiTuningConfig {
  presetId: MidiTuningPresetId;
  intervals: MidiIntervalTuningConfig;
  /** DuMetric Rhythm band anchored to the root MIDI note when in Rhythm Space (default +4). */
  rhythmAnchorBand: number;
  /** MIDI note number acting as Do in Rhythm Space (default 68 = G#4, exact TPL mirror of Do-4). */
  rhythmRootMidi: number;
  /** MIDI note number acting as Do in Pitch Space for Just tunings (default 68 = G#4). */
  pitchRootMidi: number;
  /** Phase alignment for polyphonic Rhythm Space MIDI voices ('sam-aligned' vs 'key-strike'). */
  rhythmPhaseMode: MidiPhaseMode;
}

export interface IntervalTuningResolution {
  semitone: number;
  ratioValue: number;
  rational: { num: number; den: number } | null;
  primeFamily: PrimeFamilyLabel;
  centsFromEdo: number;
}

export interface MidiNoteMappingResult {
  midi: number;
  d: number;
  freqHz: number;
  bpm: number;
  polarity: TplPolarity;
  clampedToPolarity: boolean;
  semitone: number;
  octavesFromRoot: number;
  ratioValue: number;
  rational: { num: number; den: number } | null;
  primeFamily: PrimeFamilyLabel;
  centsFromEdo: number;
  address: DuPeriodAddress;
}

/** Default Rhythm Root: G#4 (MIDI 68), the exact TPL mirror of Do-4 (~412.8 Hz). */
export const DEFAULT_RHYTHM_ROOT_MIDI = 68;
export const DEFAULT_PITCH_ROOT_MIDI = 68;
export const DEFAULT_RHYTHM_ANCHOR_BAND = 4;

/** Smallest DuPeriod margin from d = 0 when clamping to preserve TPL polarity. */
const TPL_POLARITY_EPSILON_D = 0.01;

export const MIDI_TUNING_PRESETS: Record<
  Exclude<MidiTuningPresetId, 'custom'>,
  { label: string; description: string; intervals: MidiIntervalTuningConfig }
> = {
  '12tet': {
    label: '12-TET (Du)',
    description: 'Equal-tempered 12-tone division of the DuPeriod.',
    intervals: {
      m2: 'Du',
      M2: 'Du',
      m3: 'Du',
      M3: 'Du',
      P4: 'Du',
      TT: 'Du',
      P5: 'Du',
      m6: 'Du',
      M6: 'Du',
      m7: 'Du',
      M7: 'Du',
    },
  },
  '5-limit': {
    label: '5-Limit Just (Qui)',
    description: 'Pure 3- and 5-limit harmonic ratios (3:2, 4:3, 5:4, 6:5).',
    intervals: {
      m2: 'Tri',
      M2: 'Tri',
      m3: 'Qui',
      M3: 'Qui',
      P4: 'Tri',
      TT: 'Qui',
      P5: 'Tri',
      m6: 'Qui',
      M6: 'Qui',
      m7: 'Tri',
      M7: 'Qui',
    },
  },
  pythagorean: {
    label: 'Pythagorean (Tri)',
    description: 'Pure 3-limit fifths and fourths across all chromatic degrees.',
    intervals: {
      m2: 'Tri',
      M2: 'Tri',
      m3: 'Tri',
      M3: 'Tri',
      P4: 'Tri',
      TT: 'Tri',
      P5: 'Tri',
      m6: 'Tri',
      M6: 'Tri',
      m7: 'Tri',
      M7: 'Tri',
    },
  },
  '7-limit': {
    label: '7-Limit Septimal (Sep)',
    description: '5-limit Just tuning with the harmonic seventh (7:4).',
    intervals: {
      m2: 'Tri',
      M2: 'Tri',
      m3: 'Qui',
      M3: 'Qui',
      P4: 'Tri',
      TT: 'Qui',
      P5: 'Tri',
      m6: 'Qui',
      M6: 'Qui',
      m7: 'Sep',
      M7: 'Qui',
    },
  },
  '11-limit': {
    label: '11-Limit Undecimal (Undec)',
    description: '7-limit Just tuning with the undecimal tritone (11:8).',
    intervals: {
      m2: 'Tri',
      M2: 'Tri',
      m3: 'Qui',
      M3: 'Qui',
      P4: 'Tri',
      TT: 'Undec',
      P5: 'Tri',
      m6: 'Qui',
      M6: 'Qui',
      m7: 'Sep',
      M7: 'Qui',
    },
  },
};

export function createDefaultMidiTuningConfig(
  presetId: Exclude<MidiTuningPresetId, 'custom'> = '5-limit'
): MidiTuningConfig {
  return {
    presetId,
    intervals: { ...MIDI_TUNING_PRESETS[presetId].intervals },
    rhythmAnchorBand: DEFAULT_RHYTHM_ANCHOR_BAND,
    rhythmRootMidi: DEFAULT_RHYTHM_ROOT_MIDI,
    pitchRootMidi: DEFAULT_PITCH_ROOT_MIDI,
    rhythmPhaseMode: 'sam-aligned',
  };
}

/**
 * Resolves a chromatic semitone offset (0..11) to its frequency ratio and Prime Family
 * under the supplied interval tuning configuration.
 */
export function resolveSemitoneInterval(
  semitone: number,
  intervals: MidiIntervalTuningConfig
): IntervalTuningResolution {
  const s = ((semitone % 12) + 12) % 12;
  const edoRatio = Math.pow(2, s / 12);

  let ratioValue = 1;
  let rational: { num: number; den: number } | null = { num: 1, den: 1 };
  let primeFamily: PrimeFamilyLabel = 'Du';

  const setJi = (num: number, den: number, family: PrimeFamilyLabel) => {
    ratioValue = num / den;
    rational = { num, den };
    primeFamily = family;
  };

  const setEdo = () => {
    ratioValue = edoRatio;
    rational = null;
    primeFamily = 'Du';
  };

  switch (s) {
    case 0:
      setJi(1, 1, 'Du');
      break;
    case 1:
      if (intervals.m2 === 'Du') setEdo();
      else setJi(16, 15, 'Tri');
      break;
    case 2:
      if (intervals.M2 === 'Du') setEdo();
      else setJi(9, 8, 'Tri');
      break;
    case 3:
      if (intervals.m3 === 'Du') setEdo();
      else if (intervals.m3 === 'Tri') setJi(32, 27, 'Tri');
      else setJi(6, 5, 'Qui');
      break;
    case 4:
      if (intervals.M3 === 'Du') setEdo();
      else if (intervals.M3 === 'Tri') setJi(81, 64, 'Tri');
      else setJi(5, 4, 'Qui');
      break;
    case 5:
      if (intervals.P4 === 'Du') setEdo();
      else setJi(4, 3, 'Tri');
      break;
    case 6:
      if (intervals.TT === 'Du') setEdo();
      else if (intervals.TT === 'Undec') setJi(11, 8, 'Undec');
      else if (intervals.TT === 'Tri') setJi(729, 512, 'Tri');
      else setJi(45, 32, 'Qui');
      break;
    case 7:
      if (intervals.P5 === 'Du') setEdo();
      else setJi(3, 2, 'Tri');
      break;
    case 8:
      if (intervals.m6 === 'Du') setEdo();
      else if (intervals.m6 === 'Tri') setJi(128, 81, 'Tri');
      else setJi(8, 5, 'Qui');
      break;
    case 9:
      if (intervals.M6 === 'Du') setEdo();
      else if (intervals.M6 === 'Tri') setJi(27, 16, 'Tri');
      else setJi(5, 3, 'Qui');
      break;
    case 10:
      if (intervals.m7 === 'Du') setEdo();
      else if (intervals.m7 === 'Sep') setJi(7, 4, 'Sep');
      else setJi(16, 9, 'Tri');
      break;
    case 11:
      if (intervals.M7 === 'Du') setEdo();
      else if (intervals.M7 === 'Tri') setJi(243, 128, 'Tri');
      else setJi(15, 8, 'Qui');
      break;
  }

  const centsFromEdo = Math.round(1200 * Math.log2(ratioValue / edoRatio));

  return {
    semitone: s,
    ratioValue,
    rational,
    primeFamily,
    centsFromEdo,
  };
}

/**
 * Determines TPL polarity from the current fundamental placement coordinate d.
 * d >= 0 is Rhythm Space; d < 0 is Pitch Space.
 */
export function getPolarityFromD(d: number): TplPolarity {
  return d >= 0 ? 'rhythm' : 'pitch';
}

/**
 * Checks whether all intervals in a config are set to 12-TET ('Du').
 */
export function isAllEqualTemperament(intervals: MidiIntervalTuningConfig): boolean {
  return (
    intervals.m2 === 'Du' &&
    intervals.M2 === 'Du' &&
    intervals.m3 === 'Du' &&
    intervals.M3 === 'Du' &&
    intervals.P4 === 'Du' &&
    intervals.TT === 'Du' &&
    intervals.P5 === 'Du' &&
    intervals.m6 === 'Du' &&
    intervals.M6 === 'Du' &&
    intervals.m7 === 'Du' &&
    intervals.M7 === 'Du'
  );
}

/**
 * Maps an incoming MIDI note number to a DuPeriod coordinate d using the active
 * tuning config while preserving TPL polarity based on `currentFundamentalD`.
 */
export function midiToDWithTuning(
  midi: number,
  config: MidiTuningConfig,
  currentFundamentalD: number,
  a4Hz: number = 440,
  tplHz: number = TPL_FREQUENCY_HZ
): MidiNoteMappingResult {
  const polarity = getPolarityFromD(currentFundamentalD);
  const rootMidi = polarity === 'rhythm' ? config.rhythmRootMidi : config.pitchRootMidi;
  const delta = midi - rootMidi;
  const octavesFromRoot = Math.floor(delta / 12);
  const semitone = ((delta % 12) + 12) % 12;

  const interval = resolveSemitoneInterval(semitone, config.intervals);
  const octaveMultiplier = Math.pow(2, octavesFromRoot);
  const fullMultiplier = interval.ratioValue * octaveMultiplier;

  let rawD: number;
  if (polarity === 'rhythm') {
    // Higher MIDI notes increase frequency (move right toward TPL, decreasing positive d)
    rawD = config.rhythmAnchorBand - Math.log2(fullMultiplier);
  } else {
    // Pitch Space: if pure 12-TET, match standard A440 concert pitch formula exactly
    if (isAllEqualTemperament(config.intervals)) {
      rawD = freqToD(midiToFreq(midi, a4Hz), tplHz);
    } else {
      const rootFreq = midiToFreq(rootMidi, a4Hz);
      const targetFreq = rootFreq * fullMultiplier;
      rawD = freqToD(targetFreq, tplHz);
    }
  }

  let d = rawD;
  let clampedToPolarity = false;
  if (polarity === 'rhythm' && d < TPL_POLARITY_EPSILON_D) {
    d = TPL_POLARITY_EPSILON_D;
    clampedToPolarity = true;
  } else if (polarity === 'pitch' && d > -TPL_POLARITY_EPSILON_D) {
    d = -TPL_POLARITY_EPSILON_D;
    clampedToPolarity = true;
  }

  const freqHz = dToFreq(d, tplHz);
  const bpm = dToBpm(d, tplHz);
  const address = resolveDuPeriodAddress(d);

  return {
    midi,
    d,
    freqHz,
    bpm,
    polarity,
    clampedToPolarity,
    semitone,
    octavesFromRoot,
    ratioValue: interval.ratioValue,
    rational: interval.rational,
    primeFamily: interval.primeFamily,
    centsFromEdo: interval.centsFromEdo,
    address,
  };
}
