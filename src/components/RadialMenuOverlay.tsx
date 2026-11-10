import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Repeat,
  SlidersHorizontal,
  Settings,
  Filter,
  Radio,
  Bookmark,
  ArrowLeft,
  X,
  Sliders,
  Check,
} from 'lucide-react';
import { Scene, BandFilter } from '../core/types';
import { BookmarkSettings } from './MusicalBookmarksModal';
import { dToFreq, dToBpm, dToPeriodMs, freqToPitchRegister, resolveDuPeriodAddress } from '../core/axis';

export interface RadialMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  scene: Scene;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onUpdatePlacementD: (d: number) => void;
  onUpdateFilterParams?: (params: Partial<Pick<BandFilter, 'centreD' | 'widthD' | 'softnessD'>>) => void;
  onToggleFilter: () => void;
  onCycleFilterMode: () => void;
  onOpenLibrary: () => void;
  onOpenCapture: () => void;
  onOpenSettings: () => void;
  isOscillating: boolean;
  onToggleOscillate: () => void;
  bookmarks: BookmarkSettings;
  onSetBookmarkA: () => void;
  onSetBookmarkB: () => void;
  onJumpBookmarkA: () => void;
  onJumpBookmarkB: () => void;
  /** Custom spawn point (under thumb), or centered in viewport if omitted */
  anchorPos?: { x: number; y: number } | null;
}

type SubMenuDirection = 'none' | 'north' | 'east' | 'west';
type FilterControlParam = 'centre' | 'width' | 'skirt';

export const RadialMenuOverlay: React.FC<RadialMenuOverlayProps> = ({
  isOpen,
  onClose,
  scene,
  isPlaying,
  onTogglePlay,
  onUpdatePlacementD,
  onUpdateFilterParams,
  onToggleFilter,
  onCycleFilterMode,
  onOpenLibrary,
  onOpenCapture,
  onOpenSettings,
  isOscillating,
  onToggleOscillate,
  bookmarks,
  onSetBookmarkA,
  onSetBookmarkB,
  onJumpBookmarkA,
  onJumpBookmarkB,
  anchorPos,
}) => {
  const [activeSubMenu, setActiveSubMenu] = useState<SubMenuDirection>('none');
  const [isFilterEditMode, setIsFilterEditMode] = useState<boolean>(false);
  const [filterControlParam, setFilterControlParam] = useState<FilterControlParam>('centre');

  // Rotary jog wheel tracking
  const [jogAngle, setJogAngle] = useState(0);
  const lastAngleRef = useRef<number | null>(null);

  const activePlacement = scene.placements[0];
  const currentD = activePlacement ? activePlacement.d : 0;
  const currentDRef = useRef(currentD);
  currentDRef.current = currentD;

  const filter = scene.filter;
  const filterD = filter?.centreD ?? 0;
  const filterDRef = useRef(filterD);
  filterDRef.current = filterD;

  const filterWidth = filter?.widthD ?? 4.0;
  const filterWidthRef = useRef(filterWidth);
  filterWidthRef.current = filterWidth;

  const filterSoftness = filter?.softnessD ?? 1.0;
  const filterSoftnessRef = useRef(filterSoftness);
  filterSoftnessRef.current = filterSoftness;

  const freqHz = dToFreq(currentD, scene.anchors.tplFrequencyHz);
  const bpm = dToBpm(currentD, scene.anchors.tplFrequencyHz);
  const pitchInfo = freqToPitchRegister(freqHz, scene.anchors.tuningA4Hz);
  const addr = resolveDuPeriodAddress(currentD);

  // Reset menu sub-states upon opening
  useEffect(() => {
    if (isOpen) {
      setActiveSubMenu('none');
      lastAngleRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate coordinates: clamped to stay fully within screen viewport
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 400;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const menuRadius = 130;
  const padding = 16;

  const cx = anchorPos
    ? Math.max(menuRadius + padding, Math.min(viewportW - menuRadius - padding, anchorPos.x))
    : viewportW / 2;
  const cy = anchorPos
    ? Math.max(menuRadius + padding, Math.min(viewportH - menuRadius - padding, anchorPos.y))
    : viewportH / 2;

  // Touch and mouse rotary scrubbing on the outer rim
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const initialAngle = Math.atan2(dy, dx);
    lastAngleRef.current = initialAngle;
    setJogAngle(initialAngle);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lastAngleRef.current === null) return;
    e.stopPropagation();
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);

    // Only scrub when rotating around the outer dial ring (r > 70px)
    if (dist < 60) return;

    const currentAngle = Math.atan2(dy, dx);
    let deltaAngle = currentAngle - lastAngleRef.current;
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
    lastAngleRef.current = currentAngle;
    setJogAngle(currentAngle);

    if (isFilterEditMode && onUpdateFilterParams) {
      // Rotary scrubber inside Filter Edit Mode
      if (filterControlParam === 'centre') {
        const deltaD = -(deltaAngle / (2 * Math.PI)) * 1.5;
        const targetD = Math.max(-7, Math.min(7, filterDRef.current + deltaD));
        onUpdateFilterParams({ centreD: targetD });
      } else if (filterControlParam === 'width') {
        // Clockwise rotation widens the band
        const deltaW = (deltaAngle / (2 * Math.PI)) * 2.0;
        const targetW = Math.max(0.25, Math.min(12.0, filterWidthRef.current + deltaW));
        onUpdateFilterParams({ widthD: targetW });
      } else if (filterControlParam === 'skirt') {
        // Clockwise rotation softens the skirt
        const deltaS = (deltaAngle / (2 * Math.PI)) * 1.0;
        const targetS = Math.max(0.05, Math.min(4.0, filterSoftnessRef.current + deltaS));
        onUpdateFilterParams({ softnessD: targetS });
      }
    } else {
      // Normal Continuum DuPeriod scrubbing: 1 turn = -1.5 DuPeriods (higher pitch / faster tempo)
      const deltaD = -(deltaAngle / (2 * Math.PI)) * 1.5;
      const targetD = Math.max(-7, Math.min(7, currentDRef.current + deltaD));
      onUpdatePlacementD(targetD);
    }
  };

  const handlePointerUp = () => {
    lastAngleRef.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/65 backdrop-blur-md select-none animate-in fade-in duration-150 touch-none"
      onClick={onClose}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Top Banner with mode details and Close button */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-50 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-lg text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${isFilterEditMode ? 'bg-sky-400 animate-pulse' : 'bg-red-500'}`} />
          <span className="font-bold text-white uppercase">
            {isFilterEditMode ? `Filter Edit (${filterControlParam})` : 'Continuum Dial'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="pointer-events-auto p-2 rounded-full bg-slate-900/90 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition cursor-pointer shadow-lg"
          title="Close Radial Menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Radial Dial Hub */}
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
        onPointerDown={handlePointerDown}
      >
        {/* Outer Circular Dial Boundary with Rotary Ticks */}
        <div
          className={`absolute inset-0 rounded-full border-2 transition-all duration-200 shadow-2xl flex items-center justify-center ${
            isFilterEditMode
              ? 'bg-slate-950/92 border-sky-400 shadow-[0_0_35px_rgba(56,189,248,0.45)]'
              : 'bg-slate-950/92 border-red-500/80 shadow-[0_0_35px_rgba(225,54,16,0.45)]'
          }`}
        >
          {/* Dashed Rotary Track */}
          <div
            className={`absolute inset-2 rounded-full border border-dashed ${
              isFilterEditMode ? 'border-sky-400/40' : 'border-red-400/40'
            }`}
          />

          {/* Rotary Orbit Indicator Bead */}
          {(() => {
            const r = menuRadius - 16;
            const bx = Math.cos(jogAngle) * r;
            const by = Math.sin(jogAngle) * r;
            return (
              <div
                className={`absolute w-4 h-4 rounded-full border border-white -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ${
                  isFilterEditMode
                    ? 'bg-sky-400 shadow-[0_0_12px_#38bdf8]'
                    : 'bg-cyan-400 shadow-[0_0_12px_#22d3ee]'
                }`}
                style={{ left: `calc(50% + ${bx}px)`, top: `calc(50% + ${by}px)` }}
              />
            );
          })()}

          {/* ======================================================== */}
          {/* STAGE 1: Standard Cardinal Compass (North, South, East, West) */}
          {/* ======================================================== */}
          {activeSubMenu === 'none' && !isFilterEditMode && (
            <>
              {/* NORTH: Library & Mic Sampling */}
              <button
                onClick={() => setActiveSubMenu('north')}
                className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-red-500 text-slate-200 hover:text-white transition shadow-lg active:scale-95 cursor-pointer z-10 w-24"
              >
                <div className="flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-ppt-do" />
                  <Radio className="w-3 h-3 text-red-400" />
                </div>
                <span className="text-[9px] font-bold font-mono tracking-wider mt-0.5 uppercase">Library / Mic</span>
              </button>

              {/* SOUTH: Settings */}
              <button
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-purple-500 text-slate-200 hover:text-white transition shadow-lg active:scale-95 cursor-pointer z-10 w-24"
              >
                <Settings className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[9px] font-bold font-mono tracking-wider mt-0.5 uppercase">Settings</span>
              </button>

              {/* EAST: Playback Fan-out */}
              <button
                onClick={() => setActiveSubMenu('east')}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-emerald-500 text-slate-200 hover:text-white transition shadow-lg active:scale-95 cursor-pointer z-10 w-20"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[9px] font-bold font-mono tracking-wider mt-0.5 uppercase">Playback ►</span>
              </button>

              {/* WEST: Filter & Bookmarks Fan-out */}
              <button
                onClick={() => setActiveSubMenu('west')}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-cyan-500 text-slate-200 hover:text-white transition shadow-lg active:scale-95 cursor-pointer z-10 w-20"
              >
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[9px] font-bold font-mono tracking-wider mt-0.5 uppercase">◄ Filter</span>
              </button>
            </>
          )}

          {/* ======================================================== */}
          {/* STAGE 2: NORTH FAN-OUT (Library & Mic Sampling) */}
          {/* ======================================================== */}
          {activeSubMenu === 'north' && !isFilterEditMode && (
            <div className="absolute inset-0 flex items-center justify-center animate-in fade-in zoom-in-95 duration-100">
              {/* Option 1: Shape Library */}
              <button
                onClick={() => {
                  onOpenLibrary();
                  onClose();
                }}
                className="absolute -top-3 left-6 flex flex-col items-center p-2 rounded-xl bg-slate-900 border border-red-500/70 text-slate-100 shadow-xl active:scale-95 cursor-pointer w-24"
              >
                <SlidersHorizontal className="w-4 h-4 text-ppt-do" />
                <span className="text-[9px] font-mono font-bold mt-1">Shape Library</span>
              </button>

              {/* Option 2: Microphone Sampling */}
              <button
                onClick={() => {
                  onOpenCapture();
                  onClose();
                }}
                className="absolute -top-3 right-6 flex flex-col items-center p-2 rounded-xl bg-slate-900 border border-red-500/70 text-slate-100 shadow-xl active:scale-95 cursor-pointer w-24"
              >
                <Radio className="w-4 h-4 text-red-400" />
                <span className="text-[9px] font-mono font-bold mt-1">Mic Sampling</span>
              </button>

              {/* Back button */}
              <button
                onClick={() => setActiveSubMenu('none')}
                className="absolute bottom-4 flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white text-[10px] font-mono border border-slate-700"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* STAGE 2: EAST FAN-OUT (Playback & Transport) */}
          {/* ======================================================== */}
          {activeSubMenu === 'east' && !isFilterEditMode && (
            <div className="absolute inset-0 flex items-center justify-center animate-in fade-in zoom-in-95 duration-100">
              {/* Play / Pause */}
              <button
                onClick={() => onTogglePlay()}
                className={`absolute top-2 right-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold shadow-lg cursor-pointer ${
                  isPlaying ? 'bg-red-950/80 border-red-500 text-red-300' : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              {/* Jump to Bookmark A */}
              <button
                onClick={() => {
                  onJumpBookmarkA();
                  onClose();
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/60 text-cyan-300 text-xs font-mono font-bold shadow-lg cursor-pointer"
                title={`Go to Bookmark A (${bookmarks.a.label})`}
              >
                <Bookmark className="w-3 h-3 fill-current" />
                <span>Go to A</span>
              </button>

              {/* Jump to Bookmark B */}
              <button
                onClick={() => {
                  onJumpBookmarkB();
                  onClose();
                }}
                className="absolute bottom-2 right-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-amber-500/60 text-amber-300 text-xs font-mono font-bold shadow-lg cursor-pointer"
                title={`Go to Bookmark B (${bookmarks.b.label})`}
              >
                <Bookmark className="w-3 h-3 fill-current" />
                <span>Go to B</span>
              </button>

              {/* Sweep Oscillation */}
              <button
                onClick={() => onToggleOscillate()}
                className={`absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold shadow-lg cursor-pointer ${
                  isOscillating ? 'bg-red-950/80 border-red-500 text-red-300' : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                <Repeat className={`w-3.5 h-3.5 ${isOscillating ? 'animate-spin' : ''}`} />
                <span>{isOscillating ? 'Stop Sweep' : 'Sweep A↔B'}</span>
              </button>

              {/* Back button */}
              <button
                onClick={() => setActiveSubMenu('none')}
                className="absolute bottom-4 flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white text-[10px] font-mono border border-slate-700"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* STAGE 2: WEST FAN-OUT (Filter & Bookmarks) */}
          {/* ======================================================== */}
          {activeSubMenu === 'west' && !isFilterEditMode && (
            <div className="absolute inset-0 flex items-center justify-center animate-in fade-in zoom-in-95 duration-100">
              {/* Filter Mode Toggle */}
              <button
                onClick={() => onCycleFilterMode()}
                className="absolute top-2 left-4 flex flex-col items-center p-1.5 rounded-lg bg-slate-900 border border-sky-500/60 text-sky-300 text-[10px] font-mono font-bold shadow-lg cursor-pointer w-22"
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="truncate uppercase mt-0.5">Mode: {filter?.enabled ? filter.mode : 'OFF'}</span>
              </button>

              {/* Set Bookmark A */}
              <button
                onClick={() => {
                  onSetBookmarkA();
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/60 text-cyan-300 text-xs font-mono font-bold shadow-lg cursor-pointer"
              >
                <Bookmark className="w-3 h-3" />
                <span>Set A</span>
              </button>

              {/* Set Bookmark B */}
              <button
                onClick={() => {
                  onSetBookmarkB();
                }}
                className="absolute bottom-2 left-4 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-amber-500/60 text-amber-300 text-xs font-mono font-bold shadow-lg cursor-pointer"
              >
                <Bookmark className="w-3 h-3" />
                <span>Set B</span>
              </button>

              {/* Enter Filter Edit Mode */}
              <button
                onClick={() => {
                  setIsFilterEditMode(true);
                  if (onUpdateFilterParams && !filter?.enabled) {
                    onToggleFilter();
                  }
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-950/80 border border-sky-400 text-sky-200 text-xs font-mono font-bold shadow-[0_0_12px_rgba(56,189,248,0.4)] cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Filter Edit ►</span>
              </button>

              {/* Back button */}
              <button
                onClick={() => setActiveSubMenu('none')}
                className="absolute bottom-4 flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white text-[10px] font-mono border border-slate-700"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* FILTER EDIT MODE: Dedicated Dial & Quadrant Controls */}
          {/* ======================================================== */}
          {isFilterEditMode && (
            <div className="absolute inset-0 flex items-center justify-center animate-in fade-in zoom-in-95 duration-100">
              {/* NORTH: Control Aperture Width */}
              <button
                onClick={() => setFilterControlParam('width')}
                className={`absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center p-1.5 rounded-xl border text-[9px] font-mono font-bold uppercase transition shadow-lg cursor-pointer w-24 ${
                  filterControlParam === 'width'
                    ? 'bg-sky-500/30 border-sky-400 text-white shadow-[0_0_12px_#38bdf8]'
                    : 'bg-slate-900/90 border-slate-700 text-slate-300'
                }`}
              >
                <span>Width</span>
                <span className="text-[10px] text-sky-300">{filterWidth.toFixed(2)} oct</span>
              </button>

              {/* WEST: Control Centre Offset */}
              <button
                onClick={() => setFilterControlParam('centre')}
                className={`absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center p-1.5 rounded-xl border text-[9px] font-mono font-bold uppercase transition shadow-lg cursor-pointer w-20 ${
                  filterControlParam === 'centre'
                    ? 'bg-sky-500/30 border-sky-400 text-white shadow-[0_0_12px_#38bdf8]'
                    : 'bg-slate-900/90 border-slate-700 text-slate-300'
                }`}
              >
                <span>Centre</span>
                <span className="text-[10px] text-sky-300">d = {filterD.toFixed(2)}</span>
              </button>

              {/* SOUTH: Control Skirt Softness */}
              <button
                onClick={() => setFilterControlParam('skirt')}
                className={`absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center p-1.5 rounded-xl border text-[9px] font-mono font-bold uppercase transition shadow-lg cursor-pointer w-24 ${
                  filterControlParam === 'skirt'
                    ? 'bg-sky-500/30 border-sky-400 text-white shadow-[0_0_12px_#38bdf8]'
                    : 'bg-slate-900/90 border-slate-700 text-slate-300'
                }`}
              >
                <span>Skirt</span>
                <span className="text-[10px] text-sky-300">{filterSoftness.toFixed(2)} oct</span>
              </button>

              {/* EAST: Exit Filter Edit Mode */}
              <button
                onClick={() => setIsFilterEditMode(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center p-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-white transition shadow-lg cursor-pointer w-20"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[9px] font-mono font-bold uppercase mt-0.5">Done</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* CENTER HUB: Readout & Mode Status */}
          {/* ======================================================== */}
          <div className="w-22 h-22 rounded-full bg-slate-900/95 border border-slate-700 shadow-inner flex flex-col items-center justify-center text-center p-1 z-20 pointer-events-none">
            {isFilterEditMode ? (
              <>
                <span className="text-[8px] font-bold text-sky-400 font-mono tracking-wider uppercase leading-none">
                  {filterControlParam}
                </span>
                <span className="text-[12px] font-bold text-white font-mono mt-1 leading-none">
                  {filterControlParam === 'centre' && `d=${filterD.toFixed(2)}`}
                  {filterControlParam === 'width' && `${filterWidth.toFixed(1)} oct`}
                  {filterControlParam === 'skirt' && `${filterSoftness.toFixed(1)} oct`}
                </span>
                <span className="text-[7px] text-slate-400 font-mono mt-0.5">↻ Scrub dial</span>
              </>
            ) : (
              <>
                <span className="text-[12px] font-bold text-white font-mono leading-none">
                  {currentD > 0 ? `${bpm.toFixed(0)}` : pitchInfo.note + pitchInfo.octave}
                </span>
                <span className="text-[8px] text-slate-400 font-mono mt-0.5 leading-none">
                  {currentD > 0 ? `${dToPeriodMs(currentD).toFixed(0)}ms` : `${pitchInfo.cents >= 0 ? '+' : ''}${pitchInfo.cents}¢`}
                </span>
                <span className="text-[8px] text-cyan-400 font-mono font-semibold mt-0.5 leading-none">
                  {addr.formatted}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Instructional guide badge under dial */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 border border-slate-700/80 rounded-full px-2.5 py-0.5 text-[8px] font-mono font-semibold text-slate-300 shadow-md pointer-events-none">
          {isFilterEditMode ? `↻ Rotate outer ring to scrub filter ${filterControlParam}` : '↻ Rotate outer ring to scrub continuum'}
        </div>
      </div>
    </div>
  );
};
