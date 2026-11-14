/**
 * Ruler-style interactive Shape Preview for the Shape Editor.
 * Displays all Voice Anchors and Partials along the DuMetric octave axis for direct selection.
 */

import React from 'react';
import { VoiceAnchor } from '../../core/types';
import { ratioToValue } from '../../core/rational';
import { SOLFEGE_NEON_COLORS } from '../../core/ppt-constants';

export interface ShapeRulerPreviewProps {
  anchors: VoiceAnchor[];
  selectedAnchorIdx: number;
  selectedPartialIdx: number;
  onSelect: (anchorIdx: number, partialIdx: number) => void;
  minOct?: number;
  maxOct?: number;
}

export const ShapeRulerPreview: React.FC<ShapeRulerPreviewProps> = ({
  anchors,
  selectedAnchorIdx,
  selectedPartialIdx,
  onSelect,
  minOct = -1,
  maxOct = 4,
}) => {
  const width = 400;
  const height = 88;
  const padX = 16;
  const baseY = 68;
  const maxStemH = 48;

  const octToX = (oct: number) => {
    const clamped = Math.max(minOct, Math.min(maxOct, oct));
    return padX + ((clamped - minOct) / (maxOct - minOct)) * (width - padX * 2);
  };

  return (
    <div className="rounded-lg bg-slate-950 border border-slate-800 p-2 space-y-1">
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-1">
        <span>Shape Spectrum Preview (tap any stem to edit)</span>
        <span>Octaves relative to Root (1x)</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20 select-none overflow-visible">
        {/* Baseline */}
        <line x1={padX} y1={baseY} x2={width - padX} y2={baseY} stroke="rgba(148,163,184,0.25)" strokeWidth={1} />

        {/* Octave Ticks */}
        {Array.from(
          { length: Math.max(1, Math.floor(maxOct) - Math.ceil(minOct) + 1) },
          (_, i) => Math.ceil(minOct) + i
        ).map((oct) => {
          const tx = octToX(oct);
          const label =
            oct === 0
              ? '1x'
              : oct < 0
                ? `1/${Math.pow(2, -oct)}`
                : `${Math.pow(2, oct)}x`;
          return (
            <g key={oct}>
              <line
                x1={tx}
                y1={baseY - 4}
                x2={tx}
                y2={baseY + 4}
                stroke={oct === 0 ? '#E13610' : 'rgba(148,163,184,0.35)'}
                strokeWidth={oct === 0 ? 1.5 : 1}
              />
              <text
                x={tx}
                y={baseY + 14}
                textAnchor="middle"
                fill={oct === 0 ? '#E13610' : '#64748b'}
                fontSize={8}
                fontFamily="monospace"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Partial Stems */}
        {anchors.map((anchor, aIdx) => {
          const anchorRatio = ratioToValue(anchor.ratio);
          const anchorGain = anchor.mute ? 0 : anchor.gain;
          return anchor.partials.map((p, pIdx) => {
            const combinedRatio = Math.max(1e-4, anchorRatio * ratioToValue(p.ratio));
            const oct = Math.log2(combinedRatio);
            const x = octToX(oct);
            const effAmp = Math.max(0.08, anchorGain * p.amp);
            const topY = baseY - effAmp * maxStemH;
            const frac = ((oct % 1) + 1) % 1;
            const semi = Math.floor(frac * 12) % 12;
            const col = SOLFEGE_NEON_COLORS[semi] || '#38bdf8';
            const isSelected = aIdx === selectedAnchorIdx && pIdx === selectedPartialIdx;

            return (
              <g
                key={`${aIdx}-${p.id || pIdx}`}
                onClick={() => onSelect(aIdx, pIdx)}
                className="cursor-pointer"
              >
                <line
                  x1={x}
                  y1={baseY}
                  x2={x}
                  y2={topY}
                  stroke={col}
                  strokeWidth={isSelected ? 3 : 1.8}
                  strokeOpacity={p.amp <= 0.001 || anchor.mute ? 0.25 : 0.9}
                />
                <circle
                  cx={x}
                  cy={topY}
                  r={isSelected ? 5.5 : 3.5}
                  fill={isSelected ? '#ffffff' : col}
                  stroke={isSelected ? col : 'none'}
                  strokeWidth={2}
                />
                {isSelected && (
                  <circle
                    cx={x}
                    cy={topY}
                    r={8}
                    fill="none"
                    stroke={col}
                    strokeWidth={1}
                    strokeOpacity={0.6}
                  />
                )}
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
};
