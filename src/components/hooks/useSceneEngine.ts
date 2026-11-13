/**
 * Scene engine management hook.
 * Coordinates Scene state, RenderCoordinator, AudioEngine telemetry, and debounced persistence.
 */

import { useState, useRef, useEffect, useCallback, MutableRefObject } from 'react';
import { Scene } from '../../core/types';
import { DEFAULT_SCENE, loadSavedScene, saveScene } from '../../core/config';
import { setPrimaryPlacementD } from '../../core/scene-ops';
import { RenderCoordinator } from '../../renderers/render-coordinator';
import { AudioEngine } from '../../audio/audio-engine';

export interface UseSceneEngineResult {
  scene: Scene;
  sceneRef: MutableRefObject<Scene>;
  updateScene: (updater: Scene | ((prev: Scene) => Scene)) => void;
  setPrimaryDSmooth: (d: number, syncReact?: boolean) => void;
  updateSceneFast: (updater: (prev: Scene) => Scene, syncReact?: boolean) => void;
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

  // Tracks scenes already pushed via fast-path so the React commit effect does not double-sync
  const lastSyncedSceneRef = useRef<Scene | null>(null);
  const lastReactSyncTimeRef = useRef<number>(0);
  const pendingAudioRafRef = useRef<number | null>(null);

  const updateScene = useCallback((updater: Scene | ((prev: Scene) => Scene)) => {
    setScene((prev) => {
      const next = typeof updater === 'function' ? (updater as (p: Scene) => Scene)(prev) : updater;
      sceneRef.current = next;
      return next;
    });
  }, []);

  /**
   * 60 FPS fast-path for Sweep Mode and continuous scrubbing:
   * Updates RenderCoordinator and AudioEngine immediately without forcing 60 FPS React re-renders.
   */
  const setPrimaryDSmooth = useCallback(
    (d: number, syncReact: boolean = false) => {
      const next = setPrimaryPlacementD(sceneRef.current, d);
      sceneRef.current = next;
      coordinator.setScene(next);
      audioEngine.setPrimaryPlacementD(d);

      if (syncReact) {
        lastSyncedSceneRef.current = next;
        lastReactSyncTimeRef.current = performance.now();
        setScene(next);
      }
    },
    [audioEngine, coordinator]
  );

  /**
   * High-frequency fast-path for real-time filter parameter scrubbing:
   * Updates canvas immediately, coalesces AudioEngine syncs to at most once per animation frame,
   * and throttles React UI commits to ~15 Hz unless syncReact is explicitly true.
   */
  const updateSceneFast = useCallback(
    (updater: (prev: Scene) => Scene, syncReact: boolean = false) => {
      const next = updater(sceneRef.current);
      sceneRef.current = next;
      coordinator.setScene(next);

      if (pendingAudioRafRef.current === null && typeof requestAnimationFrame === 'function') {
        pendingAudioRafRef.current = requestAnimationFrame(() => {
          pendingAudioRafRef.current = null;
          audioEngine.updateScene(sceneRef.current);
        });
      } else if (typeof requestAnimationFrame !== 'function') {
        audioEngine.updateScene(next);
      }

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (syncReact || now - lastReactSyncTimeRef.current >= 66) {
        lastSyncedSceneRef.current = next;
        lastReactSyncTimeRef.current = now;
        setScene(next);
      }
    },
    [audioEngine, coordinator]
  );

  // Connect AudioEngine sample-accurate telemetry to RenderCoordinator
  useEffect(() => {
    coordinator.setAudioPhaseProvider((shapeId) => audioEngine.getMasterPhase(shapeId));
    coordinator.setIsAudioActiveProvider(() => audioEngine.isAudioActive());
    coordinator.setNoteAgeProvider((shapeId) => audioEngine.getNoteAge(shapeId));
    return () => {
      if (pendingAudioRafRef.current !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(pendingAudioRafRef.current);
        pendingAudioRafRef.current = null;
      }
    };
  }, [coordinator, audioEngine]);

  // Sync state updates to audio engine and persistence (debounced to avoid localStorage thrash during 60 FPS sweep)
  useEffect(() => {
    if (lastSyncedSceneRef.current !== scene) {
      lastSyncedSceneRef.current = scene;
      coordinator.setScene(scene);
      audioEngine.updateScene(scene);
    }
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
    setPrimaryDSmooth,
    updateSceneFast,
    coordinator,
    audioEngine,
  };
}
