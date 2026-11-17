/**
 * Pure keyboard layout, Solfège colouring, and interval-band distance helpers
 * for the on-screen Virtual Keyboard.
 */

import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS, SOLFEGE_SYLLABLES } from '../../core/ppt-constants';
import { PITCH_NAMES } from '../../core/axis';
import {
  MidiNoteMappingResult,
  MidiTuningConfig,
  midiToDWithTuning,
} from '../../core/midi-tuning';

export interface VirtualKeyItem {
  midi: number;
  pitchClass: number;
  octave: number;
  noteName: string;
  isBlack: boolean;
  semitoneFromRoot: number;
  syllable: string;
  colorHex: string;
  neonHex: string;
  isTonic: boolean;
  mapping: MidiNoteMappingResult;
}

export interface IntervalBandItem {
  id: string;
  leftMidi: number;
  rightMidi: number;
  ratioLabel: string;
  deltaLabel: string;
  centsLabel: string;
  isSubtleStep: boolean;
}

const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

/**
 * Subtle acoustic piano key offsets so white key heads have balanced widths.
 */
export function getBlackKeyOffset(pc: number): number {
  switch (pc) {
    case 1:
      return -0.06;
    case 3:
      return 0.06;
    case 6:
      return -0.07;
    case 8:
      return 0.0;
    case 10:
      return 0.07;
    default:
      return 0;
  }
}

/**
 * Builds the ordered array of VirtualKeyItems for [startMidi .. endMidi].
 */
export function buildVirtualKeys(
  startMidi: number,
  endMidi: number,
  tuning: MidiTuningConfig,
  currentFundamentalD: number,
  a4Hz: number,
  tplHz: number
): VirtualKeyItem[] {
  const rootMidi = currentFundamentalD >= 0 ? tuning.rhythmRootMidi : tuning.pitchRootMidi;
  const keys: VirtualKeyItem[] = [];

  for (let midi = startMidi; midi <= endMidi; midi++) {
    const pc = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    const noteName = `${PITCH_NAMES[pc]}${octave}`;
    const semitoneFromRoot = (((midi - rootMidi) % 12) + 12) % 12;
    const syllable = SOLFEGE_SYLLABLES[semitoneFromRoot];
    const mapping = midiToDWithTuning(midi, tuning, currentFundamentalD, a4Hz, tplHz);

    keys.push({
      midi,
      pitchClass: pc,
      octave,
      noteName,
      isBlack: BLACK_PCS.has(pc),
      semitoneFromRoot,
      syllable,
      colorHex: SOLFEGE_COLORS[semitoneFromRoot] || '#38bdf8',
      neonHex: SOLFEGE_NEON_COLORS[semitoneFromRoot] || '#60a5fa',
      isTonic: semitoneFromRoot === 0,
      mapping,
    });
  }

  return keys;
}

/**
 * Formats a frequency difference (delta Hz or delta BPM) for interval bands.
 */
export function formatFrequencyDelta(deltaHz: number, isRhythm: boolean): string {
  if (isRhythm) {
    const deltaBpm = deltaHz * 60;
    return `Δ${deltaBpm >= 10 ? deltaBpm.toFixed(1) : deltaBpm.toFixed(2)} BPM`;
  }
  return `Δ${deltaHz >= 10 ? deltaHz.toFixed(1) : deltaHz.toFixed(2)} Hz`;
}

/**
 * Computes interval distance bands to display above the keybed:
 * - When 2+ keys are active: bands between consecutive active keys (sorted ascending).
 * - When 0-1 keys are active: adjacent semitone step sizes across the visible keyboard.
 */
export function buildIntervalBands(
  keys: VirtualKeyItem[],
  activeMidiSet: Set<number>,
  isRhythm: boolean
): IntervalBandItem[] {
  const bands: IntervalBandItem[] = [];
  const activeKeys = keys.filter((k) => activeMidiSet.has(k.midi));

  if (activeKeys.length >= 2) {
    for (let i = 0; i < activeKeys.length - 1; i++) {
      const a = activeKeys[i];
      const b = activeKeys[i + 1];
      const ratio = b.mapping.freqHz / Math.max(1e-6, a.mapping.freqHz);
      const cents = Math.round(1200 * Math.log2(ratio));
      const deltaHz = Math.abs(b.mapping.freqHz - a.mapping.freqHz);

      bands.push({
        id: `active-${a.midi}-${b.midi}`,
        leftMidi: a.midi,
        rightMidi: b.midi,
        ratioLabel: `${ratio.toFixed(3)}×`,
        deltaLabel: formatFrequencyDelta(deltaHz, isRhythm),
        centsLabel: `${cents}¢`,
        isSubtleStep: false,
      });
    }
    return bands;
  }

  // Adjacent semitone step sizes across visible keys
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    const ratio = b.mapping.freqHz / Math.max(1e-6, a.mapping.freqHz);
    const cents = Math.round(1200 * Math.log2(ratio));
    const deltaHz = Math.abs(b.mapping.freqHz - a.mapping.freqHz);

    bands.push({
      id: `step-${a.midi}-${b.midi}`,
      leftMidi: a.midi,
      rightMidi: b.midi,
      ratioLabel: `${cents}¢`,
      deltaLabel: formatFrequencyDelta(deltaHz, isRhythm),
      centsLabel: `${cents}¢`,
      isSubtleStep: true,
    });
  }

  return bands;
}
