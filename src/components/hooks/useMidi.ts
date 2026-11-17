/**
 * MIDI input hook for polyphonic keyboard performance, polarity-aware tuning, and ruler ghosting.
 * Connects MidiManager events to AudioEngine polyphonic voices, scene frequency, and RenderCoordinator.
 */

import { useState, useEffect, useRef, useCallback, MutableRefObject } from 'react';
import { Scene } from '../../core/types';
import {
  MidiNoteMappingResult,
  MidiTuningConfig,
  createDefaultMidiTuningConfig,
  midiToDWithTuning,
} from '../../core/midi-tuning';
import { AudioEngine } from '../../audio/audio-engine';
import { midiManagerInstance, MidiDeviceState } from '../../audio/midi-manager';
import { RenderCoordinator, HeldMidiNote } from '../../renderers/render-coordinator';

const MIDI_TUNING_STORAGE_KEY = 'ppt_spectrum_midi_tuning_v1';

function loadMidiTuningConfig(): MidiTuningConfig {
  const fallback = createDefaultMidiTuningConfig('5-limit');
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(MIDI_TUNING_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<MidiTuningConfig>;
    return {
      ...fallback,
      ...parsed,
      intervals: {
        ...fallback.intervals,
        ...(parsed.intervals ?? {}),
      },
    };
  } catch {
    return fallback;
  }
}

function saveMidiTuningConfig(config: MidiTuningConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(MIDI_TUNING_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}

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
  midiTuning: MidiTuningConfig;
  setMidiTuning: (updater: MidiTuningConfig | ((prev: MidiTuningConfig) => MidiTuningConfig)) => void;
  lastMapping: MidiNoteMappingResult | null;
  heldMappings: MidiNoteMappingResult[];
}

interface HeldStackEntry {
  midi: number;
  d: number;
  velocity: number;
  mapping: MidiNoteMappingResult;
}

export function useMidi({
  coordinator,
  audioEngine,
  sceneRef,
  onUpdatePlacementD,
}: UseMidiOptions): UseMidiResult {
  const [midiState, setMidiState] = useState<MidiDeviceState>(midiManagerInstance.state);
  const [isMidiModalOpen, setIsMidiModalOpen] = useState<boolean>(false);
  const [midiTuning, setMidiTuningState] = useState<MidiTuningConfig>(() => loadMidiTuningConfig());
  const [lastMapping, setLastMapping] = useState<MidiNoteMappingResult | null>(null);
  const [heldMappings, setHeldMappings] = useState<MidiNoteMappingResult[]>([]);

  // Ordered list of currently held MIDI notes (most recent at the end)
  const heldStackRef = useRef<HeldStackEntry[]>([]);
  const midiTuningRef = useRef<MidiTuningConfig>(midiTuning);
  midiTuningRef.current = midiTuning;

  const onUpdatePlacementDRef = useRef(onUpdatePlacementD);
  onUpdatePlacementDRef.current = onUpdatePlacementD;

  const setMidiTuning = useCallback(
    (updater: MidiTuningConfig | ((prev: MidiTuningConfig) => MidiTuningConfig)) => {
      setMidiTuningState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        saveMidiTuningConfig(next);
        return next;
      });
    },
    []
  );

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
    setHeldMappings(stack.map((item) => item.mapping));
  }, [coordinator]);

  useEffect(() => {
    const unsubState = midiManagerInstance.onStateChange((next) => {
      setMidiState(next);
    });

    const unsubOn = midiManagerInstance.onNoteOn((midi, velocity) => {
      const sc = sceneRef.current;
      const currentD = sc.placements[0]?.d ?? 2.0;
      const mapping = midiToDWithTuning(
        midi,
        midiTuningRef.current,
        currentD,
        sc.anchors.tuningA4Hz,
        sc.anchors.tplFrequencyHz
      );

      // Dispatch audio note-on first for minimum keypress-to-sound latency
      void audioEngine.midiNoteOn(midi, velocity, mapping.d);

      // Move or append this note as the latest primary note
      const filtered = heldStackRef.current.filter((item) => item.midi !== midi);
      filtered.push({ midi, d: mapping.d, velocity, mapping });
      heldStackRef.current = filtered;

      setLastMapping(mapping);
      syncGhostsToCoordinator();
      coordinator.triggerNoteStrike();
      onUpdatePlacementDRef.current(mapping.d);
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
      setHeldMappings([]);
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
    midiTuning,
    setMidiTuning,
    lastMapping,
    heldMappings,
  };
}
