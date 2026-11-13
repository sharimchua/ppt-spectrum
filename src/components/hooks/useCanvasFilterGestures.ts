/**
 * Custom hook managing canvas gesture interactions for filter aperture parameter scrubbing.
 * Handles mouse drag, shift/ctrl modifier combinations, wheel increments, and touch scrubbing.
 */

import { useState, useCallback } from 'react';
import { Scene, SpanView } from '../../core/types';
import { getActiveSpectralSpanView } from '../../core/scene-ops';

export type FilterGestureMode = 'none' | 'width' | 'skirt' | 'centre';

export interface UseCanvasFilterGesturesOptions {
  scene: Scene;
  isFilterEditMode?: boolean;
  filterControlParam?: 'centre' | 'width' | 'skirt';
  onUpdateFilterParams?: (params: Partial<SpanView>) => void;
  onUpdateFilterCentreD?: (centreD: number) => void;
}

export interface UseCanvasFilterGesturesResult {
  filterGestureMode: FilterGestureMode;
  setFilterGestureMode: React.Dispatch<React.SetStateAction<FilterGestureMode>>;
  determineInitialGesture: (isCtrlOrMeta: boolean, isShift: boolean) => FilterGestureMode;
  processFilterDrag: (
    dx: number,
    dy: number,
    dragStart: { filterD: number; filterWidth: number; filterSoftness: number },
    isCtrlOrMeta: boolean,
    isShift: boolean
  ) => boolean;
  processFilterWheel: (e: React.WheelEvent<HTMLCanvasElement>) => boolean;
  processFilterTouch: (
    isDial: boolean,
    deltaAngle: number,
    dLinearX: number,
    canvasWidth: number,
    dragStart: { filterD: number; filterWidth: number; filterSoftness: number }
  ) => boolean;
}

export function useCanvasFilterGestures({
  scene,
  isFilterEditMode = false,
  filterControlParam = 'centre',
  onUpdateFilterParams,
  onUpdateFilterCentreD,
}: UseCanvasFilterGesturesOptions): UseCanvasFilterGesturesResult {
  const [filterGestureMode, setFilterGestureMode] = useState<FilterGestureMode>('none');

  const determineInitialGesture = useCallback(
    (isCtrlOrMeta: boolean, isShift: boolean): FilterGestureMode => {
      if (isFilterEditMode) {
        return filterControlParam;
      }
      if (isCtrlOrMeta && isShift) {
        return 'skirt';
      }
      if (isShift) {
        return 'width';
      }
      return 'none';
    },
    [isFilterEditMode, filterControlParam]
  );

  const processFilterDrag = useCallback(
    (
      dx: number,
      dy: number,
      dragStart: { filterD: number; filterWidth: number; filterSoftness: number },
      isCtrlOrMeta: boolean,
      isShift: boolean
    ): boolean => {
      // 1. Direct Filter Edit Mode (HUD active)
      if (isFilterEditMode && onUpdateFilterParams) {
        if (filterControlParam === 'centre') {
          setFilterGestureMode('centre');
          const targetFilterD = Math.max(-7, Math.min(7, dragStart.filterD - dx * 0.015));
          onUpdateFilterParams({ centreD: targetFilterD });
        } else if (filterControlParam === 'width') {
          setFilterGestureMode('width');
          const delta = Math.abs(dx) > Math.abs(dy) ? dx * 0.02 : -dy * 0.02;
          const targetWidth = Math.max(0.25, Math.min(12.0, dragStart.filterWidth + delta));
          onUpdateFilterParams({ widthD: targetWidth });
        } else if (filterControlParam === 'skirt') {
          setFilterGestureMode('skirt');
          const delta = Math.abs(dx) > Math.abs(dy) ? dx * 0.015 : -dy * 0.015;
          const targetSoftness = Math.max(0.05, Math.min(4.0, dragStart.filterSoftness + delta));
          onUpdateFilterParams({ softnessD: targetSoftness });
        }
        return true;
      }

      // 2. Modifier key combinations on desktop
      if (isCtrlOrMeta && isShift) {
        if (onUpdateFilterParams) {
          setFilterGestureMode('skirt');
          const targetSoftness = Math.max(0.05, Math.min(4.0, dragStart.filterSoftness - dy * 0.015));
          onUpdateFilterParams({ softnessD: targetSoftness });
        }
        return true;
      }

      if (isShift) {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (absY > absX * 1.15) {
          if (onUpdateFilterParams) {
            setFilterGestureMode('width');
            const targetWidth = Math.max(0.25, Math.min(12.0, dragStart.filterWidth - dy * 0.025));
            onUpdateFilterParams({ widthD: targetWidth });
          }
        } else if (absX > absY * 1.15) {
          setFilterGestureMode('centre');
          const targetFilterD = Math.max(-7, Math.min(7, dragStart.filterD - dx * 0.015));
          if (onUpdateFilterParams) {
            onUpdateFilterParams({ centreD: targetFilterD });
          } else if (onUpdateFilterCentreD) {
            onUpdateFilterCentreD(targetFilterD);
          }
        } else {
          setFilterGestureMode('width');
          const targetWidth = Math.max(0.25, Math.min(12.0, dragStart.filterWidth - dy * 0.025));
          const targetFilterD = Math.max(-7, Math.min(7, dragStart.filterD - dx * 0.015));
          if (onUpdateFilterParams) {
            onUpdateFilterParams({ widthD: targetWidth, centreD: targetFilterD });
          }
        }
        return true;
      }

      return false;
    },
    [isFilterEditMode, filterControlParam, onUpdateFilterParams, onUpdateFilterCentreD]
  );

  const processFilterWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>): boolean => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const view = getActiveSpectralSpanView(scene.filter);
      if (!view) {
        return isFilterEditMode;
      }

      const isCutoffOnly = view.mode === 'low-pass' || view.mode === 'high-pass';

      if (isFilterEditMode && onUpdateFilterParams) {
        if (filterControlParam === 'centre' || (isCutoffOnly && filterControlParam === 'width')) {
          const deltaFilter = e.deltaY > 0 ? 0.08 : -0.08;
          onUpdateFilterParams({ centreD: Math.max(-7, Math.min(7, view.centreD + deltaFilter)) });
        } else if (filterControlParam === 'width') {
          const deltaWidth = e.deltaY < 0 ? 0.2 : -0.2;
          onUpdateFilterParams({ widthD: Math.max(0.25, Math.min(12.0, view.widthD + deltaWidth)) });
        } else if (filterControlParam === 'skirt') {
          const deltaSoftness = e.deltaY < 0 ? 0.1 : -0.1;
          onUpdateFilterParams({ softnessD: Math.max(0.05, Math.min(4.0, view.softnessD + deltaSoftness)) });
        }
        return true;
      }

      if (isCtrlOrMeta && isShift && onUpdateFilterParams) {
        const deltaSoftness = e.deltaY < 0 ? 0.1 : -0.1;
        const targetSoftness = Math.max(0.05, Math.min(4.0, view.softnessD + deltaSoftness));
        onUpdateFilterParams({ softnessD: targetSoftness });
        return true;
      }

      if (isShift) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || isCutoffOnly) {
          const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          const deltaFilter = delta > 0 ? 0.08 : -0.08;
          const targetFilterD = Math.max(-7, Math.min(7, view.centreD + deltaFilter));
          if (onUpdateFilterParams) {
            onUpdateFilterParams({ centreD: targetFilterD });
          } else if (onUpdateFilterCentreD) {
            onUpdateFilterCentreD(targetFilterD);
          }
        } else if (onUpdateFilterParams) {
          const deltaWidth = e.deltaY < 0 ? 0.2 : -0.2;
          const targetWidth = Math.max(0.25, Math.min(12.0, view.widthD + deltaWidth));
          onUpdateFilterParams({ widthD: targetWidth });
        }
        return true;
      }

      return false;
    },
    [scene.filter, isFilterEditMode, filterControlParam, onUpdateFilterParams, onUpdateFilterCentreD]
  );

  const processFilterTouch = useCallback(
    (
      isDial: boolean,
      deltaAngle: number,
      dLinearX: number,
      canvasWidth: number,
      dragStart: { filterD: number; filterWidth: number; filterSoftness: number }
    ): boolean => {
      if (!isFilterEditMode || !onUpdateFilterParams) return false;

      const view = getActiveSpectralSpanView(scene.filter) || {
        centreD: 0,
        widthD: 4,
        softnessD: 1,
      };

      if (isDial) {
        if (filterControlParam === 'centre') {
          const deltaD = -(deltaAngle / (2 * Math.PI)) * 1.5;
          const targetD = Math.max(-7, Math.min(7, view.centreD + deltaD));
          onUpdateFilterParams({ centreD: targetD });
        } else if (filterControlParam === 'width') {
          const deltaW = (deltaAngle / (2 * Math.PI)) * 2.0;
          const targetW = Math.max(0.25, Math.min(12.0, view.widthD + deltaW));
          onUpdateFilterParams({ widthD: targetW });
        } else if (filterControlParam === 'skirt') {
          const deltaS = (deltaAngle / (2 * Math.PI)) * 1.0;
          const targetS = Math.max(0.05, Math.min(4.0, view.softnessD + deltaS));
          onUpdateFilterParams({ softnessD: targetS });
        }
      } else {
        const cWidth = Math.max(100, canvasWidth);
        if (filterControlParam === 'centre') {
          const deltaD = -(dLinearX / cWidth) * 2.5;
          const targetD = Math.max(-7, Math.min(7, dragStart.filterD + deltaD));
          onUpdateFilterParams({ centreD: targetD });
        } else if (filterControlParam === 'width') {
          const deltaW = (dLinearX / cWidth) * 4.0;
          const targetW = Math.max(0.25, Math.min(12.0, dragStart.filterWidth + deltaW));
          onUpdateFilterParams({ widthD: targetW });
        } else if (filterControlParam === 'skirt') {
          const deltaS = (dLinearX / cWidth) * 2.0;
          const targetS = Math.max(0.05, Math.min(4.0, dragStart.filterSoftness + deltaS));
          onUpdateFilterParams({ softnessD: targetS });
        }
      }
      return true;
    },
    [scene.filter, isFilterEditMode, filterControlParam, onUpdateFilterParams]
  );

  return {
    filterGestureMode,
    setFilterGestureMode,
    determineInitialGesture,
    processFilterDrag,
    processFilterWheel,
    processFilterTouch,
  };
}
