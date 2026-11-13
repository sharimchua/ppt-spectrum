/**
 * Continuous DuMetric Octave Scrubber with Autocomplete Ratio Snap Pills.
 * Horizontal linear scrub bar on desktop, rotary pitch-clock dial on touch/mobile.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Ratio } from '../../core/types';
import {
  ratioToOctaves,
  octavesToRatio,
  formatRatioShort,
  getNearbyRatioSuggestions,
} from '../../core/ratio-suggestions';
import { SOLFEGE_NEON_COLORS } from '../../core/ppt-constants';

export interface RatioScrubberProps {
  ratio: Ratio;
  onChange: (ratio: Ratio) => void;
  minOctaves?: number;
  maxOctaves?: number;
  label?: string;
}

export const RatioScrubber: React.FC<RatioScrubberProps> = ({
  ratio,
  onChange,
  minOctaves = -1,
  maxOctaves = 4,
  label,
}) => {
  const octValue = Math.max(minOctaves, Math.min(maxOctaves, ratioToOctaves(ratio)));
  const suggestions = getNearbyRatioSuggestions(octValue, 5, minOctaves, maxOctaves);

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
    }
  }, []);

  // Solfège colour for current octave fraction
  const frac = ((octValue % 1) + 1) % 1;
  const semitoneIdx = Math.floor(frac * 12) % 12;
  const accentColor = SOLFEGE_NEON_COLORS[semitoneIdx] || '#38bdf8';
  const octBand = Math.floor(octValue);
  const centsInOct = Math.round(frac * 1200);

  // Desktop horizontal scrub bar
  const trackRef = useRef<HTMLDivElement | null>(null);
  const updateFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const norm = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    const nextOct = minOctaves + norm * (maxOctaves - minOctaves);
    onChange(octavesToRatio(nextOct));
  };

  // Mobile rotary dial drag
  const dialRef = useRef<SVGSVGElement | null>(null);
  const lastAngleRef = useRef<number | null>(null);
  const accumOctRef = useRef<number>(octValue);

  const handleDialPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    lastAngleRef.current = Math.atan2(e.clientY - cy, e.clientX - cx);
    accumOctRef.current = octValue;
  };

  const handleDialPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (lastAngleRef.current === null || !dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
    let delta = angle - lastAngleRef.current;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    lastAngleRef.current = angle;
    accumOctRef.current = Math.max(
      minOctaves,
      Math.min(maxOctaves, accumOctRef.current + delta / (Math.PI * 2))
    );
    onChange(octavesToRatio(accumOctRef.current));
  };

  const handleDialPointerUp = () => {
    lastAngleRef.current = null;
  };

  const progressPct = ((octValue - minOctaves) / (maxOctaves - minOctaves)) * 100;
  const dialAngleDeg = frac * 360 - 90;
  const dialRad = (dialAngleDeg * Math.PI) / 180;
  const handX = 36 + 24 * Math.cos(dialRad);
  const handY = 36 + 24 * Math.sin(dialRad);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-mono">
        {label && <span className="text-slate-400">{label}</span>}
        <span className="font-bold" style={{ color: accentColor }}>
          {formatRatioShort(ratio)}{' '}
          <span className="text-slate-400 font-normal">
            (oct {octBand >= 0 ? `+${octBand}` : octBand} · {centsInOct}¢)
          </span>
        </span>
      </div>

      {isTouchDevice ? (
        /* Mobile Rotary Pitch-Clock Dial (1 turn = 1 DuMetric octave) */
        <div className="flex items-center gap-3">
          <svg
            ref={dialRef}
            width={72}
            height={72}
            viewBox="0 0 72 72"
            onPointerDown={handleDialPointerDown}
            onPointerMove={handleDialPointerMove}
            onPointerUp={handleDialPointerUp}
            onPointerCancel={handleDialPointerUp}
            className="touch-none select-none cursor-grab active:cursor-grabbing shrink-0"
          >
            <circle cx={36} cy={36} r={30} fill="#090d16" stroke="#1e293b" strokeWidth={2} />
            <circle cx={36} cy={36} r={24} fill="none" stroke="rgba(148,163,184,0.2)" strokeDasharray="2 4" />
            <line x1={36} y1={36} x2={handX} y2={handY} stroke={accentColor} strokeWidth={2.5} strokeLinecap="round" />
            <circle cx={handX} cy={handY} r={4.5} fill={accentColor} />
            <text x={36} y={40} textAnchor="middle" fill="#e2e8f0" fontSize={10} fontFamily="monospace" fontWeight="bold">
              {octBand >= 0 ? `+${octBand}` : octBand}
            </text>
          </svg>
          <span className="text-[10px] text-slate-400 leading-snug">
            Rotate dial to scrub continuously across DuMetric octaves, or tap a ratio pill to snap.
          </span>
        </div>
      ) : (
        /* Desktop Horizontal Linear Scrub Bar */
        <div
          ref={trackRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            updateFromClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) updateFromClientX(e.clientX);
          }}
          onWheel={(e) => {
            e.preventDefault();
            const step = e.shiftKey ? 0.005 : 1 / 24;
            const dir = e.deltaY < 0 || e.deltaX > 0 ? 1 : -1;
            const next = Math.max(minOctaves, Math.min(maxOctaves, octValue + dir * step));
            onChange(octavesToRatio(next));
          }}
          className="relative h-6 rounded-md bg-slate-950 border border-slate-800 cursor-ew-resize select-none overflow-hidden"
          title="Drag horizontally or scroll to scrub DuMetric octaves (Shift+scroll for fine cents)"
        >
          {/* Octave ticks */}
          {Array.from({ length: maxOctaves - minOctaves + 1 }, (_, i) => minOctaves + i).map((tickOct) => {
            const leftPct = ((tickOct - minOctaves) / (maxOctaves - minOctaves)) * 100;
            return (
              <div
                key={tickOct}
                style={{ left: `${leftPct}%` }}
                className="absolute top-0 bottom-0 border-l border-slate-700/70 pointer-events-none"
              >
                <span className="text-[8px] font-mono text-slate-500 pl-0.5 leading-none">
                  {tickOct === 0 ? '1x' : `${Math.pow(2, tickOct)}x`}
                </span>
              </div>
            );
          })}

          {/* Active fill & thumb */}
          <div
            className="absolute top-0 bottom-0 left-0 opacity-20 pointer-events-none"
            style={{ width: `${progressPct}%`, backgroundColor: accentColor }}
          />
          <div
            className="absolute top-0.5 bottom-0.5 w-1.5 -ml-0.5 rounded-full pointer-events-none shadow"
            style={{ left: `${progressPct}%`, backgroundColor: accentColor }}
          />
        </div>
      )}

      {/* Autocomplete Snap Pills */}
      <div className="flex flex-wrap items-center gap-1">
        {suggestions.map((sug) => {
          const isSnapped = Math.abs(sug.distCents) <= 2 && ratio.kind === 'rational';
          return (
            <button
              key={sug.label}
              type="button"
              onClick={() => onChange(sug.ratio)}
              title={`${sug.name} (${sug.distCents >= 0 ? `+${sug.distCents}` : sug.distCents}¢)`}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition cursor-pointer ${
                isSnapped
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                  : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-cyan-500/50 hover:text-white'
              }`}
            >
              {sug.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
