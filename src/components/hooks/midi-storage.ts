/**
 * Persistence helpers for MIDI tuning configuration in localStorage.
 */

import {
  MIDI_TUNING_PRESETS,
  MidiTuningConfig,
  MidiTuningPresetId,
  applyTuningPreset,
  createDefaultMidiTuningConfig,
} from '../../core/midi-tuning';
import { TuningSubsetId } from '../../core/tuning-systems';

const MIDI_TUNING_STORAGE_KEY = 'ppt_spectrum_midi_tuning_v1';

const LEGACY_PRESET_MIGRATION: Record<
  string,
  { presetId: Exclude<MidiTuningPresetId, 'custom'>; subsetId?: TuningSubsetId }
> = {
  'pythagorean-pentatonic': { presetId: 'pythagorean', subsetId: 'pentatonic' },
  'pythagorean-heptatonic': { presetId: 'pythagorean', subsetId: 'heptatonic' },
  '31edo-meantone': { presetId: '31edo', subsetId: 'meantone' },
  '31edo-septimal': { presetId: '31edo', subsetId: 'septimal' },
  '31edo-chromatic': { presetId: '31edo', subsetId: 'all' },
  '24edo-maqam-rast': { presetId: '24edo', subsetId: 'rast' },
};

export function loadMidiTuningConfig(): MidiTuningConfig {
  const fallback = createDefaultMidiTuningConfig('5-limit');
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(MIDI_TUNING_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<MidiTuningConfig> & { presetId?: string };
    const rawId = parsed.presetId;
    const legacy = rawId ? LEGACY_PRESET_MIGRATION[rawId] : undefined;
    const merged: MidiTuningConfig = {
      ...fallback,
      ...parsed,
      presetId:
        rawId === 'custom' || (rawId && rawId in MIDI_TUNING_PRESETS)
          ? (rawId as MidiTuningPresetId)
          : legacy
          ? legacy.presetId
          : fallback.presetId,
      intervals: {
        ...fallback.intervals,
        ...(parsed.intervals ?? {}),
      },
    };
    if (legacy) {
      const migrated = applyTuningPreset(merged, legacy.presetId);
      return legacy.subsetId ? { ...migrated, subsetId: legacy.subsetId } : migrated;
    }
    return merged;
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
