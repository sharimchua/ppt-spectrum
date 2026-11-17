/**
 * Persistence helpers for MIDI tuning configuration in localStorage.
 */

import { MidiTuningConfig, createDefaultMidiTuningConfig } from '../../core/midi-tuning';

const MIDI_TUNING_STORAGE_KEY = 'ppt_spectrum_midi_tuning_v1';

export function loadMidiTuningConfig(): MidiTuningConfig {
  const fallback = createDefaultMidiTuningConfig('5-limit');
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(MIDI_TUNING_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<MidiTuningConfig>;
    return {
      ...fallback,
      ...parsed,
      intervals: {
        ...fallback.intervals,
        ...(parsed.intervals ?? {}),
      },
    };
  } catch {
    return fallback;
  }
}

export function saveMidiTuningConfig(config: MidiTuningConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(MIDI_TUNING_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}
