/**
 * Envelope Quick Search Modal (Command Palette for Envelopes).
 * Fast autocomplete search across envelope presets and user envelopes.
 * Press Enter to apply, or Shift+Enter to apply and open Envelope Studio.
 * Australian English spelling maintained.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, CornerDownLeft, ArrowUp, ArrowDown, Activity, Music, Radio, User } from 'lucide-react';
import { Envelope } from '../core/types';

export interface EnvelopeQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  envelopes: Envelope[];
  activeEnvelopeId?: string;
  onSelectEnvelope: (envelopeId: string) => void;
  onOpenEnvelopeStudio?: () => void;
}

export const EnvelopeQuickSearchModal: React.FC<EnvelopeQuickSearchModalProps> = ({
  isOpen,
  onClose,
  envelopes,
  activeEnvelopeId,
  onSelectEnvelope,
  onOpenEnvelopeStudio,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return envelopes;
    return envelopes.filter((env) => {
      const nameMatch = env.name.toLowerCase().includes(q);
      const catMatch = ((env.category || env.origin) ?? '').toLowerCase().includes(q);
      const descMatch = (env.description || '').toLowerCase().includes(q);
      return nameMatch || catMatch || descMatch;
    });
  }, [envelopes, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      const currentIdx = envelopes.findIndex((e) => e.id === activeEnvelopeId);
      setSelectedIndex(currentIdx >= 0 ? currentIdx : 0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen, envelopes, activeEnvelopeId]);

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

  const handleApply = (env: Envelope, openStudio = false) => {
    onSelectEnvelope(env.id);
    if (openStudio && onOpenEnvelopeStudio) {
      onOpenEnvelopeStudio();
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
      const target = filteredList[selectedIndex];
      if (target) {
        handleApply(target, e.shiftKey);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-lg bg-[#0d111a]/95 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800 bg-slate-900/60">
          <Search className="w-4 h-4 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Quick search envelopes (pitch, rhythm, piano, swell...)"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none font-medium"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-1.5 space-y-0.5">
          {filteredList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              No envelopes matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredList.map((env, idx) => {
              const isSelected = idx === selectedIndex;
              const isActive = env.id === activeEnvelopeId;
              const badge =
                env.origin === 'user'
                  ? { label: 'User', cls: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60', icon: <User className="w-2.5 h-2.5" /> }
                  : env.category === 'rhythm'
                  ? { label: `${env.supercycleLength}x Rhythm`, cls: 'bg-amber-950/80 text-amber-300 border-amber-700/60', icon: <Radio className="w-2.5 h-2.5" /> }
                  : { label: 'Pitch', cls: 'bg-purple-950/80 text-purple-300 border-purple-700/60', icon: <Music className="w-2.5 h-2.5" /> };
              return (
                <button
                  key={env.id}
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={(e) => handleApply(env, e.shiftKey)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-950/50 border border-amber-500/40 text-white'
                      : 'border border-transparent text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-semibold text-xs truncate">{env.name}</span>
                      {isActive && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    {env.description && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 pl-5">
                        {env.description}
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-mono shrink-0 ${badge.cls}`}>
                    {badge.icon}
                    {badge.label}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between px-3.5 py-2 border-t border-slate-800 bg-slate-900/80 text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" /> Navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3 text-amber-400" /> Apply
            </span>
            <span className="hidden sm:flex items-center gap-1 text-amber-300">
              Shift+Enter: Apply &amp; Open Studio
            </span>
          </div>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
