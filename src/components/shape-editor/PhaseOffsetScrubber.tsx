/**
 * Continuous DuMetric Phase Offset Scrubber with Autocomplete Offset Pills.
 * Clamped strictly to [0, 1] across a single DuMetric cycle:
 * - Touch / coarse pointer: rotary drag around the cycle dial (1 turn = 1 cycle).
 * - Mouse / desktop: continuous relative horizontal drag (Shift for fine control) or wheel.
 * Australian English spelling maintained.
 */

import React, { useRef, useState, useEffect } from 'react';
import { DU_METRIC_OFFSETS, resolveDuMetricOffsetToken } from '../../core/shape';
import { SOLFEGE_NEON_COLORS } from '../../core/ppt-constants';

export interface PhaseOffsetScrubberProps {
  phaseOffset: number;
  onChange: (phaseOffset: number, offsetToken: string) => void;
  label?: string;
}

export const PhaseOffsetScrubber: React.FC<PhaseOffsetScrubberProps> = ({
  phaseOffset,
  onChange,
  label = 'DuMetric Offset',
}) => {
  const clamped = Math.max(0, Math.min(1, phaseOffset || 0));
  const descriptor = resolveDuMetricOffsetToken(clamped);

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
    }
  }, []);

  const frac = ((clamped % 1) + 1) % 1;
  const semitoneIdx = Math.floor(frac * 12) % 12;
  const accentColor = SOLFEGE_NEON_COLORS[semitoneIdx] || '#fbbf24';

  const nearbyOffsets = [...DU_METRIC_OFFSETS]
    .sort((a, b) => Math.abs(clamped - a.phase) - Math.abs(clamped - b.phase))
    .slice(0, 5);

  const dialRef = useRef<SVGSVGElement | null>(null);
  const dragModeRef = useRef<'rotary' | 'horizontal' | null>(null);
  const lastAngleRef = useRef<number | null>(null);
  const lastClientXRef = useRef<number | null>(null);
  const accumPhaseRef = useRef<number>(clamped);

  const emitPhase = (nextPhase: number) => {
    const safe = Math.max(0, Math.min(1, nextPhase));
    const token = resolveDuMetricOffsetToken(safe).token;
    onChange(safe, token);
  };

  const handleDialPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    accumPhaseRef.current = clamped;
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
      accumPhaseRef.current = Math.max(0, Math.min(1, accumPhaseRef.current + delta / (Math.PI * 2)));
      emitPhase(accumPhaseRef.current);
      return;
    }

    if (lastClientXRef.current === null) return;
    const dx = e.clientX - lastClientXRef.current;
    lastClientXRef.current = e.clientX;
    if (dx === 0) return;
    const pxPerCycle = e.shiftKey ? 720 : 200;
    accumPhaseRef.current = Math.max(0, Math.min(1, accumPhaseRef.current + dx / pxPerCycle));
    emitPhase(accumPhaseRef.current);
  };

  const handleDialPointerUp = () => {
    dragModeRef.current = null;
    lastAngleRef.current = null;
    lastClientXRef.current = null;
  };

  const dialAngleDeg = clamped * 360 - 90;
  const dialRad = (dialAngleDeg * Math.PI) / 180;
  const handX = 22 + 14 * Math.cos(dialRad);
  const handY = 22 + 14 * Math.sin(dialRad);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-slate-400">{label}</span>
        <span className="font-bold" style={{ color: accentColor }}>
          {descriptor.glyph} {descriptor.token}{' '}
          <span className="text-slate-400 font-normal">
            ({descriptor.fraction} · {Math.round(clamped * 100)}%)
          </span>
        </span>
      </div>

      {/* Single-line Cycle Dial + Nearby DuMetric Offset Pills */}
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
            emitPhase(clamped + dir * step);
          }}
          className={`touch-none select-none shrink-0 ${
            isTouchDevice ? 'cursor-grab active:cursor-grabbing' : 'cursor-ew-resize'
          }`}
        >
          <title>
            {isTouchDevice
              ? 'Rotate cycle dial to scrub DuMetric phase offset (0–1)'
              : 'Drag horizontally or scroll to scrub DuMetric phase offset (0–1, Shift for fine control)'}
          </title>
          <circle cx={22} cy={22} r={19} fill="#090d16" stroke="#1e293b" strokeWidth={1.75} />
          <circle cx={22} cy={22} r={14} fill="none" stroke="rgba(148,163,184,0.22)" strokeDasharray="2 3" />
          <line x1={22} y1={22} x2={handX} y2={handY} stroke={accentColor} strokeWidth={2} strokeLinecap="round" />
          <circle cx={handX} cy={handY} r={3} fill={accentColor} />
          <text x={22} y={25} textAnchor="middle" fill="#e2e8f0" fontSize={8.5} fontFamily="monospace" fontWeight="bold">
            {descriptor.token}
          </text>
        </svg>

        <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1 py-0.5">
          {nearbyOffsets.map((off) => {
            const isSnapped = Math.abs(clamped - off.phase) <= 0.015;
            return (
              <button
                key={off.token}
                type="button"
                onClick={() => onChange(off.phase, off.token)}
                title={`${off.glyph} ${off.token} (${off.fraction}) — ${off.description}`}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0 transition cursor-pointer flex items-baseline gap-1 ${
                  isSnapped
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                    : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-amber-500/50 hover:text-white'
                }`}
              >
                <span className="font-semibold">{off.glyph} {off.token}</span>
                <span className="text-[9px] text-slate-400 font-normal">{off.fraction}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
