/**
 * Interactive explorer for alternate Tuning Systems (Pythagorean 3:2 Chain and 31-EDO)
 * inside MidiTuningPanel: chain length selector, 31-EDO subset selector, MIDI step map toggle,
 * and clickable degree activation pills.
 */

import React from 'react';
import { MidiTuningConfig } from '../core/midi-tuning';
import { Edo31SubsetId, resolveTuningDegrees } from '../core/tuning-systems';

export interface TuningSystemExplorerProps {
  midiTuning: MidiTuningConfig;
  onChangeTuning: (updater: MidiTuningConfig | ((prev: MidiTuningConfig) => MidiTuningConfig)) => void;
}

export const TuningSystemExplorer: React.FC<TuningSystemExplorerProps> = ({
  midiTuning,
  onChangeTuning,
}) => {
  const resolvedDegrees = resolveTuningDegrees(midiTuning);

  const toggleDegreeActive = (idx: number) => {
    const nextMask = resolvedDegrees.map((d, i) => (i === idx ? !d.active : d.active));
    onChangeTuning((prev) => ({ ...prev, activeDegreeMask: nextMask }));
  };

  return (
    <div className="space-y-2 rounded-xl bg-slate-950/70 border border-slate-800 p-3">
      {midiTuning.systemMode === 'pythagorean-chain' && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-200">
            3:2 Chain Length: {midiTuning.pythagoreanChainLength ?? 5} steps
          </span>
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
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                  (midiTuning.pythagoreanChainLength ?? 5) === len
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {len === 5 ? '5 Pentatonic' : len === 7 ? '7 Heptatonic' : '12 Full'}
              </button>
            ))}
          </div>
        </div>
      )}

      {midiTuning.systemMode === '31edo' && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {(
              [
                { id: 'pentatonic-5', label: 'Pentatonic (5)' },
                { id: 'meantone-7', label: 'Meantone (7)' },
                { id: 'septimal', label: 'Septimal (5)' },
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
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                  (midiTuning.edo31Subset ?? 'meantone-7') === sub.id
                    ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              onChangeTuning((prev) => ({
                ...prev,
                midiStepMap: prev.midiStepMap === '31edo' ? '12-key' : '31edo',
              }))
            }
            className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
              midiTuning.midiStepMap === '31edo'
                ? 'bg-sky-600/30 border-sky-500 text-sky-200'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title="Map consecutive hardware MIDI keys 1:1 to 31-EDO steps"
          >
            MIDI: {midiTuning.midiStepMap === '31edo' ? '31-Step/Key' : '12-Key'}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1 pt-1">
        {resolvedDegrees.map((deg) => (
          <button
            key={deg.index}
            type="button"
            onClick={() => toggleDegreeActive(deg.index)}
            className={`px-1.5 py-1 rounded text-[10px] font-mono border transition cursor-pointer ${
              deg.active
                ? deg.highlightRole === 'tritone'
                  ? 'bg-rose-950/70 border-rose-500/70 text-rose-200'
                  : deg.highlightRole === 'semitone'
                  ? 'bg-amber-950/70 border-amber-500/70 text-amber-200'
                  : 'bg-emerald-950/70 border-emerald-500/70 text-emerald-200'
                : 'bg-slate-900/50 border-slate-800 text-slate-600 line-through'
            }`}
            title={`${deg.label} (${deg.subLabel} · ${deg.cents}¢) — click to toggle`}
          >
            {deg.label}
          </button>
        ))}
      </div>
    </div>
  );
};
