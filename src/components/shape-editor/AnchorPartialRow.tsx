/**
 * Single harmonic partial row inside a voice anchor card.
 * Responsive mobile-first layout: 2-tier on narrow screens, single line on desktop.
 * Australian English spelling maintained.
 */

import React from 'react';
import { Volume2, VolumeX, Trash2 } from 'lucide-react';
import { PartialComponent } from '../../core/types';
import { ratioToValue } from '../../core/rational';

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
  const pRatioVal = ratioToValue(partial.ratio);
  const isMuted = partial.amp <= 0.0001;

  return (
    <div
      className={`p-2 rounded-lg border transition space-y-1.5 sm:space-y-0 sm:flex sm:items-center sm:gap-2.5 ${
        isMuted
          ? 'bg-slate-950/40 border-slate-900 opacity-50'
          : 'bg-slate-950/80 border-slate-800/90 hover:border-slate-700'
      }`}
    >
      {/* TIER 1 (Mobile): Header & Actions / Left cluster on Desktop */}
      <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-5 text-[10px] font-mono text-slate-500 font-bold shrink-0">
            .{partialIdx + 1}
          </span>

          {/* Partial Ratio Selector */}
          <div className="w-24 sm:w-20 min-w-0">
            <select
              value={
                partial.ratio.kind === 'rational' && partial.ratio.den === 1
                  ? `${partial.ratio.num}/1`
                  : partial.ratio.kind === 'rational'
                  ? `${partial.ratio.num}/${partial.ratio.den}`
                  : pRatioVal.toFixed(2)
              }
              onChange={(e) => {
                const parts = e.target.value.split('/');
                if (parts.length === 2) {
                  onUpdatePartial(anchorIdx, partialIdx, {
                    ratio: {
                      kind: 'rational',
                      num: parseInt(parts[0], 10) || 1,
                      den: parseInt(parts[1], 10) || 1,
                    },
                  });
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono font-semibold text-ppt-do focus:outline-none cursor-pointer"
              title="Partial Harmonic Multiple relative to this Voice Anchor"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                <option key={h} value={`${h}/1`}>
                  {h}x {h === 1 ? '(Fund)' : h === 2 ? '(Oct)' : h === 3 ? '(P5)' : ''}
                </option>
              ))}
              {partial.ratio.kind === 'rational' && partial.ratio.den !== 1 && (
                <option value={`${partial.ratio.num}/${partial.ratio.den}`}>
                  {partial.ratio.num}/{partial.ratio.den}x
                </option>
              )}
              {partial.ratio.kind === 'real' && (
                <option value={pRatioVal.toFixed(2)}>{pRatioVal.toFixed(2)}x</option>
              )}
            </select>
          </div>
        </div>

        {/* Action Buttons for Mobile */}
        <div className="flex items-center gap-1 sm:hidden shrink-0">
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

      {/* Action Buttons for Desktop */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
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
  );
};
