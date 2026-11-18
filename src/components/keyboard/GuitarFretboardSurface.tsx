/**
 * SVG Guitar / Bass / Ukulele Fretboard surface inspired by Note Navigation's GuitarFretboard:
 * renders nut, fret wires, inlay markers, graduated string gauges, open-string tuning labels,
 * and interactive Solfège-coloured scale/active note nodes.
 */

import React from 'react';
import { GuitarLabelMode, GuitarStringRow, SurfacePad } from './instrument-layouts';

export interface GuitarFretboardSurfaceProps {
  guitarStrings: GuitarStringRow[];
  labelMode?: GuitarLabelMode;
  dimOutOfScale?: boolean;
  activeSet: Set<number>;
  onDown: (pad: SurfacePad, e: React.PointerEvent) => void;
  onEnter: (pad: SurfacePad) => void;
  onUpOrLeave: (pad: SurfacePad) => void;
}

const MARKER_FRETS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21]);

function resolveFretLabel(pad: SurfacePad, labelMode: GuitarLabelMode): string {
  switch (labelMode) {
    case 'note':
      return pad.noteLabel ?? pad.subLabel;
    case 'cents':
      return pad.centsLabel ?? pad.subLabel;
    case 'solfege':
    default:
      return pad.subLabel;
  }
}

export const GuitarFretboardSurface: React.FC<GuitarFretboardSurfaceProps> = ({
  guitarStrings,
  labelMode = 'solfege',
  dimOutOfScale = true,
  activeSet,
  onDown,
  onEnter,
  onUpOrLeave,
}) => {
  if (guitarStrings.length === 0) return null;

  const fretCount = Math.max(1, (guitarStrings[0]?.frets.length ?? 13) - 1);
  const stringCount = guitarStrings.length;
  const leftMargin = 54;
  const nutX = 62;
  const boardWidth = Math.max(820, fretCount * 62);
  const totalWidth = nutX + boardWidth + 16;
  const stringSpacing = 26;
  const topPad = 16;
  const boardHeight = (stringCount - 1) * stringSpacing;
  const totalHeight = topPad + boardHeight + 28;
  const fretWidth = boardWidth / fretCount;

  const xForFret = (fIdx: number): number =>
    fIdx === 0 ? leftMargin - 10 : nutX + (fIdx - 0.5) * fretWidth;

  return (
    <div className="w-full overflow-x-auto pb-1">
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="w-full h-auto select-none"
        style={{ minWidth: `${Math.max(640, fretCount * 46)}px` }}
      >
        {/* Neck / Fretboard Background */}
        <rect
          x={nutX}
          y={topPad - 8}
          width={boardWidth}
          height={boardHeight + 16}
          rx={4}
          fill="#0b1120"
          stroke="#1e293b"
          strokeWidth={1.2}
        />

        {/* Nut */}
        <rect
          x={nutX - 4}
          y={topPad - 8}
          width={4.5}
          height={boardHeight + 16}
          rx={1.5}
          fill="#d6c7a9"
          opacity={0.8}
        />

        {/* Fret Wires */}
        {Array.from({ length: fretCount }, (_, i) => {
          const x = nutX + (i + 1) * fretWidth;
          return (
            <line
              key={`fret-wire-${i + 1}`}
              x1={x}
              y1={topPad - 8}
              x2={x}
              y2={topPad + boardHeight + 8}
              stroke="#334155"
              strokeWidth={1.5}
            />
          );
        })}

        {/* Fret Inlay Dots */}
        {Array.from({ length: fretCount }, (_, i) => {
          const fret = i + 1;
          if (!MARKER_FRETS.has(fret)) return null;
          const x = nutX + (fret - 0.5) * fretWidth;
          const midY = topPad + boardHeight / 2;
          if (fret === 12) {
            const offset = Math.min(28, boardHeight * 0.28);
            return (
              <g key={`inlay-${fret}`}>
                <circle cx={x} cy={midY - offset} r={4} fill="#64748b" opacity={0.35} />
                <circle cx={x} cy={midY + offset} r={4} fill="#64748b" opacity={0.35} />
              </g>
            );
          }
          return <circle key={`inlay-${fret}`} cx={x} cy={midY} r={4} fill="#64748b" opacity={0.3} />;
        })}

        {/* Graduated Strings + Open-String Tuning Labels */}
        {guitarStrings.map((row, sIdx) => {
          const y = topPad + sIdx * stringSpacing;
          const gauge = 0.7 + sIdx * 0.35;
          return (
            <g key={`str-${row.stringIndex}-${row.stringName}`}>
              <text
                x={18}
                y={y + 3.5}
                fill="#94a3b8"
                fontSize={10}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontWeight="600"
                textAnchor="middle"
              >
                {row.stringName}
              </text>
              <line
                x1={nutX - 4}
                y1={y}
                x2={nutX + boardWidth}
                y2={y}
                stroke="#cbd5e1"
                strokeWidth={gauge}
                opacity={0.38}
              />
            </g>
          );
        })}

        {/* Interactive Note Nodes */}
        {guitarStrings.map((row, sIdx) => {
          const y = topPad + sIdx * stringSpacing;
          return row.frets.map((pad, fIdx) => {
            const x = xForFret(fIdx);
            const isActive = activeSet.has(pad.midiId);
            const isDimmedOut = dimOutOfScale && !pad.inScale && !isActive;
            const radius = isActive ? 10.5 : pad.inScale ? 9.5 : isDimmedOut ? 4.5 : 7.5;
            const textLabel = resolveFretLabel(pad, labelMode);

            return (
              <g
                key={pad.id}
                className="cursor-pointer group"
                onPointerDown={(e) => onDown(pad, e)}
                onPointerEnter={() => onEnter(pad)}
                onPointerUp={() => onUpOrLeave(pad)}
                onPointerLeave={() => onUpOrLeave(pad)}
              >
                <title>{`String ${row.stringName} · Fret ${fIdx} (${pad.noteLabel ?? ''} · ${pad.subLabel} · ${pad.centsLabel ?? ''})`}</title>
                {/* Larger invisible hit target for easy clicking on dimmed notes */}
                <circle cx={x} cy={y} r={11} fill="transparent" />
                {isActive && (
                  <circle
                    cx={x}
                    cy={y}
                    r={13.5}
                    fill="none"
                    stroke={pad.colorHex}
                    strokeWidth={1.6}
                    opacity={0.75}
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={isActive ? pad.colorHex : pad.inScale ? `${pad.colorHex}55` : '#0f172a'}
                  stroke={
                    isActive
                      ? '#ffffff'
                      : pad.isRoot && pad.inScale
                      ? '#fbbf24'
                      : pad.inScale
                      ? pad.colorHex
                      : '#334155'
                  }
                  strokeWidth={isActive ? 1.8 : pad.isRoot && pad.inScale ? 1.6 : 1}
                  opacity={isActive ? 1 : pad.inScale ? 0.95 : isDimmedOut ? 0.22 : 0.65}
                  className={isDimmedOut ? 'group-hover:opacity-75 transition-opacity' : undefined}
                />
                {(!isDimmedOut || isActive) && (
                  <text
                    x={x}
                    y={y + 3}
                    fill={isActive ? '#020617' : pad.inScale ? '#f8fafc' : '#94a3b8'}
                    fontSize={textLabel.length > 3 ? 6.2 : textLabel.length > 2 ? 7 : 8.5}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fontWeight={isActive || pad.inScale ? '700' : '500'}
                    textAnchor="middle"
                    opacity={isActive || pad.inScale ? 1 : 0.75}
                  >
                    {textLabel}
                  </text>
                )}
              </g>
            );
          });
        })}

        {/* Fret Numbers */}
        {Array.from({ length: fretCount + 1 }, (_, fIdx) => {
          const x = xForFret(fIdx);
          return (
            <text
              key={`fnum-${fIdx}`}
              x={x}
              y={topPad + boardHeight + 20}
              fill={MARKER_FRETS.has(fIdx) ? '#cbd5e1' : '#64748b'}
              fontSize={9}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontWeight={MARKER_FRETS.has(fIdx) ? '700' : '400'}
              textAnchor="middle"
            >
              {fIdx}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
