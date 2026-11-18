/**
 * Expanded MIDI Tuning & Rhythm Mapping panel.
 * Brings the Prime Period Theory Harmonic Profiler tuning model into Spectrum Shapes,
 * allowing consistent Prime Family interval mappings across Pitch Space and Rhythm Space.
 */

import React, { useEffect, useState } from 'react';
import {
  MIDI_TUNING_PRESETS,
  MidiIntervalTuningConfig,
  MidiNoteMappingResult,
  MidiTuningConfig,
  MidiTuningPresetId,
  PrimeFamilyLabel,
  ROOT_KEY_ANCHORS,
  applyTuningPreset,
  resolveRootFrequencyHz,
  resolveSemitoneInterval,
} from '../core/midi-tuning';
import { dToBpm } from '../core/axis';
import { TPL_FREQUENCY_HZ } from '../core/ppt-constants';
import { TuningSystemExplorer } from './TuningSystemExplorer';

export interface MidiTuningPanelProps {
  midiTuning: MidiTuningConfig;
  onChangeTuning: (updater: MidiTuningConfig | ((prev: MidiTuningConfig) => MidiTuningConfig)) => void;
  currentFundamentalD: number;
  tplFrequencyHz?: number;
  lastMapping: MidiNoteMappingResult | null;
  heldMappings: MidiNoteMappingResult[];
}

interface IntervalRowDef {
  key: keyof MidiIntervalTuningConfig;
  semitone: number;
  solfege: string;
  label: string;
  options: PrimeFamilyLabel[];
}

const INTERVAL_ROWS: IntervalRowDef[] = [
  { key: 'm2', semitone: 1, solfege: 'Ra', label: 'Minor 2nd', options: ['12TET', 'DuTri', 'Tri', 'Qui'] },
  { key: 'M2', semitone: 2, solfege: 'Re', label: 'Major 2nd', options: ['12TET', 'DuTri', 'Tri'] },
  { key: 'm3', semitone: 3, solfege: 'Me', label: 'Minor 3rd', options: ['12TET', 'Du', 'Tri', 'Qui', 'Sep'] },
  { key: 'M3', semitone: 4, solfege: 'Mi', label: 'Major 3rd', options: ['12TET', 'DuTri', 'Tri', 'Qui'] },
  { key: 'P4', semitone: 5, solfege: 'Fa', label: 'Perfect 4th', options: ['12TET', 'Tri'] },
  { key: 'TT', semitone: 6, solfege: 'Fi', label: 'Tritone', options: ['12TET', 'Du', 'Tri', 'Qui', 'Sep', 'Undec'] },
  { key: 'P5', semitone: 7, solfege: 'So', label: 'Perfect 5th', options: ['12TET', 'Tri'] },
  { key: 'm6', semitone: 8, solfege: 'Le', label: 'Minor 6th', options: ['12TET', 'DuTri', 'Tri', 'Qui'] },
  { key: 'M6', semitone: 9, solfege: 'La', label: 'Major 6th', options: ['12TET', 'Du', 'Tri', 'Qui'] },
  { key: 'm7', semitone: 10, solfege: 'Te', label: 'Minor 7th', options: ['12TET', 'DuTri', 'Tri', 'Sep'] },
  { key: 'M7', semitone: 11, solfege: 'Ti', label: 'Major 7th', options: ['12TET', 'DuTri', 'Tri', 'Qui'] },
];

const FAMILY_BADGE_STYLES: Record<PrimeFamilyLabel, string> = {
  '12TET': 'bg-slate-800 text-slate-200 border-slate-600',
  Du: 'bg-sky-950/70 text-sky-300 border-sky-700/60',
  DuTri: 'bg-teal-950/70 text-teal-300 border-teal-700/60',
  Tri: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60',
  Qui: 'bg-amber-950/70 text-amber-300 border-amber-700/60',
  Sep: 'bg-purple-950/70 text-purple-300 border-purple-700/60',
  Undec: 'bg-rose-950/70 text-rose-300 border-rose-700/60',
};

export const MidiTuningPanel: React.FC<MidiTuningPanelProps> = ({
  midiTuning,
  onChangeTuning,
  tplFrequencyHz = TPL_FREQUENCY_HZ,
}) => {
  const resolvedAnchorHz = resolveRootFrequencyHz(midiTuning);
  const [hzDraft, setHzDraft] = useState(resolvedAnchorHz.toFixed(2));
  useEffect(() => {
    setHzDraft(resolvedAnchorHz.toFixed(2));
  }, [resolvedAnchorHz]);

  const activeAnchorId =
    midiTuning.rootAnchorId ??
    (midiTuning.rootFrequencyHz !== undefined
      ? 'custom-hz'
      : `midi-${midiTuning.pitchRootMidi}`);

  const commitHzDraft = () => {
    const parsed = Number(hzDraft);
    if (Number.isFinite(parsed) && parsed >= 20 && parsed <= 4000) {
      onChangeTuning((prev) => ({
        ...prev,
        rootAnchorId: 'custom-hz',
        rootFrequencyHz: parsed,
      }));
    } else {
      setHzDraft(resolvedAnchorHz.toFixed(2));
    }
  };

  const handleSelectPreset = (presetId: Exclude<MidiTuningPresetId, 'custom'>) => {
    onChangeTuning((prev) => applyTuningPreset(prev, presetId));
  };

  const handleIntervalChange = (key: keyof MidiIntervalTuningConfig, family: PrimeFamilyLabel) => {
    onChangeTuning((prev) => ({
      ...prev,
      presetId: 'custom',
      systemMode: 'chromatic-12',
      activeDegreeMask: undefined,
      intervals: {
        ...prev.intervals,
        [key]: family,
      },
    }));
  };

  return (
    <div className="space-y-4">
      {/* 1. Tuning System Presets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200">Tuning System</span>
          {midiTuning.presetId === 'custom' && (
            <span className="text-[10px] font-mono text-amber-300">Mixed / Custom Profile</span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {(Object.keys(MIDI_TUNING_PRESETS) as Array<Exclude<MidiTuningPresetId, 'custom'>>).map((id) => {
            const preset = MIDI_TUNING_PRESETS[id];
            const isActive = midiTuning.presetId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectPreset(id)}
                title={preset.description}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition cursor-pointer ${
                  isActive
                    ? 'bg-red-600/20 border-red-500 text-white'
                    : 'bg-slate-800/70 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onChangeTuning((prev) => ({ ...prev, presetId: 'custom' }))}
            title="Mix Prime Family tunings per interval below."
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition cursor-pointer ${
              midiTuning.presetId === 'custom'
                ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                : 'bg-slate-800/70 border-slate-700/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Mixed / Custom
          </button>
        </div>
        <p className="text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800/80 rounded-lg px-2.5 py-2 leading-relaxed">
          {midiTuning.presetId === 'custom'
            ? 'Mixed / Custom: Combine rational Prime Family intervals with irrational Du, DuTri, or 12-TET steps per chromatic degree relative to Do.'
            : MIDI_TUNING_PRESETS[midiTuning.presetId].description}
        </p>
      </div>

      {/* Layer 2 & Projection: Generalized System + Tuning Subset Explorer (always shown) */}
      <TuningSystemExplorer midiTuning={midiTuning} onChangeTuning={onChangeTuning} />

      {/* Optional 12-Tone Harmonic Profiler Interval Matrix */}
      {(!midiTuning.systemMode || midiTuning.systemMode === 'chromatic-12') && (
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-200">
            Harmonic Profiler Interval Matrix
          </span>
          <div className="max-h-52 overflow-y-auto pr-1 space-y-1">
            {INTERVAL_ROWS.map((row) => {
              const activeFamily = midiTuning.intervals[row.key];
              const res = resolveSemitoneInterval(row.semitone, midiTuning.intervals);
              return (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-2 bg-slate-950/70 border border-slate-800/80 rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-semibold text-slate-200 w-6">{row.solfege}</span>
                    <span className="text-slate-400 truncate">{row.label}</span>
                    <span className="font-mono text-[11px] text-slate-300">
                      {res.rational ? `${res.rational.num}:${res.rational.den}` : res.primeFamily}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {row.options.map((opt) => {
                      const selected = activeFamily === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleIntervalChange(row.key, opt)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition cursor-pointer ${
                            selected
                              ? FAMILY_BADGE_STYLES[opt]
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Absolute Projection: Rhythm Anchor Band & Root Key */}
      <div className="space-y-2 rounded-xl bg-slate-950/70 border border-slate-800 p-3">
        <div>
          <span className="text-xs font-semibold text-slate-200 block">
            3. Absolute Frequency &amp; Rhythm Projection
          </span>
          <span className="text-[10px] text-slate-400">
            Anchors the relative 2-layer tuning structure to absolute pitch (Hz) and rhythm (BPM) space.
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-300">Rhythm Anchor Band</span>
            <select
              value={midiTuning.rhythmAnchorBand}
              onChange={(e) =>
                onChangeTuning((prev) => ({ ...prev, rhythmAnchorBand: Number(e.target.value) }))
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              {[2, 3, 4, 5, 6].map((band) => (
                <option key={band} value={band}>
                  Band +{band} (Do+{band} ≈ {dToBpm(band, tplFrequencyHz).toFixed(1)} BPM)
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-300">Root Key / Anchor (Do)</span>
            <select
              value={activeAnchorId}
              onChange={(e) => {
                const id = e.target.value;
                if (id === 'custom-hz') {
                  onChangeTuning((prev) => ({
                    ...prev,
                    rootAnchorId: 'custom-hz',
                    rootFrequencyHz: prev.rootFrequencyHz ?? resolvedAnchorHz,
                  }));
                  return;
                }
                const found = ROOT_KEY_ANCHORS.find((a) => a.id === id);
                if (!found) return;
                onChangeTuning((prev) => ({
                  ...prev,
                  rhythmRootMidi: found.midi,
                  pitchRootMidi: found.midi,
                  rootAnchorId: found.id,
                  rootFrequencyHz: found.freqHz,
                }));
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <optgroup label="12-TET Pitches (C4–B4)">
                {ROOT_KEY_ANCHORS.filter((a) => a.group === '12tet').map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="World & Historical Anchors">
                {ROOT_KEY_ANCHORS.filter((a) => a.group === 'world').map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
              <option value="custom-hz">Custom Frequency (Hz)</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-300">Anchor Pitch (Hz)</span>
            <input
              type="text"
              inputMode="decimal"
              value={hzDraft}
              onChange={(e) => setHzDraft(e.target.value.replace(/[^0-9.]/g, ''))}
              onBlur={commitHzDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitHzDraft();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
