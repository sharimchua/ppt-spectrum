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
  /** Kept for API compatibility; unique step pills no longer collide on narrow screens. */
  semitoneWidthPx?: number;
}

const BAND_ROW_HEIGHT = 22;
const FIXED_STRIP_HEIGHT_PX = 70; // Fits 3 stacked rows without resizing the viewport

export const IntervalBandsStrip: React.FC<IntervalBandsStripProps> = ({
  bands,
  rowCount,
  keyCenterMap,
}) => {
  const isStepSummary = bands.length > 0 && bands.every((b) => b.isSubtleStep);
  const innerHeight = Math.max(FIXED_STRIP_HEIGHT_PX - 2, rowCount * BAND_ROW_HEIGHT + 4);

  if (isStepSummary) {
    return (
      <div
        style={{ height: `${FIXED_STRIP_HEIGHT_PX}px` }}
        className="mb-1.5 bg-slate-900/70 border border-slate-800/80 rounded-lg px-2 py-1 flex flex-wrap items-center justify-center gap-1.5 overflow-y-auto"
      >
        <span className="text-[10px] font-mono text-slate-400 mr-1">
          Unique steps ({bands.length}):
        </span>
        {bands.map((b) => (
          <span
            key={b.id}
            title={`Example: ${b.ratioLabel} (${b.centsLabel} · ${b.deltaLabel})`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700/80 text-[10px] font-mono text-slate-200"
          >
            <strong className="text-white">{b.centsLabel}</strong>
            <span className="text-slate-400 text-[9px]">({b.ratioLabel})</span>
          </span>
        ))}
      </div>
    );
  }

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
                backgroundColor: `${b.colorHex}40`,
                borderColor: b.colorHex,
              }}
              className="absolute flex items-center justify-center gap-1.5 px-1 border text-white rounded"
            >
              <span className="text-[9.5px] font-mono font-semibold leading-none truncate">
                {b.ratioLabel}
              </span>
              <span className="text-[8.5px] font-mono opacity-85 leading-none truncate hidden sm:inline">
                {b.centsLabel} · {b.deltaLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
