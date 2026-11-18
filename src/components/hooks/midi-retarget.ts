/**
 * Pure re-targeting helpers for held/latched MIDI & virtual surface notes
 * when polarity or tuning configuration changes.
 */

import {
  MidiNoteMappingResult,
  MidiTuningConfig,
  midiToDWithTuning,
} from '../../core/midi-tuning';

export interface HeldStackEntry {
  midi: number;
  d: number;
  velocity: number;
  mapping: MidiNoteMappingResult;
  explicitNoteD?: number;
}

export function resolveRetargetedEntry(
  item: HeldStackEntry,
  polarityD: number,
  tuningCfg: MidiTuningConfig,
  tuningA4Hz: number,
  tplFrequencyHz: number
): HeldStackEntry {
  if (item.explicitNoteD !== undefined || item.midi >= 1000) {
    const targetIsRhythm = polarityD >= 0;
    const currentlyRhythm = item.d >= 0;
    const shifted =
      targetIsRhythm === currentlyRhythm
        ? item.d
        : item.d >= 0
        ? Math.max(-7.0, item.d - 8)
        : Math.min(7.0, item.d + 8);
    const nextD = targetIsRhythm ? Math.max(0.01, shifted) : Math.min(-0.01, shifted);
    const nextMapping: MidiNoteMappingResult = {
      ...item.mapping,
      d: nextD,
      polarity: targetIsRhythm ? 'rhythm' : 'pitch',
    };
    return {
      ...item,
      d: nextD,
      mapping: nextMapping,
      ...(item.explicitNoteD !== undefined ? { explicitNoteD: nextD } : {}),
    };
  }

  const nextMapping = midiToDWithTuning(
    item.midi,
    tuningCfg,
    polarityD,
    tuningA4Hz,
    tplFrequencyHz
  );
  return {
    ...item,
    d: nextMapping.d,
    mapping: nextMapping,
  };
}
