import React from 'react';
import { VoiceId } from '../../core/types';
import { CapturedOnsetEvent, estimateCyclePeriodSec } from '../../core/decompose';
import { resolveDuMetricOffsetToken } from '../../core/shape';
import { PhaseOffsetScrubber } from '../shape-editor/PhaseOffsetScrubber';
import { Trash2 } from 'lucide-react';

const VOICE_BADGE_CLASS: Record<VoiceId, string> = {
  kick: 'border-red-500/40 bg-red-500/15 text-red-300',
  snare: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  clave: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  hihat: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300',
  woodblock: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  triangle: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  click: 'border-slate-500/40 bg-slate-500/15 text-slate-300',
};

export interface CapturedOnsetListProps {
  onsetEvents: CapturedOnsetEvent[];
  cyclePeriodSec: number;
  bpm: number;
  selectedOnsetIdx: number;
  groupSimilar: boolean;
  onToggleGroupSimilar: () => void;
  onSelectOnset: (idx: number) => void;
  onCycleVoice: (idx: number) => void;
  onToggleQuantise: (idx: number) => void;
  onUpdatePhase: (idx: number, phaseOffset: number) => void;
  onRemoveOnset: (idx: number) => void;
  onAdjustCycleSec: (nextSec: number) => void;
}

export const CapturedOnsetList: React.FC<CapturedOnsetListProps> = ({
  onsetEvents,
  cyclePeriodSec,
  bpm,
  selectedOnsetIdx,
  groupSimilar,
  onToggleGroupSimilar,
  onSelectOnset,
  onCycleVoice,
  onToggleQuantise,
  onUpdatePhase,
  onRemoveOnset,
  onAdjustCycleSec,
}) => {
  const t0 = onsetEvents[0]?.timestampSec ?? 0;

  const getOnsetRawPhase = (ev: CapturedOnsetEvent, idx: number): number => {
    if (idx === 0) return 0;
    const rel = Math.max(0, ev.timestampSec - t0);
    return (((rel / cyclePeriodSec) % 1) + 1) % 1;
  };

  const selectedEvent = onsetEvents[selectedOnsetIdx];
  const selectedEffectivePhase = selectedEvent
    ? selectedEvent.quantisedPhase !== undefined
      ? selectedEvent.quantisedPhase
      : selectedEvent.quantise
        ? resolveDuMetricOffsetToken(getOnsetRawPhase(selectedEvent, selectedOnsetIdx)).phase
        : getOnsetRawPhase(selectedEvent, selectedOnsetIdx)
    : 0;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex flex-col justify-between space-y-2.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 gap-2">
          <span>
            Cycle: {(cyclePeriodSec * 1000).toFixed(0)} ms ({bpm} BPM)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleGroupSimilar}
              className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition cursor-pointer ${
                groupSimilar
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Group acoustically similar hits under shared voice roots"
            >
              {groupSimilar ? 'Grouped' : 'Per-Hit'}
            </button>
            <button
              type="button"
              onClick={() =>
                onAdjustCycleSec(
                  Number(Math.max(0.4, (cyclePeriodSec || estimateCyclePeriodSec(onsetEvents)) - 0.05).toFixed(2))
                )
              }
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              title="Shorten cycle"
            >
              -
            </button>
            <button
              type="button"
              onClick={() =>
                onAdjustCycleSec(
                  Number(Math.min(8.0, (cyclePeriodSec || estimateCyclePeriodSec(onsetEvents)) + 0.05).toFixed(2))
                )
              }
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              title="Lengthen cycle"
            >
              +
            </button>
          </div>
        </div>

        {/* Per-Onset List (Raw by default, click to selectively quantise) */}
        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
          {onsetEvents.map((ev, idx) => {
            const rawPhase = getOnsetRawPhase(ev, idx);
            const effPhase =
              ev.quantisedPhase !== undefined
                ? ev.quantisedPhase
                : ev.quantise
                  ? resolveDuMetricOffsetToken(rawPhase).phase
                  : rawPhase;
            const token = resolveDuMetricOffsetToken(effPhase);
            const isSelected = idx === selectedOnsetIdx;
            const isQuantised = Boolean(ev.quantise || ev.quantisedPhase !== undefined);

            return (
              <div
                key={`${ev.timestampSec}-${idx}`}
                onClick={() => onSelectOnset(idx)}
                className={`flex items-center justify-between gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-mono cursor-pointer transition ${
                  isSelected
                    ? 'border-amber-500/70 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCycleVoice(idx);
                    }}
                    className={`px-1.5 py-0.5 rounded border text-[9px] uppercase cursor-pointer hover:brightness-125 ${VOICE_BADGE_CLASS[ev.voice]}`}
                    title="Click to cycle voice (Kick / Snare / Clave / Hi-Hat)"
                  >
                    {ev.voice}
                  </button>
                  <span className="text-slate-200 font-bold">
                    {isQuantised ? `${token.token} (${token.fraction})` : `${Math.round(effPhase * 100)}% (~${token.token})`}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleQuantise(idx);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition cursor-pointer ${
                        isQuantised
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                      title="Toggle quantisation for this onset"
                    >
                      {isQuantised ? 'Quant' : 'Raw'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveOnset(idx);
                    }}
                    className="p-0.5 text-slate-500 hover:text-red-400 cursor-pointer"
                    title="Remove onset"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selective PhaseOffsetScrubber + Autocomplete Pills for Selected Onset */}
      {selectedEvent && selectedOnsetIdx > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1.5">
          <div className="text-[10px] font-mono text-slate-400">
            Selected Onset #{selectedOnsetIdx + 1} ({selectedEvent.voice}) — tap an autocomplete pill to quantise selectively:
          </div>
          <PhaseOffsetScrubber
            phaseOffset={selectedEffectivePhase}
            onChange={(phase) => onUpdatePhase(selectedOnsetIdx, phase)}
            label={`Onset #${selectedOnsetIdx + 1} Offset`}
          />
        </div>
      )}
    </div>
  );
};
