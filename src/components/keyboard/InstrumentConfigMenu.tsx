/**
 * Inline configuration sub-menu for alternate instrument surfaces
 * (Scale Strip, Isomorphic Lattice, Guitar Fretboard) inside VirtualKeyboard.
 */

import React from 'react';
import {
  GUITAR_TUNING_PRESETS,
  GuitarConfig,
  GuitarLabelMode,
  GuitarPresetId,
  ISOMORPHIC_LAYOUT_PRESETS,
  InstrumentSurfaceMode,
  IsoLayoutPresetId,
  IsoTileSize,
  IsomorphicConfig,
  ScaleStripConfig,
  midiToNoteLabel,
  resolveGuitarStrings,
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
          <span className="text-[10px] text-slate-400 mr-0.5">Tile Size:</span>
          {(
            [
              { id: 'sm', label: 'Small' },
              { id: 'md', label: 'Medium' },
              { id: 'lg', label: 'Large' },
            ] as Array<{ id: IsoTileSize; label: string }>
          ).map((sz) => (
            <button
              key={sz.id}
              type="button"
              onClick={() => onChangeIsoConfig({ ...isoConfig, tileSize: sz.id })}
              className={`px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer ${
                (isoConfig.tileSize ?? 'md') === sz.id
                  ? 'bg-sky-600/30 border-sky-500 text-sky-200'
                  : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sz.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const activeStrings = resolveGuitarStrings(guitarConfig);
  const nudgeString = (idx: number, delta: number) => {
    const nextStrings = activeStrings.map((s, i) => {
      if (i !== idx) return s;
      const nextMidi = Math.max(24, Math.min(84, s.openMidi + delta));
      return { openMidi: nextMidi, name: midiToNoteLabel(nextMidi) };
    });
    onChangeGuitarConfig({ ...guitarConfig, presetId: 'custom', customStrings: nextStrings });
  };

  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-slate-900/90 border border-slate-700/80 px-2.5 py-1.5 text-[11px]">
      <span className="font-semibold text-slate-300">Fretboard:</span>
      <select
        value={guitarConfig.presetId}
        onChange={(e) => {
          const nextId = e.target.value as GuitarPresetId | 'custom';
          if (nextId === 'custom') {
            onChangeGuitarConfig({ ...guitarConfig, presetId: 'custom', customStrings: activeStrings });
          } else {
            onChangeGuitarConfig({ ...guitarConfig, presetId: nextId, customStrings: undefined });
          }
        }}
        className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-slate-200 focus:outline-none cursor-pointer"
      >
        {(Object.keys(GUITAR_TUNING_PRESETS) as GuitarPresetId[]).map((id) => (
          <option key={id} value={id}>
            {GUITAR_TUNING_PRESETS[id].label}
          </option>
        ))}
        <option value="custom">Custom Tuning</option>
      </select>
      <div className="flex items-center gap-1">
        {([12, 15, 18] as const).map((frets) => (
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
      <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
        <span className="text-[10px] text-slate-400">Labels:</span>
        {(
          [
            { id: 'solfege', label: 'Solfège' },
            { id: 'note', label: 'Note' },
            { id: 'cents', label: 'Cents' },
            { id: 'fret', label: 'Fret' },
          ] as Array<{ id: GuitarLabelMode; label: string }>
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChangeGuitarConfig({ ...guitarConfig, labelMode: opt.id })}
            className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold cursor-pointer ${
              (guitarConfig.labelMode ?? 'solfege') === opt.id
                ? 'bg-sky-600/30 border-sky-500 text-sky-200'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          onChangeGuitarConfig({
            ...guitarConfig,
            dimOutOfScale: !(guitarConfig.dimOutOfScale ?? true),
          })
        }
        title="Dim frets outside the active Layer 2 Tuning Subset"
        className={`px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer ${
          (guitarConfig.dimOutOfScale ?? true)
            ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
            : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
        }`}
      >
        {(guitarConfig.dimOutOfScale ?? true) ? 'Dim Non-Subset' : 'Show All Frets'}
      </button>
      <div className="flex flex-wrap items-center gap-1 border-l border-slate-800 pl-2">
        <span className="text-[10px] text-slate-400">Strings (High→Low):</span>
        {activeStrings.map((s, idx) => (
          <div
            key={`${idx}-${s.name}`}
            className="flex items-center gap-0.5 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[10px] font-mono"
          >
            <button
              type="button"
              onClick={() => nudgeString(idx, -1)}
              title={`Tune string ${idx + 1} down 1 semitone`}
              className="text-slate-400 hover:text-white px-0.5 cursor-pointer"
            >
              -
            </button>
            <span className="text-slate-200 min-w-[22px] text-center">{s.name}</span>
            <button
              type="button"
              onClick={() => nudgeString(idx, 1)}
              title={`Tune string ${idx + 1} up 1 semitone`}
              className="text-slate-400 hover:text-white px-0.5 cursor-pointer"
            >
              +
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
