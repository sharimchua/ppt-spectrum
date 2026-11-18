/**
 * Clean 2-Layer Relative Tuning UI + Projection selector:
 * 1. Tuning System (Period lattice: EDO, Ratio-Chain, or Explicit)
 * 2. Tuning Subset / Sieve (Scale / Key mask over the Tuning System's steps)
 * 3. Key/MIDI Projection Mode (Nearest-12, Step-System, Step-Subset)
 */

import React from 'react';
import { MidiTuningConfig } from '../core/midi-tuning';
import {
  ProjectionMode,
  getAvailableSubsetsForSystem,
  resolveSubsetId,
  resolveSystemSpec,
  resolveTuningDegrees,
} from '../core/tuning-systems';

export interface TuningSystemExplorerProps {
  midiTuning: MidiTuningConfig;
  onChangeTuning: (updater: MidiTuningConfig | ((prev: MidiTuningConfig) => MidiTuningConfig)) => void;
}

export const TuningSystemExplorer: React.FC<TuningSystemExplorerProps> = ({
  midiTuning,
  onChangeTuning,
}) => {
  const spec = resolveSystemSpec(midiTuning);
  const subsetId = resolveSubsetId(midiTuning);
  const resolvedDegrees = resolveTuningDegrees(midiTuning);
  const activeCount = resolvedDegrees.filter((d) => d.active).length;
  const availableSubsets = getAvailableSubsetsForSystem(spec);
  const projMode: ProjectionMode = midiTuning.projectionMode ?? 'nearest-12';

  const toggleDegreeActive = (idx: number) => {
    const nextMask = resolvedDegrees.map((d, i) => (i === idx ? !d.active : d.active));
    onChangeTuning((prev) => ({ ...prev, activeDegreeMask: nextMask }));
  };

  return (
    <div className="space-y-3 rounded-xl bg-slate-950/70 border border-slate-800 p-3">
      {/* Layer 1: Tuning System Parameters */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div>
          <span className="text-xs font-semibold text-slate-200 block">
            1. Tuning System Lattice ({resolvedDegrees.length} steps / {(spec.periodRatio ?? 2) === 3 ? '3:1 Tritave' : '2:1 Octave'})
          </span>
          <span className="text-[10px] text-slate-400">
            {spec.kind === 'ratio-chain'
              ? `Ratio chain (${spec.generatorNum}:${spec.generatorDen}) reduced mod ${spec.periodRatio ?? 2}:1`
              : spec.kind === 'edo'
              ? `${spec.divisions} equal divisions of ${spec.periodRatio ?? 2}:1`
              : `Explicit ${spec.degrees.length}-degree lattice`}
          </span>
        </div>

        {spec.kind === 'ratio-chain' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Chain:</span>
            {[12, 19, 31, 53].map((len) => (
              <button
                key={len}
                type="button"
                onClick={() =>
                  onChangeTuning((prev) => ({
                    ...prev,
                    systemSpec: { ...spec, chainLength: len },
                    activeDegreeMask: undefined,
                  }))
                }
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                  spec.chainLength === len
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {len}
              </button>
            ))}
          </div>
        )}

        {spec.kind === 'edo' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Steps:</span>
            <input
              type="number"
              min={5}
              max={72}
              value={spec.divisions}
              onChange={(e) => {
                const divs = Math.max(5, Math.min(72, Number(e.target.value) || 12));
                onChangeTuning((prev) => ({
                  ...prev,
                  presetId: 'custom',
                  systemMode: divs === 31 ? '31edo' : 'custom-system',
                  systemSpec: { ...spec, divisions: divs },
                  subsetId: 'all',
                  activeDegreeMask: undefined,
                }));
              }}
              className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-white text-right focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Layer 2: Tuning Subset / Sieve ("Scale / Key") */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-slate-200 block">
              2. Tuning Subset / Scale ({activeCount} of {resolvedDegrees.length} active)
            </span>
            <span className="text-[10px] text-slate-400">
              Relative to the active fundamental on Scale Strip &amp; Auto-Play.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {availableSubsets.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() =>
                  onChangeTuning((prev) => ({
                    ...prev,
                    subsetId: sub.id,
                    activeDegreeMask: undefined,
                  }))
                }
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                  subsetId === sub.id
                    ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
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

      {/* Physical Key / MIDI Projection Mode */}
      <div className="border-t border-slate-800/80 pt-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-slate-200 block">Key / MIDI Projection</span>
          <span className="text-[10px] text-slate-400">
            How 12-key Piano &amp; hardware MIDI keys project onto this Tuning System
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'nearest-12', label: 'Nearest-12' },
              { id: 'step-system', label: 'Step: System' },
              { id: 'step-subset', label: 'Step: Subset' },
            ] as const
          ).map((pm) => (
            <button
              key={pm.id}
              type="button"
              onClick={() =>
                onChangeTuning((prev) => ({
                  ...prev,
                  projectionMode: pm.id,
                  midiStepMap: pm.id === 'step-system' && spec.kind === 'edo' && spec.divisions === 31 ? '31edo' : '12-key',
                }))
              }
              className={`px-2 py-1 rounded text-[10px] font-semibold border cursor-pointer ${
                projMode === pm.id
                  ? 'bg-sky-600/30 border-sky-500 text-sky-200'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {pm.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
