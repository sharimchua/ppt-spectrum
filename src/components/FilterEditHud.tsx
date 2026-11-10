/**
 * Floating filter edit HUD banner.
 * Displays interactive parameter pills (centre, width, skirt), mode switcher, and completion action.
 */

import React from 'react';
import { Check } from 'lucide-react';
import { BandFilter } from '../core/types';
import { FilterControlParam } from './RadialMenuOverlay';

export interface FilterEditHudProps {
  filter?: BandFilter;
  controlParam: FilterControlParam;
  onSelectParam: (param: FilterControlParam) => void;
  onCycleMode: () => void;
  onDone: () => void;
}

export const FilterEditHud: React.FC<FilterEditHudProps> = ({
  filter,
  controlParam,
  onSelectParam,
  onCycleMode,
  onDone,
}) => {
  return (
    <div className="absolute top-14 sm:top-16 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto z-40 flex flex-wrap items-center justify-between sm:justify-center gap-2 px-3 py-1.5 rounded-xl bg-[#080d1a]/95 border border-sky-500/60 shadow-[0_0_20px_rgba(56,189,248,0.35)] backdrop-blur-md animate-in slide-in-from-top-2 duration-150 text-xs font-mono select-none">
      {/* Badge & Mode */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
        <span className="font-bold text-sky-200 uppercase tracking-wider text-[11px]">Filter Edit</span>
        <button
          onClick={onCycleMode}
          className="px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-500/50 text-[10px] text-sky-300 uppercase hover:bg-sky-900/60 transition cursor-pointer"
          title="Cycle Filter Mode (Band-pass, Low-pass, High-pass)"
        >
          {filter?.mode || 'band-pass'}
        </button>
      </div>

      <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0 hidden xs:block" />

      {/* Parameter Selector Pills */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onSelectParam('centre')}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
            controlParam === 'centre'
              ? 'bg-sky-500 text-slate-950 shadow-[0_0_8px_#38bdf8]'
              : 'bg-slate-800/80 text-slate-300 hover:text-white'
          }`}
          title="Scrub Filter Centre Frequency (Drag on cells)"
        >
          Centre ({filter?.centreD.toFixed(2) ?? '0.00'})
        </button>
        <button
          onClick={() => onSelectParam('width')}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
            controlParam === 'width'
              ? 'bg-sky-500 text-slate-950 shadow-[0_0_8px_#38bdf8]'
              : 'bg-slate-800/80 text-slate-300 hover:text-white'
          }`}
          title="Scrub Filter Bandwidth (Drag on cells)"
        >
          Width ({filter?.widthD.toFixed(1) ?? '4.0'})
        </button>
        <button
          onClick={() => onSelectParam('skirt')}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
            controlParam === 'skirt'
              ? 'bg-sky-500 text-slate-950 shadow-[0_0_8px_#38bdf8]'
              : 'bg-slate-800/80 text-slate-300 hover:text-white'
          }`}
          title="Scrub Filter Skirt Softness (Drag on cells)"
        >
          Skirt ({filter?.softnessD.toFixed(1) ?? '1.0'})
        </button>
      </div>

      <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0 hidden xs:block" />

      {/* Done Button */}
      <button
        onClick={onDone}
        className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-600/30 border border-emerald-500/60 text-emerald-200 hover:bg-emerald-600/50 font-semibold text-[10px] transition cursor-pointer shrink-0"
        title="Finish Filter Editing"
      >
        <Check className="w-3 h-3 text-emerald-400" />
        <span>Done</span>
      </button>
    </div>
  );
};
