/**
 * Dedicated Filters state management and interactive HUD mode hook.
 * Manages Filters sheet visibility, condition CRUD, canvas aperture parameter scrubbing, and mode cycling.
 * Follows Australian English spelling conventions.
 */

import { useState, useCallback, useMemo } from 'react';
import { Scene, SpanView, Filter, FilterCondition } from '../../core/types';
import { PRESET_FILTERS } from '../../core/filter-presets';
import {
  setFilterEnabled,
  updateFilter,
  addCondition,
  updateCondition,
  removeCondition,
  moveCondition,
  applyStarterPreset,
  patchFocusedSpan,
  cycleSpectralPreset,
  setPrimaryFilter,
  forkFilter,
  duplicateFilter,
  deleteUserFilter,
  createUserFilter,
  renameActiveFilter,
} from '../../core/scene-ops';

export type FilterControlParam = 'centre' | 'width' | 'skirt';

export interface UseFiltersOptions {
  scene: Scene;
  updateScene: (updater: Scene | ((prev: Scene) => Scene)) => void;
}

export interface UseFiltersResult {
  isFiltersOpen: boolean;
  openFilters: () => void;
  closeFilters: () => void;
  toggleFiltersOpen: () => void;
  isFilterEditMode: boolean;
  setIsFilterEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  filterControlParam: FilterControlParam;
  setFilterControlParam: React.Dispatch<React.SetStateAction<FilterControlParam>>;
  handleUpdateFilterCentreD: (centreD: number) => void;
  handleUpdateFilterParams: (params: Partial<SpanView>) => void;
  handleEnterFilterEditMode: (param?: FilterControlParam) => void;
  handleCycleFilterMode: () => void;
  toggleFilter: () => void;
  toggleFilterEditMode: () => void;
  updateFilterState: (patch: Partial<Omit<Filter, 'conditions'>>) => void;
  addFilterCondition: (condition: FilterCondition) => void;
  updateFilterCondition: (id: string, condition: FilterCondition) => void;
  removeFilterCondition: (id: string) => void;
  moveFilterCondition: (id: string, direction: 'up' | 'down') => void;
  applyStarter: (starter: Filter) => void;
  focusCondition: (conditionId: string) => void;
  // Filter Library
  allFilters: Filter[];
  handleSelectFilter: (filterId: string) => void;
  handleForkFilter: () => void;
  handleDuplicateFilter: () => void;
  handleDeleteFilter: (filterId: string) => void;
  handleCreateNewFilter: () => void;
  handleRenameFilter: (name: string) => void;
}

export function useFilters({ scene, updateScene }: UseFiltersOptions): UseFiltersResult {
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
  const [isFilterEditMode, setIsFilterEditMode] = useState<boolean>(false);
  const [filterControlParam, setFilterControlParam] = useState<FilterControlParam>('centre');

  const openFilters = useCallback(() => setIsFiltersOpen(true), []);
  const closeFilters = useCallback(() => setIsFiltersOpen(false), []);
  const toggleFiltersOpen = useCallback(() => setIsFiltersOpen((prev) => !prev), []);

  const handleUpdateFilterCentreD = useCallback(
    (centreD: number) => {
      updateScene((prev) => {
        const patchedFilter = patchFocusedSpan(prev.filter, { centreD });
        return { ...prev, filter: { ...patchedFilter, enabled: true } };
      });
    },
    [updateScene]
  );

  const handleUpdateFilterParams = useCallback(
    (params: Partial<SpanView>) => {
      updateScene((prev) => {
        const patchedFilter = patchFocusedSpan(prev.filter, params);
        return { ...prev, filter: { ...patchedFilter, enabled: true } };
      });
    },
    [updateScene]
  );

  const handleEnterFilterEditMode = useCallback(
    (param: FilterControlParam = 'centre') => {
      setFilterControlParam(param);
      setIsFilterEditMode(true);
      updateScene((prev) => setFilterEnabled(prev, true));
    },
    [updateScene]
  );

  const toggleFilterEditMode = useCallback(() => {
    setIsFilterEditMode((prev) => {
      const next = !prev;
      if (next) {
        updateScene((sc) => setFilterEnabled(sc, true));
      }
      return next;
    });
  }, [updateScene]);

  const handleCycleFilterMode = useCallback(() => {
    updateScene((prev) => cycleSpectralPreset(prev));
  }, [updateScene]);

  const toggleFilter = useCallback(() => {
    updateScene((prev) => setFilterEnabled(prev));
  }, [updateScene]);

  const updateFilterState = useCallback(
    (patch: Partial<Omit<Filter, 'conditions'>>) => {
      updateScene((prev) => updateFilter(prev, patch));
    },
    [updateScene]
  );

  const addFilterCondition = useCallback(
    (condition: FilterCondition) => {
      updateScene((prev) => addCondition(prev, condition));
    },
    [updateScene]
  );

  const updateFilterCondition = useCallback(
    (id: string, condition: FilterCondition) => {
      updateScene((prev) => updateCondition(prev, id, condition));
    },
    [updateScene]
  );

  const removeFilterCondition = useCallback(
    (id: string) => {
      updateScene((prev) => removeCondition(prev, id));
    },
    [updateScene]
  );

  const moveFilterCondition = useCallback(
    (id: string, direction: 'up' | 'down') => {
      updateScene((prev) => moveCondition(prev, id, direction));
    },
    [updateScene]
  );

  const applyStarter = useCallback(
    (starter: Filter) => {
      updateScene((prev) => applyStarterPreset(prev, starter));
    },
    [updateScene]
  );

  const focusCondition = useCallback(
    (conditionId: string) => {
      updateScene((prev) => {
        const target = prev.filter.conditions.find((c) => c.id === conditionId);
        const isSpectral = target?.kind === 'range';
        const nextConditions = isSpectral && target.enabled === false
          ? prev.filter.conditions.map((c) => (c.id === conditionId ? { ...c, enabled: true } : c))
          : prev.filter.conditions;
        return {
          ...prev,
          filter: {
            ...prev.filter,
            enabled: isSpectral ? true : prev.filter.enabled,
            conditions: nextConditions,
            focus: { conditionId, spanIndex: 0 },
          },
        };
      });
    },
    [updateScene]
  );

  const allFilters = useMemo(
    () => (scene.filters && scene.filters.length > 0 ? scene.filters : PRESET_FILTERS),
    [scene.filters]
  );

  const handleSelectFilter = useCallback(
    (filterId: string) => {
      updateScene((prev) => setPrimaryFilter(prev, filterId));
    },
    [updateScene]
  );

  const handleForkFilter = useCallback(() => {
    updateScene((prev) => forkFilter(prev, prev.filter));
  }, [updateScene]);

  const handleDuplicateFilter = useCallback(() => {
    updateScene((prev) => duplicateFilter(prev, prev.filter));
  }, [updateScene]);

  const handleDeleteFilter = useCallback(
    (filterId: string) => {
      updateScene((prev) => deleteUserFilter(prev, filterId));
    },
    [updateScene]
  );

  const handleCreateNewFilter = useCallback(() => {
    updateScene((prev) => createUserFilter(prev));
  }, [updateScene]);

  const handleRenameFilter = useCallback(
    (name: string) => {
      updateScene((prev) => renameActiveFilter(prev, name));
    },
    [updateScene]
  );

  return {
    isFiltersOpen,
    openFilters,
    closeFilters,
    toggleFiltersOpen,
    isFilterEditMode,
    setIsFilterEditMode,
    filterControlParam,
    setFilterControlParam,
    handleUpdateFilterCentreD,
    handleUpdateFilterParams,
    handleEnterFilterEditMode,
    handleCycleFilterMode,
    toggleFilter,
    toggleFilterEditMode,
    updateFilterState,
    addFilterCondition,
    updateFilterCondition,
    removeFilterCondition,
    moveFilterCondition,
    applyStarter,
    focusCondition,
    allFilters,
    handleSelectFilter,
    handleForkFilter,
    handleDuplicateFilter,
    handleDeleteFilter,
    handleCreateNewFilter,
    handleRenameFilter,
  };
}
