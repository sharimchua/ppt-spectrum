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
  { syllable: 'Do', glyph: '○', ratio: '1/1', cents: '0¢', pitchRole: 'Home Note / Root (12 o’clock)', rhythmRole: 'Beat 1 Downbeat (Start of Bar)', color: SOLFEGE_COLORS[0], neonColor: SOLFEGE_NEON_COLORS[0] },
  { syllable: 'Ra', glyph: '◇', ratio: '16/15', cents: '112¢', pitchRole: 'Minor 2nd (Half-step tension)', rhythmRole: '1/12th Early Pickup', color: SOLFEGE_COLORS[1], neonColor: SOLFEGE_NEON_COLORS[1] },
  { syllable: 'Re', glyph: '□', ratio: '9/8', cents: '204¢', pitchRole: 'Major 2nd (Whole step)', rhythmRole: '1/6th Subdivision Step', color: SOLFEGE_COLORS[2], neonColor: SOLFEGE_NEON_COLORS[2] },
  { syllable: 'Me', glyph: '▽', ratio: '6/5', cents: '316¢', pitchRole: 'Minor 3rd (Warm minor colour)', rhythmRole: '2nd Quarter Beat (1/4 of bar)', color: SOLFEGE_COLORS[3], neonColor: SOLFEGE_NEON_COLORS[3] },
  { syllable: 'Mi', glyph: '△', ratio: '5/4', cents: '386¢', pitchRole: 'Major 3rd (Bright major colour)', rhythmRole: '2nd Triplet Beat (1/3 of bar)', color: SOLFEGE_COLORS[4], neonColor: SOLFEGE_NEON_COLORS[4] },
  { syllable: 'Fa', glyph: '⊂', ratio: '4/3', cents: '498¢', pitchRole: 'Perfect 4th (Suspended pull)', rhythmRole: '5/12th Cross-Beat', color: SOLFEGE_COLORS[5], neonColor: SOLFEGE_NEON_COLORS[5] },
  { syllable: 'Fi', glyph: '×', ratio: '√2 (7/5)', cents: '600¢', pitchRole: 'Tritone (Exact Halfway Axis)', rhythmRole: 'Backbeat / Maximum Offbeat (1/2 bar)', color: SOLFEGE_COLORS[6], neonColor: SOLFEGE_NEON_COLORS[6] },
  { syllable: 'So', glyph: '⊃', ratio: '3/2', cents: '702¢', pitchRole: 'Perfect 5th (Strongest partner)', rhythmRole: '3:2 Hemiola Pulse', color: SOLFEGE_COLORS[7], neonColor: SOLFEGE_NEON_COLORS[7] },
  { syllable: 'Le', glyph: '▽', ratio: '8/5', cents: '814¢', pitchRole: 'Minor 6th (Inverted Major 3rd)', rhythmRole: '3rd Triplet Beat (2/3 of bar)', color: SOLFEGE_COLORS[8], neonColor: SOLFEGE_NEON_COLORS[8] },
  { syllable: 'La', glyph: '△', ratio: '5/3', cents: '884¢', pitchRole: 'Major 6th (Pastoral consonance)', rhythmRole: '4th Quarter Beat (3/4 of bar)', color: SOLFEGE_COLORS[9], neonColor: SOLFEGE_NEON_COLORS[9] },
  { syllable: 'Te', glyph: '◇', ratio: '7/4', cents: '969¢', pitchRole: 'Harmonic 7th (Natural blues note)', rhythmRole: '5/6th Late Swing Pickup', color: SOLFEGE_COLORS[10], neonColor: SOLFEGE_NEON_COLORS[10] },
  { syllable: 'Ti', glyph: '□', ratio: '15/8', cents: '1088¢', pitchRole: 'Major 7th (Leading tone to Do)', rhythmRole: '11/12th Leading Pickup into Beat 1', color: SOLFEGE_COLORS[11], neonColor: SOLFEGE_NEON_COLORS[11] },
];

type GrooveOverlay = 'hemiola' | 'tresillo' | 'triad' | 'quarters' | 'all';

export const DuMetricCycleDiagram: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [activeGroove, setActiveGroove] = useState<GrooveOverlay>('hemiola');

  const selected = DEGREES[selectedIdx] || DEGREES[0];

  const size = 250;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 92;

  const grooveHighlightIndices: Record<GrooveOverlay, number[]> = {
    all: [],
    hemiola: [0, 7],
    tresillo: [0, 4, 9],
    triad: [0, 4, 7],
    quarters: [0, 3, 6, 9],
  };

  const highlighted = grooveHighlightIndices[activeGroove] || [];

  return (
    <div className="w-full flex flex-col p-3.5 sm:p-4 bg-slate-950/85 border border-slate-800/90 rounded-xl select-none space-y-3 shadow-lg">
      {/* Header with Groove Overlay Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div>
          <span className="text-xs sm:text-sm font-bold text-white font-mono">
            One 12-Hour Clock for Both Notes &amp; Beats (Uniform Solfège)
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Click any clock position or shape overlay to see its dual role in a chord and in a drum bar.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1 self-start sm:self-auto text-[10px] font-mono">
          {([
            { id: 'hemiola', label: '3:2 Fifth / Hemiola' },
            { id: 'triad', label: 'Major Triad' },
            { id: 'tresillo', label: 'Tresillo 3+3+2' },
            { id: 'quarters', label: '4/4 Quarters' },
            { id: 'all', label: 'All 12' },
          ] as const).map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveGroove(g.id)}
              className={`px-2 py-0.5 rounded transition cursor-pointer border ${
                activeGroove === g.id
                  ? 'bg-amber-950/90 border-amber-500 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* SVG Clock Dial */}
        <div className="md:col-span-6 flex justify-center">
          <div className="relative w-60 h-60">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
              <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth={1} />
              <circle cx={cx} cy={cy} r={radius - 22} fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="2 3" strokeWidth={1} />

              {/* Do <-> Fi Mirror Axis */}
              <line x1={cx} y1={cy - radius} x2={cx} y2={cy + radius} stroke="rgba(225, 54, 16, 0.35)" strokeDasharray="3 3" strokeWidth={1.2} />

              {highlighted.length > 1 && (
                <polygon
                  points={highlighted
                    .map((idx) => {
                      const angle = (idx / 12) * Math.PI * 2 - Math.PI / 2;
                      return `${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`;
                    })
                    .join(' ')}
                  fill="rgba(245, 158, 11, 0.14)"
                  stroke="#f59e0b"
                  strokeWidth={1.8}
                />
              )}

              {DEGREES.map((deg, idx) => {
                const angle = (idx / 12) * Math.PI * 2 - Math.PI / 2;
                const nx = cx + Math.cos(angle) * radius;
                const ny = cy + Math.sin(angle) * radius;
                const isSelected = selectedIdx === idx;
                const isGrooveActive = highlighted.includes(idx);

                return (
                  <g key={deg.syllable} onClick={() => setSelectedIdx(idx)} className="cursor-pointer">
                    <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="rgba(255, 255, 255, 0.08)" strokeWidth={1} />
                    {(isSelected || isGrooveActive) && (
                      <circle
                        cx={nx}
                        cy={ny}
                        r={isSelected ? 15 : 13}
                        fill="none"
                        stroke={deg.neonColor}
                        strokeWidth={isSelected ? 2 : 1.5}
                        strokeDasharray={isSelected ? undefined : '2 2'}
                        opacity={0.85}
                      />
                    )}
                    <circle
                      cx={nx}
                      cy={ny}
                      r={isSelected ? 11.5 : 9.5}
                      fill={deg.color}
                      stroke={isSelected ? '#ffffff' : 'rgba(15, 23, 42, 0.8)'}
                      strokeWidth={isSelected ? 2 : 1.2}
                    />
                    <text x={nx} y={ny + 3} textAnchor="middle" fill="#ffffff" fontSize={isSelected ? '9px' : '8px'} fontFamily="monospace" fontWeight="bold">
                      {deg.syllable}
                    </text>
                    <text
                      x={cx + Math.cos(angle) * (radius + 17)}
                      y={cy + Math.sin(angle) * (radius + 17) + 3}
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

              <circle cx={cx} cy={cy} r="17" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth={1} />
              <text x={cx} y={cy + 3} textAnchor="middle" fill="#f8fafc" fontSize="8.5px" fontFamily="monospace" fontWeight="bold">
                {selected.syllable}
              </text>
            </svg>
          </div>
        </div>

        {/* 12-Tone Solfège Matrix */}
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

      {/* Dual Readout Ribbon */}
      <div className="w-full p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 shrink-0" style={{ color: selected.neonColor }}>
            {selected.glyph} {selected.syllable}
          </span>
          <div className="min-w-0 leading-snug">
            <span className="text-purple-300 font-semibold mr-2">Pitch: <strong className="text-white">{selected.pitchRole}</strong></span>
            <span className="text-blue-300 text-[11px]">&bull; Rhythm: <strong className="text-slate-200">{selected.rhythmRole}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 shrink-0 self-end sm:self-auto">
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
