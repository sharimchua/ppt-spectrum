/**
 * Inline configuration sub-menu for alternate instrument surfaces
 * (Scale Strip, Isomorphic Lattice, Guitar Fretboard) inside VirtualKeyboard.
 */

import React from 'react';
import {
  GUITAR_TUNING_PRESETS,
  GuitarConfig,
  GuitarPresetId,
  ISOMORPHIC_LAYOUT_PRESETS,
  InstrumentSurfaceMode,
  IsoLayoutPresetId,
  IsomorphicConfig,
  ScaleStripConfig,
} from './instrument-layouts';

export interface InstrumentConfigMenuProps {
  mode: Exclude<InstrumentSurfaceMode, 'piano'>;
  scaleConfig: ScaleStripConfig;
  onChangeScaleConfig: (next: ScaleStripConfig) => void;
  isoConfig: IsomorphicConfig;
  onChangeIsoConfig: (next: IsomorphicConfig) => void;
  guitarConfig: GuitarConfig;
  onChangeGuitarConfig: (next: GuitarConfig) => void;
}

export const InstrumentConfigMenu: React.FC<InstrumentConfigMenuProps> = ({
  mode,
  scaleConfig,
  onChangeScaleConfig,
  isoConfig,
  onChangeIsoConfig,
  guitarConfig,
  onChangeGuitarConfig,
}) => {
  if (mode === 'scale-strip') {
    return (
      <div className="mb-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-slate-900/90 border border-slate-700/80 px-2.5 py-1.5 text-[11px]">
        <span className="font-semibold text-slate-300">Scale Strip:</span>
        <div className="flex items-center gap-1">
          {([1, 2] as const).map((oct) => (
            <button
              key={oct}
              type="button"
              onClick={() => onChangeScaleConfig({ ...scaleConfig, octaves: oct })}
              className={`px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer ${
                scaleConfig.octaves === oct
                  ? 'bg-sky-600/30 border-sky-500 text-sky-200'
                  : 'bg-slate-950 border-slate-700 text-slate-400'
              }`}
            >
              {oct} Oct
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChangeScaleConfig({ ...scaleConfig, showInactive: !scaleConfig.showInactive })}
          className={`px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer ${
            scaleConfig.showInactive
              ? 'bg-emerald-600/25 border-emerald-500 text-emerald-200'
              : 'bg-slate-950 border-slate-700 text-slate-400'
          }`}
        >
          {scaleConfig.showInactive ? 'All Tuning Steps' : 'Active Subset Only'}
        </button>
      </div>
    );
  }

  if (mode === 'isomorphic') {
    return (
      <div className="mb-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-slate-900/90 border border-slate-700/80 px-2.5 py-1.5 text-[11px]">
        <span className="font-semibold text-slate-300">Isomorphic:</span>
        <div className="flex items-center gap-1">
          {(['hex', 'rect'] as const).map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() => onChangeIsoConfig({ ...isoConfig, tileShape: shape })}
              className={`px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer ${
                isoConfig.tileShape === shape
                  ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                  : 'bg-slate-950 border-slate-700 text-slate-400'
              }`}
            >
              {shape === 'hex' ? 'Hexagons' : 'Squares'}
            </button>
          ))}
        </div>
        <select
          value={isoConfig.layoutPreset}
          onChange={(e) =>
            onChangeIsoConfig({ ...isoConfig, layoutPreset: e.target.value as IsoLayoutPresetId })
          }
          className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-slate-200 focus:outline-none cursor-pointer"
        >
          {(Object.keys(ISOMORPHIC_LAYOUT_PRESETS) as IsoLayoutPresetId[]).map((id) => (
            <option key={id} value={id}>
              {ISOMORPHIC_LAYOUT_PRESETS[id].label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          {[
            { rows: 4, cols: 8, label: '4×8' },
            { rows: 5, cols: 10, label: '5×10' },
          ].map((sz) => (
            <button
              key={sz.label}
              type="button"
              onClick={() => onChangeIsoConfig({ ...isoConfig, rows: sz.rows, cols: sz.cols })}
              className={`px-1.5 py-0.5 rounded border text-[10px] font-mono cursor-pointer ${
                isoConfig.rows === sz.rows
                  ? 'bg-sky-600/30 border-sky-500 text-sky-200'
                  : 'bg-slate-950 border-slate-700 text-slate-400'
              }`}
            >
              {sz.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-slate-900/90 border border-slate-700/80 px-2.5 py-1.5 text-[11px]">
      <span className="font-semibold text-slate-300">Fretboard:</span>
      <select
        value={guitarConfig.presetId}
        onChange={(e) =>
          onChangeGuitarConfig({ ...guitarConfig, presetId: e.target.value as GuitarPresetId })
        }
        className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-slate-200 focus:outline-none cursor-pointer"
      >
        {(Object.keys(GUITAR_TUNING_PRESETS) as GuitarPresetId[]).map((id) => (
          <option key={id} value={id}>
            {GUITAR_TUNING_PRESETS[id].label}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-1">
        {([12, 15] as const).map((frets) => (
          <button
            key={frets}
            type="button"
            onClick={() => onChangeGuitarConfig({ ...guitarConfig, fretCount: frets })}
            className={`px-2 py-0.5 rounded border text-[10px] font-mono cursor-pointer ${
              guitarConfig.fretCount === frets
                ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                : 'bg-slate-950 border-slate-700 text-slate-400'
            }`}
          >
            {frets} Frets
          </button>
        ))}
      </div>
    </div>
  );
};
