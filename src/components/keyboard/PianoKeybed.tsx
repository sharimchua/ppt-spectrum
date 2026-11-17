/**
 * Standard 12-key Solfège Piano Keybed with stacked interval distance bands.
 */

import React from 'react';
import { IntervalBandItem, VirtualKeyItem } from './keyboard-layout';
import { IntervalBandsStrip } from './IntervalBandsStrip';

export interface PianoKeybedProps {
  isFitMode: boolean;
  keyboardWidthPx: number;
  showIntervals: boolean;
  intervalBands: IntervalBandItem[];
  intervalRowCount: number;
  keyCenterMap: Map<number, number>;
  semitoneWidthPx: number;
  whiteKeys: VirtualKeyItem[];
  blackKeys: VirtualKeyItem[];
  activeSet: Set<number>;
  totalWhite: number;
  isCompact: boolean;
  isUltraCompact: boolean;
  onKeyDown: (k: VirtualKeyItem, e: React.PointerEvent) => void;
  onKeyUpOrLeave: (k: VirtualKeyItem) => void;
}

export const PianoKeybed: React.FC<PianoKeybedProps> = ({
  isFitMode,
  keyboardWidthPx,
  showIntervals,
  intervalBands,
  intervalRowCount,
  keyCenterMap,
  semitoneWidthPx,
  whiteKeys,
  blackKeys,
  activeSet,
  totalWhite,
  isCompact,
  isUltraCompact,
  onKeyDown,
  onKeyUpOrLeave,
}) => (
  <div className="w-full overflow-x-auto">
    <div style={{ width: isFitMode ? '100%' : `${keyboardWidthPx}px` }} className="mx-auto">
      {showIntervals && (
        <IntervalBandsStrip
          bands={intervalBands}
          rowCount={intervalRowCount}
          keyCenterMap={keyCenterMap}
          semitoneWidthPx={semitoneWidthPx}
        />
      )}

      <div className="relative h-24 sm:h-28 w-full flex">
        {whiteKeys.map((k) => {
          const isActive = activeSet.has(k.midi);
          const darkInk = k.semitoneFromRoot === 3 || k.semitoneFromRoot === 4;
          return (
            <button
              key={k.midi}
              type="button"
              onPointerDown={(e) => onKeyDown(k, e)}
              onPointerUp={() => onKeyUpOrLeave(k)}
              onPointerLeave={() => onKeyUpOrLeave(k)}
              style={
                isActive
                  ? {
                      backgroundColor: k.colorHex,
                      borderColor: '#0f172a',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.45)',
                    }
                  : undefined
              }
              className={`relative flex-1 h-full border rounded-b-lg flex flex-col items-center justify-end pb-1.5 transition-colors cursor-pointer ${
                isActive
                  ? darkInk
                    ? 'text-slate-950 font-semibold'
                    : 'text-white font-semibold'
                  : 'bg-slate-100 hover:bg-white border-slate-400 text-slate-800'
              }`}
            >
              {k.isTonic && (
                <span
                  className="w-1.5 h-1.5 rounded-full mb-0.5"
                  style={{ backgroundColor: isActive ? '#ffffff' : k.colorHex }}
                  title="Tonic (Do)"
                />
              )}
              {!isUltraCompact && (
                <span className="text-[10px] font-mono leading-none">{k.syllable}</span>
              )}
              {!isCompact && (
                <span className="text-[8px] opacity-65 font-mono leading-none mt-0.5">{k.noteName}</span>
              )}
            </button>
          );
        })}

        {blackKeys.map((k) => {
          const isActive = activeSet.has(k.midi);
          const centerPct = (keyCenterMap.get(k.midi) ?? 0) * 100;
          const widthPct = (1 / totalWhite) * 58;
          const darkInk = k.semitoneFromRoot === 3 || k.semitoneFromRoot === 4;
          return (
            <button
              key={k.midi}
              type="button"
              onPointerDown={(e) => onKeyDown(k, e)}
              onPointerUp={() => onKeyUpOrLeave(k)}
              onPointerLeave={() => onKeyUpOrLeave(k)}
              style={{
                left: `calc(${centerPct}% - ${widthPct / 2}%)`,
                width: `${widthPct}%`,
                ...(isActive
                  ? {
                      backgroundColor: k.colorHex,
                      borderColor: '#020617',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.45)',
                    }
                  : {}),
              }}
              className={`absolute top-0 h-[62%] z-10 border rounded-b-md flex flex-col items-center justify-end pb-1 shadow-md transition-colors cursor-pointer ${
                isActive
                  ? darkInk
                    ? 'text-slate-950 font-semibold'
                    : 'text-white font-semibold'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              {k.isTonic && (
                <span
                  className="w-1.5 h-1.5 rounded-full mb-0.5"
                  style={{ backgroundColor: isActive ? '#ffffff' : k.colorHex }}
                  title="Tonic (Do)"
                />
              )}
              {!isCompact && (
                <span className="text-[9px] font-mono leading-none">{k.syllable}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);
