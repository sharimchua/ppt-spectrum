/**
 * Harmonic-Geometry-style stacked interval ratio and frequency distance bands
 * rendered above the VirtualKeyboard keybed.
 */

import React from 'react';
import { IntervalBandItem } from './keyboard-layout';

export interface IntervalBandsStripProps {
  bands: IntervalBandItem[];
  rowCount: number;
  keyCenterMap: Map<number, number>;
}

const BAND_ROW_HEIGHT = 22;

export const IntervalBandsStrip: React.FC<IntervalBandsStripProps> = ({
  bands,
  rowCount,
  keyCenterMap,
}) => (
  <div
    style={{ height: `${Math.max(1, rowCount) * BAND_ROW_HEIGHT + 4}px` }}
    className="relative mb-1.5 bg-slate-900/70 border border-slate-800/80 rounded-lg overflow-hidden"
  >
    {bands.map((b) => {
      const leftPct = (keyCenterMap.get(b.leftMidi) ?? 0) * 100;
      const rightPct = (keyCenterMap.get(b.rightMidi) ?? 0) * 100;
      const widthPct = Math.max(2, rightPct - leftPct);
      const bottomPx = 2 + b.row * BAND_ROW_HEIGHT;
      return (
        <div
          key={b.id}
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            bottom: `${bottomPx}px`,
            height: `${BAND_ROW_HEIGHT - 2}px`,
          }}
          className={`absolute flex items-center justify-center gap-1.5 border-x px-1 ${
            b.isSubtleStep
              ? 'border-slate-700/50 text-slate-300'
              : 'bg-indigo-950/75 border-indigo-400/80 text-indigo-100 rounded'
          }`}
        >
          <span className="text-[9.5px] font-mono font-semibold leading-none truncate">
            {b.isSubtleStep ? b.centsLabel : b.ratioLabel}
          </span>
          {!b.isSubtleStep && (
            <span className="text-[8.5px] font-mono text-indigo-300 leading-none truncate hidden sm:inline">
              {b.centsLabel} · {b.deltaLabel}
            </span>
          )}
        </div>
      );
    })}
  </div>
);
