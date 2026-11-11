import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutCellNode,
  SpectrumLensType,
  LensLabelMode,
  RingClockDensityMode,
  LayoutFlexDirection,
  getLensDisplayName,
} from '../core/layout-models';
import { Scene, SpanView } from '../core/types';
import { dToFreq, dToBpm, dToPeriodMs, freqToPitchRegister, resolveDuPeriodAddress } from '../core/axis';
import { SOLFEGE_NEON_COLORS } from '../core/ppt-constants';
import { getFocusedSpanView } from '../core/scene-ops';
import { useCanvasFilterGestures } from './hooks/useCanvasFilterGestures';
import { RenderCoordinator, RegisteredLensRenderer } from '../renderers/render-coordinator';
import { RulerLensRenderer } from '../renderers/ruler-lens';
import { RingClockLensRenderer } from '../renderers/ring-clock-lens';
import { CycleWheelLensRenderer } from '../renderers/cycle-wheel-lens';
import { WaveformPhasorLensRenderer } from '../renderers/waveform-phasor-lens';
import { PhasorLensRenderer } from '../renderers/phasor-lens';
import { PrimeProfileLensRenderer } from '../renderers/prime-profile-lens';
import { EventLanesLensRenderer } from '../renderers/event-lanes-lens';
import { AlignmentMeterLensRenderer } from '../renderers/alignment-meter-lens';
import {
  Columns,
  Rows,
  Copy,
  Trash2,
  Tag,
  Disc,
  Play,
  Pause,
  MoveHorizontal,
  MoveVertical,
  Minus,
  Plus,
  Equal,
} from 'lucide-react';

interface CellViewportProps {
  cell: LayoutCellNode;
  scene: Scene;
  coordinator: RenderCoordinator;
  onUpdatePlacementD?: (d: number) => void;
  onUpdateFilterCentreD?: (centreD: number) => void;
  onUpdateFilterParams?: (params: Partial<SpanView>) => void;
  onUpdateCell?: (updated: LayoutCellNode) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onOpenRadialMenuAt?: (pos: { x: number; y: number }) => void;
  // Layout Edit Mode Props
  isEditMode?: boolean;
  isFilterEditMode?: boolean;
  filterControlParam?: 'centre' | 'width' | 'skirt';
  canDelete?: boolean;
  onSplitCell?: (targetCellId: string, direction: LayoutFlexDirection, newModule: SpectrumLensType) => void;
  onRemoveCell?: (targetCellId: string) => void;
  onDuplicateCell?: (targetCellId: string) => void;
  onNudgeCellFlex?: (targetCellId: string, delta: number) => void;
  onEqualiseCellFlex?: (targetCellId: string) => void;
  parentDirection?: LayoutFlexDirection;
  siblingCount?: number;
  localSharePercent?: number;
}

export const CellViewport: React.FC<CellViewportProps> = ({
  cell,
  scene,
  coordinator,
  onUpdatePlacementD,
  onUpdateFilterCentreD,
  onUpdateFilterParams,
  onUpdateCell,
  isPlaying = false,
  onTogglePlay,
  onOpenRadialMenuAt,
  isEditMode = false,
  isFilterEditMode = false,
  filterControlParam = 'centre',
  canDelete = false,
  onSplitCell,
  onRemoveCell,
  onDuplicateCell,
  onNudgeCellFlex,
  onEqualiseCellFlex,
  parentDirection,
  siblingCount,
  localSharePercent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Double-tap to play/pause state
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const [doubleTapRipple, setDoubleTapRipple] = useState<{
    x: number;
    y: number;
    action: 'play' | 'pause';
  } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  // Drag scrubbing & mobile rotary jog wheel states
  const {
    filterGestureMode,
    setFilterGestureMode,
    determineInitialGesture,
    processFilterDrag,
    processFilterWheel,
    processFilterTouch,
  } = useCanvasFilterGestures({
    scene,
    isFilterEditMode,
    filterControlParam,
    onUpdateFilterParams,
    onUpdateFilterCentreD,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({
    x: 0,
    y: 0,
    d: 0,
    filterD: 0,
    filterWidth: 4.0,
    filterSoftness: 1.0,
  });
  const [isTouchScrubbing, setIsTouchScrubbing] = useState(false);
  const [wheelPos, setWheelPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [jogAngle, setJogAngle] = useState(0);
  const lastAngleRef = useRef<number | null>(null);
  const jogCenterRef = useRef<{ cx: number; cy: number }>({ cx: 0, cy: 0 });

  const activePlacement = scene.placements[0];
  const currentD = activePlacement ? activePlacement.d : 0;
  const currentDRef = useRef(currentD);
  currentDRef.current = currentD;

  const freqHz = dToFreq(currentD, scene.anchors.tplFrequencyHz);
  const bpm = dToBpm(currentD, scene.anchors.tplFrequencyHz);
  const pitchInfo = freqToPitchRegister(freqHz, scene.anchors.tuningA4Hz);
  const addr = resolveDuPeriodAddress(currentD);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: RegisteredLensRenderer;
    switch (cell.module) {
      case 'ring-clock':
        renderer = new RingClockLensRenderer();
        break;
      case 'cycle-wheel':
        renderer = new CycleWheelLensRenderer();
        break;
      case 'waveform-phasor':
        renderer = new WaveformPhasorLensRenderer();
        break;
      case 'phasor':
        renderer = new PhasorLensRenderer();
        break;
      case 'prime-profile':
        renderer = new PrimeProfileLensRenderer();
        break;
      case 'event-lanes':
        renderer = new EventLanesLensRenderer();
        break;
      case 'alignment-meter':
        renderer = new AlignmentMeterLensRenderer();
        break;
      case 'ruler':
      default:
        renderer = new RulerLensRenderer();
        break;
    }

    coordinator.registerLens(
      cell.id,
      canvas,
      renderer,
      cell.labelMode || 'duperiod',
      {
        ringClockMode: cell.ringClockMode || 'auto-compact',
        minRings: cell.minRings ?? 4,
        ...cell.configOverrides,
      }
    );

    return () => {
      coordinator.unregisterLens(cell.id);
    };
  }, [
    cell.id,
    cell.module,
    cell.labelMode,
    cell.ringClockMode,
    cell.minRings,
    cell.configOverrides,
    coordinator,
  ]);

  // High-DPI canvas resizing
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      // Cap DPR to 2.0 on 2D lens canvases to keep retina-crisp rendering without burning GPU fill-rate on 3x screens
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      const rect = container.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      coordinator.invalidateRectCaches();
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [coordinator]);

  // Mouse drag scrubbing on desktop canvas (Shift + Drag scrubs Band Filter centreD & widthD, Ctrl+Shift scrubs skirt)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || isEditMode) return;
    setIsDragging(true);
    const view = getFocusedSpanView(scene.filter);
    const filterD = view?.centreD ?? 0;
    const filterWidth = view?.widthD ?? 4.0;
    const filterSoftness = view?.softnessD ?? 1.0;

    const initialGesture = determineInitialGesture(Boolean(e.ctrlKey || e.metaKey), e.shiftKey);
    setFilterGestureMode(initialGesture);
    setDragStartPos({
      x: e.clientX,
      y: e.clientY,
      d: currentD,
      filterD,
      filterWidth,
      filterSoftness,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      if (processFilterDrag(dx, dy, dragStartPos, isCtrlOrMeta, isShift)) {
        return;
      }

      // Normal drag without shift: placement d scrubbing
      setFilterGestureMode('none');
      if (!onUpdatePlacementD) return;
      const sensitivity = 0.015;
      const targetD = Math.max(-7, Math.min(7, dragStartPos.d - dx * sensitivity));
      onUpdatePlacementD(targetD);
    },
    [
      isDragging,
      dragStartPos,
      processFilterDrag,
      onUpdatePlacementD,
      setFilterGestureMode,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setFilterGestureMode('none');
  }, [setFilterGestureMode]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Mouse wheel fine scrub on canvas (Shift + Wheel scrubs Filter width/centre, Ctrl+Shift scrubs skirt)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (processFilterWheel(e)) return;

    if (!onUpdatePlacementD) return;
    const step = 0.05;
    const delta = e.deltaY > 0 ? step : -step;
    onUpdatePlacementD(Math.max(-7, Math.min(7, currentD + delta)));
  };

  // Touch rotary scrub on mobile (Dynamic iPod Click-Wheel centered under thumb)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1 || isEditMode) return;
    const touch = e.touches[0];
    const container = containerRef.current;
    if (!container) return;

    // 1. Double-tap to Play/Pause (with preventDefault to prevent mobile zoom)
    const now = performance.now();
    const prevTap = lastTapRef.current;
    if (prevTap && now - prevTap.time < 400) {
      const dist = Math.hypot(touch.clientX - prevTap.x, touch.clientY - prevTap.y);
      if (dist < 45 && onTogglePlay) {
        if (e.cancelable) e.preventDefault();
        const nextAction = isPlaying ? 'pause' : 'play';
        onTogglePlay();
        setDoubleTapRipple({ x: touch.clientX, y: touch.clientY, action: nextAction });
        setTimeout(() => setDoubleTapRipple(null), 450);
        lastTapRef.current = null;
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        setIsTouchScrubbing(false);
        return;
      }
    }
    lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };

    // Center of wheel spawns directly under thumb in viewport coordinates (clamped so it stays on screen)
    const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
    const cx = Math.max(84, Math.min(vw - 84, touch.clientX));
    const cy = Math.max(84, Math.min(vh - 84, touch.clientY));

    jogCenterRef.current = { cx, cy };
    setWheelPos({ x: cx, y: cy });

    lastAngleRef.current = 0;
    setJogAngle(0);

    setDragStartPos({
      x: touch.clientX,
      y: touch.clientY,
      d: currentDRef.current,
      filterD: scene.filter?.centreD ?? 0,
      filterWidth: scene.filter?.widthD ?? 4.0,
      filterSoftness: scene.filter?.softnessD ?? 1.0,
    });
    setIsTouchScrubbing(true);

    // 2. Long-press to open the full Radial Menu centered under thumb
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      if (onOpenRadialMenuAt) {
        setIsTouchScrubbing(false);
        onOpenRadialMenuAt({ x: touch.clientX, y: touch.clientY });
      }
    }, 420);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartPos.x;
    const dy = touch.clientY - dragStartPos.y;
    if (Math.hypot(dx, dy) > 12 && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!isTouchScrubbing) return;

    // In Filter Edit Mode: touch scrubbing adjusts the active filter parameter
    if (isFilterEditMode && onUpdateFilterParams) {
      const jx = touch.clientX - jogCenterRef.current.cx;
      const jy = touch.clientY - jogCenterRef.current.cy;
      const dist = Math.hypot(jx, jy);
      const isDial = dist > 16;
      let deltaAngle = 0;

      if (isDial) {
        const currentAngle = Math.atan2(jy, jx);
        if (lastAngleRef.current !== null && lastAngleRef.current !== 0) {
          deltaAngle = currentAngle - lastAngleRef.current;
          if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
          if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
        }
        lastAngleRef.current = currentAngle;
        setJogAngle(currentAngle);
      }

      const dLinearX = touch.clientX - dragStartPos.x;
      const canvasWidth = containerRef.current?.clientWidth || 300;
      processFilterTouch(isDial, deltaAngle, dLinearX, canvasWidth, dragStartPos);
      return;
    }

    if (!onUpdatePlacementD) return;
    const jx = touch.clientX - jogCenterRef.current.cx;
    const jy = touch.clientY - jogCenterRef.current.cy;
    const dist = Math.hypot(jx, jy);

    // Rotary circular scrubbing around wheel center (when touch has moved outside inner deadzone > 16px)
    if (dist > 16) {
      const currentAngle = Math.atan2(jy, jx);
      if (lastAngleRef.current !== null && lastAngleRef.current !== 0) {
        let deltaAngle = currentAngle - lastAngleRef.current;
        if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

        // 1 full clockwise rotation (2π) = shifts spectrum by -1.5 DuPeriods (faster/higher pitch)
        const deltaD = -(deltaAngle / (2 * Math.PI)) * 1.5;
        const targetD = Math.max(-7, Math.min(7, currentDRef.current + deltaD));
        onUpdatePlacementD(targetD);
        currentDRef.current = targetD;
      }
      lastAngleRef.current = currentAngle;
      setJogAngle(currentAngle);
    } else {
      // Near center, fallback to gentle linear delta
      const dLinearX = touch.clientX - dragStartPos.x;
      const targetD = Math.max(-7, Math.min(7, dragStartPos.d - dLinearX * 0.015));
      onUpdatePlacementD(targetD);
      currentDRef.current = targetD;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsTouchScrubbing(false);
    lastAngleRef.current = null;
  };

  const lensOptions: { id: SpectrumLensType; label: string }[] = [
    { id: 'ruler', label: 'Ruler' },
    { id: 'ring-clock', label: 'Ring Clock' },
    { id: 'cycle-wheel', label: 'Cycle Wheel' },
    { id: 'waveform-phasor', label: 'Waveform' },
    { id: 'phasor', label: 'Rotating Phasors' },
    { id: 'prime-profile', label: 'Prime Profile' },
    { id: 'event-lanes', label: 'Event Lanes' },
    { id: 'alignment-meter', label: 'Alignment Meter' },
  ];

  const labelModeOptions: { id: LensLabelMode; label: string }[] = [
    { id: 'duperiod', label: 'DuPeriod (d)' },
    { id: 'pitch', label: 'Pitch (Note+Cents)' },
    { id: 'bpm', label: 'Tempo (BPM)' },
    { id: 'solfege', label: 'Solfège (Do, Re...)' },
  ];

  const ringClockDensityOptions: { id: RingClockDensityMode; label: string }[] = [
    { id: 'auto-compact', label: 'Compact (4+)' },
    { id: 'standard', label: 'Standard (8)' },
    { id: 'full', label: 'Full (16)' },
  ];

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-w-0 min-h-0 rounded-xl border bg-[#090c14]/80 overflow-hidden shadow-inner group transition-all duration-200 select-none ${
        isEditMode
          ? 'border-purple-500/50 ring-1 ring-purple-500/30'
          : isFilterEditMode
          ? 'border-sky-500/60 ring-1 ring-sky-500/40 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
          : 'border-slate-800/80 hover:border-slate-700/80'
      }`}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="absolute inset-0 block w-full h-full cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Filter Edit Mode active badge */}
      {isFilterEditMode && (
        <div className="absolute bottom-2 left-2 z-20 pointer-events-none px-2 py-0.5 rounded bg-sky-950/85 border border-sky-500/50 text-[9px] font-mono font-bold text-sky-300 uppercase shadow-md flex items-center gap-1.5 animate-in fade-in duration-150">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span>Scrubbing: {filterControlParam}</span>
        </div>
      )}


      {/* Cell Header - visible when in Edit Mode */}
      {isEditMode && (
        <div className="absolute top-2 left-2 right-2 z-20 flex flex-wrap items-center justify-between gap-1 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          {/* Left: Lens selector & Label Mode Selector */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-[#0b0e17]/90 backdrop-blur-md px-2 py-1 rounded-md border border-purple-500/50 shadow-md">
            <span className="hidden sm:inline text-[10px] font-mono text-purple-300 uppercase font-semibold">
              {cell.title || getLensDisplayName(cell.module)}
            </span>
            <select
              value={cell.module}
              onChange={(e) => {
                const newMod = e.target.value as SpectrumLensType;
                if (onUpdateCell) {
                  onUpdateCell({
                    ...cell,
                    module: newMod,
                    title: getLensDisplayName(newMod),
                  });
                }
              }}
              className="bg-transparent text-[10px] text-slate-200 font-mono focus:outline-none cursor-pointer"
            >
              {lensOptions.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-slate-900 text-slate-200">
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Label Mode Switcher */}
            <div className="h-3 w-px bg-slate-700 mx-0.5" />
            <div className="flex items-center gap-1" title="Customise Cell Label Scale">
              <Tag className="w-3 h-3 text-slate-400" />
              <select
                value={cell.labelMode || 'duperiod'}
                onChange={(e) => {
                  const newMode = e.target.value as LensLabelMode;
                  if (onUpdateCell) {
                    onUpdateCell({
                      ...cell,
                      labelMode: newMode,
                    });
                  }
                }}
                className="bg-transparent text-[9px] text-slate-300 font-mono focus:outline-none cursor-pointer"
              >
                {labelModeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-slate-900 text-slate-200">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Concentric Ring Clock Density Selector */}
            {cell.module === 'ring-clock' && (
              <>
                <div className="h-3 w-px bg-slate-700 mx-0.5" />
                <div className="flex items-center gap-1" title="Customise Ring Clock Density">
                  <Disc className="w-3 h-3 text-slate-400" />
                  <select
                    value={cell.ringClockMode || 'auto-compact'}
                    onChange={(e) => {
                      const newMode = e.target.value as RingClockDensityMode;
                      if (onUpdateCell) {
                        onUpdateCell({
                          ...cell,
                          ringClockMode: newMode,
                        });
                      }
                    }}
                    className="bg-transparent text-[9px] text-slate-300 font-mono focus:outline-none cursor-pointer"
                  >
                    {ringClockDensityOptions.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-slate-900 text-slate-200">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Centre: Directional Sizing / Flex Weight Controls (visible when cell has siblings) */}
          {siblingCount !== undefined && siblingCount > 1 && onNudgeCellFlex && (
            <div
              className="pointer-events-auto flex items-center gap-1 bg-[#0b0e17]/90 backdrop-blur-md px-1.5 py-1 rounded-md border border-purple-500/50 shadow-md text-purple-300"
              title={
                parentDirection === 'row'
                  ? `Adjust cell width within this row (${localSharePercent ?? 50}% share)`
                  : `Adjust cell height within this column (${localSharePercent ?? 50}% share)`
              }
            >
              {parentDirection === 'row' ? (
                <MoveHorizontal className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              ) : (
                <MoveVertical className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              )}
              <span className="text-[10px] font-mono font-semibold text-slate-200">
                {parentDirection === 'row' ? 'Width' : 'Height'} {localSharePercent ?? 50}%
              </span>
              <button
                onClick={() => onNudgeCellFlex(cell.id, -0.25)}
                className="p-0.5 rounded hover:bg-purple-900/50 text-slate-300 hover:text-white transition cursor-pointer"
                title={`Narrow ${parentDirection === 'row' ? 'width' : 'height'}`}
                aria-label={`Decrease ${parentDirection === 'row' ? 'width' : 'height'}`}
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => onNudgeCellFlex(cell.id, 0.25)}
                className="p-0.5 rounded hover:bg-purple-900/50 text-slate-300 hover:text-white transition cursor-pointer"
                title={`Expand ${parentDirection === 'row' ? 'width' : 'height'}`}
                aria-label={`Increase ${parentDirection === 'row' ? 'width' : 'height'}`}
              >
                <Plus className="w-3 h-3" />
              </button>
              {onEqualiseCellFlex && (
                <button
                  onClick={() => onEqualiseCellFlex(cell.id)}
                  className="p-0.5 rounded hover:bg-purple-900/50 text-slate-300 hover:text-white transition cursor-pointer ml-0.5 border-l border-slate-700/60 pl-1"
                  title={`Equalise all sibling ${parentDirection === 'row' ? 'widths' : 'heights'} in this group`}
                  aria-label={`Equalise sibling ${parentDirection === 'row' ? 'widths' : 'heights'}`}
                >
                  <Equal className="w-3 h-3 text-purple-300 hover:text-white" />
                </button>
              )}
            </div>
          )}

          {/* Right: In Edit Mode, display action tools on both mobile and desktop */}
          <div className="flex pointer-events-auto items-center gap-1 bg-[#0b0e17]/90 backdrop-blur-md p-1 rounded-md border border-purple-500/40 shadow-lg">
            {onSplitCell && (
              <button
                onClick={() => onSplitCell(cell.id, 'row', 'cycle-wheel')}
                className="p-1 rounded hover:bg-purple-900/40 text-purple-300 hover:text-white transition cursor-pointer"
                title="Split Side-by-Side (Columns)"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
            )}

            {onSplitCell && (
              <button
                onClick={() => onSplitCell(cell.id, 'column', 'waveform-phasor')}
                className="p-1 rounded hover:bg-purple-900/40 text-purple-300 hover:text-white transition cursor-pointer"
                title="Split Stacked (Rows)"
              >
                <Rows className="w-3.5 h-3.5" />
              </button>
            )}

            {onDuplicateCell && (
              <button
                onClick={() => onDuplicateCell(cell.id)}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                title="Duplicate Cell"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}

            {canDelete && onRemoveCell && (
              <button
                onClick={() => onRemoveCell(cell.id)}
                className="p-1 rounded hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition cursor-pointer"
                title="Remove Cell"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Mobile iPod-Style Rotary Jog Wheel: Portaled to document.body so it never clips inside a Duo/Quad cell */}
      {isTouchScrubbing &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[95] animate-in fade-in zoom-in-90 duration-150 select-none"
            style={{ left: `${wheelPos.x}px`, top: `${wheelPos.y}px`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-40 h-40 rounded-full bg-slate-950/92 border-2 border-red-500/80 shadow-[0_0_30px_rgba(225,54,16,0.5)] backdrop-blur-xl flex items-center justify-center relative">
              {/* Click-wheel tactile tick marks around the ring */}
              <div className="absolute inset-1.5 rounded-full border border-dashed border-red-400/40" />

              {/* Curved rotation direction labels */}
              <div className="absolute top-1.5 flex items-center gap-1 text-[8px] text-red-400 font-bold font-mono tracking-wider">
                <span>◄ ↺ SLOWER</span>
              </div>
              <div className="absolute bottom-1.5 flex items-center gap-1 text-[8px] text-red-400 font-bold font-mono tracking-wider">
                <span>FASTER ↻ ►</span>
              </div>

              {/* Instructional gesture guide badge */}
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 border border-slate-700/80 rounded-full px-2 py-0.5 text-[8px] font-mono font-semibold text-slate-300 shadow-md">
                {isFilterEditMode ? `↻ Scrub Filter ${filterControlParam.toUpperCase()}` : '↻ Rotate to Scrub · Hold for Menu'}
              </div>

              {/* Orbiting touch position indicator bead */}
              {(() => {
                const r = 62; // Orbit radius
                const bx = Math.cos(jogAngle) * r;
                const by = Math.sin(jogAngle) * r;
                return (
                  <div
                    className="absolute w-3.5 h-3.5 rounded-full bg-cyan-400 border border-white shadow-[0_0_10px_#22d3ee] -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
                    style={{ left: `calc(50% + ${bx}px)`, top: `calc(50% + ${by}px)` }}
                  />
                );
              })()}

              {/* Center Dial Hub (iPod Center Button with live pitch/rhythm readout) */}
              <div className="w-16 h-16 rounded-full bg-slate-900/95 border border-slate-700/90 shadow-inner flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-bold text-white font-mono leading-none">
                  {currentD > 0 ? `${bpm.toFixed(0)}` : pitchInfo.note + pitchInfo.octave}
                </span>
                <span className="text-[7px] text-slate-400 font-mono mt-0.5">
                  {currentD > 0 ? `${dToPeriodMs(currentD).toFixed(0)}ms` : `${pitchInfo.cents >= 0 ? '+' : ''}${pitchInfo.cents}¢`}
                </span>
                <span
                  className="text-[7px] font-mono font-semibold mt-0.5"
                  style={{ color: SOLFEGE_NEON_COLORS[addr.semitoneIndex] || '#38bdf8' }}
                >
                  {addr.formatted}
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Double Tap Play/Pause Ripple Indicator: Portaled to document.body */}
      {doubleTapRipple &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[96] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{ left: `${doubleTapRipple.x}px`, top: `${doubleTapRipple.y}px` }}
          >
            <div className="w-16 h-16 rounded-full bg-red-500/40 border-2 border-red-400 flex items-center justify-center animate-ping duration-300">
              {doubleTapRipple.action === 'play' ? (
                <Play className="w-6 h-6 text-white ml-0.5 fill-white" />
              ) : (
                <Pause className="w-6 h-6 text-white fill-white" />
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Floating HUD Pill for Filter Adjustment Gestures */}
      {isDragging && filterGestureMode !== 'none' && scene.filter && (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-30 animate-in fade-in zoom-in-95 duration-100 select-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 border border-sky-500/50 shadow-[0_0_20px_rgba(56,189,248,0.35)] backdrop-blur-md">
            <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider">
              {filterGestureMode === 'skirt' && 'Filter Skirt'}
              {filterGestureMode === 'width' && 'Aperture Width'}
              {filterGestureMode === 'centre' && 'Filter Centre'}
            </span>
            <div className="h-3 w-px bg-slate-700" />
            <span className="text-[11px] font-mono font-bold text-white">
              {filterGestureMode === 'skirt' && `${(scene.filter.softnessD ?? 1.0).toFixed(2)} oct`}
              {filterGestureMode === 'width' && `${(scene.filter.widthD ?? 4.0).toFixed(2)} oct`}
              {filterGestureMode === 'centre' && `d = ${(scene.filter.centreD ?? 0).toFixed(2)}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
