/**
 * Reusable Floating & Minimisable Studio Window for Desktop (md+)
 * paired with a full-screen / bottom touch sheet for Mobile (< md).
 * Allows tweaking Shapes, Envelopes, and Filters while interacting with the live canvas.
 * Australian English spelling maintained.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Minimize2, Maximize2, Move } from 'lucide-react';

export interface FloatingStudioWindowProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  defaultPosition?: { x: number; y: number };
  desktopWidthClass?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}

export const FloatingStudioWindow: React.FC<FloatingStudioWindowProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerActions,
  defaultPosition = { x: 24, y: 70 },
  desktopWidthClass = 'w-[460px] lg:w-[490px]',
  ariaLabel,
  children,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      const maxX = typeof window !== 'undefined' ? window.innerWidth - 280 : 1000;
      const maxY = typeof window !== 'undefined' ? window.innerHeight - 64 : 700;
      setPosition({
        x: Math.max(8, Math.min(maxX, dragStartRef.current.startX + dx)),
        y: Math.max(8, Math.min(maxY, dragStartRef.current.startY + dy)),
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  return (
    <>
      {/* 1. DESKTOP VIEW: Non-blocking Floating, Draggable & Minimisable Window (md+) */}
      <div
        role="dialog"
        aria-label={ariaLabel}
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className={`hidden md:flex fixed z-50 flex-col ${isMinimized ? 'w-[300px]' : desktopWidthClass} max-w-[calc(100vw-2rem)] bg-[#0b0e17]/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden transition-shadow animate-in fade-in zoom-in-95 duration-150`}
      >
        <div
          onMouseDown={handleHeaderMouseDown}
          className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 cursor-move select-none"
          title="Drag to reposition window"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Move className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            {icon}
            <div className="min-w-0">
              <div className="font-bold text-xs text-white truncate">{title}</div>
              {subtitle && !isMinimized && (
                <div className="text-[10px] text-slate-400 font-mono truncate">{subtitle}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={isMinimized ? 'Restore Window' : 'Minimise Window'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-red-950/60 transition cursor-pointer"
              title="Close Window"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="p-3.5 max-h-[75vh] overflow-y-auto overflow-x-hidden">
            {children}
          </div>
        )}
      </div>

      {/* 2. MOBILE VIEW: Full-screen / Bottom Touch Sheet (< md) */}
      <div
        role="dialog"
        aria-label={ariaLabel}
        className="md:hidden fixed inset-0 z-50 bg-[#090c14]/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom duration-200 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="w-10 h-1 bg-slate-700/80 rounded-full mx-auto my-2 shrink-0" />
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            <div className="min-w-0">
              <div className="font-bold text-xs text-white truncate">{title}</div>
              {subtitle && <div className="text-[10px] text-slate-400 font-mono truncate">{subtitle}</div>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-8">
          {children}
        </div>
      </div>
    </>
  );
};
