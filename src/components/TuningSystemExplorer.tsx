/**
 * Deliberate 3-layer Tuning configuration for alternate Tuning Systems:
 * 1. Tuning System (interval universe: 3:2 Chain or 31-EDO)
 * 2. Scale Subset (active degrees out of the tuning universe, relative to base frequency on Scale/Strum)
 * 3. Harmony Structure (Secundal / Tertial / Quartal voicing & step shapes)
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
  const activeCount = resolvedDegrees.filter((d) => d.active).length;
  const harmony = midiTuning.harmonyStructure ?? 'tertial';

  const toggleDegreeActive = (idx: number) => {
    const nextMask = resolvedDegrees.map((d, i) => (i === idx ? !d.active : d.active));
    onChangeTuning((prev) => ({ ...prev, activeDegreeMask: nextMask }));
  };

  return (
    <div className="space-y-3 rounded-xl bg-slate-950/70 border border-slate-800 p-3">
      {/* Layer 2: Scale Subset */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-slate-200 block">
              Scale Subset ({activeCount} of {resolvedDegrees.length} steps active)
            </span>
            <span className="text-[10px] text-slate-400">
              Scale Strip &amp; Strum shift tonic with the base frequency; Piano &amp; Guitar stay absolute.
            </span>
          </div>

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
          )}

          {midiTuning.systemMode === '31edo' && (
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
        </div>

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

      {/* Layer 3: Underlying Harmony Structure */}
      <div className="border-t border-slate-800/80 pt-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-slate-200 block">Harmony Structure</span>
          <span className="text-[10px] text-slate-400">
            Voicing &amp; step geometry within the active scale subset
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'secundal', label: 'Secundal (2nds)' },
              { id: 'tertial', label: 'Tertial (3rds)' },
              { id: 'quartal', label: 'Quartal (4ths)' },
            ] as const
          ).map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => onChangeTuning((prev) => ({ ...prev, harmonyStructure: h.id }))}
              className={`px-2 py-1 rounded text-[10px] font-semibold border cursor-pointer ${
                harmony === h.id
                  ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
