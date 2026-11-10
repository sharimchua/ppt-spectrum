import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, SlidersHorizontal, Minimize2, Maximize2, Move } from 'lucide-react';
import { Shape, BandFilter } from '../core/types';
import { ShapeEditor } from './shape-editor/ShapeEditor';

interface TraySheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeShape: Shape | undefined;
  onUpdateShape: (shape: Shape) => void;
  filter?: BandFilter;
  onUpdateFilter?: (filter: BandFilter) => void;
  allShapes?: Shape[];
  onSelectShape?: (shapeId: string) => void;
  onDuplicateShape?: (shape: Shape) => void;
  onDeleteShape?: (shapeId: string) => void;
  onCreateShape?: (newShape: Shape) => void;
  onTriggerNote?: () => void;
  onNoteOn?: () => void;
  onNoteOff?: () => void;
}

export const TraySheet: React.FC<TraySheetProps> = ({
  isOpen,
  onClose,
  activeShape,
  onUpdateShape,
  filter,
  onUpdateFilter,
  allShapes = [],
  onSelectShape,
  onDuplicateShape,
  onDeleteShape,
  onCreateShape,
  onTriggerNote,
  onNoteOn,
  onNoteOff,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 30, y: 70 });
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 30,
    startY: 70,
  });

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag from header, ignore buttons
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDraggingWindow(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingWindow) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      const newX = Math.max(10, Math.min(window.innerWidth - 300, dragStartRef.current.startX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 80, dragStartRef.current.startY + dy));
      setPosition({ x: newX, y: newY });
    },
    [isDraggingWindow]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingWindow(false);
  }, []);

  useEffect(() => {
    if (isDraggingWindow) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingWindow, handleMouseMove, handleMouseUp]);

  if (!isOpen || !activeShape) return null;

  return (
    <>
      {/* 1. DESKTOP VIEW: Floating Draggable & Minimizable Window (md+) */}
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className="hidden md:flex fixed z-50 flex-col w-[490px] lg:w-[500px] max-w-[calc(100vw-2rem)] bg-[#0b0e17]/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden transition-shadow select-none animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Draggable Title Bar */}
        <div
          onMouseDown={handleHeaderMouseDown}
          className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 cursor-move"
          title="Drag to reposition window"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Move className="w-3.5 h-3.5 text-slate-500" />
            <SlidersHorizontal className="w-4 h-4 text-ppt-do shrink-0" />
            <span className="font-bold text-xs text-white truncate">
              Shape Synthesiser: <span className="text-ppt-do">{activeShape.name}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Minimize / Expand Toggle */}
            <button
              onClick={() => setIsMinimized((prev) => !prev)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={isMinimized ? 'Expand Window' : 'Minimize Window'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-red-950/60 transition cursor-pointer"
              title="Close Shape Inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Window Content */}
        {!isMinimized && (
          <div className="p-3.5 max-h-[75vh] overflow-y-auto overflow-x-hidden">
            <ShapeEditor
              shape={activeShape}
              onUpdateShape={onUpdateShape}
              filter={filter}
              onUpdateFilter={onUpdateFilter}
              allShapes={allShapes}
              onSelectShape={onSelectShape}
              onDuplicateShape={onDuplicateShape}
              onDeleteShape={onDeleteShape}
              onCreateShape={onCreateShape}
              onTriggerNote={onTriggerNote}
              onNoteOn={onNoteOn}
              onNoteOff={onNoteOff}
            />
          </div>
        )}
      </div>

      {/* 2. MOBILE VIEW: Full-screen / Bottom Touch Sheet (< md) */}
      <div className="md:hidden fixed inset-0 z-50 bg-[#090c14]/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal className="w-4 h-4 text-ppt-do shrink-0" />
            <span className="font-bold text-xs text-white truncate">
              Shape Synthesiser: <span className="text-ppt-do">{activeShape.name}</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close Shape Inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Scrollable Body */}
        <div className="p-3.5 overflow-y-auto overflow-x-hidden flex-1">
          <ShapeEditor
            shape={activeShape}
            onUpdateShape={onUpdateShape}
            filter={filter}
            onUpdateFilter={onUpdateFilter}
            allShapes={allShapes}
            onSelectShape={onSelectShape}
            onDuplicateShape={onDuplicateShape}
            onDeleteShape={onDeleteShape}
            onCreateShape={onCreateShape}
            onTriggerNote={onTriggerNote}
            onNoteOn={onNoteOn}
            onNoteOff={onNoteOff}
          />
        </div>
      </div>
    </>
  );
};
