/**
 * Shape library and session history navigation hook.
 * Manages shape presets, user custom shapes, capture, duplication, and undo/redo history stack.
 */

import { useState, useCallback, useMemo } from 'react';
import { Scene, Shape } from '../../core/types';
import { RenderCoordinator } from '../../renderers/render-coordinator';
import {
  ShapeHistory,
  createHistory,
  pushHistory,
  stepHistory,
  removeFromHistory,
} from '../../core/shape-history';
import {
  setPrimaryShapeId,
  addShapeAndSelect,
  replaceWithCapturedShape,
  upsertActiveShape,
  deleteUserShape,
  duplicateShapeWithFreshIds,
} from '../../core/scene-ops';

export interface UseShapeLibraryOptions {
  scene: Scene;
  updateScene: (updater: Scene | ((prev: Scene) => Scene)) => void;
  coordinator: RenderCoordinator;
  getViewportCenter: () => { cx: number; cy: number };
}

export interface UseShapeLibraryResult {
  activeShape: Shape;
  handleSelectPreset: (shapeId: string) => void;
  handleUpdateActiveShape: (updated: Shape) => void;
  handleDuplicateShape: (sourceShape: Shape) => void;
  handleDeleteUserShape: (shapeId: string) => void;
  handleCreateShape: (newShape: Shape) => void;
  handleCaptureShape: (capturedShape: Shape, dPosition: number) => void;
  historyBack: () => void;
  historyForward: () => void;
}

export function useShapeLibrary({
  scene,
  updateScene,
  coordinator,
  getViewportCenter,
}: UseShapeLibraryOptions): UseShapeLibraryResult {
  const [, setShapeHistory] = useState<ShapeHistory>(() => {
    const initialId = scene.placements[0]?.shapeId || 'hemiola-3-2';
    return createHistory(initialId);
  });

  const pushShapeHistory = useCallback((shapeId: string) => {
    setShapeHistory((prev) => pushHistory(prev, shapeId));
  }, []);

  const historyBack = useCallback(() => {
    setShapeHistory((prev) => {
      const { history, shapeId } = stepHistory(prev, -1);
      if (shapeId) {
        updateScene((sc) => setPrimaryShapeId(sc, shapeId));
      }
      return history;
    });
  }, [updateScene]);

  const historyForward = useCallback(() => {
    setShapeHistory((prev) => {
      const { history, shapeId } = stepHistory(prev, 1);
      if (shapeId) {
        updateScene((sc) => setPrimaryShapeId(sc, shapeId));
      }
      return history;
    });
  }, [updateScene]);

  const handleSelectPreset = useCallback(
    (shapeId: string) => {
      pushShapeHistory(shapeId);
      updateScene((prev) => setPrimaryShapeId(prev, shapeId));
    },
    [pushShapeHistory, updateScene]
  );

  const handleUpdateActiveShape = useCallback(
    (updated: Shape) => {
      updateScene((prev) => {
        const { scene: nextScene, selectedId } = upsertActiveShape(prev, updated);
        if (selectedId) {
          pushShapeHistory(selectedId);
        }
        return nextScene;
      });
    },
    [pushShapeHistory, updateScene]
  );

  const handleDuplicateShape = useCallback(
    (sourceShape: Shape) => {
      const duplicated = duplicateShapeWithFreshIds(sourceShape);
      pushShapeHistory(duplicated.id);
      updateScene((prev) => addShapeAndSelect(prev, duplicated));
    },
    [pushShapeHistory, updateScene]
  );

  const handleDeleteUserShape = useCallback(
    (shapeId: string) => {
      setShapeHistory((prev) => removeFromHistory(prev, shapeId, 'hemiola-3-2'));
      updateScene((prev) => deleteUserShape(prev, shapeId));
    },
    [updateScene]
  );

  const handleCreateShape = useCallback(
    (newShape: Shape) => {
      pushShapeHistory(newShape.id);
      updateScene((prev) => addShapeAndSelect(prev, newShape));
    },
    [pushShapeHistory, updateScene]
  );

  const handleCaptureShape = useCallback(
    (capturedShape: Shape, dPosition: number) => {
      pushShapeHistory(capturedShape.id);
      updateScene((prev) => replaceWithCapturedShape(prev, capturedShape, dPosition));

      const { cx, cy } = getViewportCenter();
      coordinator.cosmeticsEngine.triggerShockwave(cx, cy, '#38bdf8', 120);
      coordinator.cosmeticsEngine.spawnFluidDroplets(cx, cy, '#38bdf8', 1.0, 32);
    },
    [coordinator, getViewportCenter, pushShapeHistory, updateScene]
  );

  const activeShape = useMemo(() => {
    const primaryId = scene.placements[0]?.shapeId;
    return scene.shapes.find((s) => s.id === primaryId) || scene.shapes[0];
  }, [scene.shapes, scene.placements]);

  return {
    activeShape,
    handleSelectPreset,
    handleUpdateActiveShape,
    handleDuplicateShape,
    handleDeleteUserShape,
    handleCreateShape,
    handleCaptureShape,
    historyBack,
    historyForward,
  };
}
