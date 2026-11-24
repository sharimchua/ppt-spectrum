import { useEffect, useRef, useCallback } from 'react';
import { Scene } from '../../core/types';
import { AudioEngine } from '../../audio/audio-engine';
import { midiManagerInstance } from '../../audio/midi-manager';
import { RenderCoordinator } from '../../renderers/render-coordinator';
import { UseMidiResult } from './useMidi';

const STAGE_PROTOCOL = 'midlifemuso-stage-v1';
const APP_ID = 'spectrum';

interface StageBridgeOptions {
  scene: Scene;
  isPlaying: boolean;
  isOscillating: boolean;
  audioEngine: AudioEngine;
  coordinator: RenderCoordinator;
  midi: UseMidiResult;
  updateScene: (updater: Scene | ((prev: Scene) => Scene)) => void;
  setPrimaryDSmooth: (d: number, syncReact?: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsOscillating: (osc: boolean) => void;
  rawHandleNoteOn: (shapeId?: string) => void;
  rawHandleNoteOff: (shapeId?: string) => void;
  rawHandleTriggerNote: (shapeId?: string) => void;
  rawToggleOscillating: () => void;
  rawHandleTogglePlay: () => Promise<void>;
}

export interface StageBridgeApi {
  isEmbedded: boolean;
  broadcastAction: (action: string, payload?: unknown) => void;
  broadcastPrimaryD: (d: number) => void;
  handleNoteOn: (shapeId?: string) => void;
  handleNoteOff: (shapeId?: string) => void;
  handleTriggerNote: (shapeId?: string) => void;
  toggleOscillating: () => void;
  handleTogglePlay: () => Promise<void>;
}

export function isStageEmbedded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.parent !== window &&
      new URLSearchParams(window.location.search).get('stage') === '1'
    );
  } catch {
    return false;
  }
}

function postToParent(msg: Record<string, unknown>): void {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage({ protocol: STAGE_PROTOCOL, appId: APP_ID, ...msg }, '*');
}

function pickSyncableScene(scene: Scene): Partial<Scene> & { isPlaying?: boolean } {
  return {
    shapes: scene.shapes,
    placements: scene.placements,
    filter: scene.filter,
    filters: scene.filters,
    envelope: scene.envelope,
    envelopes: scene.envelopes,
    anchors: scene.anchors,
    lenses: scene.lenses,
    audio: scene.audio,
  };
}

export function useStageBridge({
  scene,
  isPlaying,
  isOscillating,
  audioEngine,
  coordinator,
  midi,
  updateScene,
  setPrimaryDSmooth,
  setIsPlaying,
  setIsOscillating,
  rawHandleNoteOn,
  rawHandleNoteOff,
  rawHandleTriggerNote,
  rawToggleOscillating,
  rawHandleTogglePlay,
}: StageBridgeOptions): StageBridgeApi {
  const embedded = isStageEmbedded();
  const isApplyingRemoteRef = useRef<boolean>(false);
  const lastSentJsonRef = useRef<string>('');
  const throttleTimerRef = useRef<number | null>(null);
  const lastDPostRef = useRef<number>(0);

  const latestRef = useRef({
    audioEngine,
    coordinator,
    midi,
    updateScene,
    setPrimaryDSmooth,
    setIsPlaying,
    setIsOscillating,
    isPlaying,
    isOscillating,
    scene,
  });
  latestRef.current = {
    audioEngine,
    coordinator,
    midi,
    updateScene,
    setPrimaryDSmooth,
    setIsPlaying,
    setIsOscillating,
    isPlaying,
    isOscillating,
    scene,
  };

  useEffect(() => {
    if (!embedded) return;

    audioEngine.setStageMode(true);
    midiManagerInstance.setStageMode(true);
    postToParent({
      type: 'STAGE_READY',
      audioState: audioEngine.getAudioState(),
    });

    const handleMessage = (event: MessageEvent) => {
      const data = event.data as Record<string, unknown> | null;
      if (!data || data.protocol !== STAGE_PROTOCOL || typeof data.type !== 'string') return;
      const cur = latestRef.current;

      switch (data.type) {
        case 'STAGE_INIT': {
          midiManagerInstance.setSuppressed(Boolean(data.suppressLocalMidi));
          break;
        }
        case 'STAGE_UNLOCK_AUDIO': {
          void cur.audioEngine.unlock().then(() => {
            postToParent({
              type: 'STAGE_AUDIO_STATE',
              audioState: cur.audioEngine.getAudioState(),
            });
          });
          break;
        }
        case 'STAGE_MIDI': {
          const ev = data.event;
          isApplyingRemoteRef.current = true;
          if (ev === 'noteOn' && typeof data.midi === 'number') {
            const vel = typeof data.velocity === 'number' ? data.velocity : 0.85;
            cur.midi.virtualNoteOn(data.midi, vel);
          } else if (ev === 'noteOff' && typeof data.midi === 'number') {
            cur.midi.virtualNoteOff(data.midi);
          } else if (ev === 'sustain' && typeof data.isDown === 'boolean') {
            cur.audioEngine.setMidiSustain(data.isDown);
          } else if (ev === 'allNotesOff') {
            cur.midi.clearAllNotes();
          }
          window.setTimeout(() => {
            isApplyingRemoteRef.current = false;
          }, 0);
          break;
        }
        case 'REMOTE_STATE': {
          const st = data.state as (Partial<Scene> & { isPlaying?: boolean; isOscillating?: boolean }) | null;
          if (!st || typeof st !== 'object') break;

          isApplyingRemoteRef.current = true;
          cur.updateScene((prev) => ({
            ...prev,
            shapes: st.shapes ?? prev.shapes,
            placements: st.placements ?? prev.placements,
            filter: st.filter ?? prev.filter,
            filters: st.filters ?? prev.filters,
            envelope: st.envelope ?? prev.envelope,
            envelopes: st.envelopes ?? prev.envelopes,
            anchors: st.anchors ?? prev.anchors,
            lenses: st.lenses ?? prev.lenses,
            audio: st.audio ?? prev.audio,
          }));

          if (typeof st.isPlaying === 'boolean' && st.isPlaying !== cur.isPlaying) {
            if (st.isPlaying) {
              void cur.audioEngine.play();
              cur.setIsPlaying(true);
            } else {
              cur.audioEngine.pause();
              cur.setIsPlaying(false);
            }
          }
          if (typeof st.isOscillating === 'boolean') {
            cur.setIsOscillating(st.isOscillating);
          }

          window.setTimeout(() => {
            isApplyingRemoteRef.current = false;
          }, 50);
          break;
        }
        case 'REMOTE_ACTION': {
          const action = data.action;
          const payload = data.payload as Record<string, unknown> | undefined;
          isApplyingRemoteRef.current = true;
          if (action === 'SET_PRIMARY_D' && typeof payload?.d === 'number') {
            cur.setPrimaryDSmooth(payload.d, true);
          } else if (action === 'TRANSPORT_PLAY') {
            void cur.audioEngine.play().then(() => {
              postToParent({
                type: 'STAGE_AUDIO_STATE',
                audioState: cur.audioEngine.getAudioState(),
              });
            });
            cur.setIsPlaying(true);
          } else if (action === 'TRANSPORT_PAUSE') {
            cur.audioEngine.pause();
            cur.setIsPlaying(false);
          } else if (action === 'TRIGGER_NOTE') {
            void cur.audioEngine.triggerNote(
              typeof payload?.shapeId === 'string' ? payload.shapeId : undefined,
              cur.scene
            );
            cur.coordinator.triggerNoteStrike();
          } else if (action === 'NOTE_ON') {
            void cur.audioEngine.noteOn(
              typeof payload?.shapeId === 'string' ? payload.shapeId : undefined,
              cur.scene
            );
            cur.coordinator.triggerNoteStrike();
          } else if (action === 'NOTE_OFF') {
            cur.audioEngine.noteOff(
              typeof payload?.shapeId === 'string' ? payload.shapeId : undefined
            );
          } else if (action === 'OSC_SET' && typeof payload?.enabled === 'boolean') {
            cur.setIsOscillating(payload.enabled);
          }
          window.setTimeout(() => {
            isApplyingRemoteRef.current = false;
          }, 20);
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      audioEngine.setStageMode(false);
      midiManagerInstance.setStageMode(false);
      midiManagerInstance.setSuppressed(false);
    };
  }, [embedded, audioEngine]);

  // Throttled outbound state snapshot
  useEffect(() => {
    if (!embedded || isApplyingRemoteRef.current) return;

    const payload = {
      ...pickSyncableScene(scene),
      isPlaying,
      isOscillating,
    };
    const encoded = JSON.stringify(payload);
    if (encoded === lastSentJsonRef.current) return;

    if (throttleTimerRef.current !== null) {
      window.clearTimeout(throttleTimerRef.current);
    }
    throttleTimerRef.current = window.setTimeout(() => {
      throttleTimerRef.current = null;
      if (isApplyingRemoteRef.current) return;
      lastSentJsonRef.current = encoded;
      postToParent({ type: 'APP_STATE_UPDATE', state: payload });
    }, 120);

    return () => {
      if (throttleTimerRef.current !== null) {
        window.clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [embedded, scene, isPlaying, isOscillating]);

  const broadcastAction = useCallback(
    (action: string, payload?: unknown) => {
      if (!embedded || isApplyingRemoteRef.current) return;
      postToParent({ type: 'APP_ACTION', action, payload });
    },
    [embedded]
  );

  const broadcastPrimaryD = useCallback(
    (d: number) => {
      if (!embedded || isApplyingRemoteRef.current) return;
      const now = performance.now();
      if (now - lastDPostRef.current < 33) return;
      lastDPostRef.current = now;
      postToParent({ type: 'APP_ACTION', action: 'SET_PRIMARY_D', payload: { d } });
    },
    [embedded]
  );

  const handleNoteOn = useCallback(
    (shapeId?: string) => {
      rawHandleNoteOn(shapeId);
      broadcastAction('NOTE_ON', { shapeId });
    },
    [rawHandleNoteOn, broadcastAction]
  );

  const handleNoteOff = useCallback(
    (shapeId?: string) => {
      rawHandleNoteOff(shapeId);
      broadcastAction('NOTE_OFF', { shapeId });
    },
    [rawHandleNoteOff, broadcastAction]
  );

  const handleTriggerNote = useCallback(
    (shapeId?: string) => {
      rawHandleTriggerNote(shapeId);
      broadcastAction('TRIGGER_NOTE', { shapeId });
    },
    [rawHandleTriggerNote, broadcastAction]
  );

  const toggleOscillating = useCallback(() => {
    const next = !latestRef.current.isOscillating;
    rawToggleOscillating();
    broadcastAction('OSC_SET', { enabled: next });
  }, [rawToggleOscillating, broadcastAction]);

  const handleTogglePlay = useCallback(async () => {
    const willPlay = !audioEngine.getIsPlaying();
    if (latestRef.current.isPlaying && latestRef.current.isOscillating) {
      setIsOscillating(false);
    }
    await rawHandleTogglePlay();
    broadcastAction(willPlay ? 'TRANSPORT_PLAY' : 'TRANSPORT_PAUSE');
  }, [audioEngine, rawHandleTogglePlay, setIsOscillating, broadcastAction]);

  return {
    isEmbedded: embedded,
    broadcastAction,
    broadcastPrimaryD,
    handleNoteOn,
    handleNoteOff,
    handleTriggerNote,
    toggleOscillating,
    handleTogglePlay,
  };
}
