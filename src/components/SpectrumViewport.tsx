import React, { useRef, useEffect, useState } from 'react';
import {
  LayoutDefinition,
  LayoutFlexDirection,
  SpectrumLensType,
  getAllCellNodes,
} from '../core/layout-models';
import { PerformanceProfile } from '../core/types';
import { RenderCoordinator } from '../renderers/render-coordinator';
import { getCanvasDprCaps } from '../renderers/performance-profile';
import { Plus, RotateCcw, Share2, Check } from 'lucide-react';

interface SpectrumViewportProps {
  coordinator: RenderCoordinator;
  layout: LayoutDefinition;
  performanceProfile?: PerformanceProfile;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  onAddCell?: (direction: LayoutFlexDirection, module: SpectrumLensType) => void;
  onResetLayout?: () => void;
  onShareLayout?: () => void;
  children?: React.ReactNode;
}

export const SpectrumViewport: React.FC<SpectrumViewportProps> = ({
  coordinator,
  layout,
  performanceProfile = 'balanced',
  isEditMode = false,
  onToggleEditMode,
  onAddCell,
  onResetLayout,
  onShareLayout,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const effectsCanvasRef = useRef<HTMLCanvasElement>(null);
  const postProcessingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  useEffect(() => {
    if (bgCanvasRef.current) coordinator.registerBgCanvas(bgCanvasRef.current);
    if (effectsCanvasRef.current) coordinator.registerEffectsCanvas(effectsCanvasRef.current);
    if (postProcessingCanvasRef.current) coordinator.registerPostProcessingCanvas(postProcessingCanvasRef.current);

    coordinator.start();

    return () => {
      coordinator.stop();
    };
  }, [coordinator]);

  // High-DPI canvas resizing with mobile thermal safeguards
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;

      const { bgDpr, webglDpr: ppDpr } = getCanvasDprCaps(performanceProfile);

      const rect = container.getBoundingClientRect();
      const wPp = Math.round(rect.width * ppDpr);
      const hPp = Math.round(rect.height * ppDpr);
      const wBg = Math.round(rect.width * bgDpr);
      const hBg = Math.round(rect.height * bgDpr);

      if (bgCanvasRef.current) {
        bgCanvasRef.current.width = wBg;
        bgCanvasRef.current.height = hBg;
        bgCanvasRef.current.style.width = `${rect.width}px`;
        bgCanvasRef.current.style.height = `${rect.height}px`;
      }
      if (effectsCanvasRef.current) {
        effectsCanvasRef.current.width = wBg;
        effectsCanvasRef.current.height = hBg;
        effectsCanvasRef.current.style.width = `${rect.width}px`;
        effectsCanvasRef.current.style.height = `${rect.height}px`;
      }
      if (postProcessingCanvasRef.current) {
        postProcessingCanvasRef.current.width = wPp;
        postProcessingCanvasRef.current.height = hPp;
        postProcessingCanvasRef.current.style.width = `${rect.width}px`;
        postProcessingCanvasRef.current.style.height = `${rect.height}px`;
      }

      coordinator.invalidateRectCaches();
      coordinator.renderBackground();
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
  }, [coordinator, performanceProfile]);

  const allCells = getAllCellNodes(layout.root);
  const totalCells = allCells.length;

  return (
    <div className="relative flex-1 w-full h-full min-h-0 min-w-0 overflow-hidden flex flex-col">
      {/* EDIT MODE: Dedicated Top Control Bar docked in flow */}
      {isEditMode && (
        <div className="flex-shrink-0 w-full bg-[#0b0f19]/95 backdrop-blur-xl border-b border-purple-500/40 px-3 sm:px-4 py-1.5 sm:py-2 z-30 shadow-lg flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Left: Layout Editor Status & Cell Counter Badge */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
              <span className="tracking-wide uppercase text-[11px] font-bold text-purple-200">Layout Editor</span>
            </div>
            <span className="text-[10px] sm:text-[11px] bg-purple-950/70 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded-full font-mono shrink-0">
              {totalCells} {totalCells === 1 ? 'cell' : 'cells'}
            </span>
          </div>

          {/* Right: Actions (Add Cell, Reset, Share, Done) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Add Cell */}
            {onAddCell && (
              <button
                onClick={() => onAddCell('row', 'cycle-wheel')}
                className="flex items-center gap-1 text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1 rounded-md border border-slate-700 hover:border-purple-500/50 transition cursor-pointer"
                title="Add a new cell to layout"
              >
                <Plus className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Add Cell</span>
              </button>
            )}

            {/* Reset Layout */}
            {onResetLayout && (
              <button
                onClick={onResetLayout}
                className="flex items-center gap-1 text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1 rounded-md border border-slate-700 hover:border-purple-500/50 transition cursor-pointer"
                title="Reset layout to preset default"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            {/* Share / Export Slug */}
            {onShareLayout && (
              <button
                onClick={() => {
                  onShareLayout();
                  setCopiedShareLink(true);
                  setTimeout(() => setCopiedShareLink(false), 2000);
                }}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition cursor-pointer ${
                  copiedShareLink
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-purple-300 border-slate-700 hover:border-purple-500/50'
                }`}
                title="Export and copy shareable layout link"
              >
                {copiedShareLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-purple-400" />
                )}
                <span className="hidden sm:inline">{copiedShareLink ? 'Link Copied!' : 'Share'}</span>
              </button>
            )}

            <div className="h-4 w-px bg-slate-700/80 mx-0.5 shrink-0" />

            {/* Done Editing */}
            {onToggleEditMode && (
              <button
                onClick={onToggleEditMode}
                className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-semibold px-3 py-1 rounded-md shadow-[0_0_10px_rgba(168,85,247,0.3)] transition cursor-pointer"
                title="Exit layout edit mode"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Viewport Workspace Area */}
      <div ref={containerRef} className="relative flex-1 w-full h-full min-h-0 min-w-0 overflow-hidden">
        {/* 1. Global display theme background */}
        <canvas ref={bgCanvasRef} className="absolute inset-0 block w-full h-full pointer-events-none" />

        {/* 2. Interactive lens viewports */}
        <div className="relative z-10 w-full h-full min-h-0 min-w-0">
          {children}
        </div>

        {/* 3. 2D Kinetic effects layer (sparks, shockwaves) */}
        <canvas ref={effectsCanvasRef} className="absolute inset-0 block w-full h-full pointer-events-none z-20" />

        {/* 4. Fullscreen Hardware WebGL post-processing shader (CRT, lens flares, halation, film grain) */}
        <canvas ref={postProcessingCanvasRef} className="absolute inset-0 block w-full h-full pointer-events-none z-30" />
      </div>
    </div>
  );
};
