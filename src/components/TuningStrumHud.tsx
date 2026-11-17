/**
 * Floating HUD banner for Tuning-driven Strum / Scale-Step Mode and Stepped Scale Sequencer.
 * Plays polyphonic voices using the active Shape's full overtones and ADSR.
 * Australian English spelling maintained.
 */

import React from 'react';
import { Play, Square, Check, Sparkles, Sliders } from 'lucide-react';
import { SEQUENCE_PATTERNS, SequencePattern } from '../core/scale-sequencer';
import { MIDI_TUNING_PRESETS, MidiTuningConfig } from '../core/midi-tuning';
import { UseTuningStrumResult } from './hooks/useTuningStrum';

export interface TuningStrumHudProps {
  midiTuning: MidiTuningConfig;
  tuningStrum: UseTuningStrumResult;
  onOpenTuningStudio: () => void;
}

export const TuningStrumHud: React.FC<TuningStrumHudProps> = ({
  midiTuning,
  tuningStrum,
  onOpenTuningStudio,
}) => {
  const {
    allDegrees,
    activeDegrees,
    activeIndex,
    strumToIndex,
    toggleDegreeActive,
    isSequencing,
    sequencePattern,
    setSequencePattern,
    sequenceTempoBpm,
    setSequenceTempoBpm,
    toggleSequencer,
    setIsStrumMode,
  } = tuningStrum;

  const presetLabel =
    midiTuning.presetId === 'custom'
      ? 'Custom Tuning'
      : MIDI_TUNING_PRESETS[midiTuning.presetId].label;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 w-[95vw] max-w-3xl pointer-events-auto">
      <div className="bg-[#0b0e17]/95 backdrop-blur-md border border-rose-500/40 rounded-xl shadow-[0_8px_32px_rgba(244,63,94,0.2)] px-3 py-2 flex flex-col gap-2 text-xs text-slate-100">
        {/* Top Row: Tuning Label + Sequencer Controls + Done */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-semibold text-[11px]">
              <Sparkles className="w-3 h-3" />
              Strum
            </span>
            <button
              type="button"
              onClick={onOpenTuningStudio}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-amber-300 font-medium cursor-pointer"
              title="Open Tuning & Rhythm Map"
            >
              <Sliders className="w-3 h-3" />
              <span>{presetLabel}</span>
            </button>
            <span className="text-[11px] text-slate-400 hidden md:inline">
              Drag or scroll canvas ({activeDegrees.length} degrees)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={sequencePattern}
              onChange={(e) => setSequencePattern(e.target.value as SequencePattern)}
              className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-rose-500"
              title="Scale sequencer pattern"
            >
              {SEQUENCE_PATTERNS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-md px-2 py-0.5 text-[10px] text-slate-300">
              <span>BPM</span>
              <input
                type="number"
                min={30}
                max={360}
                step={10}
                value={sequenceTempoBpm}
                onChange={(e) =>
                  setSequenceTempoBpm(Math.max(30, Math.min(360, Number(e.target.value) || 120)))
                }
                className="w-11 bg-transparent text-right font-mono text-white focus:outline-none"
              />
            </label>

            <button
              type="button"
              onClick={toggleSequencer}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                isSequencing
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
              title={isSequencing ? 'Stop stepped scale walk' : 'Auto-play stepped scale walk'}
            >
              {isSequencing ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isSequencing ? 'Stop' : 'Walk'}
            </button>

            <button
              type="button"
              onClick={() => setIsStrumMode(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              Done
            </button>
          </div>
        </div>

        {/* Active Scale Degree Pills (Click to strum; Shift+Click to toggle active/inactive) */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {allDegrees.map((deg) => {
            const activeIdx = activeDegrees.findIndex((d) => d.index === deg.index);
            const isPlayingThis = activeIdx >= 0 && activeIdx === activeIndex;
            return (
              <button
                key={deg.index}
                type="button"
                onClick={(e) => {
                  if (e.shiftKey) {
                    toggleDegreeActive(deg.index);
                  } else if (activeIdx >= 0) {
                    strumToIndex(activeIdx);
                  } else {
                    toggleDegreeActive(deg.index);
                  }
                }}
                className={`px-2 py-1 rounded-md text-[10px] font-mono shrink-0 transition cursor-pointer border ${
                  !deg.active
                    ? 'bg-slate-950/60 text-slate-600 border-slate-800/60 line-through'
                    : isPlayingThis
                    ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                    : deg.highlightRole === 'tritone'
                    ? 'bg-rose-950/50 text-rose-200 border-rose-700/50 hover:border-rose-500'
                    : deg.highlightRole === 'semitone'
                    ? 'bg-amber-950/50 text-amber-200 border-amber-700/50 hover:border-amber-500'
                    : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:border-slate-500'
                }`}
                title={`${deg.label} (${deg.subLabel} · ${deg.cents}¢) — Click to play, Shift+Click to toggle`}
              >
                {deg.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
