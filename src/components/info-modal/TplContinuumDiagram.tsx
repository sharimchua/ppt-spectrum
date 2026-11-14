import React, { useState } from 'react';
import { Bookmark } from 'lucide-react';

interface Landmark {
  id: string;
  label: string;
  subLabel: string;
  d: number;
  freqHz: number;
  periodMs: number;
  regime: 'rhythm' | 'transition' | 'pitch';
  description: string;
}

const LANDMARKS: Landmark[] = [
  {
    id: 'heartbeat',
    label: '60 BPM (Heartbeat)',
    subLabel: '1.0 Hz · d +4.7',
    d: 4.689,
    freqHz: 1.0,
    periodMs: 1000.0,
    regime: 'rhythm',
    description: 'Resting heartbeat (1 beat per second). Your brain easily tracks each individual pulse as tempo.',
  },
  {
    id: 'tempo120',
    label: '120 BPM (Dance Beat)',
    subLabel: '2.0 Hz · d +3.7',
    d: 3.689,
    freqHz: 2.0,
    periodMs: 500.0,
    regime: 'rhythm',
    description: 'Upbeat dance and march tempo (2 beats per second). Felt in the body as groove and metre.',
  },
  {
    id: 'flutter',
    label: '15 Hz (Spoke Flutter)',
    subLabel: '15 Hz · d +0.8',
    d: 0.782,
    freqHz: 15.0,
    periodMs: 66.7,
    regime: 'transition',
    description: 'Flutter Zone (10–20 Hz): Too fast to tap your foot to, like a playing card whirring in bicycle spokes.',
  },
  {
    id: 'tpl',
    label: '25.8 Hz (TPL Horizon)',
    subLabel: 'Horizon · d = 0',
    d: 0.0,
    freqHz: 25.8,
    periodMs: 38.76,
    regime: 'transition',
    description: 'The Auditory Horizon (Temporal-Place Limen, d = 0): Where separate clicks fuse into a continuous low hum.',
  },
  {
    id: 'roughness',
    label: '32 Hz (Sub-Bass Buzz)',
    subLabel: '32 Hz · d −0.3',
    d: -0.31,
    freqHz: 32.0,
    periodMs: 31.25,
    regime: 'transition',
    description: 'Roughness Zone (20–40 Hz): Pitch emerges as a gritty, tactile sub-bass growl.',
  },
  {
    id: 'subbass',
    label: 'C2 · 65 Hz (Deep Bass)',
    subLabel: '65.4 Hz · d −1.3',
    d: -1.342,
    freqHz: 65.4,
    periodMs: 15.29,
    regime: 'pitch',
    description: 'Deep bass guitar note. The inner ear now reads vibration location as a steady musical pitch.',
  },
  {
    id: 'do5',
    label: 'Do−5 · 413 Hz (Anchor)',
    subLabel: '412.8 Hz · d −4.0',
    d: -4.0,
    freqHz: 412.8,
    periodMs: 2.42,
    regime: 'pitch',
    description: 'Pure PPT Pitch Anchor (25.8 Hz × 16, near Baroque A415)—4 octave doublings above the 25.8 Hz horizon.',
  },
  {
    id: 'highC',
    label: 'C7 · 2.1 kHz (Piccolo)',
    subLabel: '2093 Hz · d −6.3',
    d: -6.342,
    freqHz: 2093.0,
    periodMs: 0.48,
    regime: 'pitch',
    description: 'High soprano / piccolo register—over 6 octave doublings faster than the 25.8 Hz horizon.',
  },
];

const D_MAX = 7.0;
const D_MIN = -7.0;

function getTrackPct(d: number): number {
  const norm = (D_MAX - d) / (D_MAX - D_MIN);
  return Math.max(2, Math.min(98, norm * 100));
}

export const TplContinuumDiagram: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('tpl');

  const active = LANDMARKS.find((lm) => lm.id === selectedId) || LANDMARKS[3];
  const bpm = active.freqHz * 60;

  const pct10Hz = getTrackPct(1.368);
  const pct40Hz = getTrackPct(-0.632);
  const pctTpl = getTrackPct(0);
  const pctActive = getTrackPct(active.d);

  const crossoverLeft = Math.min(pct10Hz, pct40Hz);
  const crossoverWidth = Math.max(6, Math.abs(pct40Hz - pct10Hz));

  return (
    <div className="w-full flex flex-col p-3.5 sm:p-4 bg-slate-950/85 border border-slate-800/90 rounded-xl select-none space-y-3 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-white font-mono">
            Speed Continuum Bookmarks (d = +7 Rhythm ↔ d = 0 Horizon ↔ d = −7 Pitch)
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          Tap any landmark bookmark to compare speeds
        </span>
      </div>

      {/* Symmetrical d = +7 to d = -7 Continuum Bar */}
      <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800/80 space-y-2.5">
        {/* 3 Regime Labels Header */}
        <div className="grid grid-cols-3 gap-1 text-[9px] sm:text-[10px] font-mono font-bold">
          <div className="text-sky-400 truncate">◄ RHYTHM (d +7..+1)</div>
          <div className="text-center text-red-400 truncate">10–40 Hz CROSSOVER</div>
          <div className="text-right text-purple-400 truncate">PITCH (d −1..−7) ►</div>
        </div>

        {/* Interactive Visual Continuum Track */}
        <div className="relative w-full h-14 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
          {/* Rhythm Zone tint */}
          <div
            className="absolute inset-y-0 left-0 bg-sky-500/10"
            style={{ width: `${crossoverLeft}%` }}
          />
          {/* 10-40 Hz Crossover Zone tint */}
          <div
            className="absolute inset-y-0 bg-red-500/15 border-x border-dashed border-red-500/40"
            style={{ left: `${crossoverLeft}%`, width: `${crossoverWidth}%` }}
          />
          {/* Pitch Zone tint */}
          <div
            className="absolute inset-y-0 right-0 bg-purple-500/10"
            style={{ left: `${crossoverLeft + crossoverWidth}%` }}
          />

          {/* Integer d Scale Ticks (+6, +4, +2, 0, -2, -4, -6) */}
          {[6, 4, 2, 0, -2, -4, -6].map((tickD) => {
            const pct = getTrackPct(tickD);
            return (
              <div
                key={tickD}
                className="absolute bottom-0.5 -translate-x-1/2 text-[8px] font-mono text-slate-600 pointer-events-none"
                style={{ left: `${pct}%` }}
              >
                {tickD > 0 ? `+${tickD}` : tickD}
              </div>
            );
          })}

          {/* Horizontal Centre Axis Line */}
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-0.5 bg-slate-700/80" />

          {/* 25.8 Hz TPL Horizon Vertical Line (Dead Centre at 50%) */}
          <div
            className="absolute inset-y-0 w-0.5 border-l-2 border-dashed border-red-500/80"
            style={{ left: `${pctTpl}%` }}
            title="Auditory Horizon (25.8 Hz, d = 0)"
          >
            <span className="absolute top-0.5 -translate-x-1/2 px-1 py-0.2 rounded bg-red-950/90 border border-red-500/40 text-[8px] font-mono text-red-300 whitespace-nowrap">
              d=0 · 25.8Hz
            </span>
          </div>

          {/* Tappable Landmark Dots Along Track */}
          {LANDMARKS.map((lm) => {
            const pct = getTrackPct(lm.d);
            const isSelected = lm.id === active.id;
            const dotColor =
              lm.id === 'tpl'
                ? '#ef4444'
                : lm.regime === 'rhythm'
                  ? '#38bdf8'
                  : lm.regime === 'transition'
                    ? '#f59e0b'
                    : '#c084fc';
            return (
              <button
                key={lm.id}
                type="button"
                onClick={() => setSelectedId(lm.id)}
                style={{ left: `${pct}%` }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 p-1.5 group cursor-pointer focus:outline-none z-10"
                title={`${lm.label} (${lm.subLabel})`}
              >
                <span
                  className="block rounded-full transition-transform group-hover:scale-125"
                  style={{
                    width: isSelected ? '13px' : '9px',
                    height: isSelected ? '13px' : '9px',
                    backgroundColor: isSelected ? '#fbbf24' : dotColor,
                    border: isSelected ? '2px solid #ffffff' : `2px solid ${dotColor}`,
                  }}
                />
              </button>
            );
          })}

          {/* Active Bookmark Indicator Line */}
          <div
            className="absolute inset-y-0 pointer-events-none transition-all duration-200"
            style={{ left: `${pctActive}%` }}
          >
            <div className="absolute inset-y-0 -translate-x-1/2 w-0.5 bg-amber-400/80" />
          </div>
        </div>

        {/* Responsive 2x4 / 4x2 Landmark Bookmark Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
          {LANDMARKS.map((lm) => {
            const isSelected = lm.id === active.id;
            const badgeAccent =
              lm.id === 'tpl'
                ? 'border-red-500/40 text-red-300'
                : lm.regime === 'rhythm'
                  ? 'border-sky-500/30 text-sky-300'
                  : lm.regime === 'transition'
                    ? 'border-amber-500/30 text-amber-300'
                    : 'border-purple-500/30 text-purple-300';
            return (
              <button
                key={lm.id}
                type="button"
                onClick={() => setSelectedId(lm.id)}
                className={`flex flex-col items-start justify-between px-2.5 py-1.5 rounded-lg text-left font-mono transition cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                    : `bg-slate-950/90 hover:bg-slate-900 ${badgeAccent}`
                }`}
              >
                <span className="text-[10px] font-bold truncate w-full flex items-center gap-1">
                  <Bookmark className="w-2.5 h-2.5 shrink-0 fill-current" />
                  <span className="truncate">{lm.label}</span>
                </span>
                <span className="text-[9px] text-slate-400 truncate w-full">{lm.subLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Readout Ribbon */}
      <div className="w-full p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-start sm:items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 sm:mt-0"
            style={{
              backgroundColor:
                active.regime === 'rhythm' ? '#38bdf8' : active.regime === 'transition' ? '#f59e0b' : '#c084fc',
            }}
          />
          <div className="min-w-0">
            <span className="font-bold text-white font-mono mr-2">{active.label}:</span>
            <span className="text-slate-300 text-[11px] leading-relaxed">{active.description}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono shrink-0 self-start sm:self-auto">
          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300" title="DuPeriod offset from 25.8 Hz">
            d: {active.d >= 0 ? `+${active.d.toFixed(2)}` : active.d.toFixed(2)}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300">
            {active.d > 0.3 ? `${bpm.toFixed(0)} BPM (${active.freqHz.toFixed(1)} Hz)` : `${active.freqHz < 100 ? active.freqHz.toFixed(1) : active.freqHz.toFixed(0)} Hz`}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-purple-300">
            {active.periodMs >= 10 ? `${active.periodMs.toFixed(1)} ms` : `${active.periodMs.toFixed(2)} ms`}
          </span>
        </div>
      </div>
    </div>
  );
};
