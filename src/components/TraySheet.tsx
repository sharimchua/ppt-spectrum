import React from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { Shape } from '../core/types';
import { ShapeEditor } from './ShapeEditor';

interface TraySheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeShape: Shape | undefined;
  onUpdateShape: (shape: Shape) => void;
}

export const TraySheet: React.FC<TraySheetProps> = ({
  isOpen,
  onClose,
  activeShape,
  onUpdateShape,
}) => {
  if (!isOpen || !activeShape) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-[#090c14]/95 backdrop-blur-xl border-t border-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] transition-all animate-in slide-in-from-bottom duration-200 max-h-[85vh] sm:max-h-[60vh] flex flex-col">
      {/* Top Grab Handle & Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-ppt-do" />
          <span className="font-bold text-xs sm:text-sm text-white tracking-wide">
            Shape Synthesiser: <span className="text-ppt-do">{activeShape.name}</span>
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Close Shape Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content */}
      <div className="p-4 overflow-y-auto flex-1">
        <div className="max-w-3xl mx-auto">
          <ShapeEditor shape={activeShape} onUpdateShape={onUpdateShape} />
        </div>
      </div>
    </div>
  );
};
