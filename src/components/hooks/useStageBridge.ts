import { useEffect, useRef, useCallback } from 'react';
import { Scene } from '../../core/types';
import { AudioEngine } from '../../audio/audio-engine';
import { midiManagerInstance } from '../../audio/midi-manager';
import { RenderCoordinator } from '../../renderers/render-coordinator';
import { UseMidiResult } from './useMidi';
import {
  STAGE_PROTOCOL,
  applyStageEcoMode,
  getInitialStageRole,
  isStageEmbedded,
  mountAudioPromptPill,
  pickSyncableScene,
  postStageMessage,
} from './stage-bridge-helpers';

export { isStageEmbedded };

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
  const roleRef = useRef<'teacher' | 'student'>(getInitialStageRole());
  // Seed with initial state so newly mounted student iframes never overwrite teacher state on mount
  const lastSentJsonRef = useRef<string>(
    JSON.stringify({ ...pickSyncableScene(scene), isPlaying, isOscillating })
  );
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

    const pushCurrentState = () => {
      const cur = latestRef.current;
      const payload = {
        ...pickSyncableScene(cur.scene),
        isPlaying: cur.isPlaying,
        isOscillating: cur.isOscillating,
      };
      lastSentJsonRef.current = JSON.stringify(payload);
      postStageMessage({ type: 'APP_STATE_UPDATE', state: payload });
    };

    const handleGestureUnlock = () => {
      const cur = latestRef.current;
      if (cur.audioEngine.getAudioState() === 'running') {
        prompt.hide();
        return;
      }
      void cur.audioEngine.unlock().then(() => {
        const st = cur.audioEngine.getAudioState();
        postStageMessage({ type: 'STAGE_AUDIO_STATE', audioState: st });
        if (st === 'running') {
          prompt.hide();
        }
      });
    };

    const prompt = mountAudioPromptPill(handleGestureUnlock);

    audioEngine.onAudioStateChange = (audioState) => {
      postStageMessage({ type: 'STAGE_AUDIO_STATE', audioState });
      if (audioState === 'running') {
        prompt.hide();
      }
    };

    const ensureAudioPromptIfNeeded = () => {
      if (latestRef.current.audioEngine.getAudioState() !== 'running') {
        prompt.show();
      }
    };

    postStageMessage({
      type: 'STAGE_READY',
      audioState: audioEngine.getAudioState(),
    });

    const onPointerUnlock = () => {
      if (latestRef.current.audioEngine.getAudioState() !== 'running') {
        handleGestureUnlock();
      }
    };
    window.addEventListener('pointerdown', onPointerUnlock, true);

    const handleMessage = (event: MessageEvent) => {
      const data = event.data as Record<string, unknown> | null;
      if (!data || data.protocol !== STAGE_PROTOCOL || typeof data.type !== 'string') return;
      const cur = latestRef.current;

      switch (data.type) {
        case 'STAGE_INIT': {
          roleRef.current = data.role === 'teacher' ? 'teacher' : 'student';
          midiManagerInstance.setSuppressed(Boolean(data.suppressLocalMidi));
          if (typeof data.ecoMode === 'boolean') applyStageEcoMode(cur.updateScene, data.ecoMode);
          if (roleRef.current === 'teacher') {
            pushCurrentState();
          }
          break;
        }
        case 'STAGE_ECO_MODE': {
          if (typeof data.ecoMode === 'boolean') applyStageEcoMode(cur.updateScene, data.ecoMode);
          break;
        }
        case 'STAGE_REQUEST_STATE': {
          if (roleRef.current === 'teacher') {
            pushCurrentState();
          }
          break;
        }
        case 'STAGE_UNLOCK_AUDIO': {
          void cur.audioEngine.unlock().then(() => {
            const audioState = cur.audioEngine.getAudioState();
            postStageMessage({ type: 'STAGE_AUDIO_STATE', audioState });
            if (audioState !== 'running') {
              prompt.show();
            } else {
              prompt.hide();
            }
          });
          break;
        }
        case 'STAGE_MIDI': {
          const ev = data.event;
          isApplyingRemoteRef.current = true;
          if (ev === 'noteOn' && typeof data.midi === 'number') {
            const vel = typeof data.velocity === 'number' ? data.velocity : 0.85;
            cur.midi.virtualNoteOn(data.midi, vel);
            ensureAudioPromptIfNeeded();
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
          cur.updateScene((prev) => {
            const merged: Scene = {
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
            };
            lastSentJsonRef.current = JSON.stringify({
              ...pickSyncableScene(merged),
              isPlaying: typeof st.isPlaying === 'boolean' ? st.isPlaying : cur.isPlaying,
              isOscillating:
                typeof st.isOscillating === 'boolean' ? st.isOscillating : cur.isOscillating,
            });
            return merged;
          });

          if (typeof st.isPlaying === 'boolean' && st.isPlaying !== cur.isPlaying) {
            if (st.isPlaying) {
              void cur.audioEngine.play().then(() => ensureAudioPromptIfNeeded());
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
          }, 60);
          break;
        }
        case 'REMOTE_ACTION': {
          const action = data.action;
          const payload = data.payload as Record<string, unknown> | undefined;
          isApplyingRemoteRef.current = true;
          if (action === 'SET_PRIMARY_D' && typeof payload?.d === 'number') {
            cur.setPrimaryDSmooth(payload.d, true);
          } else if (action === 'TRANSPORT_PLAY') {
            cur.setIsPlaying(true);
            void cur.audioEngine.play().then(() => {
              const audioState = cur.audioEngine.getAudioState();
              postStageMessage({ type: 'STAGE_AUDIO_STATE', audioState });
              if (audioState !== 'running') {
                prompt.show();
              } else {
                prompt.hide();
              }
            });
          } else if (action === 'TRANSPORT_PAUSE') {
            cur.audioEngine.pause();
            cur.setIsPlaying(false);
          } else if (action === 'TRIGGER_NOTE') {
            void cur.audioEngine.triggerNote(
              typeof payload?.shapeId === 'string' ? payload.shapeId : undefined,
              cur.scene
            ).then(() => ensureAudioPromptIfNeeded());
            cur.coordinator.triggerNoteStrike();
          } else if (action === 'NOTE_ON') {
            void cur.audioEngine.noteOn(
              typeof payload?.shapeId === 'string' ? payload.shapeId : undefined,
              cur.scene
            ).then(() => ensureAudioPromptIfNeeded());
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
          }, 25);
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('pointerdown', onPointerUnlock, true);
      prompt.destroy();
      audioEngine.onAudioStateChange = undefined;
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
      postStageMessage({ type: 'APP_STATE_UPDATE', state: payload });
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
      postStageMessage({ type: 'APP_ACTION', action, payload });
    },
    [embedded]
  );

  const broadcastPrimaryD = useCallback(
    (d: number) => {
      if (!embedded || isApplyingRemoteRef.current) return;
      const now = performance.now();
      if (now - lastDPostRef.current < 33) return;
      lastDPostRef.current = now;
      postStageMessage({ type: 'APP_ACTION', action: 'SET_PRIMARY_D', payload: { d } });
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
