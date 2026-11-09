import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  LayoutCellNode,
  SpectrumLensType,
  LensLabelMode,
  RingClockDensityMode,
  LayoutFlexDirection,
  getLensDisplayName,
} from '../core/layout-models';
import { Scene } from '../core/types';
import { dToFreq, dToBpm, dToPeriodMs, freqToPitchRegister, resolveDuPeriodAddress } from '../core/axis';
import { RenderCoordinator, RegisteredLensRenderer } from '../renderers/render-coordinator';
import { RulerLensRenderer } from '../renderers/ruler-lens';
import { RingClockLensRenderer } from '../renderers/ring-clock-lens';
import { CycleWheelLensRenderer } from '../renderers/cycle-wheel-lens';
import { WaveformPhasorLensRenderer } from '../renderers/waveform-phasor-lens';
import { PrimeProfileLensRenderer } from '../renderers/prime-profile-lens';
import { EventLanesLensRenderer } from '../renderers/event-lanes-lens';
import { AlignmentMeterLensRenderer } from '../renderers/alignment-meter-lens';
import { Columns, Rows, Copy, Trash2, Tag, Disc } from 'lucide-react';

interface CellViewportProps {
  cell: LayoutCellNode;
  scene: Scene;
  coordinator: RenderCoordinator;
  onUpdatePlacementD?: (d: number) => void;
  onUpdateCell?: (updated: LayoutCellNode) => void;
  // Layout Edit Mode Props
  isEditMode?: boolean;
  canDelete?: boolean;
  onSplitCell?: (targetCellId: string, direction: LayoutFlexDirection, newModule: SpectrumLensType) => void;
  onRemoveCell?: (targetCellId: string) => void;
  onDuplicateCell?: (targetCellId: string) => void;
}

export const CellViewport: React.FC<CellViewportProps> = ({
  cell,
  scene,
  coordinator,
  onUpdatePlacementD,
  onUpdateCell,
  isEditMode = false,
  canDelete = false,
  onSplitCell,
  onRemoveCell,
  onDuplicateCell,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag scrubbing & rotary jog wheel states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0, d: 0 });
  const [showJogWheel, setShowJogWheel] = useState(false);
  const [jogAngle, setJogAngle] = useState(0);
  const jogCenterRef = useRef<{ cx: number; cy: number }>({ cx: 0, cy: 0 });

  const activePlacement = scene.placements[0];
  const currentD = activePlacement ? activePlacement.d : 0;
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

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
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
  }, []);

  // Mouse drag scrubbing on desktop canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || isEditMode) return;
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY, d: currentD });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !onUpdatePlacementD) return;
      const dx = e.clientX - dragStartPos.x;
      const sensitivity = e.shiftKey ? 0.003 : 0.015;
      // Moving right increases frequency (faster) => decreases d
      const targetD = Math.max(-7, Math.min(7, dragStartPos.d - dx * sensitivity));
      onUpdatePlacementD(targetD);
    },
    [isDragging, dragStartPos, onUpdatePlacementD]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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

  // Mouse wheel fine scrub on canvas
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!onUpdatePlacementD) return;
    e.preventDefault();
    const step = e.shiftKey ? 0.01 : 0.05;
    const delta = e.deltaY > 0 ? step : -step;
    onUpdatePlacementD(Math.max(-7, Math.min(7, currentD + delta)));
  };

  // Touch Drag scrub on mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1 || isEditMode) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStartPos({ x: touch.clientX, y: touch.clientY, d: currentD });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || !onUpdatePlacementD || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartPos.x;
    const sensitivity = 0.015;
    const targetD = Math.max(-7, Math.min(7, dragStartPos.d - dx * sensitivity));
    onUpdatePlacementD(targetD);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Circular / Rotary Jog Wheel Gesture (iPod click-wheel style)
  const handleJogTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    jogCenterRef.current = { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
  };

  const handleJogTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!onUpdatePlacementD || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - jogCenterRef.current.cx;
    const dy = touch.clientY - jogCenterRef.current.cy;
    const angle = Math.atan2(dy, dx);

    let deltaAngle = angle - jogAngle;
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
    setJogAngle(angle);

    // 1 full clockwise rotation (2π) = shifts spectrum by -1.5 DuPeriods (faster)
    const deltaD = -(deltaAngle / (2 * Math.PI)) * 1.5;
    onUpdatePlacementD(Math.max(-7, Math.min(7, currentD + deltaD)));
  };

  const lensOptions: { id: SpectrumLensType; label: string }[] = [
    { id: 'ruler', label: 'Ruler' },
    { id: 'ring-clock', label: 'Ring Clock' },
    { id: 'cycle-wheel', label: 'Cycle Wheel' },
    { id: 'waveform-phasor', label: 'Waveform' },
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
        className="absolute inset-0 block w-full h-full cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Floating Scrubbing HUD pill when user is dragging or scrolling */}
      {isDragging && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-500/60 shadow-xl flex items-center gap-2 text-xs font-mono animate-in fade-in zoom-in-95 duration-100">
          <span className="text-ppt-do font-bold">◄</span>
          <span className="text-white font-bold">
            {currentD > 0 ? `${bpm.toFixed(0)} BPM` : pitchInfo.formatted}
          </span>
          <span className="text-slate-400">({currentD > 0 ? `${dToPeriodMs(currentD).toFixed(0)} ms` : `${freqHz.toFixed(1)} Hz`})</span>
          <span className="text-cyan-400 font-semibold">{addr.formatted}</span>
          <span className="text-ppt-do font-bold">►</span>
        </div>
      )}

      {/* Cell Header */}
      <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Lens selector & Label Mode Selector */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-[#0b0e17]/85 backdrop-blur-md px-2 py-1 rounded-md border border-slate-700/60 shadow-md">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
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
            className="bg-transparent text-[10px] text-slate-300 font-mono focus:outline-none cursor-pointer"
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
            <Tag className="w-3 h-3 text-slate-500" />
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
              className="bg-transparent text-[9px] text-slate-400 font-mono focus:outline-none cursor-pointer"
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
                <Disc className="w-3 h-3 text-slate-500" />
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
                  className="bg-transparent text-[9px] text-slate-400 font-mono focus:outline-none cursor-pointer"
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

        {/* Right: In Edit Mode, display action tools */}
        {isEditMode && (
          <div className="pointer-events-auto flex items-center gap-1 bg-[#0b0e17]/90 backdrop-blur-md p-1 rounded-md border border-purple-500/40 shadow-lg animate-in fade-in zoom-in-95 duration-150">
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
        )}
      </div>

      {/* Floating Jog Wheel Toggle on Mobile (Bottom Right of Cell) */}
      <div className="absolute bottom-2 right-2 z-20 flex flex-col items-end gap-1.5">
        <button
          onClick={() => setShowJogWheel((prev) => !prev)}
          className={`p-1.5 rounded-full border shadow-lg backdrop-blur-md transition-all cursor-pointer ${
            showJogWheel
              ? 'bg-red-600/40 border-red-500 text-white shadow-[0_0_12px_rgba(225,54,16,0.5)]'
              : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white opacity-40 hover:opacity-100 group-hover:opacity-100'
          }`}
          title="Toggle Rotary Jog Wheel Scrub (iPod click-wheel style)"
        >
          <Disc className={`w-4 h-4 ${showJogWheel ? 'animate-spin' : ''}`} />
        </button>

        {/* Rotary Dial Jog Wheel (iPod Click-Wheel circular motion) */}
        {showJogWheel && (
          <div
            onTouchStart={handleJogTouchStart}
            onTouchMove={handleJogTouchMove}
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-950/90 border-2 border-red-500/50 shadow-2xl backdrop-blur-xl flex items-center justify-center relative touch-none select-none cursor-grab active:cursor-grabbing animate-in zoom-in-95 duration-150"
          >
            {/* Click-wheel tactile tick marks around the ring */}
            <div className="absolute inset-1 rounded-full border border-dashed border-red-400/30 pointer-events-none" />
            <div className="absolute top-1 text-[8px] text-red-400 font-bold font-mono">◄ Slower</div>
            <div className="absolute bottom-1 text-[8px] text-red-400 font-bold font-mono">Faster ►</div>

            {/* Center Dial Hub */}
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 shadow-inner flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[9px] font-bold text-white font-mono leading-none">
                {currentD > 0 ? `${bpm.toFixed(0)}` : pitchInfo.note + pitchInfo.octave}
              </span>
              <span className="text-[7px] text-slate-400 font-mono mt-0.5">
                {currentD > 0 ? 'BPM' : `${pitchInfo.cents >= 0 ? '+' : ''}${pitchInfo.cents}¢`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
