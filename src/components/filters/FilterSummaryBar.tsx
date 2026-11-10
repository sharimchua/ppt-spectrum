import React from 'react';
import { Filter } from '../../core/filter-types';
import { describeFilter } from './filter-ui-format';

interface FilterSummaryBarProps {
  filter: Filter;
  onChange: (patch: Partial<Omit<Filter, 'conditions'>>) => void;
}

export const FilterSummaryBar: React.FC<FilterSummaryBarProps> = ({
  filter,
  onChange,
}) => {
  return (
    <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
      {/* Controls Row: Action, Combine, Depth */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Action: Keep vs Remove */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Action:</span>
          <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => onChange({ action: 'keep' })}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                filter.action === 'keep'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Keep
            </button>
            <button
              type="button"
              onClick={() => onChange({ action: 'remove' })}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                filter.action === 'remove'
                  ? 'bg-rose-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Remove
            </button>
          </div>
        </div>

        {/* Combine: All vs Any */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Logic:</span>
          <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => onChange({ combine: 'all' })}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                filter.combine === 'all'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All (AND)
            </button>
            <button
              type="button"
              onClick={() => onChange({ combine: 'any' })}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                filter.combine === 'any'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Any (OR)
            </button>
          </div>
        </div>

        {/* Depth Slider */}
        <div className="flex items-center gap-2 min-w-[130px] flex-1 sm:flex-initial">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Depth:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={filter.depth}
            onChange={(e) => onChange({ depth: parseFloat(e.target.value) })}
            className="flex-1 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-sky-400"
          />
          <span className="text-xs font-mono text-sky-400 w-8 text-right">
            {Math.round(filter.depth * 100)}%
          </span>
        </div>
      </div>

      {/* Natural Language Summary */}
      <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono flex items-center gap-2">
        <span className="text-sky-400 font-bold">ℹ</span>
        <span>{describeFilter(filter)}</span>
      </div>
    </div>
  );
};
