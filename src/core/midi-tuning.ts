/**
 * Pure Prime Period Theory (PPT) MIDI tuning and polarity-aware DuPeriod mapping.
 * Mirrors the Harmonic Profiler tuning model and Du-Fractal DuTri Closure across
 * both Pitch Space (d < 0) and Rhythm Space (d >= 0), preserving TPL polarity.
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

export type PrimeFamilyLabel =
  | '12TET'
  | 'Du'
  | 'DuTri'
  | 'Tri'
  | 'Qui'
  | 'Sep'
  | 'Undec';

export type Interval12Tet = '12TET';
export type DuTriOrTriOr12Tet = 'DuTri' | 'Tri' | '12TET';
export type DuTriQuiTriOr12Tet = 'DuTri' | 'Qui' | 'Tri' | '12TET';
export type DuOrTriQuiSep12Tet = 'Du' | 'Tri' | 'Qui' | 'Sep' | '12TET';
export type DuTriSepTriOr12Tet = 'DuTri' | 'Sep' | 'Tri' | '12TET';
export type DuOrTriQui12Tet = 'Du' | 'Tri' | 'Qui' | '12TET';
export type TriOr12Tet = 'Tri' | '12TET';
export type TritoneTuning = 'Du' | 'Undec' | 'Sep' | 'Qui' | 'Tri' | '12TET';

export interface MidiIntervalTuningConfig {
  m2: DuTriQuiTriOr12Tet;
  M2: DuTriOrTriOr12Tet;
  m3: DuOrTriQuiSep12Tet;
  M3: DuTriQuiTriOr12Tet;
  P4: TriOr12Tet;
  TT: TritoneTuning;
  P5: TriOr12Tet;
  m6: DuTriQuiTriOr12Tet;
  M6: DuOrTriQui12Tet;
  m7: DuTriSepTriOr12Tet;
  M7: DuTriQuiTriOr12Tet;
}

export type MidiTuningPresetId =
  | '12tet'
  | 'dutri'
  | 'ppt-native'
  | '5-limit'
  | 'pythagorean'
  | '7-limit'
  | 'pythagorean-pentatonic'
  | 'pythagorean-heptatonic'
  | '31edo-meantone'
  | '31edo-septimal'
  | '31edo-chromatic'
  | 'custom';

export interface MidiTuningConfig {
  presetId: MidiTuningPresetId;
  intervals: MidiIntervalTuningConfig;
  /** DuMetric Rhythm band anchored to the root MIDI note when in Rhythm Space (default +4). */
  rhythmAnchorBand: number;
  /** MIDI note number acting as Do in Rhythm Space (default 68 = G#4, exact TPL mirror of Do-4). */
  rhythmRootMidi: number;
  /** MIDI note number acting as Do in Pitch Space for Just/DuTri tunings (default 68 = G#4). */
  pitchRootMidi: number;
  /** Phase alignment for polyphonic Rhythm Space MIDI voices ('sam-aligned' vs 'key-strike'). */
  rhythmPhaseMode: MidiPhaseMode;
  /** Tuning system architecture beyond 12-tone semitone matrices. */
  systemMode?: 'chromatic-12' | 'pythagorean-chain' | '31edo';
  /** Number of 3:2 fifths active in 'pythagorean-chain' mode (5 = Pentatonic, 7 = Heptatonic, 12 = Full). */
  pythagoreanChainLength?: number;
  /** Active subset in '31edo' mode. */
  edo31Subset?: 'chromatic' | 'meantone-7' | 'pentatonic-5' | 'septimal';
  /** Optional per-degree activation override mask. */
  activeDegreeMask?: boolean[];
  /** Hardware MIDI key mapping mode ('12-key' standard vs '31edo' step-per-key). */
  midiStepMap?: '12-key' | '31edo';
}

export interface IntervalTuningResolution {
  semitone: number;
  ratioValue: number;
  rational: { num: number; den: number } | null;
  primeFamily: PrimeFamilyLabel;
  centsFromEdo: number;
}

export type TplPolarity = 'rhythm' | 'pitch';
export type MidiPhaseMode = 'sam-aligned' | 'key-strike';

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
  {
    label: string;
    description: string;
    intervals: MidiIntervalTuningConfig;
    systemMode?: 'chromatic-12' | 'pythagorean-chain' | '31edo';
    pythagoreanChainLength?: number;
    edo31Subset?: 'chromatic' | 'meantone-7' | 'pentatonic-5' | 'septimal';
  }
> = {
  '12tet': {
    label: '12-TET',
    description: 'Equal-tempered 12-tone division of the DuPeriod (2^(k/12)).',
    intervals: {
      m2: '12TET',
      M2: '12TET',
      m3: '12TET',
      M3: '12TET',
      P4: '12TET',
      TT: '12TET',
      P5: '12TET',
      m6: '12TET',
      M6: '12TET',
      m7: '12TET',
      M7: '12TET',
    },
  },
  dutri: {
    label: 'DuTri Closure',
    description: 'Du-Fractal dim7 skeleton (Do, Me, Fi, La) dressed with ±3:2/4:3 Tri operators (~102¢/96¢ steps).',
    intervals: {
      m2: 'DuTri',
      M2: 'DuTri',
      m3: 'Du',
      M3: 'DuTri',
      P4: 'Tri',
      TT: 'Du',
      P5: 'Tri',
      m6: 'DuTri',
      M6: 'Du',
      m7: 'DuTri',
      M7: 'DuTri',
    },
  },
  'ppt-native': {
    label: 'PPT Native',
    description: 'Prime Period Theory native tuning: Just harmony with Fi as the Du antipode (√2).',
    intervals: {
      m2: 'Qui',
      M2: 'Tri',
      m3: 'Qui',
      M3: 'Qui',
      P4: 'Tri',
      TT: 'Du',
      P5: 'Tri',
      m6: 'Qui',
      M6: 'Qui',
      m7: 'Sep',
      M7: 'Qui',
    },
  },
  '5-limit': {
    label: '5-Limit Just (Qui)',
    description: 'Pure 3- and 5-limit harmonic ratios (3:2, 4:3, 5:4, 6:5, 16:15).',
    intervals: {
      m2: 'Qui',
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
    description: 'Ptolemaic tuning with septimal minor 3rd (7:6), tritone (7:5), and 7th (7:4).',
    intervals: {
      m2: 'Qui',
      M2: 'Tri',
      m3: 'Sep',
      M3: 'Qui',
      P4: 'Tri',
      TT: 'Sep',
      P5: 'Tri',
      m6: 'Qui',
      M6: 'Qui',
      m7: 'Sep',
      M7: 'Qui',
    },
  },
  'pythagorean-pentatonic': {
    label: 'Pythagorean Pentatonic (5× 3:2)',
    description: 'First 5 steps of the 3:2 chain (1/1, 9/8, 81/64, 3/2, 27/16) — avoiding minor 2nds and tritones.',
    systemMode: 'pythagorean-chain',
    pythagoreanChainLength: 5,
    intervals: {
      m2: 'Tri', M2: 'Tri', m3: 'Tri', M3: 'Tri', P4: 'Tri', TT: 'Tri',
      P5: 'Tri', m6: 'Tri', M6: 'Tri', m7: 'Tri', M7: 'Tri',
    },
  },
  'pythagorean-heptatonic': {
    label: 'Pythagorean Heptatonic (7× 3:2)',
    description: 'Extends the 3:2 chain to 7 steps, introducing the 729/512 tritone and two 90.2¢ minor 2nds.',
    systemMode: 'pythagorean-chain',
    pythagoreanChainLength: 7,
    intervals: {
      m2: 'Tri', M2: 'Tri', m3: 'Tri', M3: 'Tri', P4: 'Tri', TT: 'Tri',
      P5: 'Tri', m6: 'Tri', M6: 'Tri', m7: 'Tri', M7: 'Tri',
    },
  },
  '31edo-meantone': {
    label: '31-EDO Meantone Diatonic',
    description: '7-note quarter-comma meantone diatonic subset in 31-EDO with near-pure 5/4 thirds (387.1¢).',
    systemMode: '31edo',
    edo31Subset: 'meantone-7',
    intervals: {
      m2: 'Qui', M2: 'Tri', m3: 'Qui', M3: 'Qui', P4: 'Tri', TT: 'Qui',
      P5: 'Tri', m6: 'Qui', M6: 'Qui', m7: 'Tri', M7: 'Qui',
    },
  },
  '31edo-septimal': {
    label: '31-EDO Septimal (7-Limit)',
    description: '31-EDO septimal subset approximating 7/6 (7\\31), 5/4 (10\\31), 3/2 (18\\31), and 7/4 (25\\31).',
    systemMode: '31edo',
    edo31Subset: 'septimal',
    intervals: {
      m2: 'Qui', M2: 'Tri', m3: 'Sep', M3: 'Qui', P4: 'Tri', TT: 'Sep',
      P5: 'Tri', m6: 'Qui', M6: 'Qui', m7: 'Sep', M7: 'Qui',
    },
  },
  '31edo-chromatic': {
    label: '31-EDO Chromatic (31 Steps)',
    description: 'All 31 equal divisions of the octave (38.7¢ per step) for microtonal exploration.',
    systemMode: '31edo',
    edo31Subset: 'chromatic',
    intervals: {
      m2: '12TET', M2: '12TET', m3: '12TET', M3: '12TET', P4: '12TET', TT: '12TET',
      P5: '12TET', m6: '12TET', M6: '12TET', m7: '12TET', M7: '12TET',
    },
  },
};

export function applyTuningPreset(
  prev: MidiTuningConfig,
  presetId: Exclude<MidiTuningPresetId, 'custom'>
): MidiTuningConfig {
  const preset = MIDI_TUNING_PRESETS[presetId];
  return {
    ...prev,
    presetId,
    intervals: { ...preset.intervals },
    systemMode: preset.systemMode ?? 'chromatic-12',
    pythagoreanChainLength: preset.pythagoreanChainLength ?? prev.pythagoreanChainLength ?? 5,
    edo31Subset: preset.edo31Subset ?? prev.edo31Subset ?? 'meantone-7',
    activeDegreeMask: undefined,
    midiStepMap: preset.systemMode === '31edo' && preset.edo31Subset === 'chromatic' ? '31edo' : '12-key',
  };
}

export function createDefaultMidiTuningConfig(
  presetId: Exclude<MidiTuningPresetId, 'custom'> = '5-limit'
): MidiTuningConfig {
  const preset = MIDI_TUNING_PRESETS[presetId];
  return {
    presetId,
    intervals: { ...preset.intervals },
    rhythmAnchorBand: DEFAULT_RHYTHM_ANCHOR_BAND,
    rhythmRootMidi: DEFAULT_RHYTHM_ROOT_MIDI,
    pitchRootMidi: DEFAULT_PITCH_ROOT_MIDI,
    rhythmPhaseMode: 'sam-aligned',
    systemMode: preset.systemMode ?? 'chromatic-12',
    pythagoreanChainLength: preset.pythagoreanChainLength ?? 5,
    edo31Subset: preset.edo31Subset ?? 'meantone-7',
    midiStepMap: '12-key',
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

  const setIrrational = (val: number, family: PrimeFamilyLabel) => {
    ratioValue = val;
    rational = null;
    primeFamily = family;
  };

  switch (s) {
    case 0:
      setJi(1, 1, 'Du');
      break;
    case 1:
      if (intervals.m2 === '12TET') setIrrational(edoRatio, '12TET');
      else if (intervals.m2 === 'DuTri') setIrrational((3 * Math.SQRT2) / 4, 'DuTri');
      else if (intervals.m2 === 'Tri') setJi(256, 243, 'Tri');
      else setJi(16, 15, 'Qui');
      break;
    case 2:
      if (intervals.M2 === '12TET') setIrrational(edoRatio, '12TET');
      else if (intervals.M2 === 'DuTri') setIrrational((2 * Math.pow(2, 0.75)) / 3, 'DuTri');
      else setJi(9, 8, 'Tri');
      break;
    case 3:
      if (intervals.m3 === '12TET') setIrrational(edoRatio, '12TET');
      else if (intervals.m3 === 'Du') setIrrational(Math.pow(2, 0.25), 'Du');
      else if (intervals.m3 === 'Tri') setJi(32, 27, 'Tri');
      else if (intervals.m3 === 'Sep') setJi(7, 6, 'Sep');
      else setJi(6, 5, 'Qui');
      break;
    case 4:
      if (intervals.M3 === '12TET') setIrrational(edoRatio, '12TET');
      else if (intervals.M3 === 'DuTri') setIrrational((3 * Math.pow(2, 0.75)) / 4, 'DuTri');
      else if (intervals.M3 === 'Tri') setJi(81, 64, 'Tri');
      else setJi(5, 4, 'Qui');
      break;
    case 5:
      if (intervals.P4 === '12TET') setIrrational(edoRatio, '12TET');
      else setJi(4, 3, 'Tri');
      break;
    case 6:
      if (intervals.TT === '12TET') setIrrational(edoRatio, '12TET');
      else if (intervals.TT === 'Du') setIrrational(Math.SQRT2, 'Du');
      else if (intervals.TT === 'Undec') setJi(11, 8, 'Undec');
      else if (intervals.TT === 'Sep') setJi(7, 5, 'Sep');
      else if (intervals.TT === 'Tri') setJi(729, 512, 'Tri');
      else setJi(45, 32, 'Qui');
      break;
    case 7:
      if (intervals.P5 === '12TET') setIrrational(edoRatio, '12TET');
      else setJi(3, 2, 'Tri');
      break;
    case 8:
      if (intervals.m6 === '12TET') setIrrational(edoRatio, '12TET');
      else if (intervals.m6 === 'DuTri') setIrrational((4 * Math.pow(2, 0.25)) / 3, 'DuTri');
      else if (intervals.m6 === 'Tri') setJi(128, 81, 'Tri');
      else setJi(8, 5, 'Qui');
      break;
    case 9:
      if (intervals.M6 === '12TET') setIrrational(edoRatio, '12TET');
      else if (intervals.M6 === 'Du') setIrrational(Math.pow(2, 0.75), 'Du');
      else if (intervals.M6 === 'Tri') setJi(27, 16, 'Tri');
      else setJi(5, 3, 'Qui');
      break;
    case 10:
      if (intervals.m7 === '12TET') setIrrational(edoRatio, '12TET');
      else if (intervals.m7 === 'DuTri') setIrrational((3 * Math.pow(2, 0.25)) / 2, 'DuTri');
      else if (intervals.m7 === 'Sep') setJi(7, 4, 'Sep');
      else setJi(16, 9, 'Tri');
      break;
    case 11:
      if (intervals.M7 === '12TET') setIrrational(edoRatio, '12TET');
      else if (intervals.M7 === 'DuTri') setIrrational((4 * Math.SQRT2) / 3, 'DuTri');
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
 * Checks whether all intervals in a config are set to 12-TET.
 */
export function isAllEqualTemperament(intervals: MidiIntervalTuningConfig): boolean {
  return (
    intervals.m2 === '12TET' &&
    intervals.M2 === '12TET' &&
    intervals.m3 === '12TET' &&
    intervals.M3 === '12TET' &&
    intervals.P4 === '12TET' &&
    intervals.TT === '12TET' &&
    intervals.P5 === '12TET' &&
    intervals.m6 === '12TET' &&
    intervals.M6 === '12TET' &&
    intervals.m7 === '12TET' &&
    intervals.M7 === '12TET'
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

  if (config.midiStepMap === '31edo') {
    const octavesFromRoot = Math.floor(delta / 31);
    const step = ((delta % 31) + 31) % 31;
    const ratioValue = Math.pow(2, step / 31);
    const fullMultiplier = Math.pow(2, delta / 31);
    let rawD =
      polarity === 'rhythm'
        ? config.rhythmAnchorBand - Math.log2(fullMultiplier)
        : freqToD(midiToFreq(rootMidi, a4Hz) * fullMultiplier, tplHz);
    let clampedToPolarity = false;
    if (polarity === 'rhythm' && rawD < TPL_POLARITY_EPSILON_D) {
      rawD = TPL_POLARITY_EPSILON_D;
      clampedToPolarity = true;
    } else if (polarity === 'pitch' && rawD > -TPL_POLARITY_EPSILON_D) {
      rawD = -TPL_POLARITY_EPSILON_D;
      clampedToPolarity = true;
    }
    return {
      midi,
      d: rawD,
      freqHz: dToFreq(rawD, tplHz),
      bpm: dToBpm(rawD, tplHz),
      polarity,
      clampedToPolarity,
      semitone: step,
      octavesFromRoot,
      ratioValue,
      rational: null,
      primeFamily: '12TET',
      centsFromEdo: 0,
      address: resolveDuPeriodAddress(rawD),
    };
  }

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

  let d = Number.isFinite(rawD) ? Math.max(-12, Math.min(12, rawD)) : 0;
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
