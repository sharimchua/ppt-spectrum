/**
 * Dedicated Envelopes Sheet (slide-over drawer on desktop, bottom sheet on mobile).
 * Manages Pitch-space ADSR and Rhythm-space Supercycle Envelope contours independently from Shape.
 */

import React, { useState } from 'react';
import { Activity, Play, X, Copy, Plus, Trash2, Edit3, Check } from 'lucide-react';
import { Envelope, MAX_ENVELOPE_SUPERCYCLE } from '../../core/types';
import { AdsrCurve } from '../shape-editor/AdsrCurve';

export interface EnvelopesSheetProps {
  isOpen: boolean;
  envelope: Envelope;
  allEnvelopes: Envelope[];
  onClose: () => void;
  onSelectEnvelope: (id: string) => void;
  onToggleEnabled: () => void;
  onUpdateEnvelope: (
    patch: Partial<Omit<Envelope, 'adsr'>> & { adsr?: Partial<Envelope['adsr']> }
  ) => void;
  onForkEnvelope: () => void;
  onDuplicateEnvelope: () => void;
  onCreateNewEnvelope: () => void;
  onRenameEnvelope: (name: string) => void;
  onDeleteEnvelope: (id: string) => void;
  onTriggerNote?: () => void;
  onNoteOn?: () => void;
  onNoteOff?: () => void;
}

export const EnvelopesSheet: React.FC<EnvelopesSheetProps> = ({
  isOpen,
  envelope,
  allEnvelopes,
  onClose,
  onSelectEnvelope,
  onToggleEnabled,
  onUpdateEnvelope,
  onForkEnvelope,
  onDuplicateEnvelope,
  onCreateNewEnvelope,
  onRenameEnvelope,
  onDeleteEnvelope,
  onTriggerNote,
  onNoteOn,
  onNoteOff,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'pitch' | 'rhythm' | 'user'>('all');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(envelope.name);

  if (!isOpen) return null;

  const isPreset = envelope.origin === 'preset';
  const filteredList = allEnvelopes.filter((e) => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'user') return e.origin === 'user';
    return e.category === categoryFilter;
  });

  const handlePatchAdsr = (adsrPatch: Partial<Envelope['adsr']>) => {
    if (isPreset) {
      onForkEnvelope();
    }
    onUpdateEnvelope({ adsr: adsrPatch });
  };

  const handleCommitRename = () => {
    const trimmed = renameDraft.trim();
    if (trimmed) onRenameEnvelope(trimmed);
    setIsRenaming(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[1px]" onClick={onClose}>
      <div
        className="w-full sm:w-[420px] h-full bg-[#090d16] border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate">Envelope Studio</h2>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                Pitch ADSR &amp; Rhythm Supercycle Contours
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleEnabled}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition cursor-pointer ${
                envelope.enabled
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {envelope.enabled ? 'ON' : 'BYPASSED'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close Envelope Studio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Category Filter Chips + Selector */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(['all', 'pitch', 'rhythm', 'user'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase transition cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {isRenaming ? (
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCommitRename()}
                    className="flex-1 bg-slate-950 border border-amber-500 rounded px-2 py-1 text-xs text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCommitRename}
                    className="p-1.5 rounded bg-emerald-600 text-white cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <select
                  value={envelope.id}
                  onChange={(e) => onSelectEnvelope(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none cursor-pointer"
                >
                  {filteredList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.origin === 'user' ? '★ ' : ''}{e.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onDuplicateEnvelope}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer"
                  title="Duplicate Envelope"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button
                  type="button"
                  onClick={onCreateNewEnvelope}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer"
                  title="Create New Envelope"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
                {!isPreset && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setRenameDraft(envelope.name);
                        setIsRenaming(true);
                      }}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      title="Rename Envelope"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteEnvelope(envelope.id)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 cursor-pointer"
                      title="Delete Envelope"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>

              {(onTriggerNote || onNoteOn) && (
                <button
                  type="button"
                  onMouseDown={onNoteOn || onTriggerNote}
                  onMouseUp={onNoteOff}
                  onTouchStart={onNoteOn || onTriggerNote}
                  onTouchEnd={onNoteOff}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Strike (T)</span>
                </button>
              )}
            </div>
          </div>

          {/* Rhythm Space Supercycle Envelope Mode */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Rhythm-Space Supercycle</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Apply ADSR contour across repeated rhythm cycles
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isPreset) onForkEnvelope();
                  onUpdateEnvelope({
                    rhythmMode: envelope.rhythmMode === 'supercycle' ? 'off' : 'supercycle',
                  });
                }}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border cursor-pointer ${
                  envelope.rhythmMode === 'supercycle'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-950 border-slate-700 text-slate-400'
                }`}
              >
                {envelope.rhythmMode === 'supercycle' ? 'Enabled' : 'Off'}
              </button>
            </div>

            {envelope.rhythmMode === 'supercycle' && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-[11px] font-mono text-slate-300">Supercycle Length (bars):</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (isPreset) onForkEnvelope();
                      onUpdateEnvelope({
                        supercycleLength: Math.max(1, (envelope.supercycleLength || 4) - 1),
                      });
                    }}
                    className="w-6 h-6 rounded bg-slate-800 text-slate-200 font-bold text-xs cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono text-xs text-amber-400 font-bold">
                    {envelope.supercycleLength || 4}x
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isPreset) onForkEnvelope();
                      onUpdateEnvelope({
                        supercycleLength: Math.min(
                          MAX_ENVELOPE_SUPERCYCLE,
                          (envelope.supercycleLength || 4) + 1
                        ),
                      });
                    }}
                    className="w-6 h-6 rounded bg-slate-800 text-slate-200 font-bold text-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Interactive SVG Envelope Curve */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span className="text-amber-400 font-semibold">Contour</span>
              <span>
                A: {(envelope.adsr.attack * 1000).toFixed(0)}ms · D: {envelope.adsr.decay.toFixed(2)}s · S:{' '}
                {(envelope.adsr.sustain * 100).toFixed(0)}% · R: {envelope.adsr.release.toFixed(2)}s
              </span>
            </div>
            <AdsrCurve adsr={envelope.adsr} />
          </div>

          {/* ADSR Sliders */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            {[
              { label: 'Attack (A)', key: 'attack' as const, min: 0.001, max: 1.0, step: 0.005, fmt: (v: number) => `${(v * 1000).toFixed(0)} ms` },
              { label: 'Decay (D)', key: 'decay' as const, min: 0.05, max: 4.0, step: 0.05, fmt: (v: number) => `${v.toFixed(2)} s` },
              { label: 'Sustain (S)', key: 'sustain' as const, min: 0, max: 1, step: 0.02, fmt: (v: number) => `${(v * 100).toFixed(0)}%` },
              { label: 'Release (R)', key: 'release' as const, min: 0.04, max: 3.0, step: 0.05, fmt: (v: number) => `${v.toFixed(2)} s` },
              { label: 'Harmonic Damping', key: 'damping' as const, min: 0, max: 1, step: 0.02, fmt: (v: number) => `${(v * 100).toFixed(0)}%` },
            ].map((s) => {
              const val = envelope.adsr[s.key] ?? 0;
              return (
                <div key={s.key} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-300">{s.label}</span>
                    <span className="text-amber-400 font-semibold">{s.fmt(val)}</span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={val}
                    onChange={(e) => handlePatchAdsr({ [s.key]: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500 block"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
