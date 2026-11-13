/**
 * Single harmonic partial row inside a voice anchor card.
 * Responsive mobile-first layout: 2-tier on narrow screens, single line on desktop.
 * Australian English spelling maintained.
 */

import React from 'react';
import { Volume2, VolumeX, Trash2 } from 'lucide-react';
import { PartialComponent } from '../../core/types';
import { RatioScrubber } from './RatioScrubber';

export interface AnchorPartialRowProps {
  partial: PartialComponent;
  partialIdx: number;
  anchorIdx: number;
  totalPartialsInAnchor: number;
  onUpdatePartial: (anchorIdx: number, partialIdx: number, patch: Partial<PartialComponent>) => void;
  onTogglePartialMute: (anchorIdx: number, partialIdx: number) => void;
  onRemovePartial: (anchorIdx: number, partialIdx: number) => void;
}

export const AnchorPartialRow: React.FC<AnchorPartialRowProps> = ({
  partial,
  partialIdx,
  anchorIdx,
  totalPartialsInAnchor,
  onUpdatePartial,
  onTogglePartialMute,
  onRemovePartial,
}) => {
  const isMuted = partial.amp <= 0.0001;

  return (
    <div
      className={`p-2.5 rounded-lg border transition space-y-2 ${
        isMuted
          ? 'bg-slate-950/40 border-slate-900 opacity-50'
          : 'bg-slate-950/80 border-slate-800/90 hover:border-slate-700'
      }`}
    >
      {/* TIER 1: Header & Mute/Remove Actions */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-slate-400 font-bold">
          Partial .{partialIdx + 1}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onTogglePartialMute(anchorIdx, partialIdx)}
            className={`p-1.5 rounded border transition cursor-pointer ${
              isMuted
                ? 'border-slate-800 bg-slate-950 text-slate-600'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title={isMuted ? 'Unmute Partial' : 'Mute Partial'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onRemovePartial(anchorIdx, partialIdx)}
            disabled={totalPartialsInAnchor <= 1}
            className="p-1.5 rounded text-slate-500 hover:text-red-400 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Remove Partial"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Continuous DuMetric Octave Scrubber + Autocomplete Ratio Pills */}
      <RatioScrubber
        ratio={partial.ratio}
        onChange={(ratio) => onUpdatePartial(anchorIdx, partialIdx, { ratio })}
        minOctaves={0}
        maxOctaves={4}
        label="Frequency Ratio"
      />

      {/* TIER 2: Amplitude & Phase Sliders */}
      <div className="flex-1 grid grid-cols-2 sm:flex sm:items-center gap-2 min-w-0">
        {/* Amplitude Slider */}
        <div className="space-y-0.5 sm:flex-1 min-w-0">
          <div className="flex justify-between text-[9px] font-mono text-slate-400">
            <span>Amp</span>
            <span className="font-semibold text-white">{(partial.amp * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={partial.amp}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onUpdatePartial(anchorIdx, partialIdx, {
                amp: val,
                previousAmp: val > 0 ? val : partial.previousAmp,
              });
            }}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-red-500 block"
          />
        </div>

        {/* Phase Slider */}
        <div className="space-y-0.5 sm:w-20 min-w-0 shrink-0">
          <div className="flex justify-between text-[9px] font-mono text-slate-400">
            <span>Phase</span>
            <span className="font-semibold text-purple-300">{(partial.phase * 360).toFixed(0)}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={partial.phase}
            onChange={(e) =>
              onUpdatePartial(anchorIdx, partialIdx, { phase: parseFloat(e.target.value) })
            }
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500 block"
          />
        </div>
      </div>
    </div>
  );
};
