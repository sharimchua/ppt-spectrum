/**
 * Pure keyboard layout, range presets, Solfège colouring, and Harmonic-Geometry-style
 * pairwise interval band builders for the on-screen Virtual Keyboard.
 */

import { SOLFEGE_COLORS, SOLFEGE_SYLLABLES } from '../../core/ppt-constants';
import { PITCH_NAMES } from '../../core/axis';
import { rationalise } from '../../core/rational';
import {
  MidiNoteMappingResult,
  MidiTuningConfig,
  midiToDWithTuning,
} from '../../core/midi-tuning';

export interface KeyboardRangePreset {
  id: string;
  label: string;
  startMidi: number;
  endMidi: number;
}

export const KEYBOARD_RANGE_PRESETS: KeyboardRangePreset[] = [
  { id: '2oct-f', label: '2 Oct (F3–F5)', startMidi: 53, endMidi: 77 },
  { id: '2oct-c', label: '2 Oct (C3–C5)', startMidi: 48, endMidi: 72 },
  { id: '3oct-c', label: '3 Oct (C3–C6)', startMidi: 48, endMidi: 84 },
  { id: '4oct-c', label: '4 Oct (C2–C6)', startMidi: 36, endMidi: 84 },
  { id: '88key', label: '88-Key (A0–C8)', startMidi: 21, endMidi: 108 },
];

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
  row: number;
  ratioLabel: string;
  deltaLabel: string;
  centsLabel: string;
  colorHex: string;
  neonHex: string;
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
 * Formats a frequency ratio as an exact reduced fraction (e.g. "3:2", "5:4")
 * when within tolerance, or as a decimal multiplier (e.g. "1.260×") when tempered.
 */
export function formatIntervalRatioLabel(ratio: number): string {
  const cand = rationalise(ratio, 1e-5, 64);
  if (cand.den > 0 && Math.abs(ratio - cand.num / cand.den) < 1e-5) {
    return `${cand.num}:${cand.den}`;
  }
  return `${ratio.toFixed(3)}×`;
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
      neonHex: SOLFEGE_COLORS[semitoneFromRoot] || '#38bdf8',
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
 * Computes Harmonic-Geometry-style stacked interval bands above the keybed:
 * - When 2+ keys are active: all pairwise relationships (i < j), packed into
 *   non-overlapping horizontal rows (shorter spans at the bottom, wider spans above).
 * - When 0-1 keys are active: adjacent semitone step sizes across the visible keyboard.
 */
export function buildIntervalBands(
  keys: VirtualKeyItem[],
  activeMidiSet: Set<number>,
  isRhythm: boolean
): { bands: IntervalBandItem[]; rowCount: number } {
  const bands: IntervalBandItem[] = [];
  const activeKeys = keys.filter((k) => activeMidiSet.has(k.midi));

  if (activeKeys.length >= 2) {
    // Generate all pairs sorted by span (shortest first so inner intervals sit closest to keys)
    const rawPairs: Array<{ a: VirtualKeyItem; b: VirtualKeyItem; span: number }> = [];
    for (let i = 0; i < activeKeys.length; i++) {
      for (let j = i + 1; j < activeKeys.length; j++) {
        rawPairs.push({
          a: activeKeys[i],
          b: activeKeys[j],
          span: activeKeys[j].midi - activeKeys[i].midi,
        });
      }
    }
    rawPairs.sort((p, q) => p.span - q.span || p.a.midi - q.a.midi);

    // Greedy interval packing into rows so non-overlapping bands share the lowest row
    const rowRanges: Array<Array<[number, number]>> = [];
    for (const pair of rawPairs) {
      let assignedRow = -1;
      for (let r = 0; r < rowRanges.length; r++) {
        const overlaps = rowRanges[r].some(
          ([s, e]) => !(pair.b.midi <= s || pair.a.midi >= e)
        );
        if (!overlaps) {
          assignedRow = r;
          rowRanges[r].push([pair.a.midi, pair.b.midi]);
          break;
        }
      }
      if (assignedRow === -1) {
        assignedRow = rowRanges.length;
        rowRanges.push([[pair.a.midi, pair.b.midi]]);
      }

      const ratio = pair.b.mapping.freqHz / Math.max(1e-6, pair.a.mapping.freqHz);
      const cents = Math.round(1200 * Math.log2(ratio));
      const deltaHz = Math.abs(pair.b.mapping.freqHz - pair.a.mapping.freqHz);
      const intervalSemitone = ((pair.b.midi - pair.a.midi) % 12 + 12) % 12;

      bands.push({
        id: `active-${pair.a.midi}-${pair.b.midi}`,
        leftMidi: pair.a.midi,
        rightMidi: pair.b.midi,
        row: assignedRow,
        ratioLabel: formatIntervalRatioLabel(ratio),
        deltaLabel: formatFrequencyDelta(deltaHz, isRhythm),
        centsLabel: `${cents}¢`,
        colorHex: SOLFEGE_COLORS[intervalSemitone] || '#38bdf8',
        neonHex: SOLFEGE_COLORS[intervalSemitone] || '#38bdf8',
        isSubtleStep: false,
      });
    }
    return { bands, rowCount: Math.max(1, rowRanges.length) };
  }

  // Unique adjacent semitone step sizes across the visible octave/range
  const seenCents = new Set<string>();
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    const ratio = b.mapping.freqHz / Math.max(1e-6, a.mapping.freqHz);
    const cents = Math.round(1200 * Math.log2(ratio));
    const centsLabel = `${cents}¢`;
    if (seenCents.has(centsLabel)) continue;
    seenCents.add(centsLabel);

    const deltaHz = Math.abs(b.mapping.freqHz - a.mapping.freqHz);
    bands.push({
      id: `step-${cents}`,
      leftMidi: a.midi,
      rightMidi: b.midi,
      row: 0,
      ratioLabel: `${a.syllable}→${b.syllable}`,
      deltaLabel: formatFrequencyDelta(deltaHz, isRhythm),
      centsLabel,
      colorHex: SOLFEGE_COLORS[1] || '#F98016',
      neonHex: SOLFEGE_COLORS[1] || '#F98016',
      isSubtleStep: true,
    });
  }

  return { bands, rowCount: 1 };
}

/**
 * Computes an updated { rangePresetId, octaveOffset } when active MIDI notes
 * fall outside the currently visible [startMidi..endMidi] window.
 * Returns null if all active notes are already visible.
 */
export function resolveVisibleRangeForNotes(
  activeMidiNumbers: number[],
  currentPresetId: string,
  currentOctaveOffset: number
): { rangePresetId: string; octaveOffset: number } | null {
  if (activeMidiNumbers.length === 0 || currentPresetId === '88key') {
    return null;
  }
  const preset =
    KEYBOARD_RANGE_PRESETS.find((p) => p.id === currentPresetId) ?? KEYBOARD_RANGE_PRESETS[0];
  const curStart = Math.max(21, preset.startMidi + currentOctaveOffset * 12);
  const curEnd = Math.min(108, preset.endMidi + currentOctaveOffset * 12);

  const minActive = Math.min(...activeMidiNumbers);
  const maxActive = Math.max(...activeMidiNumbers);
  if (minActive >= curStart && maxActive <= curEnd) {
    return null;
  }

  const currentSpan = preset.endMidi - preset.startMidi;
  if (maxActive - minActive <= currentSpan) {
    for (let shift = -3; shift <= 3; shift++) {
      const s = Math.max(21, preset.startMidi + shift * 12);
      const e = Math.min(108, preset.endMidi + shift * 12);
      if (minActive >= s && maxActive <= e) {
        return { rangePresetId: preset.id, octaveOffset: shift };
      }
    }
  }

  for (const candidate of KEYBOARD_RANGE_PRESETS) {
    if (candidate.id === '88key') {
      return { rangePresetId: '88key', octaveOffset: 0 };
    }
    for (let shift = -2; shift <= 2; shift++) {
      const s = Math.max(21, candidate.startMidi + shift * 12);
      const e = Math.min(108, candidate.endMidi + shift * 12);
      if (minActive >= s && maxActive <= e) {
        return { rangePresetId: candidate.id, octaveOffset: shift };
      }
    }
  }

  return null;
}

const KEYBOARD_RANGE_STORAGE_KEY = 'ppt_spectrum_keyboard_range_v1';

export function loadSavedKeyboardRange(): string {
  if (typeof window === 'undefined' || !window.localStorage) return '2oct-f';
  try {
    const saved = window.localStorage.getItem(KEYBOARD_RANGE_STORAGE_KEY);
    if (saved && KEYBOARD_RANGE_PRESETS.some((p) => p.id === saved)) {
      return saved;
    }
  } catch {
    // Ignore storage access errors
  }
  return '2oct-f';
}

export function saveKeyboardRange(presetId: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(KEYBOARD_RANGE_STORAGE_KEY, presetId);
  } catch {
    // Ignore storage quota errors
  }
}
