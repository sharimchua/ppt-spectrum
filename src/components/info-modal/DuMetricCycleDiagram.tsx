import React, { useState } from 'react';
import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS } from '../../core/ppt-constants';

interface SolfegeDegreeInfo {
  syllable: string;
  glyph: string;
  ratio: string;
  cents: string;
  pitchRole: string;
  rhythmRole: string;
  color: string;
  neonColor: string;
}

const DEGREES: SolfegeDegreeInfo[] = [
  { syllable: 'Do', glyph: '○', ratio: '1/1', cents: '0¢', pitchRole: 'Tonic Root (Zenith)', rhythmRole: 'Downbeat (0/1)', color: SOLFEGE_COLORS[0], neonColor: SOLFEGE_NEON_COLORS[0] },
  { syllable: 'Ra', glyph: '◇', ratio: '16/15', cents: '112¢', pitchRole: 'Minor 2nd', rhythmRole: '12th Subdivision', color: SOLFEGE_COLORS[1], neonColor: SOLFEGE_NEON_COLORS[1] },
  { syllable: 'Re', glyph: '□', ratio: '9/8', cents: '204¢', pitchRole: 'Major 2nd', rhythmRole: '6th Subdivision', color: SOLFEGE_COLORS[2], neonColor: SOLFEGE_NEON_COLORS[2] },
  { syllable: 'Me', glyph: '▽', ratio: '6/5', cents: '316¢', pitchRole: 'Minor 3rd', rhythmRole: 'Quarter Beat (1/4)', color: SOLFEGE_COLORS[3], neonColor: SOLFEGE_NEON_COLORS[3] },
  { syllable: 'Mi', glyph: '△', ratio: '5/4', cents: '386¢', pitchRole: 'Major 3rd', rhythmRole: 'Triplet Beat (1/3)', color: SOLFEGE_COLORS[4], neonColor: SOLFEGE_NEON_COLORS[4] },
  { syllable: 'Fa', glyph: '⊂', ratio: '4/3', cents: '498¢', pitchRole: 'Perfect 4th', rhythmRole: '5/12 Step', color: SOLFEGE_COLORS[5], neonColor: SOLFEGE_NEON_COLORS[5] },
  { syllable: 'Fi', glyph: '×', ratio: '7/5 (√2)', cents: '582¢ / 600¢', pitchRole: 'Tritone (Nadir)', rhythmRole: 'Offbeat Antipode (1/2)', color: SOLFEGE_COLORS[6], neonColor: SOLFEGE_NEON_COLORS[6] },
  { syllable: 'So', glyph: '⊃', ratio: '3/2', cents: '702¢', pitchRole: 'Perfect 5th', rhythmRole: '3:2 Hemiola Pulse (7/12)', color: SOLFEGE_COLORS[7], neonColor: SOLFEGE_NEON_COLORS[7] },
  { syllable: 'Le', glyph: '▽', ratio: '8/5', cents: '814¢', pitchRole: 'Minor 6th', rhythmRole: '2nd Triplet (2/3)', color: SOLFEGE_COLORS[8], neonColor: SOLFEGE_NEON_COLORS[8] },
  { syllable: 'La', glyph: '△', ratio: '5/3', cents: '884¢', pitchRole: 'Major 6th', rhythmRole: '3rd Quarter (3/4)', color: SOLFEGE_COLORS[9], neonColor: SOLFEGE_NEON_COLORS[9] },
  { syllable: 'Te', glyph: '◇', ratio: '7/4', cents: '969¢', pitchRole: 'Harmonic 7th', rhythmRole: '5/6 Pickup', color: SOLFEGE_COLORS[10], neonColor: SOLFEGE_NEON_COLORS[10] },
  { syllable: 'Ti', glyph: '□', ratio: '15/8', cents: '1088¢', pitchRole: 'Major 7th', rhythmRole: '11/12 Leading Step', color: SOLFEGE_COLORS[11], neonColor: SOLFEGE_NEON_COLORS[11] },
];

export const DuMetricCycleDiagram: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [activeGroove, setActiveGroove] = useState<'all' | 'hemiola' | 'tresillo' | 'quarters'>('hemiola');

  const selected = DEGREES[selectedIdx] || DEGREES[0];

  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 96;

  // Active indices for groove overlays
  const grooveHighlightIndices: Record<string, number[]> = {
    all: [],
    hemiola: [0, 7], // Do (0) + So (7)
    tresillo: [0, 4, 9], // Do (0/8), DoLa (3/8 ~ Mi), La (6/8 ~ La)
    quarters: [0, 3, 6, 9], // Do, Me, Fi, La (4 quarters)
  };

  const highlighted = grooveHighlightIndices[activeGroove] || [];

  return (
    <div className="w-full flex flex-col p-3.5 sm:p-4 bg-slate-950/80 border border-slate-800/90 rounded-xl select-none space-y-3 shadow-lg">
      {/* Header with Groove Overlay Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div>
          <span className="text-xs sm:text-sm font-bold text-white font-mono flex items-center gap-2">
            <span>DuMetric Time &amp; Uniform Solfège Clock</span>
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            12 degrees subdivide both pitch octaves and rhythmic cycles symmetrically.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1 self-start sm:self-auto text-[10px] font-mono">
          <span className="text-slate-400 mr-1">Overlay:</span>
          {(['all', 'hemiola', 'tresillo', 'quarters'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroove(g)}
              className={`px-2 py-0.5 rounded capitalize transition cursor-pointer border ${
                activeGroove === g
                  ? 'bg-amber-950/90 border-amber-500 text-white shadow-sm ring-1 ring-amber-400/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {g === 'all' ? '12 Tones' : g === 'hemiola' ? '3:2 Hemiola' : g === 'tresillo' ? 'Tresillo 3+3+2' : '4/4 Quarters'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* SVG Clock Dial */}
        <div className="md:col-span-6 flex justify-center">
          <div className="relative w-64 h-64">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
              {/* Outer guide ring */}
              <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth={1} />
              <circle cx={cx} cy={cy} r={radius - 24} fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="2 3" strokeWidth={1} />

              {/* Vertical polar axis (Do 12 o'clock <-> Fi 6 o'clock) */}
              <line x1={cx} y1={cy - radius} x2={cx} y2={cy + radius} stroke="rgba(225, 54, 16, 0.35)" strokeDasharray="3 3" strokeWidth={1.2} />

              {/* Connecting polygon for active groove */}
              {highlighted.length > 1 && (
                <polygon
                  points={highlighted
                    .map((idx) => {
                      const angle = (idx / 12) * Math.PI * 2 - Math.PI / 2;
                      return `${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`;
                    })
                    .join(' ')}
                  fill="rgba(245, 158, 11, 0.12)"
                  stroke="#f59e0b"
                  strokeWidth={1.8}
                />
              )}

              {/* 12 Degree Nodes */}
              {DEGREES.map((deg, idx) => {
                const angle = (idx / 12) * Math.PI * 2 - Math.PI / 2;
                const nx = cx + Math.cos(angle) * radius;
                const ny = cy + Math.sin(angle) * radius;
                const isSelected = selectedIdx === idx;
                const isGrooveActive = highlighted.includes(idx);

                return (
                  <g
                    key={deg.syllable}
                    onClick={() => setSelectedIdx(idx)}
                    className="cursor-pointer transition-transform duration-100"
                  >
                    {/* Connecting spoke */}
                    <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="rgba(255, 255, 255, 0.08)" strokeWidth={1} />

                    {/* Ring aura if selected or highlighted */}
                    {(isSelected || isGrooveActive) && (
                      <circle
                        cx={nx}
                        cy={ny}
                        r={isSelected ? 16 : 14}
                        fill="none"
                        stroke={deg.neonColor}
                        strokeWidth={isSelected ? 2 : 1.5}
                        strokeDasharray={isSelected ? undefined : '2 2'}
                        opacity={0.8}
                      />
                    )}

                    {/* Degree Circle */}
                    <circle
                      cx={nx}
                      cy={ny}
                      r={isSelected ? 12 : 10}
                      fill={deg.color}
                      stroke={isSelected ? '#ffffff' : 'rgba(15, 23, 42, 0.8)'}
                      strokeWidth={isSelected ? 2 : 1.2}
                    />

                    {/* Degree Label */}
                    <text
                      x={nx}
                      y={ny + 3.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={isSelected ? '9px' : '8px'}
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {deg.syllable}
                    </text>

                    {/* Glyph Marker outside radius */}
                    <text
                      x={cx + Math.cos(angle) * (radius + 18)}
                      y={cy + Math.sin(angle) * (radius + 18) + 3}
                      textAnchor="middle"
                      fill={deg.neonColor}
                      fontSize="9px"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {deg.glyph}
                    </text>
                  </g>
                );
              })}

              {/* Centre Hub */}
              <circle cx={cx} cy={cy} r="18" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth={1} />
              <text x={cx} y={cy + 3.5} textAnchor="middle" fill="#f8fafc" fontSize="8.5px" fontFamily="monospace" fontWeight="bold">
                {selected.syllable}
              </text>
            </svg>
          </div>
        </div>

        {/* 12-Tone Solfège Glyphs Matrix Grid */}
        <div className="md:col-span-6 grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {DEGREES.map((deg, idx) => {
            const isSelected = selectedIdx === idx;
            return (
              <button
                key={deg.syllable}
                onClick={() => setSelectedIdx(idx)}
                className={`p-1.5 rounded-lg border text-center flex flex-col items-center gap-0.5 transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-red-500 ring-1 ring-red-500/50 shadow-md'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1 font-mono font-bold text-xs" style={{ color: deg.neonColor }}>
                  <span>{deg.glyph}</span>
                  <span>{deg.syllable}</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400">{deg.ratio}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fixed-Height Inspector Ribbon */}
      <div className="w-full min-h-[46px] p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800" style={{ color: selected.neonColor }}>
            {selected.glyph} {selected.syllable}
          </span>
          <div className="min-w-0 leading-tight">
            <span className="font-bold text-white mr-1.5">{selected.pitchRole}</span>
            <span className="text-slate-400 text-[11px]">&bull; Rhythm: <strong className="text-slate-200">{selected.rhythmRole}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 shrink-0 self-end sm:self-auto">
          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
            Ratio: {selected.ratio}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300">
            {selected.cents}
          </span>
        </div>
      </div>
    </div>
  );
};
