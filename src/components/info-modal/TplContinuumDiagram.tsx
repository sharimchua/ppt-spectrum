import React, { useState } from 'react';

interface Landmark {
  id: string;
  label: string;
  shortLabel: string;
  d: number;
  freqHz: number;
  periodMs: number;
  regime: 'rhythm' | 'transition' | 'pitch';
  tier: 'upper-a' | 'upper-b' | 'lower-a' | 'lower-b';
  description: string;
  musicalRole: string;
}

const LANDMARKS: Landmark[] = [
  {
    id: 'heartbeat',
    label: '60 BPM',
    shortLabel: '60 BPM',
    d: 5.689,
    freqHz: 1.0,
    periodMs: 1000.0,
    regime: 'rhythm',
    tier: 'lower-a',
    description: 'Human resting heartbeat. Individual pulses distinctly separated in time.',
    musicalRole: 'Macro Rhythm & Form',
  },
  {
    id: 'tempo120',
    label: '120 BPM',
    shortLabel: '120 BPM',
    d: 3.689,
    freqHz: 2.0,
    periodMs: 500.0,
    regime: 'rhythm',
    tier: 'upper-a',
    description: 'Standard modern dance and march tempo. Neural spikes track every beat.',
    musicalRole: 'Tactile Beat & Groove',
  },
  {
    id: 'flutter',
    label: '15 Hz (Flutter)',
    shortLabel: '15 Hz',
    d: 0.782,
    freqHz: 15.0,
    periodMs: 66.7,
    regime: 'transition',
    tier: 'upper-a',
    description: 'Flutter Zone: Rapid motorboat sensation. Beats are too fast to count separately.',
    musicalRole: 'Threshold Flutter',
  },
  {
    id: 'tpl',
    label: 'TPL (25.8 Hz)',
    shortLabel: 'TPL 25.8 Hz',
    d: 0.0,
    freqHz: 25.8,
    periodMs: 38.76,
    regime: 'transition',
    tier: 'lower-b',
    description: 'The Temporal-Place Limen (d = 0). The neurological boundary of human hearing.',
    musicalRole: 'Zero DuPeriod Anchor',
  },
  {
    id: 'roughness',
    label: '32 Hz (Roughness)',
    shortLabel: '32 Hz',
    d: -0.31,
    freqHz: 32.0,
    periodMs: 31.25,
    regime: 'transition',
    tier: 'upper-b',
    description: 'Roughness Zone: Sensation of coarse, gritty buzzing as cochlear fusion begins.',
    musicalRole: 'Acoustic Roughness',
  },
  {
    id: 'subbass',
    label: 'C2 (65 Hz)',
    shortLabel: 'C2 · 65 Hz',
    d: -1.333,
    freqHz: 65.4,
    periodMs: 15.29,
    regime: 'pitch',
    tier: 'lower-a',
    description: 'Deep musical bass note. Place coding on basilar membrane produces fused pitch.',
    musicalRole: 'Sub-Bass Root',
  },
  {
    id: 'a440',
    label: 'A4 (440 Hz)',
    shortLabel: 'A4 · 440 Hz',
    d: -4.092,
    freqHz: 440.0,
    periodMs: 2.27,
    regime: 'pitch',
    tier: 'upper-a',
    description: 'Standard concert pitch anchor. Partials fuse into clear instrument timbre.',
    musicalRole: 'Tonal Reference',
  },
  {
    id: 'upper',
    label: '20 kHz (UAH)',
    shortLabel: '20 kHz',
    d: -9.60,
    freqHz: 20000.0,
    periodMs: 0.05,
    regime: 'pitch',
    tier: 'lower-a',
    description: 'Upper Auditory Horizon (UAH). Ceiling of human cochlear sensitivity.',
    musicalRole: 'Auditory Ceiling',
  },
];

export const TplContinuumDiagram: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('tpl');
  const [scaleMode, setScaleMode] = useState<'log' | 'hz'>('log');

  const selected = LANDMARKS.find((l) => l.id === selectedId) || LANDMARKS[3];

  // SVG coordinate projection with expanded canvas
  const svgWidth = 660;
  const svgHeight = 142;
  const padX = 44;
  const lineY = 68;
  const plotW = svgWidth - padX * 2;

  // Log2 d axis spans from +7 (slow rhythm) to -10 (20 kHz treble)
  const dMin = -10.0;
  const dMax = 7.0;

  const getX = (lm: { d: number; freqHz: number }): number => {
    if (scaleMode === 'log') {
      // Faster/pitch to the right (x = -d)
      const norm = (dMax - lm.d) / (dMax - dMin);
      return padX + norm * plotW;
    }
    // Physical Hz scale (logarithmic compressed display for visual clarity)
    const logHzMin = Math.log10(0.8);
    const logHzMax = Math.log10(22000);
    const norm = (Math.log10(Math.max(0.8, lm.freqHz)) - logHzMin) / (logHzMax - logHzMin);
    return padX + norm * plotW;
  };

  const x10Hz = getX({ d: 1.368, freqHz: 10 });
  const x40Hz = getX({ d: -0.632, freqHz: 40 });
  const xTpl = getX(LANDMARKS[3]);

  // Tiered label vertical coordinates
  const getYForTier = (tier: Landmark['tier'], isSelected: boolean): { textY: number; tickEnd: number } => {
    switch (tier) {
      case 'upper-a':
        return { textY: 34, tickEnd: isSelected ? 42 : 46 };
      case 'upper-b':
        return { textY: 46, tickEnd: isSelected ? 52 : 54 };
      case 'lower-a':
        return { textY: 92, tickEnd: isSelected ? 82 : 80 };
      case 'lower-b':
        return { textY: 104, tickEnd: isSelected ? 84 : 80 };
    }
  };

  return (
    <div className="w-full flex flex-col p-3.5 sm:p-4 bg-slate-950/80 border border-slate-800/90 rounded-xl select-none space-y-3.5 shadow-lg">
      {/* Header with Scale Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-white font-mono tracking-wide">
            The Frequency Continuum &amp; The Temporal-Place Limen (TPL)
          </span>
        </div>
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 self-start sm:self-auto text-[10px] font-mono shrink-0">
          <button
            onClick={() => setScaleMode('log')}
            className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
              scaleMode === 'log' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            DuPeriod (Log d)
          </button>
          <button
            onClick={() => setScaleMode('hz')}
            className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
              scaleMode === 'hz' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Physical (Hz)
          </button>
        </div>
      </div>

      {/* Interactive SVG Continuum Ruler with Zero-Overlap Staggered Tiers */}
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[560px] overflow-visible">
          {/* Regime Backgrounds: Top Banners */}
          {/* Rhythm Region */}
          <rect
            x={padX}
            y={8}
            width={Math.max(0, Math.min(x10Hz, x40Hz) - padX)}
            height={16}
            fill="rgba(56, 189, 248, 0.08)"
            rx={3}
          />
          <text x={padX + 6} y={19} fill="#38bdf8" fontSize="8px" fontFamily="monospace" fontWeight="bold">
            ◄ RHYTHM (Temporal Beats)
          </text>

          {/* Shaded 10 Hz - 40 Hz Transition Zone */}
          <rect
            x={Math.min(x10Hz, x40Hz)}
            y={8}
            width={Math.abs(x40Hz - x10Hz)}
            height={svgHeight - 16}
            fill="rgba(225, 54, 16, 0.08)"
            stroke="rgba(225, 54, 16, 0.3)"
            strokeWidth={1}
            strokeDasharray="3 3"
            rx={4}
          />
          <text
            x={(x10Hz + x40Hz) / 2}
            y={19}
            textAnchor="middle"
            fill="#FF4D4D"
            fontSize="7.5px"
            fontFamily="monospace"
            fontWeight="bold"
          >
            10–40 Hz TRANSITION
          </text>

          {/* Pitch Region */}
          <rect
            x={Math.max(x10Hz, x40Hz)}
            y={8}
            width={Math.max(0, svgWidth - padX - Math.max(x10Hz, x40Hz))}
            height={16}
            fill="rgba(192, 132, 252, 0.08)"
            rx={3}
          />
          <text
            x={svgWidth - padX - 6}
            y={19}
            textAnchor="end"
            fill="#c084fc"
            fontSize="8px"
            fontFamily="monospace"
            fontWeight="bold"
          >
            PITCH (Acoustic Tone) ►
          </text>

          {/* Continuum Baseline */}
          <line
            x1={padX}
            y1={lineY}
            x2={svgWidth - padX}
            y2={lineY}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth={1.5}
          />

          {/* TPL Prominent Dividing Line */}
          <line
            x1={xTpl}
            y1={24}
            x2={xTpl}
            y2={lineY + 16}
            stroke="#E13610"
            strokeWidth={2}
            strokeDasharray="4 2"
          />

          {/* Clickable Landmark Pins */}
          {LANDMARKS.map((lm) => {
            const x = getX(lm);
            const isSelected = selectedId === lm.id;
            const isTpl = lm.id === 'tpl';
            const pinColor = isTpl
              ? '#FF4D4D'
              : lm.regime === 'rhythm'
              ? '#38bdf8'
              : lm.regime === 'transition'
              ? '#f59e0b'
              : '#c084fc';

            const { textY, tickEnd } = getYForTier(lm.tier, isSelected);
            const isUpper = lm.tier.startsWith('upper');

            return (
              <g
                key={lm.id}
                onClick={() => setSelectedId(lm.id)}
                className="cursor-pointer transition-transform duration-100"
              >
                {/* Vertical Leader Tick between Baseline and Label */}
                <line
                  x1={x}
                  y1={isUpper ? tickEnd : lineY + (isSelected ? 7 : 4)}
                  x2={x}
                  y2={isUpper ? lineY - (isSelected ? 7 : 4) : tickEnd}
                  stroke={pinColor}
                  strokeWidth={isSelected ? 1.8 : 0.9}
                  strokeDasharray={isSelected ? undefined : '2 2'}
                  opacity={isSelected ? 1 : 0.65}
                />

                {/* Node Bead on Baseline */}
                <circle
                  cx={x}
                  cy={lineY}
                  r={isSelected ? 6 : isTpl ? 5 : 3.5}
                  fill={isSelected ? '#ffffff' : pinColor}
                  stroke={pinColor}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />

                {/* Label Text with Pill Accent for TPL */}
                {isTpl ? (
                  <g>
                    <rect
                      x={x - 40}
                      y={textY - 9}
                      width={80}
                      height={14}
                      rx={3}
                      fill={isSelected ? 'rgba(225, 54, 16, 0.95)' : 'rgba(225, 54, 16, 0.25)'}
                      stroke="#FF4D4D"
                      strokeWidth={1}
                    />
                    <text
                      x={x}
                      y={textY + 1.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="8px"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {lm.shortLabel}
                    </text>
                    <text
                      x={x}
                      y={textY + 16}
                      textAnchor="middle"
                      fill="#fca5a5"
                      fontSize="7px"
                      fontFamily="monospace"
                    >
                      d = 0 · 38.8ms
                    </text>
                  </g>
                ) : (
                  <text
                    x={x}
                    y={textY}
                    textAnchor="middle"
                    fill={isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.75)'}
                    fontSize={isSelected ? '8px' : '7.5px'}
                    fontFamily="monospace"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                  >
                    {lm.shortLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Landmark Quick Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] text-slate-400 font-mono mr-1">Inspect Landmark:</span>
        {LANDMARKS.map((lm) => (
          <button
            key={lm.id}
            onClick={() => setSelectedId(lm.id)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition cursor-pointer border ${
              selectedId === lm.id
                ? 'bg-red-950/90 border-red-500 text-white shadow-sm ring-1 ring-red-400/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {lm.label}
          </button>
        ))}
      </div>

      {/* Fixed-Height Inspector Ribbon */}
      <div className="w-full min-h-[46px] p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              backgroundColor:
                selected.regime === 'rhythm'
                  ? '#38bdf8'
                  : selected.regime === 'transition'
                  ? '#f59e0b'
                  : '#c084fc',
            }}
          />
          <div className="min-w-0">
            <span className="font-bold text-white font-mono mr-2">{selected.label}</span>
            <span className="text-slate-300 text-[11px] leading-relaxed">{selected.description}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 shrink-0 self-end sm:self-auto">
          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
            d: {selected.d.toFixed(2)}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300">
            {selected.periodMs >= 10 ? `${selected.periodMs.toFixed(1)} ms` : `${selected.periodMs.toFixed(2)} ms`}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-purple-300">
            {selected.freqHz.toFixed(1)} Hz
          </span>
        </div>
      </div>
    </div>
  );
};
