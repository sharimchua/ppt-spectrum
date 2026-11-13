import React, { useState, useEffect } from 'react';
import { Lock, User, Sliders } from 'lucide-react';
import { Filter, FilterCondition, MAX_CONDITIONS } from '../../core/filter-types';
import { FilterSummaryBar } from './FilterSummaryBar';
import { ConditionCard } from './ConditionCard';
import { PresetPicker } from './PresetPicker';
import { FilterPicker } from './FilterPicker';
import { FilterActionsMenu } from './FilterActionsMenu';
import { FloatingStudioWindow } from '../FloatingStudioWindow';

interface FiltersSheetProps {
  isOpen: boolean;
  filter: Filter;
  allFilters?: Filter[];
  onSelectFilter?: (filterId: string) => void;
  onForkFilter?: () => void;
  onDuplicateFilter?: () => void;
  onDeleteFilter?: (filterId: string) => void;
  onCreateNewFilter?: () => void;
  onRenameFilter?: (name: string) => void;
  onClose: () => void;
  onToggleEnabled: () => void;
  onUpdateFilter: (patch: Partial<Omit<Filter, 'conditions'>>) => void;
  onAddCondition: (condition: FilterCondition) => void;
  onUpdateCondition: (id: string, condition: FilterCondition) => void;
  onRemoveCondition: (id: string) => void;
  onMoveCondition: (id: string, direction: 'up' | 'down') => void;
  onFocusCondition: (id: string) => void;
  onEnterFilterEditMode?: () => void;
}

export const FiltersSheet: React.FC<FiltersSheetProps> = ({
  isOpen,
  filter,
  allFilters,
  onSelectFilter,
  onForkFilter,
  onDuplicateFilter,
  onDeleteFilter,
  onCreateNewFilter,
  onRenameFilter,
  onClose,
  onToggleEnabled,
  onUpdateFilter,
  onAddCondition,
  onUpdateCondition,
  onRemoveCondition,
  onMoveCondition,
  onFocusCondition,
  onEnterFilterEditMode,
}) => {
  const [isPresetPickerOpen, setIsPresetPickerOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const defaultX = typeof window !== 'undefined' ? Math.max(24, window.innerWidth - 540) : 640;

  return (
    <>
      <FloatingStudioWindow
        isOpen={isOpen}
        onClose={onClose}
        icon={
          <div className="w-6 h-6 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs border border-sky-500/30 shrink-0">
            ⊛
          </div>
        }
        title="Filters & Rhythm Sieves"
        subtitle="Aperture formants · Interval windows · Rhythm sieves"
        defaultPosition={{ x: defaultX, y: 100 }}
        desktopWidthClass="w-[480px] lg:w-[510px]"
        ariaLabel="Acoustic Aperture and Sieve Filters"
        headerActions={
          <div className="flex items-center gap-1.5">
            {onEnterFilterEditMode && (
              <button
                type="button"
                onClick={onEnterFilterEditMode}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border border-sky-500/40 bg-sky-950/50 text-sky-300 hover:bg-sky-900/60 transition cursor-pointer"
                title="Scrub Spectral Filter on Canvas (E)"
              >
                <Sliders className="w-3 h-3" />
                <span className="hidden sm:inline">Scrub</span>
              </button>
            )}
            <button
              type="button"
              onClick={onToggleEnabled}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                filter.enabled
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Filter Bypass (F)"
            >
              {filter.enabled ? 'ON' : 'BYPASS'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Filter Preset / Library Header Bar */}
          {allFilters && onSelectFilter && (
            <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              {/* ROW 1: Filter picker with category chips, dropdown, and Load button */}
              <FilterPicker
                currentFilter={filter}
                allFilters={allFilters}
                onSelectFilter={onSelectFilter}
              />

              {/* ROW 2: Origin status & action toolbar */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                <div className="flex items-center gap-1.5 min-w-0">
                  {filter.origin === 'user' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 shrink-0">
                      <User className="w-3 h-3" />
                      <span>User Filter</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60 shrink-0">
                      <Lock className="w-3 h-3" />
                      <span>Preset</span>
                    </span>
                  )}
                  {filter.description && (
                    <span className="text-[10px] text-slate-400 font-mono italic truncate hidden sm:inline">
                      {filter.description}
                    </span>
                  )}
                </div>

                <FilterActionsMenu
                  filter={filter}
                  isPreset={filter.origin === 'preset' || !filter.origin}
                  onUpdateFilterName={onRenameFilter || (() => {})}
                  onForkFilter={onForkFilter || (() => {})}
                  onDuplicateFilter={onDuplicateFilter || (() => {})}
                  onDeleteFilter={onDeleteFilter}
                  onCreateNewFilter={onCreateNewFilter || (() => {})}
                />
              </div>
            </div>
          )}

          {/* Summary / Global Parameters Bar */}
          <FilterSummaryBar filter={filter} onChange={onUpdateFilter} />

          {/* Conditions Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Conditions ({filter.conditions.length}/{MAX_CONDITIONS})
              </span>

              {filter.conditions.length < MAX_CONDITIONS && (
                <button
                  type="button"
                  onClick={() => setIsPresetPickerOpen(true)}
                  className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                >
                  + Add Condition
                </button>
              )}
            </div>

            {/* Condition Cards */}
            {filter.conditions.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {filter.conditions.map((cond, idx) => {
                  const isFocused = filter.focus?.conditionId === cond.id;
                  return (
                    <ConditionCard
                      key={cond.id}
                      condition={cond}
                      index={idx}
                      totalConditions={filter.conditions.length}
                      isFocused={isFocused}
                      onSetFocus={() => onFocusCondition(cond.id)}
                      onMoveUp={() => onMoveCondition(cond.id, 'up')}
                      onMoveDown={() => onMoveCondition(cond.id, 'down')}
                      onDelete={() => onRemoveCondition(cond.id)}
                      onChange={(updated) => onUpdateCondition(cond.id, updated)}
                    />
                  );
                })}
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-slate-800 text-center gap-3 bg-slate-900/30">
                <span className="text-2xl">⊛</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300">No Filter Conditions</span>
                  <span className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    Add frequency apertures or rhythm cycle sieves to sculpt the sound spectrum.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPresetPickerOpen(true)}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold transition-all"
                >
                  + Add Condition
                </button>
              </div>
            )}
          </div>
        </div>
      </FloatingStudioWindow>

      {/* Preset Picker Modal */}
      <PresetPicker
        isOpen={isPresetPickerOpen}
        onClose={() => setIsPresetPickerOpen(false)}
        onAddCondition={onAddCondition}
      />
    </>
  );
};
