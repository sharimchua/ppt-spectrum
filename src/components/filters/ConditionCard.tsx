import React, { useState } from 'react';
import { FilterCondition } from '../../core/filter-types';
import { RangeConditionEditor } from './RangeConditionEditor';
import { CycleConditionEditor } from './CycleConditionEditor';
import { formatConditionSummary } from './filter-ui-format';

interface ConditionCardProps {
  condition: FilterCondition;
  index: number;
  totalConditions: number;
  isFocused: boolean;
  onSetFocus: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onChange: (updated: FilterCondition) => void;
}

export const ConditionCard: React.FC<ConditionCardProps> = ({
  condition,
  index,
  totalConditions,
  isFocused,
  onSetFocus,
  onMoveUp,
  onMoveDown,
  onDelete,
  onChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(index === 0);

  const isRange = condition.kind === 'range';
  const badgeBorder = isRange
    ? isFocused
      ? 'border-sky-400 bg-sky-950/20 shadow-md shadow-sky-500/10'
      : 'border-slate-800 bg-slate-900/60'
    : 'border-slate-800 bg-slate-900/60';

  return (
    <div className={`flex flex-col rounded-xl border transition-all ${badgeBorder}`}>
      {/* Collapsed Header Bar */}
      <div className="flex items-center justify-between p-3 gap-2">
        {/* Left: Icon, index & summary */}
        <div
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Kind Icon */}
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
              isRange
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {isRange ? '≈' : '⊛'}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200 truncate">
                {isRange ? `Range #${index + 1}` : `Cycle #${index + 1}`}
              </span>
              {isFocused && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/30 text-sky-300 border border-sky-400/50 uppercase font-semibold">
                  Canvas Active
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 truncate font-mono">
              {formatConditionSummary(condition)}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {isRange && !isFocused && (
            <button
              type="button"
              onClick={onSetFocus}
              title="Focus for canvas drag scrubbing"
              className="px-2 py-1 text-[10px] font-mono text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition-colors border border-slate-700/60"
            >
              Focus
            </button>
          )}

          {/* Reorder Buttons */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              title="Move condition up"
              className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 hover:bg-slate-800 transition-colors"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === totalConditions - 1}
              title="Move condition down"
              className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 hover:bg-slate-800 transition-colors"
            >
              ↓
            </button>
          </div>

          {/* Delete Button */}
          <button
            type="button"
            onClick={onDelete}
            title="Delete condition"
            className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Expand/Collapse Chevron */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-slate-400 hover:text-slate-200"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Editor Body */}
      {isExpanded && (
        <div className="p-3 pt-0 border-t border-slate-800/80 mt-1">
          {condition.kind === 'range' ? (
            <RangeConditionEditor
              condition={condition}
              onChange={(updated) => onChange(updated)}
            />
          ) : (
            <CycleConditionEditor
              condition={condition}
              onChange={(updated) => onChange(updated)}
            />
          )}
        </div>
      )}
    </div>
  );
};
