/**
 * Piano-specific toolbar controls (Range preset, Fit/Fixed sizing, Interval Bands toggle)
 * rendered inside VirtualKeyboard only when surfaceMode === 'piano'.
 */

import React from 'react';
import { Maximize2, Minimize2, Ruler } from 'lucide-react';
import { KEYBOARD_RANGE_PRESETS, saveKeyboardRange } from './keyboard-layout';

export interface PianoToolbarControlsProps {
  rangePresetId: string;
  onChangeRangePreset: (id: string) => void;
  isFitMode: boolean;
  onToggleFitMode: () => void;
  showIntervals: boolean;
  onToggleIntervals: () => void;
}

export const PianoToolbarControls: React.FC<PianoToolbarControlsProps> = ({
  rangePresetId,
  onChangeRangePreset,
  isFitMode,
  onToggleFitMode,
  showIntervals,
  onToggleIntervals,
}) => (
  <>
    <select
      value={rangePresetId}
      onChange={(e) => {
        const nextId = e.target.value;
        saveKeyboardRange(nextId);
        onChangeRangePreset(nextId);
        e.currentTarget.blur();
      }}
      className="bg-slate-900 border border-slate-700/80 rounded-lg px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] font-mono text-slate-200 focus:outline-none cursor-pointer shrink-0"
      aria-label="Select visible key range"
    >
      {KEYBOARD_RANGE_PRESETS.map((p) => (
        <option key={p.id} value={p.id}>
          {p.label}
        </option>
      ))}
    </select>

    <button
      type="button"
      onClick={onToggleFitMode}
      className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-slate-300 transition cursor-pointer shrink-0"
      title={isFitMode ? 'Fit to window width (click for Fixed key size)' : 'Fixed key size (click to Fit window)'}
    >
      {isFitMode ? <Minimize2 className="w-3 h-3 text-sky-400" /> : <Maximize2 className="w-3 h-3 text-sky-400" />}
      <span className="hidden sm:inline">{isFitMode ? 'Fit' : 'Fixed'}</span>
    </button>

    <button
      type="button"
      onClick={onToggleIntervals}
      className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer shrink-0 ${
        showIntervals
          ? 'bg-indigo-950/70 border-indigo-500/70 text-indigo-200'
          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
      }`}
      title="Show pairwise interval ratios & frequency distance bands above keys"
    >
      <Ruler className="w-3 h-3" />
      <span className="hidden sm:inline">Intervals</span>
    </button>
  </>
);
