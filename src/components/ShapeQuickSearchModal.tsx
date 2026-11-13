import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Shape } from '../core/types';
import { getShapeAnchors } from '../core/shape';
import { Search, X, CornerDownLeft, ArrowUp, ArrowDown, Layers } from 'lucide-react';

interface ShapeQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  shapes: Shape[];
  activeShapeId?: string;
  onSelectShape: (shapeId: string) => void;
  onOpenShapeEditor?: () => void;
}

export const ShapeQuickSearchModal: React.FC<ShapeQuickSearchModalProps> = ({
  isOpen,
  onClose,
  shapes,
  activeShapeId,
  onSelectShape,
  onOpenShapeEditor,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredShapes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shapes;
    return shapes.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(q);
      const catMatch = (s.category || s.origin).toLowerCase().includes(q);
      const descMatch = (s.description || '').toLowerCase().includes(q);
      return nameMatch || catMatch || descMatch;
    });
  }, [shapes, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      const currentIdx = shapes.findIndex((s) => s.id === activeShapeId);
      setSelectedIndex(currentIdx >= 0 ? currentIdx : 0);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen, shapes, activeShapeId]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!listRef.current) return;
    const itemEl = listRef.current.querySelector(`[data-idx="${selectedIndex}"]`) as HTMLElement | null;
    if (itemEl && typeof itemEl.scrollIntoView === 'function') {
      itemEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredShapes.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % filteredShapes.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredShapes.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + filteredShapes.length) % filteredShapes.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const target = filteredShapes[selectedIndex];
      if (target) {
        onSelectShape(target.id);
        if (e.shiftKey) {
          onOpenShapeEditor?.();
        }
        onClose();
      }
    }
  };

  const getCategoryBadge = (s: Shape) => {
    if (s.origin !== 'preset') {
      return { label: 'User', cls: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60' };
    }
    if (s.category === 'rhythm') {
      return { label: 'Rhythm', cls: 'bg-amber-950/80 text-amber-300 border-amber-700/60' };
    }
    if (s.category === 'harmony') {
      return { label: 'Harmony', cls: 'bg-purple-950/80 text-purple-300 border-purple-700/60' };
    }
    return { label: 'Timbre', cls: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60' };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-3 bg-black/70 backdrop-blur-md animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#0b0e17] border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800 bg-slate-900/80">
          <Search className="w-4 h-4 text-red-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shapes by name, category (rhythm, harmony, timbre), or ratio..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[10px] font-mono text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Autocomplete Results List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredShapes.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              No shapes matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredShapes.map((s, idx) => {
              const isSelected = idx === selectedIndex;
              const isActive = s.id === activeShapeId;
              const badge = getCategoryBadge(s);
              const anchorsCount = getShapeAnchors(s).length;

              return (
                <button
                  key={s.id}
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    onSelectShape(s.id);
                    onClose();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl border transition flex items-start justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-red-600/20 border-red-500/60 text-white shadow-[0_0_12px_rgba(225,54,16,0.2)]'
                      : 'bg-slate-900/40 border-transparent hover:bg-slate-900/80 text-slate-300'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white truncate">{s.name}</span>
                      {isActive && (
                        <span className="px-1.5 py-0.2 rounded bg-red-500/30 border border-red-500/50 text-[9px] font-mono text-red-200 font-semibold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-[10px] text-slate-400 line-clamp-1">{s.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[9px] font-mono text-slate-400">
                      <Layers className="w-2.5 h-2.5 text-slate-500" />
                      {anchorsCount}A / {s.partials.length}P
                    </span>
                    <span className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Keyboard Hints */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/90 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-slate-300" />
              <ArrowDown className="w-3 h-3 text-slate-300" />
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3 text-red-400" />
              <span>Select</span>
            </span>
            <span className="hidden sm:inline text-red-300">
              Shift+Enter: Open Studio
            </span>
          </div>
          <span>Esc to dismiss • Shift + L</span>
        </div>
      </div>
    </div>
  );
};
