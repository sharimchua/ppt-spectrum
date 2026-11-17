/**
 * Harmonic-Geometry-style stacked interval ratio and frequency distance bands
 * rendered above the VirtualKeyboard keybed in a fixed-height container so the
 * canvas viewport never jumps as notes are added or cleared.
 */

import React from 'react';
import { IntervalBandItem } from './keyboard-layout';

export interface IntervalBandsStripProps {
  bands: IntervalBandItem[];
  rowCount: number;
  keyCenterMap: Map<number, number>;
  /** Width in px per semitone step, used to prevent adjacent step labels from colliding on 3+ octave views. */
  semitoneWidthPx: number;
}

const BAND_ROW_HEIGHT = 22;
const FIXED_STRIP_HEIGHT_PX = 70; // Fits 3 stacked rows without resizing the viewport

export const IntervalBandsStrip: React.FC<IntervalBandsStripProps> = ({
  bands,
  rowCount,
  keyCenterMap,
  semitoneWidthPx,
}) => {
  const innerHeight = Math.max(FIXED_STRIP_HEIGHT_PX - 2, rowCount * BAND_ROW_HEIGHT + 4);
  const showStepText = semitoneWidthPx >= 24;
  const showCompactStepNumber = semitoneWidthPx >= 15 && semitoneWidthPx < 24;

  return (
    <div
      style={{ height: `${FIXED_STRIP_HEIGHT_PX}px` }}
      className="relative mb-1.5 bg-slate-900/70 border border-slate-800/80 rounded-lg overflow-y-auto overflow-x-hidden"
    >
      <div style={{ height: `${innerHeight}px` }} className="relative w-full">
        {bands.map((b) => {
          const leftPct = (keyCenterMap.get(b.leftMidi) ?? 0) * 100;
          const rightPct = (keyCenterMap.get(b.rightMidi) ?? 0) * 100;
          const widthPct = Math.max(1.2, rightPct - leftPct);
          const bottomPx = 2 + b.row * BAND_ROW_HEIGHT;
          return (
            <div
              key={b.id}
              title={`${b.ratioLabel} (${b.centsLabel} · ${b.deltaLabel})`}
              style={{
                left: `${leftPct}%`,
                width: `calc(${widthPct}% - 1px)`,
                bottom: `${bottomPx}px`,
                height: `${BAND_ROW_HEIGHT - 2}px`,
                ...(b.isSubtleStep
                  ? {}
                  : {
                      backgroundColor: `${b.colorHex}40`,
                      borderColor: b.colorHex,
                    }),
              }}
              className={`absolute flex items-center justify-center gap-1.5 px-0.5 ${
                b.isSubtleStep
                  ? 'border-r border-slate-700/50 text-slate-300'
                  : 'border text-white rounded'
              }`}
            >
              {b.isSubtleStep ? (
                showStepText ? (
                  <span className="text-[9px] font-mono leading-none truncate">{b.centsLabel}</span>
                ) : showCompactStepNumber ? (
                  <span className="text-[8px] font-mono leading-none opacity-80">
                    {b.centsLabel.replace('¢', '')}
                  </span>
                ) : (
                  <span className="w-1 h-1 rounded-full bg-slate-500/70" />
                )
              ) : (
                <>
                  <span className="text-[9.5px] font-mono font-semibold leading-none truncate">
                    {b.ratioLabel}
                  </span>
                  <span className="text-[8.5px] font-mono opacity-85 leading-none truncate hidden sm:inline">
                    {b.centsLabel} · {b.deltaLabel}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
