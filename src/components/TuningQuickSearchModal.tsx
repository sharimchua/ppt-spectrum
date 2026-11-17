/**
 * Tuning Quick Search Modal (Command Palette for Tuning Systems).
 * Fast autocomplete search across PPT tuning presets (Shift+T).
 * Press Enter to apply, or Shift+Enter to open the floating Tuning & Rhythm Map window.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CornerDownLeft, Search, Sliders, X } from 'lucide-react';
import {
  MIDI_TUNING_PRESETS,
  MidiTuningPresetId,
} from '../core/midi-tuning';

export interface TuningQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePresetId: MidiTuningPresetId;
  onSelectPreset: (presetId: Exclude<MidiTuningPresetId, 'custom'>) => void;
  onOpenTuningStudio: () => void;
}

interface TuningPresetOption {
  id: Exclude<MidiTuningPresetId, 'custom'>;
  label: string;
  description: string;
}

const TUNING_OPTIONS: TuningPresetOption[] = (
  Object.keys(MIDI_TUNING_PRESETS) as Array<Exclude<MidiTuningPresetId, 'custom'>>
).map((id) => ({
  id,
  label: MIDI_TUNING_PRESETS[id].label,
  description: MIDI_TUNING_PRESETS[id].description,
}));

export const TuningQuickSearchModal: React.FC<TuningQuickSearchModalProps> = ({
  isOpen,
  onClose,
  activePresetId,
  onSelectPreset,
  onOpenTuningStudio,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TUNING_OPTIONS;
    return TUNING_OPTIONS.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.id.toLowerCase().includes(q) ||
        opt.description.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      const currentIdx = TUNING_OPTIONS.findIndex((o) => o.id === activePresetId);
      setSelectedIndex(currentIdx >= 0 ? currentIdx : 0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen, activePresetId]);

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

  const handleApply = (opt: TuningPresetOption) => {
    onSelectPreset(opt.id);
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
        onOpenTuningStudio();
        onClose();
        return;
      }
      const selected = filteredList[selectedIndex];
      if (selected) {
        handleApply(selected);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Tuning Quick Search"
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800">
          <Search className="w-4 h-4 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tuning presets (DuTri, PPT Native, 5-Limit, 12-TET…)"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={listRef} className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filteredList.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No matching tuning presets.
            </div>
          ) : (
            filteredList.map((opt, idx) => {
              const isSelected = idx === selectedIndex;
              const isActive = opt.id === activePresetId;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleApply(opt)}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-start justify-between gap-3 transition cursor-pointer ${
                    isSelected ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-xs font-semibold">{opt.label}</span>
                      {isActive && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{opt.description}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" />
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" />
              Apply
            </span>
          </div>
          <span>Shift+Enter: Tuning Window</span>
        </div>
      </div>
    </div>
  );
};
