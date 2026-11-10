/**
 * Filter tab component.
 * Displays raised-cosine acoustic aperture filter controls, tracking behaviour, aperture mode, and sliders.
 */

import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { BandFilter } from '../../core/types';

export interface FilterTabProps {
  filter: BandFilter;
  onUpdateFilter: (filter: BandFilter) => void;
}

export const FilterTab: React.FC<FilterTabProps> = ({
  filter,
  onUpdateFilter,
}) => {
  return (
    <div className="space-y-3.5 p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="font-semibold text-white block">Acoustic Formant Lens</span>
            <span className="text-[9px] text-cyan-400 font-mono">Non-destructive view aperture</span>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={filter.enabled}
            onChange={(e) => onUpdateFilter({ ...filter, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
        </label>
      </div>

      <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800/80">
        A temporary raised-cosine frequency aperture that sculpts perceived acoustics and resonance cavities in real-time without modifying your shape’s stored harmonic partials. Visible on the <strong className="text-cyan-300">Spectrum Ruler</strong>.
      </div>

      {/* Tracking Behavior: Fixed Formant vs Relative Fundamental */}
      <div className="space-y-1">
        <span className="text-[11px] text-slate-300 font-medium">Tracking Behaviour:</span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onUpdateFilter({ ...filter, trackingMode: 'fixed' })}
            className={`py-1.5 px-2 rounded text-center text-xs font-semibold transition border cursor-pointer ${
              (filter.trackingMode || 'fixed') === 'fixed'
                ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Fixed Formant
          </button>
          <button
            type="button"
            onClick={() => onUpdateFilter({ ...filter, trackingMode: 'relative' })}
            className={`py-1.5 px-2 rounded text-center text-xs font-semibold transition border cursor-pointer ${
              filter.trackingMode === 'relative'
                ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Relative Tracking
          </button>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight pt-0.5">
          {filter.trackingMode === 'relative'
            ? 'Relative mode locks the aperture to the fundamental, sweeping dynamically with pitch & tempo.'
            : 'Fixed mode anchors the aperture to absolute continuum coordinates (physical vocal/instrument formant).'}
        </p>
      </div>

      {/* Filter Mode */}
      <div className="space-y-1">
        <span className="text-[11px] text-slate-300 font-medium">Aperture Mode:</span>
        <div className="grid grid-cols-3 gap-1.5">
          {(['band-pass', 'low-pass', 'high-pass'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onUpdateFilter({ ...filter, mode })}
              className={`py-1.5 rounded text-center text-xs font-semibold capitalize transition border cursor-pointer whitespace-nowrap ${
                filter.mode === mode
                  ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {mode.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Centre d */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-300">
            {filter.trackingMode === 'relative' ? 'Relative Offset (Δd from Fund):' : 'Aperture Centre (d):'}
          </span>
          <span className="font-mono text-cyan-300">{filter.centreD.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={-7}
          max={7}
          step={0.05}
          value={filter.centreD}
          onChange={(e) => onUpdateFilter({ ...filter, centreD: parseFloat(e.target.value) })}
          className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
        />
      </div>

      {/* Filter Width d */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-300">Aperture Width (DuPeriods / Octaves):</span>
          <span className="font-mono text-cyan-300">{filter.widthD.toFixed(2)} oct</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={8}
          step={0.1}
          value={filter.widthD}
          onChange={(e) => onUpdateFilter({ ...filter, widthD: parseFloat(e.target.value) })}
          className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
        />
      </div>

      {/* Filter Edge Softness */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-300">Skirt Softness (Raised-Cosine):</span>
          <span className="font-mono text-cyan-300">{filter.softnessD.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.05}
          value={filter.softnessD}
          onChange={(e) => onUpdateFilter({ ...filter, softnessD: parseFloat(e.target.value) })}
          className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
        />
      </div>

      {/* Reset Aperture Button */}
      <div className="pt-1">
        <button
          onClick={() => onUpdateFilter({ ...filter, enabled: false, centreD: 0, widthD: 4, softnessD: 1 })}
          className="w-full py-1.5 rounded border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reset & Bypass Filter View</span>
        </button>
      </div>
    </div>
  );
};
