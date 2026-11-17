/**
 * Expanded MIDI Tuning & Rhythm Mapping panel.
 * Brings the Prime Period Theory Harmonic Profiler tuning model into Spectrum Shapes,
 * allowing consistent Prime Family interval mappings across Pitch Space and Rhythm Space.
 */

import React from 'react';
import {
  MIDI_TUNING_PRESETS,
  MidiIntervalTuningConfig,
  MidiNoteMappingResult,
  MidiPhaseMode,
  MidiTuningConfig,
  MidiTuningPresetId,
  PrimeFamilyLabel,
  getPolarityFromD,
  resolveSemitoneInterval,
} from '../core/midi-tuning';
import { PITCH_NAMES, dToBpm } from '../core/axis';
import { TPL_FREQUENCY_HZ } from '../core/ppt-constants';

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
  { key: 'm2', semitone: 1, solfege: 'Ra', label: 'Minor 2nd', options: ['Du', 'Tri', 'Qui'] },
  { key: 'M2', semitone: 2, solfege: 'Re', label: 'Major 2nd', options: ['Du', 'Tri'] },
  { key: 'm3', semitone: 3, solfege: 'Me', label: 'Minor 3rd', options: ['Du', 'Tri', 'Qui', 'Sep'] },
  { key: 'M3', semitone: 4, solfege: 'Mi', label: 'Major 3rd', options: ['Du', 'Tri', 'Qui'] },
  { key: 'P4', semitone: 5, solfege: 'Fa', label: 'Perfect 4th', options: ['Du', 'Tri'] },
  { key: 'TT', semitone: 6, solfege: 'Fi', label: 'Tritone', options: ['Du', 'Tri', 'Qui', 'Sep', 'Undec'] },
  { key: 'P5', semitone: 7, solfege: 'So', label: 'Perfect 5th', options: ['Du', 'Tri'] },
  { key: 'm6', semitone: 8, solfege: 'Le', label: 'Minor 6th', options: ['Du', 'Tri', 'Qui'] },
  { key: 'M6', semitone: 9, solfege: 'La', label: 'Major 6th', options: ['Du', 'Tri', 'Qui'] },
  { key: 'm7', semitone: 10, solfege: 'Te', label: 'Minor 7th', options: ['Du', 'Tri', 'Sep'] },
  { key: 'M7', semitone: 11, solfege: 'Ti', label: 'Major 7th', options: ['Du', 'Tri', 'Qui'] },
];

const ROOT_OPTIONS: Array<{ midi: number; label: string }> = [
  { midi: 68, label: 'G♯4 (MIDI 68 — TPL Mirror)' },
  { midi: 62, label: 'D4 (MIDI 62 — PPT D)' },
  { midi: 60, label: 'C4 (MIDI 60 — Middle C)' },
  { midi: 69, label: 'A4 (MIDI 69 — A440)' },
];

const FAMILY_BADGE_STYLES: Record<PrimeFamilyLabel, string> = {
  Du: 'bg-sky-950/70 text-sky-300 border-sky-700/60',
  Tri: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60',
  Qui: 'bg-amber-950/70 text-amber-300 border-amber-700/60',
  Sep: 'bg-purple-950/70 text-purple-300 border-purple-700/60',
  Undec: 'bg-rose-950/70 text-rose-300 border-rose-700/60',
};

function formatMidiNoteName(midi: number): string {
  const note = PITCH_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

export const MidiTuningPanel: React.FC<MidiTuningPanelProps> = ({
  midiTuning,
  onChangeTuning,
  currentFundamentalD,
  tplFrequencyHz = TPL_FREQUENCY_HZ,
  lastMapping,
  heldMappings,
}) => {
  const polarity = getPolarityFromD(currentFundamentalD);
  const anchorBpm = dToBpm(midiTuning.rhythmAnchorBand, tplFrequencyHz);
  const activeMappings = heldMappings.length > 0 ? heldMappings : lastMapping ? [lastMapping] : [];

  const handleSelectPreset = (presetId: Exclude<MidiTuningPresetId, 'custom'>) => {
    onChangeTuning((prev) => ({
      ...prev,
      presetId,
      intervals: { ...MIDI_TUNING_PRESETS[presetId].intervals },
    }));
  };

  const handleIntervalChange = (key: keyof MidiIntervalTuningConfig, family: PrimeFamilyLabel) => {
    onChangeTuning((prev) => ({
      ...prev,
      presetId: 'custom',
      intervals: {
        ...prev.intervals,
        [key]: family,
      },
    }));
  };

  return (
    <div className="space-y-4">
      {/* Live TPL Polarity & PPT Lens Readout */}
      <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Active TPL Polarity
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
              polarity === 'rhythm'
                ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                : 'bg-sky-950/60 text-sky-300 border-sky-700/60'
            }`}
          >
            {polarity === 'rhythm' ? 'Rhythm Space (d ≥ 0)' : 'Pitch Space (d < 0)'}
          </span>
        </div>

        {activeMappings.length > 0 ? (
          <div className="space-y-1.5">
            {activeMappings.map((m) => (
              <div
                key={m.midi}
                className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-white">{formatMidiNoteName(m.midi)}</span>
                  <span className="font-mono text-slate-300">{m.address.formatted}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] border ${FAMILY_BADGE_STYLES[m.primeFamily]}`}>
                    {m.primeFamily}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px] text-slate-300">
                  <span>{m.rational ? `${m.rational.num}:${m.rational.den}` : '12-TET'}</span>
                  <span>
                    {m.polarity === 'rhythm'
                      ? `${m.bpm.toFixed(2)} BPM`
                      : `${m.freqHz.toFixed(2)} Hz`}
                  </span>
                  <span className="text-slate-400">
                    {m.centsFromEdo > 0 ? `+${m.centsFromEdo}¢` : m.centsFromEdo < 0 ? `${m.centsFromEdo}¢` : '±0¢'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Play a MIDI key to inspect its DuMetric Solfège degree, Prime Family ratio, and tempo/pitch translation.
          </p>
        )}
      </div>

      {/* Tuning System Presets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200">Tuning System</span>
          {midiTuning.presetId === 'custom' && (
            <span className="text-[10px] font-mono text-amber-300">Custom Profile</span>
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
      </div>

      {/* Rhythm & Pitch Anchor Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-slate-300">
            Rhythm Anchor Band (Do+{midiTuning.rhythmAnchorBand} ≈ {anchorBpm.toFixed(1)} BPM)
          </span>
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
          <span className="text-[11px] font-medium text-slate-300">Root Key (Do)</span>
          <select
            value={midiTuning.rhythmRootMidi}
            onChange={(e) => {
              const root = Number(e.target.value);
              onChangeTuning((prev) => ({
                ...prev,
                rhythmRootMidi: root,
                pitchRootMidi: root,
              }));
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            {ROOT_OPTIONS.map((opt) => (
              <option key={opt.midi} value={opt.midi}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Rhythm Phase Alignment Mode */}
      <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-slate-200 block">Rhythm Phase Alignment</span>
          <span className="text-[11px] text-slate-400">
            {midiTuning.rhythmPhaseMode === 'sam-aligned'
              ? 'Voices join mid-cycle so periodic ratios lock at the Sam.'
              : 'Each key strike restarts its own cycle from phase 0.'}
          </span>
        </div>
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 shrink-0">
          {(
            [
              { id: 'sam-aligned', label: 'Sam-Aligned' },
              { id: 'key-strike', label: 'Key-Strike' },
            ] as Array<{ id: MidiPhaseMode; label: string }>
          ).map((opt) => {
            const active = (midiTuning.rhythmPhaseMode ?? 'sam-aligned') === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onChangeTuning((prev) => ({ ...prev, rhythmPhaseMode: opt.id }))
                }
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  active
                    ? 'bg-red-600/25 text-white border border-red-500/60'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Harmonic Profiler Interval Matrix */}
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
                    {res.rational ? `${res.rational.num}:${res.rational.den}` : '12-TET'}
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
    </div>
  );
};
