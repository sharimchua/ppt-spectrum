/**
 * Alternate playable surfaces for VirtualKeyboard:
 * Scale-Degree Strip, 2D Isomorphic Lattice, and 6-String Guitar Fretboard.
 * Australian English spelling maintained.
 */

import React from 'react';
import { GuitarStringRow, InstrumentSurfaceMode, SurfacePad } from './instrument-layouts';

export interface AlternateSurfacesProps {
  mode: Exclude<InstrumentSurfaceMode, 'piano'>;
  stripPads: SurfacePad[];
  isoGrid: SurfacePad[][];
  guitarStrings: GuitarStringRow[];
  activeSet: Set<number>;
  isMidiHoldActive: boolean;
  onNoteOn: (midiId: number, explicitD: number) => void;
  onNoteOff: (midiId: number) => void;
  onToggleLatch: (midiId: number, explicitD: number) => void;
}

export const AlternateSurfaces: React.FC<AlternateSurfacesProps> = ({
  mode,
  stripPads,
  isoGrid,
  guitarStrings,
  activeSet,
  isMidiHoldActive,
  onNoteOn,
  onNoteOff,
  onToggleLatch,
}) => {
  const handleDown = (pad: SurfacePad, e: React.PointerEvent) => {
    e.preventDefault();
    if (isMidiHoldActive) {
      onToggleLatch(pad.midiId, pad.d);
    } else {
      onNoteOn(pad.midiId, pad.d);
    }
  };

  const handleUpOrLeave = (pad: SurfacePad) => {
    if (!isMidiHoldActive && activeSet.has(pad.midiId)) {
      onNoteOff(pad.midiId);
    }
  };

  if (mode === 'scale-strip') {
    return (
      <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {stripPads.map((pad) => {
          const isActive = activeSet.has(pad.midiId);
          return (
            <button
              key={pad.id}
              type="button"
              onPointerDown={(e) => handleDown(pad, e)}
              onPointerUp={() => handleUpOrLeave(pad)}
              onPointerLeave={() => handleUpOrLeave(pad)}
              className={`min-w-[44px] flex-1 h-20 rounded-lg border flex flex-col items-center justify-between py-2 px-1 transition cursor-pointer ${
                isActive
                  ? 'scale-[0.97] brightness-125 ring-2 ring-white/70'
                  : pad.inScale
                  ? 'opacity-100 hover:brightness-110'
                  : 'opacity-35 hover:opacity-75'
              }`}
              style={{
                backgroundColor: isActive
                  ? pad.colorHex
                  : pad.inScale
                  ? `${pad.colorHex}33`
                  : '#0f172a',
                borderColor: pad.isRoot ? '#fbbf24' : pad.inScale ? `${pad.colorHex}85` : '#1e293b',
              }}
            >
              <span className="text-[11px] font-bold text-white truncate max-w-full">{pad.label}</span>
              <span className="text-[9px] font-mono text-slate-200/80">{pad.subLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (mode === 'isomorphic') {
    return (
      <div className="flex flex-col gap-1 overflow-x-auto pb-1">
        {isoGrid.map((row, rIdx) => (
          <div
            key={`iso-row-${rIdx}`}
            className="flex items-center gap-1"
            style={{ paddingLeft: rIdx % 2 === 1 ? '18px' : '0px' }}
          >
            {row.map((pad) => {
              const isActive = activeSet.has(pad.midiId);
              return (
                <button
                  key={pad.id}
                  type="button"
                  onPointerDown={(e) => handleDown(pad, e)}
                  onPointerUp={() => handleUpOrLeave(pad)}
                  onPointerLeave={() => handleUpOrLeave(pad)}
                  className={`min-w-[54px] h-10 rounded-md border flex flex-col items-center justify-center transition cursor-pointer ${
                    isActive
                      ? 'ring-2 ring-white brightness-125'
                      : pad.inScale
                      ? 'opacity-100 hover:brightness-110'
                      : 'opacity-40 hover:opacity-75'
                  }`}
                  style={{
                    backgroundColor: isActive ? pad.colorHex : `${pad.colorHex}28`,
                    borderColor: pad.isRoot ? '#fbbf24' : `${pad.colorHex}75`,
                  }}
                >
                  <span className="text-[10px] font-bold text-white leading-tight">{pad.label}</span>
                  <span className="text-[8px] font-mono text-slate-300 leading-tight">{pad.subLabel}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 overflow-x-auto pb-1">
      {guitarStrings.map((row) => (
        <div key={row.stringName} className="flex items-center gap-0.5">
          {row.frets.map((pad, fIdx) => {
            const isActive = activeSet.has(pad.midiId);
            const isMarker = fIdx === 3 || fIdx === 5 || fIdx === 7 || fIdx === 9 || fIdx === 12;
            return (
              <button
                key={pad.id}
                type="button"
                onPointerDown={(e) => handleDown(pad, e)}
                onPointerUp={() => handleUpOrLeave(pad)}
                onPointerLeave={() => handleUpOrLeave(pad)}
                className={`min-w-[38px] flex-1 h-7 rounded border flex items-center justify-center gap-1 transition cursor-pointer ${
                  fIdx === 0 ? 'border-r-2 border-r-amber-400/70' : ''
                } ${
                  isActive
                    ? 'ring-2 ring-white brightness-125'
                    : pad.inScale
                    ? 'opacity-100 hover:brightness-110'
                    : 'opacity-35 hover:opacity-75'
                }`}
                style={{
                  backgroundColor: isActive
                    ? pad.colorHex
                    : pad.inScale
                    ? `${pad.colorHex}2c`
                    : isMarker
                    ? '#1e293b'
                    : '#0f172a',
                  borderColor: pad.isRoot ? '#fbbf24' : `${pad.colorHex}55`,
                }}
                title={`String ${row.stringName} Fret ${fIdx} (${pad.subLabel})`}
              >
                <span className="text-[9px] font-mono font-semibold text-white">
                  {pad.inScale || isActive ? pad.subLabel : pad.label}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
