import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft } from 'lucide-react';
import { Scene, SpanView } from '../core/types';
import { BookmarkSettings } from './bookmarks-storage';
import { dToFreq, dToBpm, dToPeriodMs, freqToPitchRegister, resolveDuPeriodAddress } from '../core/axis';
import { buildRadialSegments, RadialWedgeSegment } from './radial-menu-segments';
import { FilterControlParam } from './hooks/useFilters';

export interface RadialMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  scene: Scene;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onUpdatePlacementD: (d: number) => void;
  onUpdateFilterParams?: (params: Partial<SpanView>) => void;
  onToggleFilter: () => void;
  onCycleFilterMode: () => void;
  onOpenLibrary: () => void;
  onOpenCapture: () => void;
  onOpenSettings: () => void;
  onOpenFilters?: () => void;
  isOscillating: boolean;
  onToggleOscillate: () => void;
  bookmarks: BookmarkSettings;
  onSetBookmarkA: () => void;
  onSetBookmarkB: () => void;
  onJumpBookmarkA: () => void;
  onJumpBookmarkB: () => void;
  /** Custom spawn point (under thumb), or centred in viewport if omitted */
  anchorPos?: { x: number; y: number } | null;
  /** Switch to full-canvas Filter Edit mode (closing radial menu) */
  onEnterFilterEditMode?: (param?: FilterControlParam) => void;
}

type SubMenuDirection = 'none' | 'north' | 'east' | 'west';

/**
 * Generates an SVG path string for an annular sector (radial pie wedge)
 * centred at (0, 0) between rInner and rOuter from startDeg to endDeg.
 */
function describeAnnularSector(
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number,
  gapDeg: number = 3.5
): string {
  const sRad = ((startDeg + gapDeg / 2) * Math.PI) / 180;
  const eRad = ((endDeg - gapDeg / 2) * Math.PI) / 180;
  const largeArc = endDeg - startDeg - gapDeg > 180 ? 1 : 0;

  const x1Out = rOuter * Math.cos(sRad);
  const y1Out = rOuter * Math.sin(sRad);
  const x2Out = rOuter * Math.cos(eRad);
  const y2Out = rOuter * Math.sin(eRad);

  const x1In = rInner * Math.cos(eRad);
  const y1In = rInner * Math.sin(eRad);
  const x2In = rInner * Math.cos(sRad);
  const y2In = rInner * Math.sin(sRad);

  return [
    `M ${x1Out.toFixed(2)} ${y1Out.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2Out.toFixed(2)} ${y2Out.toFixed(2)}`,
    `L ${x1In.toFixed(2)} ${y1In.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x2In.toFixed(2)} ${y2In.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export const RadialMenuOverlay: React.FC<RadialMenuOverlayProps> = ({
  isOpen,
  onClose,
  scene,
  isPlaying,
  onTogglePlay,
  onUpdatePlacementD,
  onUpdateFilterParams: _onUpdateFilterParams,
  onToggleFilter,
  onCycleFilterMode,
  onOpenLibrary,
  onOpenCapture,
  onOpenSettings,
  onOpenFilters,
  isOscillating,
  onToggleOscillate,
  bookmarks,
  onSetBookmarkA,
  onSetBookmarkB,
  onJumpBookmarkA,
  onJumpBookmarkB,
  anchorPos,
  onEnterFilterEditMode,
}) => {
  const [activeSubMenu, setActiveSubMenu] = useState<SubMenuDirection>('none');
  const [hoveredWedgeId, setHoveredWedgeId] = useState<string | null>(null);

  // Rotary jog wheel tracking
  const [jogAngle, setJogAngle] = useState(-Math.PI / 2);
  const [isScrubbingRim, setIsScrubbingRim] = useState(false);
  const lastAngleRef = useRef<number | null>(null);

  const activePlacement = scene.placements[0];
  const currentD = activePlacement ? activePlacement.d : 0;
  const currentDRef = useRef(currentD);
  currentDRef.current = currentD;

  const freqHz = dToFreq(currentD, scene.anchors.tplFrequencyHz);
  const bpm = dToBpm(currentD, scene.anchors.tplFrequencyHz);
  const pitchInfo = freqToPitchRegister(freqHz, scene.anchors.tuningA4Hz);
  const addr = resolveDuPeriodAddress(currentD);

  // Reset menu sub-states upon opening
  useEffect(() => {
    if (isOpen) {
      setActiveSubMenu('none');
      setHoveredWedgeId(null);
      setIsScrubbingRim(false);
      lastAngleRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  // Dial dimensions: 312px total diameter (menuRadius = 156px)
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 393;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 852;
  const menuRadius = 156;
  const rInner = 48;
  const rOuter = 136;
  const rRimTrack = 147;
  const padding = 12;

  // Spawn centred under thumb, clamped only to screen viewport bounds
  const cx = anchorPos
    ? Math.max(menuRadius + padding, Math.min(viewportW - menuRadius - padding, anchorPos.x))
    : viewportW / 2;
  const cy = anchorPos
    ? Math.max(menuRadius + padding + 44, Math.min(viewportH - menuRadius - padding - 24, anchorPos.y))
    : viewportH / 2;

  // Outer rim rotary scrubbing handlers
  const handleRimPointerDown = (e: React.PointerEvent<SVGElement | HTMLDivElement>) => {
    e.stopPropagation();
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const initialAngle = Math.atan2(dy, dx);
    lastAngleRef.current = initialAngle;
    setJogAngle(initialAngle);
    setIsScrubbingRim(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lastAngleRef.current === null || !isScrubbingRim) return;
    e.stopPropagation();
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < 40) return;

    const currentAngle = Math.atan2(dy, dx);
    let deltaAngle = currentAngle - lastAngleRef.current;
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
    lastAngleRef.current = currentAngle;
    setJogAngle(currentAngle);

    // 1 turn = -1.5 DuPeriods (clockwise = faster tempo / higher pitch)
    const deltaD = -(deltaAngle / (2 * Math.PI)) * 1.5;
    const targetD = Math.max(-7, Math.min(7, currentDRef.current + deltaD));
    onUpdatePlacementD(targetD);
    currentDRef.current = targetD;
  };

  const handlePointerUp = () => {
    lastAngleRef.current = null;
    setIsScrubbingRim(false);
  };

  // Build radial wedge segments for the current stage via extracted builder
  const segments: RadialWedgeSegment[] = buildRadialSegments({
    activeSubMenu,
    scene,
    isPlaying,
    isOscillating,
    currentD: currentDRef.current,
    bookmarks,
    onSelectSubMenu: (sub) => setActiveSubMenu(sub),
    onOpenLibrary,
    onOpenCapture,
    onOpenSettings,
    onOpenFilters,
    onTogglePlay,
    onToggleOscillate,
    onJumpBookmarkA,
    onJumpBookmarkB,
    onSetBookmarkA,
    onSetBookmarkB,
    onToggleFilter,
    onCycleFilterMode,
    onEnterFilterEditMode,
    onClose,
  });

  const rMidLabel = (rInner + rOuter) / 2;
  const beadX = Math.cos(jogAngle) * rRimTrack;
  const beadY = Math.sin(jogAngle) * rRimTrack;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-hidden select-none animate-in fade-in duration-150 touch-none pointer-events-auto"
      onClick={onClose}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Top Status Bar & Close Button */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-50 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/95 border border-slate-700/80 shadow-lg text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-bold text-white uppercase">
            {activeSubMenu === 'none'
              ? 'Radial Continuum Menu'
              : activeSubMenu === 'north'
              ? 'Library & Mic Sampling'
              : activeSubMenu === 'east'
              ? 'Playback & Bookmarks'
              : 'Filter & Bookmarks'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="pointer-events-auto p-2 rounded-full bg-slate-900/95 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition cursor-pointer shadow-lg"
          title="Close Radial Menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Radial Wheel Container (Top-Layer Fixed Coordinates) */}
      <div
        className="absolute animate-in zoom-in-95 duration-150 pointer-events-auto"
        style={{
          left: `${cx}px`,
          top: `${cy}px`,
          transform: 'translate(-50%, -50%)',
          width: `${menuRadius * 2}px`,
          height: `${menuRadius * 2}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* SVG Annular Wedge Sectors & Outer Rotary Scrub Rim */}
        <svg
          width={menuRadius * 2}
          height={menuRadius * 2}
          viewBox={`${-menuRadius} ${-menuRadius} ${menuRadius * 2} ${menuRadius * 2}`}
          className="block w-full h-full overflow-visible drop-shadow-[0_0_35px_rgba(0,0,0,0.85)]"
        >
          {/* Outer Rotary Scrub Rim Track */}
          <circle
            cx={0}
            cy={0}
            r={rRimTrack}
            fill="none"
            stroke="rgba(15, 23, 42, 0.9)"
            strokeWidth={18}
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={handleRimPointerDown}
          />
          <circle
            cx={0}
            cy={0}
            r={rRimTrack}
            fill="none"
            stroke="rgba(225, 54, 16, 0.45)"
            strokeWidth={2}
            strokeDasharray="4 6"
            className="pointer-events-none"
          />
          <circle
            cx={0}
            cy={0}
            r={menuRadius - 1}
            fill="none"
            stroke="rgba(148, 163, 184, 0.25)"
            strokeWidth={1.5}
            className="pointer-events-none"
          />

          {/* Large Radial Pie / Annular Sector Wedges */}
          {segments.map((seg) => {
            const pathD = describeAnnularSector(rInner, rOuter, seg.startDeg, seg.endDeg, 3.5);
            const isHovered = hoveredWedgeId === seg.id;
            const isHighlighted = isHovered || seg.isActive;
            return (
              <path
                key={seg.id}
                d={pathD}
                fill={isHighlighted ? seg.activeFillRgba : seg.fillRgba}
                stroke={seg.accentHex}
                strokeWidth={isHighlighted ? 2.4 : 1.4}
                strokeOpacity={isHighlighted ? 0.95 : 0.55}
                className="cursor-pointer transition-colors duration-100"
                onPointerEnter={() => setHoveredWedgeId(seg.id)}
                onPointerLeave={() => setHoveredWedgeId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  seg.onSelect();
                }}
              />
            );
          })}

          {/* Orbiting Rim Scrubbing Indicator Bead */}
          <circle
            cx={beadX}
            cy={beadY}
            r={7}
            fill="#22d3ee"
            stroke="#ffffff"
            strokeWidth={2}
            className="pointer-events-none"
          />
        </svg>

        {/* HTML Labels & Icons Positioned at the Exact Polar Centroid of Each Radial Wedge */}
        {segments.map((seg) => {
          const midRad = (((seg.startDeg + seg.endDeg) / 2) * Math.PI) / 180;
          const lx = menuRadius + rMidLabel * Math.cos(midRad);
          const ly = menuRadius + rMidLabel * Math.sin(midRad);
          return (
            <div
              key={`label-${seg.id}`}
              style={{
                left: `${lx}px`,
                top: `${ly}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute pointer-events-none flex flex-col items-center justify-center text-center w-24 select-none"
            >
              <div className="mb-0.5 drop-shadow">{seg.icon}</div>
              <span className="text-[10px] font-bold font-mono text-white tracking-tight leading-tight uppercase drop-shadow">
                {seg.title}
              </span>
              {seg.subtitle && (
                <span className="text-[8px] font-mono text-slate-300/90 truncate max-w-[84px] leading-tight mt-0.5">
                  {seg.subtitle}
                </span>
              )}
            </div>
          );
        })}

        {/* Centre Hub: Live Continuum Readout (or Back Button when in Stage 2 Fan-out) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (activeSubMenu !== 'none') {
              setActiveSubMenu('none');
            } else {
              onClose();
            }
          }}
          style={{
            width: `${rInner * 2 - 4}px`,
            height: `${rInner * 2 - 4}px`,
            left: `${menuRadius}px`,
            top: `${menuRadius}px`,
            transform: 'translate(-50%, -50%)',
          }}
          className="absolute rounded-full bg-slate-950/95 border-2 border-slate-700 hover:border-red-400 shadow-inner flex flex-col items-center justify-center text-center p-1 z-20 cursor-pointer active:scale-95 transition"
          title={activeSubMenu !== 'none' ? 'Return to Main Compass' : 'Close Radial Menu'}
        >
          {activeSubMenu !== 'none' ? (
            <>
              <ArrowLeft className="w-4 h-4 text-cyan-400 mb-0.5" />
              <span className="text-[10px] font-bold text-white font-mono uppercase leading-none">
                Back
              </span>
              <span className="text-[8px] text-slate-400 font-mono mt-0.5 leading-none">
                {addr.formatted}
              </span>
            </>
          ) : (
            <>
              <span className="text-[12px] font-bold text-white font-mono leading-none">
                {currentD > 0 ? `${bpm.toFixed(0)} BPM` : pitchInfo.note + pitchInfo.octave}
              </span>
              <span className="text-[8px] text-slate-400 font-mono mt-0.5 leading-none">
                {currentD > 0 ? `${dToPeriodMs(currentD).toFixed(0)}ms` : `${pitchInfo.cents >= 0 ? '+' : ''}${pitchInfo.cents}¢`}
              </span>
              <span className="text-[9px] text-cyan-400 font-mono font-bold mt-0.5 leading-none">
                {addr.formatted}
              </span>
            </>
          )}
        </button>

        {/* Bottom Rim Scrub Instruction Pill */}
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/95 border border-slate-700/80 rounded-full px-3 py-0.5 text-[9px] font-mono font-semibold text-slate-300 shadow-lg pointer-events-none">
          ↻ Drag outer ring to scrub continuum
        </div>
      </div>
    </div>,
    document.body
  );
};
