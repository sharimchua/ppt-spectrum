import { TPL_FREQUENCY_HZ, SOLFEGE_SYLLABLES, SolfegeSyllable } from './ppt-constants';

/**
 * Converts frequency in Hz to DuPeriod coordinate d.
 * d = log2(f_TPL / f)
 * d > 0: Rhythm region (slower than TPL)
 * d < 0: Pitch region (faster than TPL)
 * d = 0: Temporal-Place Limen
 */
export function freqToD(freqHz: number, tplHz: number = TPL_FREQUENCY_HZ): number {
  if (freqHz <= 0) return 100;
  return Math.log2(tplHz / freqHz);
}

/**
 * Converts DuPeriod coordinate d to frequency in Hz.
 * f = f_TPL * 2^(-d)
 */
export function dToFreq(d: number, tplHz: number = TPL_FREQUENCY_HZ): number {
  return tplHz * Math.pow(2, -d);
}

/**
 * Converts period in milliseconds to DuPeriod coordinate d.
 */
export function periodMsToD(periodMs: number, tplHz: number = TPL_FREQUENCY_HZ): number {
  if (periodMs <= 0) return -100;
  const freqHz = 1000 / periodMs;
  return freqToD(freqHz, tplHz);
}

/**
 * Converts DuPeriod coordinate d to period in milliseconds.
 */
export function dToPeriodMs(d: number, tplHz: number = TPL_FREQUENCY_HZ): number {
  const freq = dToFreq(d, tplHz);
  return 1000 / freq;
}

/**
 * Converts tempo in BPM to DuPeriod coordinate d.
 * 120 BPM = 2 Hz => d ≈ +3.69
 */
export function bpmToD(bpm: number, tplHz: number = TPL_FREQUENCY_HZ): number {
  if (bpm <= 0) return 100;
  const freqHz = bpm / 60;
  return freqToD(freqHz, tplHz);
}

/**
 * Converts DuPeriod coordinate d to tempo in BPM.
 */
export function dToBpm(d: number, tplHz: number = TPL_FREQUENCY_HZ): number {
  const freqHz = dToFreq(d, tplHz);
  return freqHz * 60;
}

export interface DuPeriodAddress {
  band: number;
  semitoneIndex: number;
  semitoneOffset: number;
  cents: number;
  syllable: SolfegeSyllable;
  formatted: string;
}

/**
 * Resolves a DuPeriod coordinate d to a PPT Band and Solfège degree address.
 * Left-to-right (-d, frequency ascending) orientation by default:
 * In pitch (d < 0): band -1, -2...
 * In rhythm (d > 0): band +1, +2...
 * (There is no band 0; d = 0 is the limen).
 */
export function resolveDuPeriodAddress(d: number): DuPeriodAddress {
  let band: number;
  let fraction: number;

  if (d < 0) {
    // Pitch region: d in [-1, 0) is band -1, d in [-2, -1) is band -2
    band = Math.floor(d);
    // fraction from 0.0 (floor) to 1.0 (ceiling) as frequency ascends (toward more negative d)
    fraction = (band - d);
    if (fraction < 0) fraction = (fraction % 1) + 1;
  } else {
    // Rhythm region: d in (0, 1] is band +1, d in (1, 2] is band +2
    band = Math.floor(d) + 1;
    // fraction ascending with frequency (left-to-right, decreasing d toward 0)
    fraction = 1 - (d - Math.floor(d));
    if (fraction >= 1) fraction -= 1;
  }

  const exactSemitones = fraction * 12;
  const semitoneIndex = Math.floor(exactSemitones) % 12;
  const cents = Math.round((exactSemitones - semitoneIndex) * 100);
  const syllable = SOLFEGE_SYLLABLES[semitoneIndex];
  const sign = band > 0 ? `+${band}` : `${band}`;
  const formatted = `${syllable}${sign}`;

  return {
    band,
    semitoneIndex,
    semitoneOffset: exactSemitones,
    cents,
    syllable,
    formatted,
  };
}

export interface PitchRegisterInfo {
  note: string;
  octave: number;
  cents: number;
  formatted: string;
}

const PITCH_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/**
 * Converts frequency in Hz to traditional Pitch + Register + Cent deviation (e.g. "A4 +3¢", "C3 -14¢")
 * anchored to standard concert pitch (default A4 = 440 Hz).
 */
export function freqToPitchRegister(freqHz: number, a4Hz: number = 440): PitchRegisterInfo {
  if (freqHz <= 0) {
    return { note: 'C', octave: 0, cents: 0, formatted: '---' };
  }
  const exactMidi = 69 + 12 * Math.log2(freqHz / a4Hz);
  const roundedMidi = Math.round(exactMidi);
  const cents = Math.round((exactMidi - roundedMidi) * 100);

  const semitoneIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  const note = PITCH_NAMES[semitoneIndex];

  const sign = cents > 0 ? `+${cents}` : cents < 0 ? `${cents}` : '±0';
  const formatted = `${note}${octave} ${sign}¢`;

  return { note, octave, cents, formatted };
}
