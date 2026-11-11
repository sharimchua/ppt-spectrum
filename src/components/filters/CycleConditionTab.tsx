/**
 * Cycle Condition Tab for PresetPicker modal.
 * Presents fundamental metric and Euclidean cycle generators.
 * Australian English spelling maintained.
 */

import React from 'react';

export type CycleTemplateType =
  | 'grid4'
  | 'grid8'
  | 'grid16'
  | 'triplet3'
  | 'downbeat'
  | 'backbeat'
  | 'offbeat'
  | 'euclid3_8'
  | 'euclid5_8'
  | 'euclid5_16'
  | 'euclid7_12'
  | 'blank8'
  | 'blank16';

interface CycleConditionTabProps {
  onSelect: (type: CycleTemplateType) => void;
}

export const CycleConditionTab: React.FC<CycleConditionTabProps> = ({ onSelect }) => {
  return (
    <div className="flex flex-col gap-3">
      {/* 1. Regular Grids & Subdivisions */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Regular Grids & Subdivisions
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onSelect('grid4')}
            className="flex flex-col p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
          >
            <span className="text-xs font-bold text-cyan-300 font-mono">Quarter Grid (4-Pulse)</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Straight 4/4 quarter divisions</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('grid8')}
            className="flex flex-col p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
          >
            <span className="text-xs font-bold text-cyan-300 font-mono">Eighth Grid (8-Pulse)</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Straight 8th-note pulse sieve</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('grid16')}
            className="flex flex-col p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
          >
            <span className="text-xs font-bold text-cyan-300 font-mono">16th Grid (16-Pulse)</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Fine semi-quaver grid sieve</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('triplet3')}
            className="flex flex-col p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
          >
            <span className="text-xs font-bold text-cyan-300 font-mono">Triplet Grid (3-Pulse)</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Compound meter / 3-against-2 pulse</span>
          </button>
        </div>
      </div>

      {/* 2. Metric Accents & Offbeats */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Metric Accents & Offbeats
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onSelect('downbeat')}
            className="flex flex-col p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
          >
            <span className="text-xs font-bold text-cyan-300 font-mono">Downbeat Only</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Beat 1 [1, 0, 0, 0]</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('backbeat')}
            className="flex flex-col p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
          >
            <span className="text-xs font-bold text-cyan-300 font-mono">Backbeat (2 & 4)</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Beats 2 & 4 [0, 1, 0, 1]</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('offbeat')}
            className="flex flex-col p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
          >
            <span className="text-xs font-bold text-cyan-300 font-mono">Offbeats (&s)</span>
            <span className="text-[10px] text-slate-400 mt-0.5">8-grid upbeats [0, 1, 0, 1...]</span>
          </button>
        </div>
      </div>

      {/* 3. Euclidean Generators */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Euclidean Polyrhythm Generators (k : n)
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onSelect('euclid3_8')}
            className="flex flex-col p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
          >
            <span className="text-xs font-bold text-cyan-300 font-mono">Euclidean 3 in 8</span>
            <span className="text-[10px] text-slate-400 mt-0.5">3 pulses over 8 steps</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('euclid5_8')}
            className="flex flex-col p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
          >
            <span className="text-xs font-bold text-cyan-300 font-mono">Euclidean 5 in 8</span>
            <span className="text-[10px] text-slate-400 mt-0.5">5 pulses over 8 steps</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('euclid5_16')}
            className="flex flex-col p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
          >
            <span className="text-xs font-bold text-cyan-300 font-mono">Euclidean 5 in 16</span>
            <span className="text-[10px] text-slate-400 mt-0.5">5 pulses over 16 steps (Bossa)</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('euclid7_12')}
            className="flex flex-col p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
          >
            <span className="text-xs font-bold text-cyan-300 font-mono">Euclidean 7 in 12</span>
            <span className="text-[10px] text-slate-400 mt-0.5">7 pulses over 12 steps (Bembé)</span>
          </button>
        </div>
      </div>

      {/* 4. Blank Custom Sieve */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Custom Sieves (Tappable Blank Grid)
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onSelect('blank8')}
            className="flex flex-col p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
          >
            <span className="text-xs font-bold text-cyan-300 font-mono">Blank 8-Step Sieve</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Empty 8 slots ready to tap</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('blank16')}
            className="flex flex-col p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
          >
            <span className="text-xs font-bold text-cyan-300 font-mono">Blank 16-Step Sieve</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Empty 16 slots ready to tap</span>
          </button>
        </div>
      </div>
    </div>
  );
};
