/**
 * Filter Quick Search Modal (Command Palette for Filters).
 * Fast autocomplete search across filter presets and user filters.
 * Australian English spelling maintained.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, CornerDownLeft, ArrowUp, ArrowDown, Filter as FilterIcon, Layers, Radio, Music, User, ExternalLink } from 'lucide-react';
import { Filter } from '../core/types';

export interface FilterQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Filter[];
  activeFilterId?: string;
  onSelectFilter: (filterId: string) => void;
  onOpenFilterPanel?: () => void;
}

export const FilterQuickSearchModal: React.FC<FilterQuickSearchModalProps> = ({
  isOpen,
  onClose,
  filters,
  activeFilterId,
  onSelectFilter,
  onOpenFilterPanel,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filters;
    return filters.filter((f) => {
      const nameMatch = f.name.toLowerCase().includes(q);
      const catMatch = ((f.category || f.origin) ?? '').toLowerCase().includes(q);
      const descMatch = (f.description || '').toLowerCase().includes(q);
      return nameMatch || catMatch || descMatch;
    });
  }, [filters, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      const currentIdx = filters.findIndex(
        (f) => (f.id || f.presetId) === activeFilterId
      );
      setSelectedIndex(currentIdx >= 0 ? currentIdx : 0);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen, filters, activeFilterId]);

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

  const handleApply = (f: Filter, openPanel = false) => {
    const id = f.id || f.presetId || '';
    if (id) {
      onSelectFilter(id);
    }
    if (openPanel && onOpenFilterPanel) {
      onOpenFilterPanel();
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredList.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % filteredList.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredList.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + filteredList.length) % filteredList.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) {
        onOpenFilterPanel?.();
        onClose();
        return;
      }
      const target = filteredList[selectedIndex];
      if (target) {
        handleApply(target, false);
      }
    }
  };

  const getCategoryBadge = (f: Filter) => {
    if (f.origin === 'user') {
      return { label: 'User', cls: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60' };
    }
    switch (f.category) {
      case 'aperture':
        return { label: 'Aperture', cls: 'bg-sky-950/80 text-sky-300 border-sky-700/60' };
      case 'rhythm':
        return { label: 'Rhythm', cls: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60' };
      case 'interval':
        return { label: 'Interval', cls: 'bg-amber-950/80 text-amber-300 border-amber-700/60' };
      case 'harmonic':
        return { label: 'Harmonic', cls: 'bg-purple-950/80 text-purple-300 border-purple-700/60' };
      default:
        return { label: 'Filter', cls: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const getCategoryIcon = (f: Filter) => {
    if (f.origin === 'user') return <User className="w-3.5 h-3.5 text-cyan-400" />;
    switch (f.category) {
      case 'aperture':
        return <FilterIcon className="w-3.5 h-3.5 text-sky-400" />;
      case 'rhythm':
        return <Radio className="w-3.5 h-3.5 text-emerald-400" />;
      case 'interval':
        return <Music className="w-3.5 h-3.5 text-amber-400" />;
      case 'harmonic':
        return <Layers className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <FilterIcon className="w-3.5 h-3.5 text-slate-400" />;
    }
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
          <Search className="w-4 h-4 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search filters by name, category (rhythm, aperture, interval, harmonic)..."
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
          {filteredList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              No filters matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredList.map((f, idx) => {
              const fId = f.id || f.presetId || '';
              const isSelected = idx === selectedIndex;
              const isActive = fId === activeFilterId;
              const badge = getCategoryBadge(f);
              const conditionsCount = f.conditions.length;

              return (
                <button
                  key={fId}
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleApply(f, false)}
                  className={`w-full text-left px-3 py-2 rounded-xl border transition flex items-start justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600/20 border-sky-500/60 text-white shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                      : 'bg-slate-900/40 border-transparent hover:bg-slate-900/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="pt-0.5 shrink-0">
                      {getCategoryIcon(f)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white truncate">{f.name}</span>
                        {isActive && (
                          <span className="px-1.5 py-0.2 rounded bg-sky-500/30 border border-sky-500/50 text-[9px] font-mono text-sky-200 font-semibold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      {f.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-1">{f.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[9px] font-mono text-slate-400">
                      {conditionsCount} {conditionsCount === 1 ? 'cond' : 'conds'}
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

        {/* Footer Navigation Hints & Panel Launcher */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/90 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-slate-300" />
              <ArrowDown className="w-3 h-3 text-slate-300" />
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3 text-sky-400" />
              <span>Load (Enter)</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenFilterPanel && (
              <button
                type="button"
                onClick={() => {
                  const target = filteredList[selectedIndex];
                  if (target) {
                    handleApply(target, true);
                  } else {
                    onOpenFilterPanel();
                    onClose();
                  }
                }}
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition cursor-pointer"
                title="Load and open the full Filters & Rhythm Sieves panel (Shift+Enter)"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open Panel (Shift+Enter)</span>
              </button>
            )}
            <span className="text-slate-500">· Shift + F</span>
          </div>
        </div>
      </div>
    </div>
  );
};
