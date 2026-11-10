/**
 * Audio playback transport and note triggering hook.
 * Controls master playback state, ADSR note strike triggering, and viewport cosmetic sparks/shockwaves.
 */

import { useState, useCallback, MutableRefObject } from 'react';
import { Scene } from '../../core/types';
import { RenderCoordinator } from '../../renderers/render-coordinator';
import { AudioEngine } from '../../audio/audio-engine';

export interface UseTransportOptions {
  coordinator: RenderCoordinator;
  audioEngine: AudioEngine;
  sceneRef: MutableRefObject<Scene>;
}

export interface UseTransportResult {
  isPlaying: boolean;
  getViewportCenter: () => { cx: number; cy: number };
  handleNoteOn: (shapeId?: string) => void;
  handleNoteOff: (shapeId?: string) => void;
  handleTriggerNote: (shapeId?: string) => void;
  handleTogglePlay: () => Promise<void>;
}

export function useTransport({
  coordinator,
  audioEngine,
  sceneRef,
}: UseTransportOptions): UseTransportResult {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const getViewportCenter = useCallback(() => {
    const pp = coordinator.getPostProcessingCanvas();
    if (pp && pp.clientWidth > 0 && pp.clientHeight > 0) {
      return { cx: pp.clientWidth / 2, cy: pp.clientHeight / 2 };
    }
    return { cx: window.innerWidth / 2, cy: window.innerHeight / 2 };
  }, [coordinator]);

  const handleNoteOn = useCallback(
    (shapeId?: string) => {
      audioEngine.noteOn(shapeId, sceneRef.current);
      coordinator.triggerNoteStrike();
    },
    [audioEngine, coordinator, sceneRef]
  );

  const handleNoteOff = useCallback(
    (shapeId?: string) => {
      audioEngine.noteOff(shapeId);
    },
    [audioEngine]
  );

  const handleTriggerNote = useCallback(
    (shapeId?: string) => {
      audioEngine.triggerNote(shapeId, sceneRef.current);
      coordinator.triggerNoteStrike();
    },
    [audioEngine, coordinator, sceneRef]
  );

  const handleTogglePlay = useCallback(async () => {
    if (!audioEngine.getIsPlaying()) {
      setIsPlaying(true);
      await audioEngine.play();
    } else {
      audioEngine.pause();
      setIsPlaying(false);
    }
  }, [audioEngine]);

  return {
    isPlaying,
    getViewportCenter,
    handleNoteOn,
    handleNoteOff,
    handleTriggerNote,
    handleTogglePlay,
  };
}
