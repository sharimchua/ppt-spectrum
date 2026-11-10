import React from 'react';
import { MAX_SUPERCYCLE } from '../../core/filter-types';

interface SupercycleStripProps {
  supercycle: { length: number; cycleWeights: number[] } | null;
  onChange: (updated: { length: number; cycleWeights: number[] } | null) => void;
}

export const SupercycleStrip: React.FC<SupercycleStripProps> = ({
  supercycle,
  onChange,
}) => {
  const isEnabled = supercycle !== null;

  const toggleSupercycle = () => {
    if (isEnabled) {
      onChange(null);
    } else {
      onChange({ length: 4, cycleWeights: [1, 1, 1, 0] }); // Default 3-of-4 pattern
    }
  };

  const handleLengthChange = (length: number) => {
    if (!supercycle) return;
    const clampedLength = Math.max(1, Math.min(MAX_SUPERCYCLE, length));
    const newWeights = Array.from({ length: clampedLength }, (_, i) =>
      supercycle.cycleWeights[i] ?? 1.0
    );
    onChange({ length: clampedLength, cycleWeights: newWeights });
  };

  const toggleCycleWeight = (cycleIdx: number) => {
    if (!supercycle) return;
    const newWeights = [...supercycle.cycleWeights];
    newWeights[cycleIdx] = newWeights[cycleIdx] > 0.5 ? 0.0 : 1.0;
    onChange({ ...supercycle, cycleWeights: newWeights });
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-slate-300">
            Supercycle Modulation (Macro-measure)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Pattern modulation across repeated scene cycles
          </span>
        </div>

        <button
          type="button"
          onClick={toggleSupercycle}
          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
            isEnabled
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          {isEnabled ? 'Enabled' : 'Off'}
        </button>
      </div>

      {isEnabled && (
        <div className="flex flex-col gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono">Supercycle Length (bars):</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleLengthChange(supercycle.length - 1)}
                disabled={supercycle.length <= 1}
                className="w-6 h-6 rounded bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs disabled:opacity-30"
              >
                -
              </button>
              <span className="w-8 text-center font-mono text-xs text-sky-400 font-bold">
                {supercycle.length}x
              </span>
              <button
                type="button"
                onClick={() => handleLengthChange(supercycle.length + 1)}
                disabled={supercycle.length >= MAX_SUPERCYCLE}
                className="w-6 h-6 rounded bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>

          {/* Cycle Weights Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {supercycle.cycleWeights.map((w, idx) => {
              const active = w > 0.5;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleCycleWeight(idx)}
                  className={`flex-1 min-w-[28px] h-9 rounded flex flex-col items-center justify-center border transition-all ${
                    active
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[8px] font-mono opacity-60">Bar</span>
                  <span className="text-xs font-mono">{idx + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
