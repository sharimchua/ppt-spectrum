/**
 * Alternate playable surfaces for VirtualKeyboard:
 * Scale-Degree Strip, 2D Isomorphic Lattice (Rect or Hex), and configurable Guitar Fretboard.
 * Australian English spelling maintained.
 */

import React, { useEffect, useRef } from 'react';
import {
  GuitarStringRow,
  InstrumentSurfaceMode,
  IsoTileShape,
  IsoTileSize,
  SurfacePad,
} from './instrument-layouts';
import { GuitarFretboardSurface } from './GuitarFretboardSurface';

export interface AlternateSurfacesProps {
  mode: Exclude<InstrumentSurfaceMode, 'piano'>;
  stripPads: SurfacePad[];
  isoGrid: SurfacePad[][];
  isoTileShape: IsoTileShape;
  isoTileSize?: IsoTileSize;
  guitarStrings: GuitarStringRow[];
  activeSet: Set<number>;
  isMidiHoldActive: boolean;
  onNoteOn: (midiId: number, explicitD: number) => void;
  onNoteOff: (midiId: number) => void;
  onToggleLatch: (midiId: number, explicitD: number) => void;
}

const HEX_CLIP_PATH = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

const ISO_DIMENSIONS: Record<
  IsoTileSize,
  { hexW: number; hexH: number; hexOffset: number; hexOverlap: number; rectW: number; rectH: number; rectOffset: number }
> = {
  sm: { hexW: 36, hexH: 40, hexOffset: 19, hexOverlap: -7, rectW: 42, rectH: 32, rectOffset: 14 },
  md: { hexW: 46, hexH: 50, hexOffset: 24, hexOverlap: -8, rectW: 54, rectH: 38, rectOffset: 18 },
  lg: { hexW: 58, hexH: 64, hexOffset: 30, hexOverlap: -11, rectW: 68, rectH: 46, rectOffset: 22 },
};

export const AlternateSurfaces: React.FC<AlternateSurfacesProps> = ({
  mode,
  stripPads,
  isoGrid,
  isoTileShape,
  isoTileSize = 'md',
  guitarStrings,
  activeSet,
  isMidiHoldActive,
  onNoteOn,
  onNoteOff,
  onToggleLatch,
}) => {
  const isPointerDownRef = useRef(false);
  const lastStrumPadRef = useRef<number | null>(null);

  useEffect(() => {
    const handleGlobalUp = () => {
      if (isPointerDownRef.current && !isMidiHoldActive && lastStrumPadRef.current !== null) {
        onNoteOff(lastStrumPadRef.current);
      }
      isPointerDownRef.current = false;
      lastStrumPadRef.current = null;
    };
    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('pointercancel', handleGlobalUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalUp);
      window.removeEventListener('pointercancel', handleGlobalUp);
    };
  }, [isMidiHoldActive, onNoteOff]);

  const handleDown = (pad: SurfacePad, e: React.PointerEvent) => {
    e.preventDefault();
    isPointerDownRef.current = true;
    lastStrumPadRef.current = pad.midiId;
    if (isMidiHoldActive) {
      onToggleLatch(pad.midiId, pad.d);
    } else {
      onNoteOn(pad.midiId, pad.d);
    }
  };

  const handleEnter = (pad: SurfacePad) => {
    if (!isPointerDownRef.current || isMidiHoldActive) return;
    if (lastStrumPadRef.current !== null && lastStrumPadRef.current !== pad.midiId) {
      onNoteOff(lastStrumPadRef.current);
    }
    lastStrumPadRef.current = pad.midiId;
    onNoteOn(pad.midiId, pad.d);
  };

  const handleUpOrLeave = (pad: SurfacePad) => {
    if (!isMidiHoldActive && !isPointerDownRef.current && activeSet.has(pad.midiId)) {
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
              onPointerEnter={() => handleEnter(pad)}
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
    const isHex = isoTileShape === 'hex';
    const dims = ISO_DIMENSIONS[isoTileSize];
    return (
      <div className={`flex flex-col items-center overflow-x-auto pb-1 ${isHex ? 'pt-1' : 'gap-1'}`}>
        {isoGrid.map((row, rIdx) => (
          <div
            key={`iso-row-${rIdx}`}
            className={`flex items-center ${isHex ? 'gap-0.5' : 'gap-1'}`}
            style={{
              paddingLeft: rIdx % 2 === 1 ? `${isHex ? dims.hexOffset : dims.rectOffset}px` : '0px',
              marginTop: isHex && rIdx > 0 ? `${dims.hexOverlap}px` : undefined,
            }}
          >
            {row.map((pad) => {
              const isActive = activeSet.has(pad.midiId);
              return (
                <button
                  key={pad.id}
                  type="button"
                  onPointerDown={(e) => handleDown(pad, e)}
                  onPointerEnter={() => handleEnter(pad)}
                  onPointerUp={() => handleUpOrLeave(pad)}
                  onPointerLeave={() => handleUpOrLeave(pad)}
                  className={`${
                    isHex ? '' : 'rounded-md border'
                  } flex flex-col items-center justify-center transition cursor-pointer shrink-0 ${
                    isActive
                      ? 'brightness-125 ring-2 ring-white'
                      : pad.inScale
                      ? 'opacity-100 hover:brightness-110'
                      : 'opacity-35 hover:opacity-75'
                  }`}
                  style={{
                    width: `${isHex ? dims.hexW : dims.rectW}px`,
                    height: `${isHex ? dims.hexH : dims.rectH}px`,
                    ...(isHex ? { clipPath: HEX_CLIP_PATH } : {}),
                    backgroundColor: isActive ? pad.colorHex : `${pad.colorHex}33`,
                    borderColor: pad.isRoot ? '#fbbf24' : `${pad.colorHex}75`,
                  }}
                >
                  <span className={`${isoTileSize === 'sm' ? 'text-[9px]' : 'text-[10px]'} font-bold text-white leading-tight`}>
                    {pad.label}
                  </span>
                  <span className={`${isoTileSize === 'sm' ? 'text-[7px]' : 'text-[8px]'} font-mono text-slate-200 leading-tight`}>
                    {pad.subLabel}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <GuitarFretboardSurface
      guitarStrings={guitarStrings}
      activeSet={activeSet}
      onDown={handleDown}
      onEnter={handleEnter}
      onUpOrLeave={handleUpOrLeave}
    />
  );
};
