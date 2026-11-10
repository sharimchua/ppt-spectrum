/**
 * Band filter controls and interactive HUD mode hook.
 * Manages aperture filter enabling, parameter selection (centre, width, skirt), mode cycling, and HUD edit states.
 */

import { useState, useCallback } from 'react';
import { Scene, BandFilter } from '../../core/types';
import {
  toggleFilterEnabled,
  enableFilter,
  cycleFilterMode,
} from '../../core/scene-ops';
import { FilterControlParam } from '../RadialMenuOverlay';

export interface UseFilterControlsOptions {
  updateScene: (updater: Scene | ((prev: Scene) => Scene)) => void;
}

export interface UseFilterControlsResult {
  isFilterEditMode: boolean;
  setIsFilterEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  filterControlParam: FilterControlParam;
  setFilterControlParam: React.Dispatch<React.SetStateAction<FilterControlParam>>;
  handleUpdateFilterCentreD: (centreD: number) => void;
  handleUpdateFilterParams: (params: Partial<Pick<BandFilter, 'centreD' | 'widthD' | 'softnessD'>>) => void;
  handleEnterFilterEditMode: (param?: FilterControlParam) => void;
  handleCycleFilterMode: () => void;
  toggleFilter: () => void;
  toggleFilterEditMode: () => void;
}

export function useFilterControls({
  updateScene,
}: UseFilterControlsOptions): UseFilterControlsResult {
  const [isFilterEditMode, setIsFilterEditMode] = useState<boolean>(false);
  const [filterControlParam, setFilterControlParam] = useState<FilterControlParam>('centre');

  const handleUpdateFilterCentreD = useCallback(
    (centreD: number) => {
      updateScene((prev) => enableFilter(prev, { centreD }));
    },
    [updateScene]
  );

  const handleUpdateFilterParams = useCallback(
    (params: Partial<Pick<BandFilter, 'centreD' | 'widthD' | 'softnessD'>>) => {
      updateScene((prev) => enableFilter(prev, params));
    },
    [updateScene]
  );

  const handleEnterFilterEditMode = useCallback(
    (param: FilterControlParam = 'centre') => {
      setFilterControlParam(param);
      setIsFilterEditMode(true);
      updateScene((prev) => enableFilter(prev));
    },
    [updateScene]
  );

  const toggleFilterEditMode = useCallback(() => {
    setIsFilterEditMode((prev) => {
      const next = !prev;
      if (next) {
        updateScene((sc) => enableFilter(sc));
      }
      return next;
    });
  }, [updateScene]);

  const handleCycleFilterMode = useCallback(() => {
    updateScene((prev) => cycleFilterMode(prev));
  }, [updateScene]);

  const toggleFilter = useCallback(() => {
    updateScene((prev) => toggleFilterEnabled(prev));
  }, [updateScene]);

  return {
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
  };
}
