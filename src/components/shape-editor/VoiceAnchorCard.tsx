/**
 * Voice anchor card component.
 * Renders an anchor's header, interval ratio, DuMetric offset, voice, gain, and nested partial rows.
 */

import React from 'react';
import { Volume2, VolumeX, Trash2, Plus } from 'lucide-react';
import { VoiceAnchor, VoiceId, PartialComponent } from '../../core/types';
import { ratioToValue } from '../../core/rational';
import { DU_METRIC_OFFSETS, resolveDuMetricOffsetToken } from '../../core/shape';
import { ANCHOR_INTERVAL_PRESETS, VOICE_OPTIONS } from './shape-editor-data';
import { AnchorPartialRow } from './AnchorPartialRow';

export interface VoiceAnchorCardProps {
  anchor: VoiceAnchor;
  anchorIdx: number;
  totalAnchors: number;
  onUpdateAnchor: (anchorIdx: number, patch: Partial<VoiceAnchor>) => void;
  onToggleAnchorMute: (anchorIdx: number) => void;
  onRemoveAnchor: (anchorIdx: number) => void;
  onSetAnchorOvertonePreset: (anchorIdx: number, mode: 'pure' | 'to-p5' | 'saw4') => void;
  onUpdatePartial: (anchorIdx: number, partialIdx: number, patch: Partial<PartialComponent>) => void;
  onTogglePartialMute: (anchorIdx: number, partialIdx: number) => void;
  onAddPartial: (anchorIdx: number) => void;
  onRemovePartial: (anchorIdx: number, partialIdx: number) => void;
}

export const VoiceAnchorCard: React.FC<VoiceAnchorCardProps> = ({
  anchor,
  anchorIdx,
  totalAnchors,
  onUpdateAnchor,
  onToggleAnchorMute,
  onRemoveAnchor,
  onSetAnchorOvertonePreset,
  onUpdatePartial,
  onTogglePartialMute,
  onAddPartial,
  onRemovePartial,
}) => {
  const anchorRatioVal = ratioToValue(anchor.ratio);
  const anchorRatioStr =
    anchor.ratio.kind === 'rational'
      ? `${anchor.ratio.num}/${anchor.ratio.den}`
      : anchorRatioVal.toFixed(2);
  const offsetDescriptor = resolveDuMetricOffsetToken(anchor.phaseOffset || 0);
  const isAnchorMuted = Boolean(anchor.mute || anchor.gain <= 0.0001);

  return (
    <div
      className={`rounded-lg border p-2.5 space-y-2 transition ${
        isAnchorMuted
          ? 'bg-slate-950/50 border-slate-900 opacity-60'
          : 'bg-slate-900/75 border-slate-700/80'
      }`}
    >
      {/* Anchor Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-[9px] font-mono font-bold text-red-300 shrink-0">
            {anchorIdx === 0 ? 'ROOT' : `ANCHOR #${anchorIdx + 1}`}
          </span>
          <input
            type="text"
            value={anchor.name}
            onChange={(e) => onUpdateAnchor(anchorIdx, { name: e.target.value })}
            className="bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded px-2 py-0.5 text-[11px] font-semibold text-white focus:outline-none min-w-0 flex-1"
            title="Voice Anchor Name"
          />
        </div>

        {/* Quick Overtone Series Generator for this Anchor */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] text-slate-400 font-mono hidden md:inline">Overtones:</span>
          <button
            type="button"
            onClick={() => onSetAnchorOvertonePreset(anchorIdx, 'pure')}
            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-mono text-slate-200 cursor-pointer transition"
            title="Reset anchor to a single 1/1 fundamental partial (Pure Sine / Single Beat)"
          >
            1x Pure
          </button>
          <button
            type="button"
            onClick={() => onSetAnchorOvertonePreset(anchorIdx, 'to-p5')}
            className="px-1.5 py-0.5 rounded bg-purple-950/70 hover:bg-purple-900/80 border border-purple-500/40 text-[9px] font-mono text-purple-200 cursor-pointer transition"
            title="Populate 1x Fundamental, 2x Octave, and 3x Perfect 5th overtones (Chord Tone Series)"
          >
            1–3x to P5
          </button>
          <button
            type="button"
            onClick={() => onSetAnchorOvertonePreset(anchorIdx, 'saw4')}
            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-mono text-cyan-300 cursor-pointer transition"
            title="Populate 1x–4x harmonic series (1/k rolloff)"
          >
            1–4x Saw
          </button>

          {/* Mute Anchor */}
          <button
            type="button"
            onClick={() => onToggleAnchorMute(anchorIdx)}
            className={`p-1 rounded border transition cursor-pointer ${
              isAnchorMuted
                ? 'border-slate-800 bg-slate-950 text-slate-600'
                : 'border-slate-700 bg-slate-800 text-emerald-400 hover:text-white'
            }`}
            title={isAnchorMuted ? 'Unmute Voice Anchor' : 'Mute Voice Anchor'}
          >
            {isAnchorMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </button>

          {/* Delete Anchor */}
          <button
            type="button"
            onClick={() => onRemoveAnchor(anchorIdx)}
            disabled={totalAnchors <= 1}
            className="p-1 rounded text-slate-500 hover:text-red-400 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Remove Voice Anchor"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Anchor Parameters Row: Interval Ratio, DuMetric Solfège Offset, Drum Voice, Anchor Gain */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-950/60 p-2 rounded border border-slate-800/70 text-[10px]">
        {/* 1. Interval Ratio */}
        <div className="space-y-0.5">
          <span className="text-[9px] text-slate-400 font-mono block">Interval Ratio (vs Root):</span>
          <select
            value={anchorRatioStr}
            onChange={(e) => {
              const parts = e.target.value.split('/');
              if (parts.length === 2) {
                const num = parseInt(parts[0], 10) || 1;
                const den = parseInt(parts[1], 10) || 1;
                onUpdateAnchor(anchorIdx, { ratio: { kind: 'rational', num, den } });
              }
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[10px] font-mono text-ppt-do font-semibold focus:outline-none cursor-pointer"
          >
            {!ANCHOR_INTERVAL_PRESETS.some((pr) => `${pr.num}/${pr.den}` === anchorRatioStr) && (
              <option value={anchorRatioStr}>{anchorRatioStr} (Custom)</option>
            )}
            {ANCHOR_INTERVAL_PRESETS.map((pr) => (
              <option key={`${pr.num}/${pr.den}`} value={`${pr.num}/${pr.den}`}>
                {pr.label}
              </option>
            ))}
          </select>
        </div>

        {/* 2. DuMetric Solfège Phase Offset */}
        <div className="space-y-0.5">
          <span className="text-[9px] text-slate-400 font-mono block">
            DuMetric Offset (<span className="text-amber-300">{offsetDescriptor.glyph} {offsetDescriptor.token}</span>):
          </span>
          <select
            value={offsetDescriptor.token}
            onChange={(e) => {
              const found = DU_METRIC_OFFSETS.find((o) => o.token === e.target.value);
              if (found) {
                onUpdateAnchor(anchorIdx, {
                  phaseOffset: found.phase,
                  offsetToken: found.token,
                });
              }
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[10px] font-mono text-amber-300 font-semibold focus:outline-none cursor-pointer"
          >
            {DU_METRIC_OFFSETS.map((off) => (
              <option key={off.token} value={off.token}>
                {off.glyph} {off.token} ({off.fraction}) — {off.description}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Drum / Percussion Voice */}
        <div className="space-y-0.5">
          <span className="text-[9px] text-slate-400 font-mono block">Rhythm Voice:</span>
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
            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[10px] font-mono text-cyan-300 font-semibold focus:outline-none cursor-pointer"
          >
            {VOICE_OPTIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Anchor Gain */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[9px] font-mono text-slate-400">
            <span>Anchor Gain</span>
            <span className="text-white font-semibold">{Math.round(anchor.gain * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={anchor.gain}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onUpdateAnchor(anchorIdx, {
                gain: val,
                mute: val <= 0.0001,
                previousGain: val > 0 ? val : anchor.previousGain,
              });
            }}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500 block mt-1.5"
          />
        </div>
      </div>

      {/* Nested Partials inside this Voice Anchor */}
      <div className="pl-2 sm:pl-3 border-l-2 border-slate-800 space-y-1">
        {anchor.partials.map((p, pIdx) => (
          <AnchorPartialRow
            key={p.id || pIdx}
            partial={p}
            partialIdx={pIdx}
            anchorIdx={anchorIdx}
            totalPartialsInAnchor={anchor.partials.length}
            onUpdatePartial={onUpdatePartial}
            onTogglePartialMute={onTogglePartialMute}
            onRemovePartial={onRemovePartial}
          />
        ))}

        {/* Add Partial to this Anchor */}
        <button
          type="button"
          onClick={() => onAddPartial(anchorIdx)}
          className="w-full flex items-center justify-center gap-1 py-1 rounded border border-dashed border-slate-800 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-900 text-[10px] text-slate-400 hover:text-white transition cursor-pointer"
        >
          <Plus className="w-3 h-3 text-red-400" />
          <span>Add Harmonic Partial to this Anchor</span>
        </button>
      </div>
    </div>
  );
};
