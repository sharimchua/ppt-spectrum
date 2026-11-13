/**
 * MIDI input hook for polyphonic keyboard performance and ruler ghosting.
 * Connects MidiManager events to AudioEngine polyphonic voices, scene frequency, and RenderCoordinator.
 */

import { useState, useEffect, useRef, useCallback, MutableRefObject } from 'react';
import { Scene } from '../../core/types';
import { midiToD } from '../../core/axis';
import { AudioEngine } from '../../audio/audio-engine';
import { midiManagerInstance, MidiDeviceState } from '../../audio/midi-manager';
import { RenderCoordinator, HeldMidiNote } from '../../renderers/render-coordinator';

export interface UseMidiOptions {
  coordinator: RenderCoordinator;
  audioEngine: AudioEngine;
  sceneRef: MutableRefObject<Scene>;
  onUpdatePlacementD: (d: number) => void;
}

export interface UseMidiResult {
  midiState: MidiDeviceState;
  isMidiModalOpen: boolean;
  openMidiModal: () => void;
  closeMidiModal: () => void;
  requestMidiAccess: () => Promise<boolean>;
  selectMidiInput: (id: string) => void;
}

export function useMidi({
  coordinator,
  audioEngine,
  sceneRef,
  onUpdatePlacementD,
}: UseMidiOptions): UseMidiResult {
  const [midiState, setMidiState] = useState<MidiDeviceState>(midiManagerInstance.state);
  const [isMidiModalOpen, setIsMidiModalOpen] = useState<boolean>(false);

  // Ordered list of currently held MIDI notes (most recent at the end)
  const heldStackRef = useRef<Array<{ midi: number; d: number; velocity: number }>>([]);
  const onUpdatePlacementDRef = useRef(onUpdatePlacementD);
  onUpdatePlacementDRef.current = onUpdatePlacementD;

  const syncGhostsToCoordinator = useCallback(() => {
    const stack = heldStackRef.current;
    const lastIdx = stack.length - 1;
    const ghosts: HeldMidiNote[] = stack.map((item, idx) => ({
      midi: item.midi,
      d: item.d,
      velocity: item.velocity,
      isPrimary: idx === lastIdx,
    }));
    coordinator.setHeldMidiNotes(ghosts);
  }, [coordinator]);

  useEffect(() => {
    const unsubState = midiManagerInstance.onStateChange((next) => {
      setMidiState(next);
    });

    const unsubOn = midiManagerInstance.onNoteOn((midi, velocity) => {
      const sc = sceneRef.current;
      const d = midiToD(midi, sc.anchors.tuningA4Hz, sc.anchors.tplFrequencyHz);

      // Dispatch audio note-on first for minimum keypress-to-sound latency
      void audioEngine.midiNoteOn(midi, velocity, d);

      // Move or append this note as the latest primary note
      const filtered = heldStackRef.current.filter((item) => item.midi !== midi);
      filtered.push({ midi, d, velocity });
      heldStackRef.current = filtered;

      syncGhostsToCoordinator();
      coordinator.triggerNoteStrike();
      onUpdatePlacementDRef.current(d);
    });

    const unsubOff = midiManagerInstance.onNoteOff((midi) => {
      audioEngine.midiNoteOff(midi);

      const prevTop = heldStackRef.current[heldStackRef.current.length - 1];
      heldStackRef.current = heldStackRef.current.filter((item) => item.midi !== midi);
      syncGhostsToCoordinator();

      // If the released note was the active primary note and another note is still held,
      // promote the most recent remaining held note to the scene frequency.
      const nextTop = heldStackRef.current[heldStackRef.current.length - 1];
      if (prevTop && prevTop.midi === midi && nextTop) {
        onUpdatePlacementDRef.current(nextTop.d);
      }
    });

    const unsubSustain = midiManagerInstance.onSustainChange((isDown) => {
      audioEngine.setMidiSustain(isDown);
    });

    return () => {
      unsubState();
      unsubOn();
      unsubOff();
      unsubSustain();
      heldStackRef.current = [];
      coordinator.setHeldMidiNotes([]);
      audioEngine.setMidiSustain(false);
      audioEngine.releaseAllMidiNotes();
    };
  }, [audioEngine, coordinator, sceneRef, syncGhostsToCoordinator]);

  const openMidiModal = useCallback(() => setIsMidiModalOpen(true), []);
  const closeMidiModal = useCallback(() => setIsMidiModalOpen(false), []);

  const requestMidiAccess = useCallback(async () => {
    return midiManagerInstance.requestAccess();
  }, []);

  const selectMidiInput = useCallback((id: string) => {
    midiManagerInstance.selectInput(id);
  }, []);

  return {
    midiState,
    isMidiModalOpen,
    openMidiModal,
    closeMidiModal,
    requestMidiAccess,
    selectMidiInput,
  };
}
