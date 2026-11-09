import React, { useRef, useEffect } from 'react';
import {
  LayoutCellNode,
  SpectrumLensType,
  LayoutFlexDirection,
  getLensDisplayName,
} from '../core/layout-models';
import { Scene } from '../core/types';
import { RenderCoordinator, RegisteredLensRenderer } from '../renderers/render-coordinator';
import { RulerLensRenderer } from '../renderers/ruler-lens';
import { RingClockLensRenderer } from '../renderers/ring-clock-lens';
import { CycleWheelLensRenderer } from '../renderers/cycle-wheel-lens';
import { WaveformPhasorLensRenderer } from '../renderers/waveform-phasor-lens';
import { PrimeProfileLensRenderer } from '../renderers/prime-profile-lens';
import { Columns, Rows, Copy, Trash2 } from 'lucide-react';

interface CellViewportProps {
  cell: LayoutCellNode;
  scene: Scene;
  coordinator: RenderCoordinator;
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
  coordinator,
  onUpdateCell,
  isEditMode = false,
  canDelete = false,
  onSplitCell,
  onRemoveCell,
  onDuplicateCell,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      case 'ruler':
      default:
        renderer = new RulerLensRenderer();
        break;
    }

    coordinator.registerLens(cell.id, canvas, renderer);

    return () => {
      coordinator.unregisterLens(cell.id);
    };
  }, [cell.id, cell.module, coordinator]);

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

  const lensOptions: { id: SpectrumLensType; label: string }[] = [
    { id: 'ruler', label: 'Ruler' },
    { id: 'ring-clock', label: 'Ring Clock' },
    { id: 'cycle-wheel', label: 'Cycle Wheel' },
    { id: 'waveform-phasor', label: 'Waveform' },
    { id: 'prime-profile', label: 'Prime Profile' },
  ];

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-w-0 min-h-0 rounded-xl border bg-[#090c14]/80 overflow-hidden shadow-inner group transition-all duration-200 ${
        isEditMode
          ? 'border-purple-500/50 ring-1 ring-purple-500/30'
          : 'border-slate-800/80 hover:border-slate-700/80'
      }`}
    >
      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Cell Header */}
      <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Lens selector */}
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
        </div>

        {/* Right: In Edit Mode, display action tools (Split H, Split V, Duplicate, Delete) */}
        {isEditMode && (
          <div className="pointer-events-auto flex items-center gap-1 bg-[#0b0e17]/90 backdrop-blur-md p-1 rounded-md border border-purple-500/40 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            {/* Split Horizontal (Columns) */}
            {onSplitCell && (
              <button
                onClick={() => onSplitCell(cell.id, 'row', 'cycle-wheel')}
                className="p-1 rounded hover:bg-purple-900/40 text-purple-300 hover:text-white transition cursor-pointer"
                title="Split Side-by-Side (Columns)"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Split Vertical (Rows) */}
            {onSplitCell && (
              <button
                onClick={() => onSplitCell(cell.id, 'column', 'waveform-phasor')}
                className="p-1 rounded hover:bg-purple-900/40 text-purple-300 hover:text-white transition cursor-pointer"
                title="Split Stacked (Rows)"
              >
                <Rows className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Duplicate Cell */}
            {onDuplicateCell && (
              <button
                onClick={() => onDuplicateCell(cell.id)}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                title="Duplicate Cell"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete Cell */}
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
    </div>
  );
};
