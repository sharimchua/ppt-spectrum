/**
 * Unified polyphonic input hook for hardware Web MIDI and the on-screen Virtual Keyboard.
 * Supports polarity-aware tuning, live re-tuning of held/latched notes, TPL polarity
 * flipping, and ruler/lens ghosting.
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

export type NoteInputSource = 'midi' | 'virtual';

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
  isTuningModalOpen: boolean;
  openTuningModal: () => void;
  closeTuningModal: () => void;
  isKeyboardOpen: boolean;
  openKeyboard: () => void;
  closeKeyboard: () => void;
  toggleKeyboard: () => void;
  requestMidiAccess: () => Promise<boolean>;
  selectMidiInput: (id: string) => void;
  midiTuning: MidiTuningConfig;
  setMidiTuning: (updater: MidiTuningConfig | ((prev: MidiTuningConfig) => MidiTuningConfig)) => void;
  lastMapping: MidiNoteMappingResult | null;
  heldMappings: MidiNoteMappingResult[];
  activeMidiNumbers: number[];
  latchedMidiNumbers: number[];
  virtualNoteOn: (midi: number, velocity?: number) => void;
  virtualNoteOff: (midi: number) => void;
  toggleVirtualNote: (midi: number, velocity?: number) => void;
  transposeLatchedNotes: (semitones: number) => boolean;
  isMidiHoldActive: boolean;
  toggleMidiHold: () => void;
  clearAllNotes: () => void;
  flipPolarity: () => void;
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
  const [isTuningModalOpen, setIsTuningModalOpen] = useState<boolean>(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);
  const [midiTuning, setMidiTuningState] = useState<MidiTuningConfig>(() => loadMidiTuningConfig());
  const [lastMapping, setLastMapping] = useState<MidiNoteMappingResult | null>(null);
  const [heldMappings, setHeldMappings] = useState<MidiNoteMappingResult[]>([]);
  const [activeMidiNumbers, setActiveMidiNumbers] = useState<number[]>([]);
  const [latchedMidiNumbers, setLatchedMidiNumbers] = useState<number[]>([]);
  const [isMidiHoldActive, setIsMidiHoldActive] = useState<boolean>(false);

  // Ordered list of currently held MIDI notes (most recent at the end)
  const heldStackRef = useRef<HeldStackEntry[]>([]);
  const sourcesByMidiRef = useRef<Map<number, Set<NoteInputSource>>>(new Map());
  const physicalMidiDownRef = useRef<Set<number>>(new Set());
  const sostenutoMidiRef = useRef<Set<number>>(new Set());
  const isMidiHoldRef = useRef<boolean>(false);
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
    setActiveMidiNumbers(stack.map((item) => item.midi));

    const latched: number[] = [];
    for (const [m, srcs] of sourcesByMidiRef.current.entries()) {
      if (srcs.has('virtual')) latched.push(m);
    }
    setLatchedMidiNumbers(latched);
  }, [coordinator]);

  const dispatchNoteOn = useCallback(
    (midi: number, velocity: number, source: NoteInputSource, explicitPolarityD?: number) => {
      let srcs = sourcesByMidiRef.current.get(midi);
      if (!srcs) {
        srcs = new Set();
        sourcesByMidiRef.current.set(midi, srcs);
      }
      srcs.add(source);

      const sc = sceneRef.current;
      const currentD = explicitPolarityD ?? (sc.placements[0]?.d ?? 2.0);
      const mapping = midiToDWithTuning(
        midi,
        midiTuningRef.current,
        currentD,
        sc.anchors.tuningA4Hz,
        sc.anchors.tplFrequencyHz
      );

      void audioEngine.midiNoteOn(
        midi,
        velocity,
        mapping.d,
        undefined,
        midiTuningRef.current.rhythmPhaseMode
      );

      const filtered = heldStackRef.current.filter((item) => item.midi !== midi);
      filtered.push({ midi, d: mapping.d, velocity, mapping });
      heldStackRef.current = filtered;

      setLastMapping(mapping);
      syncGhostsToCoordinator();
      coordinator.triggerNoteStrike();
      onUpdatePlacementDRef.current(mapping.d);
    },
    [audioEngine, coordinator, sceneRef, syncGhostsToCoordinator]
  );

  const dispatchNoteOff = useCallback(
    (midi: number, source: NoteInputSource) => {
      const srcs = sourcesByMidiRef.current.get(midi);
      if (srcs) {
        srcs.delete(source);
        if (srcs.size > 0) {
          syncGhostsToCoordinator();
          return;
        }
        sourcesByMidiRef.current.delete(midi);
      }

      audioEngine.midiNoteOff(midi);

      const prevTop = heldStackRef.current[heldStackRef.current.length - 1];
      heldStackRef.current = heldStackRef.current.filter((item) => item.midi !== midi);
      syncGhostsToCoordinator();

      const nextTop = heldStackRef.current[heldStackRef.current.length - 1];
      if (prevTop && prevTop.midi === midi && nextTop) {
        onUpdatePlacementDRef.current(nextTop.d);
      }
    },
    [audioEngine, syncGhostsToCoordinator]
  );

  const clearAllNotes = useCallback(() => {
    if (heldStackRef.current.length === 0 && sourcesByMidiRef.current.size === 0) {
      return;
    }
    heldStackRef.current = [];
    sourcesByMidiRef.current.clear();
    audioEngine.releaseAllMidiNotes();
    syncGhostsToCoordinator();
  }, [audioEngine, syncGhostsToCoordinator]);

  const retargetHeldNotesToPolarityD = useCallback(
    (polarityD: number, tuningCfg: MidiTuningConfig) => {
      const stack = heldStackRef.current;
      if (stack.length === 0) return;
      const sc = sceneRef.current;
      const nextStack: HeldStackEntry[] = [];
      for (const item of stack) {
        const mapping = midiToDWithTuning(
          item.midi,
          tuningCfg,
          polarityD,
          sc.anchors.tuningA4Hz,
          sc.anchors.tplFrequencyHz
        );
        void audioEngine.midiNoteOn(
          item.midi,
          item.velocity,
          mapping.d,
          undefined,
          tuningCfg.rhythmPhaseMode
        );
        nextStack.push({ ...item, d: mapping.d, mapping });
      }
      heldStackRef.current = nextStack;
      const top = nextStack[nextStack.length - 1];
      if (top) {
        setLastMapping(top.mapping);
        onUpdatePlacementDRef.current(top.d);
      }
      syncGhostsToCoordinator();
    },
    [audioEngine, sceneRef, syncGhostsToCoordinator]
  );

  const flipPolarity = useCallback(() => {
    const sc = sceneRef.current;
    const currentD = sc.placements[0]?.d ?? 2.0;
    const flippedD =
      Math.abs(currentD) < 0.01 ? (currentD >= 0 ? -2.0 : 2.0) : -currentD;

    if (heldStackRef.current.length > 0) {
      retargetHeldNotesToPolarityD(flippedD, midiTuningRef.current);
    } else {
      onUpdatePlacementDRef.current(flippedD);
    }
  }, [retargetHeldNotesToPolarityD, sceneRef]);

  // Live re-resolve held/latched notes whenever tuning config changes
  useEffect(() => {
    if (heldStackRef.current.length === 0) return;
    const currentD = sceneRef.current.placements[0]?.d ?? 2.0;
    retargetHeldNotesToPolarityD(currentD, midiTuning);
  }, [midiTuning, retargetHeldNotesToPolarityD, sceneRef]);

  useEffect(() => {
    const sourcesMap = sourcesByMidiRef.current;
    const physicalDown = physicalMidiDownRef.current;
    const unsubState = midiManagerInstance.onStateChange((next) => {
      setMidiState(next);
    });

    const unsubOn = midiManagerInstance.onNoteOn((midi, velocity) => {
      physicalMidiDownRef.current.add(midi);
      dispatchNoteOn(midi, velocity, 'midi');
    });

    const unsubOff = midiManagerInstance.onNoteOff((midi) => {
      physicalMidiDownRef.current.delete(midi);
      if (!(isMidiHoldRef.current && sostenutoMidiRef.current.has(midi))) {
        dispatchNoteOff(midi, 'midi');
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
      sourcesMap.clear();
      physicalDown.clear();
      sostenutoMidiRef.current.clear();
      setHeldMappings([]);
      setActiveMidiNumbers([]);
      setLatchedMidiNumbers([]);
      coordinator.setHeldMidiNotes([]);
      audioEngine.setMidiSustain(false);
      audioEngine.releaseAllMidiNotes();
    };
  }, [audioEngine, coordinator, dispatchNoteOff, dispatchNoteOn]);

  const virtualNoteOn = useCallback(
    (midi: number, velocity: number = 0.85) => {
      dispatchNoteOn(midi, velocity, 'virtual');
    },
    [dispatchNoteOn]
  );

  const virtualNoteOff = useCallback(
    (midi: number) => {
      dispatchNoteOff(midi, 'virtual');
    },
    [dispatchNoteOff]
  );

  const toggleVirtualNote = useCallback(
    (midi: number, velocity: number = 0.85) => {
      const srcs = sourcesByMidiRef.current.get(midi);
      if (srcs && srcs.has('virtual')) {
        dispatchNoteOff(midi, 'virtual');
      } else {
        dispatchNoteOn(midi, velocity, 'virtual');
      }
    },
    [dispatchNoteOff, dispatchNoteOn]
  );

  const transposeLatchedNotes = useCallback(
    (semitones: number): boolean => {
      if (semitones === 0) return false;
      const movableEntries = heldStackRef.current.filter((item) => {
        const srcs = sourcesByMidiRef.current.get(item.midi);
        const isVirtual = Boolean(srcs?.has('virtual'));
        const isSostenutoMidi = Boolean(
          srcs?.has('midi') &&
            isMidiHoldRef.current &&
            sostenutoMidiRef.current.has(item.midi) &&
            !physicalMidiDownRef.current.has(item.midi)
        );
        return isVirtual || isSostenutoMidi;
      });
      if (movableEntries.length === 0) return false;

      // Ensure the whole chord stays within [0..127] without distorting intervals
      const minMidi = Math.min(...movableEntries.map((e) => e.midi));
      const maxMidi = Math.max(...movableEntries.map((e) => e.midi));
      if (minMidi + semitones < 0 || maxMidi + semitones > 127) {
        return true;
      }

      const snapshot = movableEntries.map((e) => ({
        ...e,
        wasVirtual: Boolean(sourcesByMidiRef.current.get(e.midi)?.has('virtual')),
        wasSostenuto: Boolean(
          sourcesByMidiRef.current.get(e.midi)?.has('midi') &&
            isMidiHoldRef.current &&
            sostenutoMidiRef.current.has(e.midi)
        ),
      }));

      for (const item of snapshot) {
        if (item.wasVirtual) dispatchNoteOff(item.midi, 'virtual');
        if (item.wasSostenuto) {
          sostenutoMidiRef.current.delete(item.midi);
          dispatchNoteOff(item.midi, 'midi');
        }
      }
      for (const item of snapshot) {
        const target = item.midi + semitones;
        if (item.wasVirtual) dispatchNoteOn(target, item.velocity, 'virtual');
        if (item.wasSostenuto) {
          sostenutoMidiRef.current.add(target);
          dispatchNoteOn(target, item.velocity, 'midi');
        }
      }
      return true;
    },
    [dispatchNoteOff, dispatchNoteOn]
  );

  const toggleMidiHold = useCallback(() => {
    const next = !isMidiHoldRef.current;
    isMidiHoldRef.current = next;
    setIsMidiHoldActive(next);

    if (next) {
      // Sostenuto: capture only the physical MIDI keys currently held down
      sostenutoMidiRef.current = new Set(physicalMidiDownRef.current);
    } else {
      // Turning Hold off clears captured Sostenuto MIDI notes (if physically up) and all virtual keys
      const toReleaseMidi = [...sostenutoMidiRef.current].filter((m) => !physicalMidiDownRef.current.has(m));
      sostenutoMidiRef.current.clear();
      for (const m of toReleaseMidi) dispatchNoteOff(m, 'midi');
      const toReleaseVirtual = [...sourcesByMidiRef.current.entries()]
        .filter(([, srcs]) => srcs.has('virtual'))
        .map(([m]) => m);
      for (const m of toReleaseVirtual) dispatchNoteOff(m, 'virtual');
    }
  }, [dispatchNoteOff]);

  const openMidiModal = useCallback(() => setIsMidiModalOpen(true), []);
  const closeMidiModal = useCallback(() => setIsMidiModalOpen(false), []);
  const openTuningModal = useCallback(() => setIsTuningModalOpen(true), []);
  const closeTuningModal = useCallback(() => setIsTuningModalOpen(false), []);
  const openKeyboard = useCallback(() => setIsKeyboardOpen(true), []);
  const closeKeyboard = useCallback(() => setIsKeyboardOpen(false), []);
  const toggleKeyboard = useCallback(() => setIsKeyboardOpen((v) => !v), []);
  const requestMidiAccess = useCallback(() => midiManagerInstance.requestAccess(), []);
  const selectMidiInput = useCallback((id: string) => midiManagerInstance.selectInput(id), []);

  return {
    midiState, isMidiModalOpen, openMidiModal, closeMidiModal,
    isTuningModalOpen, openTuningModal, closeTuningModal,
    isKeyboardOpen, openKeyboard, closeKeyboard, toggleKeyboard,
    requestMidiAccess, selectMidiInput, midiTuning, setMidiTuning,
    lastMapping, heldMappings, activeMidiNumbers, latchedMidiNumbers,
    virtualNoteOn, virtualNoteOff, toggleVirtualNote, transposeLatchedNotes,
    isMidiHoldActive, toggleMidiHold, clearAllNotes, flipPolarity,
  };
}
