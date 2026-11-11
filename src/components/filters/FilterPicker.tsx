/**
 * Filter Picker component for the Filters & Rhythm Sieves Sheet.
 * Mobile-first filter preset selection with category chips and structured dropdown.
 * Australian English spelling maintained.
 */

import React, { useMemo, useState } from 'react';
import { ChevronDown, Filter as FilterIcon, Layers, Radio, Music, User } from 'lucide-react';
import { Filter } from '../../core/types';

export interface FilterPickerProps {
  currentFilter: Filter;
  allFilters: Filter[];
  onSelectFilter: (filterId: string) => void;
}

type FilterCategoryChip = 'all' | 'aperture' | 'rhythm' | 'interval' | 'harmonic' | 'user';

export const FilterPicker: React.FC<FilterPickerProps> = ({
  currentFilter,
  allFilters,
  onSelectFilter,
}) => {
  const [filterCategory, setFilterCategory] = useState<FilterCategoryChip>('all');

  const counts = useMemo(() => {
    return {
      all: allFilters.length,
      aperture: allFilters.filter((f) => f.origin === 'preset' && f.category === 'aperture').length,
      rhythm: allFilters.filter((f) => f.origin === 'preset' && f.category === 'rhythm').length,
      interval: allFilters.filter((f) => f.origin === 'preset' && f.category === 'interval').length,
      harmonic: allFilters.filter((f) => f.origin === 'preset' && f.category === 'harmonic').length,
      user: allFilters.filter((f) => f.origin !== 'preset').length,
    };
  }, [allFilters]);

  const filteredList = useMemo(() => {
    if (filterCategory === 'all') return allFilters;
    if (filterCategory === 'user') return allFilters.filter((f) => f.origin !== 'preset');
    return allFilters.filter((f) => f.origin === 'preset' && f.category === filterCategory);
  }, [allFilters, filterCategory]);

  const getCategoryIcon = (category?: string, origin?: string) => {
    if (origin === 'user') return <User className="w-3.5 h-3.5 text-cyan-400" />;
    switch (category) {
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

  const activeId = currentFilter.id || currentFilter.presetId || '';

  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
      {/* Category Filter Chips */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => setFilterCategory('all')}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition shrink-0 cursor-pointer ${
            filterCategory === 'all'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({counts.all})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('aperture')}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition shrink-0 cursor-pointer ${
            filterCategory === 'aperture'
              ? 'bg-sky-600/90 text-white shadow-sm'
              : 'bg-slate-900 text-sky-400/80 hover:text-sky-300'
          }`}
        >
          Aperture ({counts.aperture})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('rhythm')}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition shrink-0 cursor-pointer ${
            filterCategory === 'rhythm'
              ? 'bg-emerald-600/90 text-white shadow-sm'
              : 'bg-slate-900 text-emerald-400/80 hover:text-emerald-300'
          }`}
        >
          Rhythm ({counts.rhythm})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('interval')}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition shrink-0 cursor-pointer ${
            filterCategory === 'interval'
              ? 'bg-amber-600/90 text-white shadow-sm'
              : 'bg-slate-900 text-amber-400/80 hover:text-amber-300'
          }`}
        >
          Interval ({counts.interval})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('harmonic')}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition shrink-0 cursor-pointer ${
            filterCategory === 'harmonic'
              ? 'bg-purple-600/90 text-white shadow-sm'
              : 'bg-slate-900 text-purple-400/80 hover:text-purple-300'
          }`}
        >
          Harmonic ({counts.harmonic})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('user')}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition shrink-0 cursor-pointer ${
            filterCategory === 'user'
              ? 'bg-cyan-600/90 text-white shadow-sm'
              : 'bg-slate-900 text-cyan-400/80 hover:text-cyan-300'
          }`}
        >
          User ({counts.user})
        </button>
      </div>

      {/* Structured Dropdown Selector */}
      <div className="relative">
        <select
          value={activeId}
          onChange={(e) => onSelectFilter(e.target.value)}
          className="w-full appearance-none bg-slate-900/90 border border-slate-700 hover:border-slate-600 focus:border-sky-500 rounded-lg pl-8 pr-8 py-2 text-xs font-semibold text-white focus:outline-none transition cursor-pointer shadow-sm truncate"
        >
          {filteredList.map((f) => {
            const fId = f.id || f.presetId || '';
            const cCount = f.conditions.length;
            const categoryLabel = f.origin === 'user' ? 'User' : (f.category || 'Preset');
            return (
              <option key={fId} value={fId} className="bg-slate-900 text-white py-1">
                {f.name} [{categoryLabel}] — {cCount} {cCount === 1 ? 'condition' : 'conditions'}
              </option>
            );
          })}
        </select>
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {getCategoryIcon(currentFilter.category, currentFilter.origin)}
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
};
