/**
 * Shape Picker component for the Shape Synthesiser / Library.
 * Mobile-first shape selection with category filter chips and structured dropdown.
 * Australian English spelling maintained.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Shape } from '../../core/types';
import { getShapeAnchors } from '../../core/shape';

export interface ShapePickerProps {
  currentShape: Shape;
  allShapes: Shape[];
  onSelectShape?: (shapeId: string) => void;
}

type CategoryFilter = 'all' | 'rhythm' | 'harmony' | 'timbre' | 'user';

export const ShapePicker: React.FC<ShapePickerProps> = ({
  currentShape,
  allShapes,
  onSelectShape,
}) => {
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [selectedId, setSelectedId] = useState<string>(currentShape.id);

  // Synchronise selectedId whenever active shape changes externally
  useEffect(() => {
    setSelectedId(currentShape.id);
  }, [currentShape.id]);

  const counts = useMemo(() => {
    return {
      all: allShapes.length,
      rhythm: allShapes.filter((s) => s.origin === 'preset' && s.category === 'rhythm').length,
      harmony: allShapes.filter((s) => s.origin === 'preset' && s.category === 'harmony').length,
      timbre: allShapes.filter(
        (s) => s.origin === 'preset' && (s.category === 'timbre' || (!s.category && s.origin === 'preset'))
      ).length,
      user: allShapes.filter((s) => s.origin !== 'preset').length,
    };
  }, [allShapes]);

  // If user presets become empty while on the user tab, reset to 'all'
  useEffect(() => {
    if (filter === 'user' && counts.user === 0) {
      setFilter('all');
    }
  }, [filter, counts.user]);

  const filteredShapes = useMemo(() => {
    if (filter === 'all') return allShapes;
    if (filter === 'rhythm') return allShapes.filter((s) => s.origin === 'preset' && s.category === 'rhythm');
    if (filter === 'harmony') return allShapes.filter((s) => s.origin === 'preset' && s.category === 'harmony');
    if (filter === 'timbre') {
      return allShapes.filter(
        (s) => s.origin === 'preset' && (s.category === 'timbre' || (!s.category && s.origin === 'preset'))
      );
    }
    return allShapes.filter((s) => s.origin !== 'preset');
  }, [allShapes, filter]);

  // Keep selectedId within the active category list
  useEffect(() => {
    if (filteredShapes.length > 0 && !filteredShapes.some((s) => s.id === selectedId)) {
      setSelectedId(filteredShapes[0].id);
    }
  }, [filteredShapes, selectedId]);

  if (!onSelectShape || allShapes.length === 0) {
    return <span className="font-bold text-sm text-white truncate block">{currentShape.name}</span>;
  }

  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
      {/* Category Filter Chips - horizontal scrollable on mobile */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition shrink-0 cursor-pointer ${
            filter === 'all'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({counts.all})
        </button>
        <button
          type="button"
          onClick={() => setFilter('rhythm')}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition shrink-0 cursor-pointer ${
            filter === 'rhythm'
              ? 'bg-amber-600/90 text-white shadow-sm'
              : 'bg-slate-900 text-amber-400/80 hover:text-amber-300'
          }`}
        >
          Rhythm ({counts.rhythm})
        </button>
        <button
          type="button"
          onClick={() => setFilter('harmony')}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition shrink-0 cursor-pointer ${
            filter === 'harmony'
              ? 'bg-purple-600/90 text-white shadow-sm'
              : 'bg-slate-900 text-purple-400/80 hover:text-purple-300'
          }`}
        >
          Harmony ({counts.harmony})
        </button>
        <button
          type="button"
          onClick={() => setFilter('timbre')}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition shrink-0 cursor-pointer ${
            filter === 'timbre'
              ? 'bg-emerald-600/90 text-white shadow-sm'
              : 'bg-slate-900 text-emerald-400/80 hover:text-emerald-300'
          }`}
        >
          Timbre ({counts.timbre})
        </button>
        {counts.user > 0 && (
          <button
            type="button"
            onClick={() => setFilter('user')}
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition shrink-0 cursor-pointer ${
              filter === 'user'
                ? 'bg-cyan-600/90 text-white shadow-sm'
                : 'bg-slate-900 text-cyan-400/80 hover:text-cyan-300'
            }`}
          >
            User ({counts.user})
          </button>
        )}
      </div>

      {/* Select Dropdown & Explicit Load Button */}
      <div className="flex items-center gap-2 w-full min-w-0">
        <div className="relative flex-1 min-w-0">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSelectShape(selectedId);
              }
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-red-500 cursor-pointer pr-7 appearance-none truncate"
          >
            {filteredShapes.map((s) => {
              const anchorsLen = getShapeAnchors(s).length;
              const partialsLen = s.partials.length;
              const subtitle = `${anchorsLen} ${anchorsLen === 1 ? 'anchor' : 'anchors'} · ${partialsLen} ${
                partialsLen === 1 ? 'partial' : 'partials'
              }`;
              return (
                <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200 font-normal">
                  {s.name} ({subtitle})
                </option>
              );
            })}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>

        <button
          type="button"
          onClick={() => onSelectShape(selectedId)}
          disabled={selectedId === currentShape.id}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 shrink-0 ${
            selectedId === currentShape.id
              ? 'bg-slate-800 text-slate-500 cursor-default'
              : 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-sm active:scale-95'
          }`}
          title={selectedId === currentShape.id ? 'Preset already loaded' : 'Load selected preset into synthesiser'}
        >
          {selectedId === currentShape.id ? 'Loaded' : 'Load'}
        </button>
      </div>
    </div>
  );
};
