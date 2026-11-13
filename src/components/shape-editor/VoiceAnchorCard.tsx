/**
 * Voice Anchor Card component.
 * Renders the focused voice anchor's header (name, rhythm voice, mute/delete),
 * interval ratio & DuMetric offset dials, and nested partial rows.
 * Australian English spelling maintained.
 */

import React from 'react';
import { Volume2, VolumeX, Trash2, Plus } from 'lucide-react';
import { VoiceAnchor, VoiceId, PartialComponent } from '../../core/types';
import { VOICE_OPTIONS } from './shape-editor-data';
import { AnchorPartialRow } from './AnchorPartialRow';
import { RatioScrubber } from './RatioScrubber';
import { PhaseOffsetScrubber } from './PhaseOffsetScrubber';

export interface VoiceAnchorCardProps {
  anchor: VoiceAnchor;
  anchorIdx: number;
  totalAnchors: number;
  selectedPartialIdx?: number;
  onSelectPartial?: (partialIdx: number) => void;
  onUpdateAnchor: (anchorIdx: number, patch: Partial<VoiceAnchor>) => void;
  onToggleAnchorMute: (anchorIdx: number) => void;
  onRemoveAnchor: (anchorIdx: number) => void;
  onUpdatePartial: (anchorIdx: number, partialIdx: number, patch: Partial<PartialComponent>) => void;
  onTogglePartialMute: (anchorIdx: number, partialIdx: number) => void;
  onAddPartial: (anchorIdx: number) => void;
  onRemovePartial: (anchorIdx: number, partialIdx: number) => void;
}

export const VoiceAnchorCard: React.FC<VoiceAnchorCardProps> = ({
  anchor,
  anchorIdx,
  totalAnchors,
  selectedPartialIdx = 0,
  onSelectPartial,
  onUpdateAnchor,
  onToggleAnchorMute,
  onRemoveAnchor,
  onUpdatePartial,
  onTogglePartialMute,
  onAddPartial,
  onRemovePartial,
}) => {
  const isAnchorMuted = Boolean(anchor.mute || anchor.gain <= 0.0001);

  return (
    <div
      className={`rounded-lg border transition overflow-hidden ${
        isAnchorMuted
          ? 'bg-slate-950/50 border-slate-900 opacity-60'
          : 'bg-slate-900/75 border-slate-700/80'
      }`}
    >
      {/* Anchor Header: Badge, Name, Rhythm Voice, Mute & Delete */}
      <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-900/90 border-b border-slate-800/80">
        <span className="px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-[9px] font-mono font-bold text-red-300 shrink-0">
          {anchorIdx === 0 ? 'ROOT' : `#${anchorIdx + 1}`}
        </span>
        <input
          type="text"
          value={anchor.name}
          onChange={(e) => onUpdateAnchor(anchorIdx, { name: e.target.value })}
          className="bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded px-2 py-1 text-xs font-semibold text-white focus:outline-none min-w-0 flex-1"
          placeholder="Anchor name"
          aria-label="Voice Anchor Name"
        />

        <select
          value={anchor.voice || 'woodblock'}
          onChange={(e) => {
            const newVoice = e.target.value as VoiceId;
            onUpdateAnchor(anchorIdx, {
              voice: newVoice,
              partials: anchor.partials.map((p, pIdx) =>
                pIdx === 0 ? { ...p, voice: newVoice } : p
              ),
            });
          }}
          className="bg-slate-950/90 border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-cyan-300 font-semibold focus:outline-none cursor-pointer shrink-0 max-w-[130px]"
          title="Anchor Rhythm Voice (inherited by all partials in this anchor)"
          aria-label="Anchor Rhythm Voice"
        >
          {VOICE_OPTIONS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 shrink-0">
          {/* Mute Anchor */}
          <button
            type="button"
            onClick={() => onToggleAnchorMute(anchorIdx)}
            className={`p-1.5 rounded border transition cursor-pointer ${
              isAnchorMuted
                ? 'border-slate-800 bg-slate-950 text-slate-600'
                : 'border-slate-700 bg-slate-800 text-emerald-400 hover:text-white'
            }`}
            title={isAnchorMuted ? 'Unmute Voice Anchor' : 'Mute Voice Anchor'}
          >
            {isAnchorMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Delete Anchor */}
          <button
            type="button"
            onClick={() => onRemoveAnchor(anchorIdx)}
            disabled={totalAnchors <= 1}
            className="p-1.5 rounded text-slate-500 hover:text-red-400 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Remove Voice Anchor"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Anchor Body */}
      <div className="p-2.5 space-y-2.5">
        {/* Anchor Interval Ratio Scrubber (vs Root) */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/70">
          <RatioScrubber
            ratio={anchor.ratio}
            onChange={(ratio) => onUpdateAnchor(anchorIdx, { ratio })}
            minOctaves={-1}
            maxOctaves={3}
            label="Anchor Interval Ratio (vs Root)"
          />
        </div>

        {/* DuMetric Phase Offset Scrubber (0–1 cycle) */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/70">
          <PhaseOffsetScrubber
            phaseOffset={anchor.phaseOffset || 0}
            onChange={(phaseOffset, offsetToken) =>
              onUpdateAnchor(anchorIdx, { phaseOffset, offsetToken })
            }
          />
        </div>

        {/* Focused Partial Editor with Quick Partial Chips */}
          <div className="pl-2 sm:pl-3 border-l-2 border-slate-800 space-y-2">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {anchor.partials.map((p, pIdx) => (
                <button
                  key={p.id || pIdx}
                  type="button"
                  onClick={() => onSelectPartial?.(pIdx)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border shrink-0 cursor-pointer transition ${
                    pIdx === selectedPartialIdx
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  .{pIdx + 1}{' '}
                  {p.ratio.kind === 'rational'
                    ? p.ratio.den === 1
                      ? `${p.ratio.num}x`
                      : `${p.ratio.num}/${p.ratio.den}`
                    : `${p.ratio.value.toFixed(2)}x`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  onAddPartial(anchorIdx);
                  onSelectPartial?.(anchor.partials.length);
                }}
                className="px-2 py-0.5 rounded border border-dashed border-slate-700 text-[10px] font-mono text-slate-400 hover:text-white shrink-0 cursor-pointer flex items-center gap-1"
                title="Add Harmonic Partial to this Anchor"
              >
                <Plus className="w-3 h-3 text-red-400" /> Add
              </button>
            </div>

            {anchor.partials[selectedPartialIdx] && (
              <AnchorPartialRow
                key={anchor.partials[selectedPartialIdx].id || selectedPartialIdx}
                partial={anchor.partials[selectedPartialIdx]}
                partialIdx={selectedPartialIdx}
                anchorIdx={anchorIdx}
                totalPartialsInAnchor={anchor.partials.length}
                onUpdatePartial={onUpdatePartial}
                onTogglePartialMute={onTogglePartialMute}
                onRemovePartial={(aIdx, pIdx) => {
                  onRemovePartial(aIdx, pIdx);
                  onSelectPartial?.(Math.max(0, pIdx - 1));
                }}
              />
            )}
          </div>
      </div>
    </div>
  );
};
