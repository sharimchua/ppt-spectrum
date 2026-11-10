import React, { useState } from 'react';
import { Filter, FilterCondition, MAX_CONDITIONS } from '../../core/filter-types';
import { FilterSummaryBar } from './FilterSummaryBar';
import { ConditionCard } from './ConditionCard';
import { PresetPicker } from './PresetPicker';

interface FiltersSheetProps {
  isOpen: boolean;
  filter: Filter;
  onClose: () => void;
  onToggleEnabled: () => void;
  onUpdateFilter: (patch: Partial<Omit<Filter, 'conditions'>>) => void;
  onAddCondition: (condition: FilterCondition) => void;
  onUpdateCondition: (id: string, condition: FilterCondition) => void;
  onRemoveCondition: (id: string) => void;
  onMoveCondition: (id: string, direction: 'up' | 'down') => void;
  onApplyStarter: (filter: Filter) => void;
  onFocusCondition: (id: string) => void;
}

export const FiltersSheet: React.FC<FiltersSheetProps> = ({
  isOpen,
  filter,
  onClose,
  onToggleEnabled,
  onUpdateFilter,
  onAddCondition,
  onUpdateCondition,
  onRemoveCondition,
  onMoveCondition,
  onApplyStarter,
  onFocusCondition,
}) => {
  const [isPresetPickerOpen, setIsPresetPickerOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Container: Mobile Bottom Sheet / Desktop Right Drawer */}
      <aside
        role="dialog"
        aria-label="Acoustic Aperture and Sieve Filters"
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[92vh] sm:max-h-none sm:top-0 sm:bottom-0 sm:right-0 sm:left-auto sm:w-[460px] bg-slate-900 border-t sm:border-t-0 sm:border-l border-slate-700 shadow-2xl rounded-t-2xl sm:rounded-none transition-transform duration-300 pb-[env(safe-area-inset-bottom)] animate-slide-up"
      >
        {/* Mobile Drag Indicator */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm border border-sky-500/30">
              ⊛
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                Filters & Rhythm Sieves
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                Aperture formants · Interval windows · Rhythm sieves
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Enable/Bypass Toggle */}
            <button
              type="button"
              onClick={onToggleEnabled}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all border ${
                filter.enabled
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter.enabled ? 'ACTIVE' : 'BYPASS'}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
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
                  Explore Presets & Conditions
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Preset Picker Modal */}
      <PresetPicker
        isOpen={isPresetPickerOpen}
        onClose={() => setIsPresetPickerOpen(false)}
        onSelectStarter={onApplyStarter}
        onAddCondition={onAddCondition}
      />
    </>
  );
};
