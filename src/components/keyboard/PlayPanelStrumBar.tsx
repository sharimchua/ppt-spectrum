/**
 * Inline Strum & Stepped Scale Sequencer bar docked inside VirtualKeyboard.
 * Includes quick subset selectors for 3:2 Chain and 31-EDO systems plus degree pills.
 */

import React from 'react';
import { Play, Square } from 'lucide-react';
import { MidiTuningConfig } from '../../core/midi-tuning';
import { Edo31SubsetId } from '../../core/tuning-systems';
import { SEQUENCE_PATTERNS, SequencePattern } from '../../core/scale-sequencer';
import { UseTuningStrumResult } from '../hooks/useTuningStrum';

export interface PlayPanelStrumBarProps {
  midiTuning: MidiTuningConfig;
  onChangeTuning: (updater: MidiTuningConfig | ((prev: MidiTuningConfig) => MidiTuningConfig)) => void;
  tuningStrum: UseTuningStrumResult;
}

export const PlayPanelStrumBar: React.FC<PlayPanelStrumBarProps> = ({
  midiTuning,
  onChangeTuning,
  tuningStrum,
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
  } = tuningStrum;

  return (
    <div className="mb-1.5 rounded-lg bg-slate-900/90 border border-rose-500/35 px-2.5 py-1.5 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold text-rose-300">
            Strum &amp; Auto-Play ({activeDegrees.length} active · drag across Scale keys)
          </span>

          {midiTuning.systemMode === 'pythagorean-chain' && (
            <div className="flex items-center gap-1">
              {[5, 7, 12].map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() =>
                    onChangeTuning((prev) => ({
                      ...prev,
                      pythagoreanChainLength: len,
                      activeDegreeMask: undefined,
                    }))
                  }
                  className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border cursor-pointer ${
                    (midiTuning.pythagoreanChainLength ?? 5) === len
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                      : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {len === 5 ? '5 Pent' : len === 7 ? '7 Hept' : '12 Full'}
                </button>
              ))}
            </div>
          )}

          {midiTuning.systemMode === '31edo' && (
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'pentatonic-5', label: '5 Pent' },
                  { id: 'meantone-7', label: '7 Meantone' },
                  { id: 'septimal', label: '5 Septimal' },
                  { id: 'chromatic', label: 'All 31' },
                ] as Array<{ id: Edo31SubsetId; label: string }>
              ).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() =>
                    onChangeTuning((prev) => ({
                      ...prev,
                      edo31Subset: sub.id,
                      activeDegreeMask: undefined,
                    }))
                  }
                  className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border cursor-pointer ${
                    (midiTuning.edo31Subset ?? 'meantone-7') === sub.id
                      ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                      : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={sequencePattern}
            onChange={(e) => setSequencePattern(e.target.value as SequencePattern)}
            className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200 focus:outline-none"
          >
            {SEQUENCE_PATTERNS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-300">
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
              className="w-10 bg-transparent text-right font-mono text-white focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={toggleSequencer}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
              isSequencing
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            {isSequencing ? <Square className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
            {isSequencing ? 'Stop' : 'Auto'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {allDegrees.map((deg) => {
          const activeIdx = activeDegrees.findIndex((d) => d.index === deg.index);
          const isPlayingThis = activeIdx >= 0 && activeIdx === activeIndex;
          return (
            <button
              key={deg.index}
              type="button"
              onClick={(e) => {
                if (e.shiftKey || activeIdx < 0) {
                  toggleDegreeActive(deg.index);
                } else {
                  strumToIndex(activeIdx);
                }
              }}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0 transition cursor-pointer border ${
                !deg.active
                  ? 'bg-slate-950/50 text-slate-600 border-slate-800/60 line-through'
                  : isPlayingThis
                  ? 'bg-rose-600 text-white border-rose-400'
                  : 'bg-slate-950 text-slate-200 border-slate-700 hover:border-slate-500'
              }`}
              title={`${deg.label} (${deg.subLabel} · ${deg.cents}¢) — Click to play, Shift+Click to toggle`}
            >
              {deg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
