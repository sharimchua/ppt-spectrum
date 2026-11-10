/**
 * Scene engine management hook.
 * Coordinates Scene state, RenderCoordinator, AudioEngine telemetry, and debounced persistence.
 */

import { useState, useRef, useEffect, useCallback, MutableRefObject } from 'react';
import { Scene } from '../../core/types';
import { DEFAULT_SCENE, loadSavedScene, saveScene } from '../../core/config';
import { RenderCoordinator } from '../../renderers/render-coordinator';
import { AudioEngine } from '../../audio/audio-engine';

export interface UseSceneEngineResult {
  scene: Scene;
  sceneRef: MutableRefObject<Scene>;
  updateScene: (updater: Scene | ((prev: Scene) => Scene)) => void;
  coordinator: RenderCoordinator;
  audioEngine: AudioEngine;
}

export function useSceneEngine(isOscillating: boolean): UseSceneEngineResult {
  const [initialScene] = useState<Scene>(() => loadSavedScene() || DEFAULT_SCENE);
  const [scene, setScene] = useState<Scene>(initialScene);

  // Singletons initialised once with initial scene state
  const [coordinator] = useState(() => new RenderCoordinator(initialScene));
  const [audioEngine] = useState(() => AudioEngine.getInstance(initialScene));

  const sceneRef = useRef<Scene>(scene);
  sceneRef.current = scene;

  const updateScene = useCallback(
    (updater: Scene | ((prev: Scene) => Scene)) => {
      setScene((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: Scene) => Scene)(prev) : updater;
        sceneRef.current = next;
        audioEngine.updateScene(next);
        coordinator.setScene(next);
        return next;
      });
    },
    [audioEngine, coordinator]
  );

  // Connect AudioEngine sample-accurate telemetry to RenderCoordinator
  useEffect(() => {
    coordinator.setAudioPhaseProvider((shapeId) => audioEngine.getMasterPhase(shapeId));
    coordinator.setIsAudioActiveProvider(() => audioEngine.isAudioActive());
    coordinator.setNoteAgeProvider((shapeId) => audioEngine.getNoteAge(shapeId));
  }, [coordinator, audioEngine]);

  // Sync state updates to audio engine and persistence (debounced to avoid localStorage thrash during 60 FPS sweep)
  useEffect(() => {
    coordinator.setScene(scene);
    audioEngine.updateScene(scene);
    if (!isOscillating) {
      const timer = setTimeout(() => {
        saveScene(scene);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [scene, coordinator, audioEngine, isOscillating]);

  return {
    scene,
    sceneRef,
    updateScene,
    coordinator,
    audioEngine,
  };
}
