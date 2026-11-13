/**
 * Floating filter edit HUD banner.
 * Displays interactive parameter pills (centre, width, skirt), mode switcher, and link to Filters sheet.
 * Australian English spelling conventions maintained.
 */

import React, { useState } from 'react';
import { Check, SlidersHorizontal, ChevronsDown, ChevronsUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { SpanView, Filter } from '../core/types';
import { FilterControlParam } from './hooks/useFilters';

export interface FilterEditHudProps {
  filter?: Filter;
  spanView?: SpanView | null;
  controlParam: FilterControlParam;
  onSelectParam: (param: FilterControlParam) => void;
  onFocusCondition?: (conditionId: string) => void;
  onCycleMode: () => void;
  onOpenFilters?: () => void;
  onDone: () => void;
}

export const FilterEditHud: React.FC<FilterEditHudProps> = ({
  filter,
  spanView,
  controlParam,
  onSelectParam,
  onFocusCondition,
  onCycleMode,
  onOpenFilters,
  onDone,
}) => {
  const [dockPosition, setDockPosition] = useState<'top' | 'bottom'>('top');

  const isRelative = filter?.trackingMode === 'relative' || filter?.conditions.some(
    (c) => c.kind === 'range' && c.reference !== 'absolute'
  );

  const centreLabel = spanView
    ? isRelative
      ? `${Math.round(-spanView.centreD * 1200)}¢`
      : `d:${spanView.centreD.toFixed(2)}`
    : filter
      ? `d:${filter.centreD.toFixed(2)}`
      : '0.00';

  const widthVal = spanView?.widthD ?? filter?.widthD ?? 4.0;
  const skirtVal = spanView?.softnessD ?? filter?.softnessD ?? 1.0;
  const modeLabel = filter?.action === 'remove' ? 'REJECT' : (filter?.mode ?? 'band-pass');

  const conditions = filter?.conditions ?? [];
  const focusedIdx = Math.max(
    0,
    conditions.findIndex((c) => c.id === filter?.focus?.conditionId)
  );
  const focusedCond = conditions[focusedIdx];
  const stepCondition = (delta: -1 | 1) => {
    if (conditions.length === 0 || !onFocusCondition) return;
    const nextIdx = (focusedIdx + delta + conditions.length) % conditions.length;
    onFocusCondition(conditions[nextIdx].id);
  };

  return (
    <div
      className={`absolute ${
        dockPosition === 'top'
          ? 'top-24 sm:top-16 animate-in slide-in-from-top-2'
          : 'bottom-4 sm:bottom-6 animate-in slide-in-from-bottom-2'
      } left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto z-40 flex flex-wrap items-center justify-between sm:justify-center gap-2 px-3 py-1.5 rounded-xl bg-[#080d1a]/95 border border-sky-500/60 shadow-[0_0_20px_rgba(56,189,248,0.35)] backdrop-blur-md transition-all duration-200 text-xs font-mono select-none`}
    >
      {/* Badge & Mode */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
        <span className="font-bold text-sky-200 uppercase tracking-wider text-[11px]">Filter Edit</span>
        <button
          type="button"
          onClick={onCycleMode}
          className="px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-500/50 text-[10px] text-sky-300 uppercase hover:bg-sky-900/60 transition cursor-pointer"
          title="Cycle Filter Aperture Preset"
        >
          {modeLabel}
        </button>
      </div>

      <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0 hidden xs:block" />

      {/* Condition Step Selector */}
      {conditions.length > 0 && onFocusCondition && (
        <>
          <div className="flex items-center gap-1 shrink-0 bg-slate-900/90 border border-slate-700/80 rounded-lg px-1 py-0.5">
            <button
              type="button"
              onClick={() => stepCondition(-1)}
              disabled={conditions.length <= 1}
              className="p-0.5 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Previous Filter Condition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-sky-200 px-1 truncate max-w-[110px]">
              {focusedIdx + 1}/{conditions.length}{' '}
              <span className={focusedCond?.kind === 'range' ? 'text-sky-400' : 'text-amber-300'}>
                {focusedCond?.kind === 'range'
                  ? `Spectral (${focusedCond.reference})`
                  : focusedCond
                  ? `Cycle (${focusedCond.divisions})`
                  : 'None'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => stepCondition(1)}
              disabled={conditions.length <= 1}
              className="p-0.5 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Next Filter Condition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0 hidden xs:block" />
        </>
      )}

      {/* Parameter Selector Pills */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onSelectParam('centre')}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
            controlParam === 'centre'
              ? 'bg-sky-500 text-slate-950 shadow-[0_0_8px_#38bdf8]'
              : 'bg-slate-800/80 text-slate-300 hover:text-white'
          }`}
          title="Scrub Filter Centre Frequency (Drag on cells)"
        >
          Centre ({centreLabel})
        </button>
        <button
          type="button"
          onClick={() => onSelectParam('width')}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
            controlParam === 'width'
              ? 'bg-sky-500 text-slate-950 shadow-[0_0_8px_#38bdf8]'
              : 'bg-slate-800/80 text-slate-300 hover:text-white'
          }`}
          title="Scrub Filter Bandwidth (Drag on cells)"
        >
          Width ({widthVal.toFixed(1)})
        </button>
        <button
          type="button"
          onClick={() => onSelectParam('skirt')}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
            controlParam === 'skirt'
              ? 'bg-sky-500 text-slate-950 shadow-[0_0_8px_#38bdf8]'
              : 'bg-slate-800/80 text-slate-300 hover:text-white'
          }`}
          title="Scrub Filter Skirt Softness (Drag on cells)"
        >
          Skirt ({skirtVal.toFixed(1)})
        </button>
      </div>

      <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0 hidden xs:block" />

      {/* Open Sheet, Bump/Dock, and Done Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Dock position toggle button */}
        <button
          type="button"
          onClick={() => setDockPosition((prev) => (prev === 'top' ? 'bottom' : 'top'))}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 hover:border-sky-500/50 text-slate-300 hover:text-white transition cursor-pointer text-[10px]"
          title={dockPosition === 'top' ? 'Dock HUD to bottom of screen' : 'Dock HUD to top of screen'}
        >
          {dockPosition === 'top' ? (
            <>
              <ChevronsDown className="w-3 h-3 text-sky-400" />
              <span className="hidden xs:inline">Down</span>
            </>
          ) : (
            <>
              <ChevronsUp className="w-3 h-3 text-sky-400" />
              <span className="hidden xs:inline">Up</span>
            </>
          )}
        </button>

        {onOpenFilters && (
          <button
            type="button"
            onClick={onOpenFilters}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-sky-950/70 border border-sky-500/40 text-sky-300 hover:bg-sky-900/60 font-semibold text-[10px] transition cursor-pointer"
            title="Open Full Filters Sheet"
          >
            <SlidersHorizontal className="w-3 h-3 text-sky-400" />
            <span>All Filters</span>
          </button>
        )}

        <button
          type="button"
          onClick={onDone}
          className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-600/30 border border-emerald-500/60 text-emerald-200 hover:bg-emerald-600/50 font-semibold text-[10px] transition cursor-pointer"
          title="Finish Filter Editing"
        >
          <Check className="w-3 h-3 text-emerald-400" />
          <span>Done</span>
        </button>
      </div>
    </div>
  );
};
