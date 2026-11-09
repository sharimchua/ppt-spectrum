import React, { useRef, useEffect } from 'react';
import { LayoutCellNode, SpectrumLensType } from '../core/layout-models';
import { Scene } from '../core/types';
import { RenderCoordinator, RegisteredLensRenderer } from '../renderers/render-coordinator';
import { RulerLensRenderer } from '../renderers/ruler-lens';
import { RingClockLensRenderer } from '../renderers/ring-clock-lens';
import { CycleWheelLensRenderer } from '../renderers/cycle-wheel-lens';
import { WaveformPhasorLensRenderer } from '../renderers/waveform-phasor-lens';
import { PrimeProfileLensRenderer } from '../renderers/prime-profile-lens';

interface CellViewportProps {
  cell: LayoutCellNode;
  scene: Scene;
  coordinator: RenderCoordinator;
  onUpdateCellModule?: (cellId: string, module: SpectrumLensType) => void;
}

export const CellViewport: React.FC<CellViewportProps> = ({
  cell,
  coordinator,
  onUpdateCellModule,
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
      className="relative w-full h-full min-w-0 min-h-0 rounded-xl border border-slate-800/80 bg-[#090c14]/80 overflow-hidden shadow-inner group"
    >
      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Subtle Cell Header with Module Selector */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition duration-150 bg-[#0b0e17]/85 backdrop-blur-md px-2 py-1 rounded-md border border-slate-700/60">
        <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
          {cell.title || cell.module}
        </span>
        {onUpdateCellModule && (
          <select
            value={cell.module}
            onChange={(e) => onUpdateCellModule(cell.id, e.target.value as SpectrumLensType)}
            className="bg-transparent text-[10px] text-slate-300 font-mono focus:outline-none cursor-pointer"
          >
            {lensOptions.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-slate-900 text-slate-200">
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};
