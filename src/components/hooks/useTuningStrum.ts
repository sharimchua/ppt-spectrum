/**
 * Hook managing Tuning-driven Strum / Scale-Step canvas mode, degree activation toggles,
 * and automated stepped scale sequencing across any Tuning System.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Scene } from '../../core/types';
import {
  TuningDegree,
  resolveTuningDegrees,
  tuningDegreeToRelativeMapping,
} from '../../core/tuning-systems';
import {
  SequencePattern,
  buildSequenceIndices,
  evaluateSequenceStep,
} from '../../core/scale-sequencer';
import { UseMidiResult } from './useMidi';

const SCALE_STRIP_MIDI_BASE = 2000;

export interface UseTuningStrumOptions {
  scene: Scene;
  midi: UseMidiResult;
}

export interface UseTuningStrumResult {
  isStrumMode: boolean;
  setIsStrumMode: (active: boolean) => void;
  toggleStrumMode: () => void;
  allDegrees: TuningDegree[];
  activeDegrees: TuningDegree[];
  activeIndex: number;
  strumToIndex: (index: number) => void;
  strumStep: (deltaSteps: number) => void;
  toggleDegreeActive: (degreeIndex: number) => void;
  isSequencing: boolean;
  sequencePattern: SequencePattern;
  setSequencePattern: (pattern: SequencePattern) => void;
  sequenceTempoBpm: number;
  setSequenceTempoBpm: (bpm: number) => void;
  toggleSequencer: () => void;
  stopSequencer: () => void;
}

export function useTuningStrum({ scene, midi }: UseTuningStrumOptions): UseTuningStrumResult {
  const [isStrumMode, setIsStrumModeState] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSequencing, setIsSequencing] = useState(false);
  const [sequencePattern, setSequencePattern] = useState<SequencePattern>(() => {
    const h = midi.midiTuning.harmonyStructure;
    return h === 'tertial' ? 'triads' : h === 'quartal' ? 'quartal' : 'ascend';
  });
  const [sequenceTempoBpm, setSequenceTempoBpm] = useState(140);

  // Sync sequencer pattern when Harmony Structure changes in the Tuning Window
  useEffect(() => {
    const h = midi.midiTuning.harmonyStructure;
    if (h === 'tertial') setSequencePattern('triads');
    else if (h === 'quartal') setSequencePattern('quartal');
    else if (h === 'secundal') setSequencePattern('ascend');
  }, [midi.midiTuning.harmonyStructure]);

  const seqStartTimeRef = useRef<number>(0);
  const seqIntervalRef = useRef<number | null>(null);
  const activeVoiceMidiRef = useRef<number | null>(null);
  const playDegreeRef = useRef<(index: number, list: TuningDegree[]) => void>(() => {});
  const placementD = scene.placements[0]?.d ?? -3.0;

  const allDegrees = useMemo(
    () => resolveTuningDegrees(midi.midiTuning),
    [midi.midiTuning]
  );

  const activeDegrees = useMemo(
    () => allDegrees.filter((d) => d.active),
    [allDegrees]
  );

  const releaseActiveVoice = useCallback(() => {
    if (activeVoiceMidiRef.current !== null) {
      midi.virtualNoteOff(activeVoiceMidiRef.current);
      activeVoiceMidiRef.current = null;
    }
  }, [midi]);

  const playDegreeAtIndex = useCallback(
    (index: number, list: TuningDegree[]) => {
      if (list.length === 0) return;
      const clamped = Math.max(0, Math.min(list.length - 1, index));
      const deg = list[clamped];
      const nextMidiId = SCALE_STRIP_MIDI_BASE + deg.index;
      const mapping = tuningDegreeToRelativeMapping(
        deg,
        0,
        nextMidiId,
        placementD,
        scene.anchors.tplFrequencyHz
      );
      if (activeVoiceMidiRef.current !== null && activeVoiceMidiRef.current !== nextMidiId) {
        midi.virtualNoteOff(activeVoiceMidiRef.current);
      }
      activeVoiceMidiRef.current = nextMidiId;
      midi.virtualNoteOn(nextMidiId, 0.85, undefined, mapping.d);
      setActiveIndex(clamped);
    },
    [midi, placementD, scene.anchors.tplFrequencyHz]
  );

  const setIsStrumMode = useCallback(
    (active: boolean) => {
      if (active) {
        setIsStrumModeState(true);
      } else {
        setIsSequencing(false);
        setIsStrumModeState(false);
        releaseActiveVoice();
      }
    },
    [releaseActiveVoice]
  );

  const toggleStrumMode = useCallback(() => {
    setIsStrumMode(!isStrumMode);
  }, [isStrumMode, setIsStrumMode]);

  const strumToIndex = useCallback(
    (index: number) => {
      playDegreeAtIndex(index, activeDegrees);
    },
    [activeDegrees, playDegreeAtIndex]
  );

  const strumStep = useCallback(
    (deltaSteps: number) => {
      if (activeDegrees.length === 0 || deltaSteps === 0) return;
      const nextIdx = Math.max(0, Math.min(activeDegrees.length - 1, activeIndex + deltaSteps));
      if (nextIdx !== activeIndex) {
        playDegreeAtIndex(nextIdx, activeDegrees);
      }
    },
    [activeDegrees, activeIndex, playDegreeAtIndex]
  );

  const toggleDegreeActive = useCallback(
    (degreeIndex: number) => {
      const nextMask = allDegrees.map((d, i) => (i === degreeIndex ? !d.active : d.active));
      midi.setMidiTuning((prev) => ({ ...prev, activeDegreeMask: nextMask }));
    },
    [allDegrees, midi]
  );

  const stopSequencer = useCallback(() => {
    if (seqIntervalRef.current !== null) {
      window.clearInterval(seqIntervalRef.current);
      seqIntervalRef.current = null;
    }
    setIsSequencing(false);
    releaseActiveVoice();
  }, [releaseActiveVoice]);

  const toggleSequencer = useCallback(() => {
    if (isSequencing) {
      stopSequencer();
    } else {
      if (!isStrumMode) {
        setIsStrumModeState(true);
      }
      seqStartTimeRef.current = performance.now();
      setIsSequencing(true);
    }
  }, [isSequencing, isStrumMode, stopSequencer]);

  playDegreeRef.current = playDegreeAtIndex;

  useEffect(() => {
    if (!isSequencing || activeDegrees.length === 0) return;

    const indices = buildSequenceIndices(activeDegrees.length, sequencePattern);
    const stepMs = Math.max(80, Math.round(60000 / Math.max(30, sequenceTempoBpm)));
    let lastStepPos = -1;

    const tick = () => {
      const elapsed = performance.now() - seqStartTimeRef.current;
      const { stepPosition, degreeIndex } = evaluateSequenceStep(elapsed, stepMs, indices);
      if (stepPosition !== lastStepPos && degreeIndex >= 0) {
        lastStepPos = stepPosition;
        playDegreeRef.current(degreeIndex, activeDegrees);
      }
    };

    tick();
    const intervalId = window.setInterval(tick, Math.min(40, Math.floor(stepMs / 3)));
    seqIntervalRef.current = intervalId;
    return () => {
      window.clearInterval(intervalId);
      if (seqIntervalRef.current === intervalId) {
        seqIntervalRef.current = null;
      }
    };
  }, [isSequencing, activeDegrees, sequencePattern, sequenceTempoBpm]);

  return {
    isStrumMode,
    setIsStrumMode,
    toggleStrumMode,
    allDegrees,
    activeDegrees,
    activeIndex,
    strumToIndex,
    strumStep,
    toggleDegreeActive,
    isSequencing,
    sequencePattern,
    setSequencePattern,
    sequenceTempoBpm,
    setSequenceTempoBpm,
    toggleSequencer,
    stopSequencer,
  };
}
