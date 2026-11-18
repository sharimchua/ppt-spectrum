/**
 * Inline Auto-Play & Algorithmic Sequencer bar docked inside VirtualKeyboard.
 * Runs dual-coordinate (diatonic subset + chromatic lattice) step patterns and
 * standard arpeggiator boundary rules on top of any Layer 1 + Layer 2 tuning.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Minus, Play, Plus, Square } from 'lucide-react';
import { MidiTuningConfig } from '../../core/midi-tuning';
import {
  getAvailableSubsetsForSystem,
  resolveSubsetId,
  resolveSystemSpec,
} from '../../core/tuning-systems';
import {
  BOUNDARY_RULES,
  BoundaryRule,
  SEQUENCE_PATTERNS,
  SequencePatternId,
} from '../../core/scale-sequencer';
import { UseTuningStrumResult } from '../hooks/useTuningStrum';

export interface PlayPanelStrumBarProps {
  midiTuning: MidiTuningConfig;
  onChangeTuning: (updater: MidiTuningConfig | ((prev: MidiTuningConfig) => MidiTuningConfig)) => void;
  tuningStrum: UseTuningStrumResult;
}

const clampBpm = (bpm: number): number => Math.max(30, Math.min(360, Math.round(bpm)));

export const PlayPanelStrumBar: React.FC<PlayPanelStrumBarProps> = ({
  midiTuning,
  onChangeTuning,
  tuningStrum,
}) => {
  const {
    allDegrees,
    activeDegrees,
    activeIndex,
    activeSystemIndex,
    strumToIndex,
    toggleDegreeActive,
    isSequencing,
    sequencePattern,
    setSequencePattern,
    boundaryRule,
    setBoundaryRule,
    periodSpan,
    setPeriodSpan,
    customSteps,
    setCustomSteps,
    sequenceTempoBpm,
    setSequenceTempoBpm,
    useBorrowedTones,
    setUseBorrowedTones,
    toggleSequencer,
  } = tuningStrum;

  const spec = resolveSystemSpec(midiTuning);
  const subsetId = resolveSubsetId(midiTuning);
  const availableSubsets = getAvailableSubsetsForSystem(spec);
  const periodUnitLabel = (spec.periodRatio ?? 2) === 3 ? 'Tritave' : 'Oct';

  const [bpmDraft, setBpmDraft] = useState(String(sequenceTempoBpm));
  const tapTimesRef = useRef<number[]>([]);

  useEffect(() => {
    setBpmDraft(String(sequenceTempoBpm));
  }, [sequenceTempoBpm]);

  const commitBpmDraft = () => {
    const parsed = Number(bpmDraft);
    if (Number.isFinite(parsed) && parsed > 0) {
      const clamped = clampBpm(parsed);
      setSequenceTempoBpm(clamped);
      setBpmDraft(String(clamped));
    } else {
      setBpmDraft(String(sequenceTempoBpm));
    }
  };

  const handleTapTempo = () => {
    const now = performance.now();
    const recent = tapTimesRef.current.filter((t) => now - t < 2000);
    recent.push(now);
    tapTimesRef.current = recent.slice(-5);
    if (recent.length >= 2) {
      let sum = 0;
      for (let i = 1; i < recent.length; i++) {
        sum += recent[i] - recent[i - 1];
      }
      const avgMs = sum / (recent.length - 1);
      if (avgMs > 0) {
        setSequenceTempoBpm(clampBpm(60000 / avgMs));
      }
    }
  };

  return (
    <div className="mb-1.5 rounded-lg bg-slate-900/90 border border-rose-500/35 px-2.5 py-1.5 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold text-rose-300">
            Auto-Play ({activeDegrees.length} tones · relative to root)
          </span>

          {availableSubsets.length > 1 && (
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
                  className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border cursor-pointer ${
                    subsetId === sub.id
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

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setUseBorrowedTones(!useBorrowedTones)}
            className={`px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer ${
              useBorrowedTones
                ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Play strictly within the Tuning Subset (Diatonic) or borrow from the full Tuning System"
          >
            {useBorrowedTones ? 'All System' : 'Scale Subset'}
          </button>

          <select
            value={sequencePattern}
            onChange={(e) => setSequencePattern(e.target.value as SequencePatternId)}
            title="Sequencer pattern"
            className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200 focus:outline-none cursor-pointer"
          >
            {SEQUENCE_PATTERNS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          <select
            value={boundaryRule}
            onChange={(e) => setBoundaryRule(e.target.value as BoundaryRule)}
            title="Boundary rule at period limit"
            className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200 focus:outline-none cursor-pointer"
          >
            {BOUNDARY_RULES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setPeriodSpan(periodSpan === 1 ? 2 : 1)}
            title="Toggle 1 or 2 period span"
            className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-950 text-[10px] font-mono text-slate-200 hover:border-slate-500 cursor-pointer"
          >
            {periodSpan} {periodUnitLabel}
          </button>

          {/* Ergonomic Tempo / BPM Control */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-slate-300">
            <button
              type="button"
              onClick={(e) => setSequenceTempoBpm(clampBpm(sequenceTempoBpm - (e.shiftKey ? 1 : 5)))}
              title="Decrease BPM (-5, Shift+Click -1)"
              className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={bpmDraft}
              onChange={(e) => setBpmDraft(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={commitBpmDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitBpmDraft();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              aria-label="Sequencer BPM"
              className="w-7 bg-transparent text-center font-mono text-white focus:outline-none"
            />
            <span className="text-[9px] text-slate-500">BPM</span>
            <button
              type="button"
              onClick={(e) => setSequenceTempoBpm(clampBpm(sequenceTempoBpm + (e.shiftKey ? 1 : 5)))}
              title="Increase BPM (+5, Shift+Click +1)"
              className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
            <input
              type="range"
              min={30}
              max={300}
              step={1}
              value={Math.min(300, sequenceTempoBpm)}
              onChange={(e) => setSequenceTempoBpm(Number(e.target.value))}
              aria-label="Sequencer BPM slider"
              className="w-14 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-rose-500 hidden sm:block"
            />
            <button
              type="button"
              onClick={handleTapTempo}
              title="Tap repeatedly to set tempo"
              className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-rose-500/60 text-[9px] font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              Tap
            </button>
          </div>

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

      {/* Inline Custom Step Editor (when Custom Steps pattern is active) */}
      {sequencePattern === 'custom' && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 border-t border-slate-800/80 text-[10px]">
          <span className="text-slate-400 font-medium">Steps (Scale ± / Lattice ±):</span>
          {customSteps.map((st, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 font-mono"
            >
              <select
                value={st.scaleDelta}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCustomSteps((prev) =>
                    prev.map((item, i) => (i === idx ? { ...item, scaleDelta: val } : item))
                  );
                }}
                title="Scale (Subset) step delta"
                className="bg-transparent text-emerald-300 focus:outline-none cursor-pointer"
              >
                {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((v) => (
                  <option key={v} value={v} className="bg-slate-900">
                    {v > 0 ? `+${v}` : v}s
                  </option>
                ))}
              </select>
              <select
                value={st.chromaticDelta ?? 0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCustomSteps((prev) =>
                    prev.map((item, i) => (i === idx ? { ...item, chromaticDelta: val } : item))
                  );
                }}
                title="Chromatic (System lattice) offset"
                className="bg-transparent text-sky-300 focus:outline-none cursor-pointer"
              >
                {[-2, -1, 0, 1, 2].map((v) => (
                  <option key={v} value={v} className="bg-slate-900">
                    {v > 0 ? `+${v}` : v}c
                  </option>
                ))}
              </select>
              {customSteps.length > 1 && (
                <button
                  type="button"
                  onClick={() => setCustomSteps((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-slate-500 hover:text-rose-400 cursor-pointer"
                  title="Remove step"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {customSteps.length < 8 && (
            <button
              type="button"
              onClick={() => setCustomSteps((prev) => [...prev, { scaleDelta: 1, chromaticDelta: 0 }])}
              className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 hover:border-slate-500 text-slate-300 cursor-pointer"
            >
              + Step
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {allDegrees.map((deg) => {
          const activeIdx = activeDegrees.findIndex((d) => d.index === deg.index);
          const isPlayingThis =
            activeSystemIndex !== null
              ? deg.index === activeSystemIndex
              : activeIdx >= 0 && activeIdx === activeIndex;
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
                !deg.active && !useBorrowedTones
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
