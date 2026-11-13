/**
 * Continuous DuMetric Octave Scrubber with Autocomplete Ratio Snap Pills.
 * Compact single-row pitch-clock dial + snap pills on both mobile and desktop:
 * - Touch / coarse pointer: rotary drag around the pitch-clock dial (1 turn = 1 octave).
 * - Mouse / desktop: continuous relative horizontal drag (Shift for fine cents) or wheel.
 * Australian English spelling maintained.
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
  const suggestions = getNearbyRatioSuggestions(octValue, 6, minOctaves, maxOctaves);

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

  // Unified dial pointer drag: rotary on touch, relative horizontal on mouse/desktop
  const dialRef = useRef<SVGSVGElement | null>(null);
  const dragModeRef = useRef<'rotary' | 'horizontal' | null>(null);
  const lastAngleRef = useRef<number | null>(null);
  const lastClientXRef = useRef<number | null>(null);
  const accumOctRef = useRef<number>(octValue);

  const handleDialPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    accumOctRef.current = octValue;
    const useRotary = e.pointerType === 'touch' || isTouchDevice;
    if (useRotary) {
      dragModeRef.current = 'rotary';
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      lastAngleRef.current = Math.atan2(e.clientY - cy, e.clientX - cx);
    } else {
      dragModeRef.current = 'horizontal';
      lastClientXRef.current = e.clientX;
    }
  };

  const handleDialPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragModeRef.current || !dialRef.current) return;

    if (dragModeRef.current === 'rotary') {
      if (lastAngleRef.current === null) return;
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
      return;
    }

    if (lastClientXRef.current === null) return;
    const dx = e.clientX - lastClientXRef.current;
    lastClientXRef.current = e.clientX;
    if (dx === 0) return;
    // Continuous relative scrub: 200px = 1 octave (~6¢/px), Shift = 720px = 1 octave (~1.7¢/px)
    const pxPerOctave = e.shiftKey ? 720 : 200;
    accumOctRef.current = Math.max(
      minOctaves,
      Math.min(maxOctaves, accumOctRef.current + dx / pxPerOctave)
    );
    onChange(octavesToRatio(accumOctRef.current));
  };

  const handleDialPointerUp = () => {
    dragModeRef.current = null;
    lastAngleRef.current = null;
    lastClientXRef.current = null;
  };

  const dialAngleDeg = frac * 360 - 90;
  const dialRad = (dialAngleDeg * Math.PI) / 180;
  const handX = 22 + 14 * Math.cos(dialRad);
  const handY = 22 + 14 * Math.sin(dialRad);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-mono">
        {label && <span className="text-slate-400">{label}</span>}
        <span className="font-bold" style={{ color: accentColor }}>
          {formatRatioShort(ratio)}{' '}
          <span className="text-slate-400 font-normal">
            (oct {octBand >= 0 ? `+${octBand}` : octBand} · {centsInOct}¢)
          </span>
        </span>
      </div>

      {/* Single-line Pitch-Clock Dial + Autocomplete Snap Pills */}
      <div className="flex items-center gap-2 min-w-0">
        <svg
          ref={dialRef}
          width={44}
          height={44}
          viewBox="0 0 44 44"
          onPointerDown={handleDialPointerDown}
          onPointerMove={handleDialPointerMove}
          onPointerUp={handleDialPointerUp}
          onPointerCancel={handleDialPointerUp}
          onWheel={(e) => {
            e.preventDefault();
            const step = e.shiftKey ? 0.005 : 1 / 24;
            const dir = e.deltaY < 0 || e.deltaX > 0 ? 1 : -1;
            const next = Math.max(minOctaves, Math.min(maxOctaves, octValue + dir * step));
            onChange(octavesToRatio(next));
          }}
          className={`touch-none select-none shrink-0 ${
            isTouchDevice ? 'cursor-grab active:cursor-grabbing' : 'cursor-ew-resize'
          }`}
        >
          <title>
            {isTouchDevice
              ? 'Rotate pitch-clock dial to scrub DuMetric octaves'
              : 'Drag horizontally or scroll to scrub DuMetric octaves (Shift for fine cents)'}
          </title>
          <circle cx={22} cy={22} r={19} fill="#090d16" stroke="#1e293b" strokeWidth={1.75} />
          <circle cx={22} cy={22} r={14} fill="none" stroke="rgba(148,163,184,0.22)" strokeDasharray="2 3" />
          <line x1={22} y1={22} x2={handX} y2={handY} stroke={accentColor} strokeWidth={2} strokeLinecap="round" />
          <circle cx={handX} cy={handY} r={3} fill={accentColor} />
          <text x={22} y={25} textAnchor="middle" fill="#e2e8f0" fontSize={9} fontFamily="monospace" fontWeight="bold">
            {octBand >= 0 ? `+${octBand}` : octBand}
          </text>
        </svg>

        {/* Autocomplete Snap Pills (wrapped beside the dial) */}
        <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1 py-0.5">
          {suggestions.map((sug) => {
            const isSnapped = Math.abs(sug.distCents) <= 2 && sug.ratio.kind === ratio.kind;
            return (
              <button
                key={`${sug.label}-${sug.shortTag}`}
                type="button"
                onClick={() => onChange(sug.ratio)}
                title={`${sug.name} (${sug.distCents >= 0 ? `+${sug.distCents}` : sug.distCents}¢)`}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0 transition cursor-pointer flex items-baseline gap-1 ${
                  isSnapped
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                    : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-cyan-500/50 hover:text-white'
                }`}
              >
                <span className="font-semibold">{sug.label}</span>
                <span className="text-[9px] text-slate-400 font-normal">{sug.shortTag}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
