/**
 * Hook managing Tuning-driven Strum / Scale-Step canvas mode, degree activation toggles,
 * and automated stepped scale sequencing across any Tuning System.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Scene } from '../../core/types';
import {
  TuningDegree,
  resolveSystemSpec,
  resolveTuningDegrees,
  tuningDegreeToRelativeMapping,
} from '../../core/tuning-systems';
import {
  BoundaryRule,
  SequencePatternId,
  SequencerStep,
  SequencerTarget,
  buildSequenceTargets,
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
  activeSystemIndex: number | null;
  strumToIndex: (index: number) => void;
  strumStep: (deltaSteps: number) => void;
  toggleDegreeActive: (degreeIndex: number) => void;
  isSequencing: boolean;
  sequencePattern: SequencePatternId;
  setSequencePattern: (pattern: SequencePatternId) => void;
  boundaryRule: BoundaryRule;
  setBoundaryRule: (rule: BoundaryRule) => void;
  periodSpan: number;
  setPeriodSpan: (span: number) => void;
  customSteps: SequencerStep[];
  setCustomSteps: (steps: SequencerStep[] | ((prev: SequencerStep[]) => SequencerStep[])) => void;
  sequenceTempoBpm: number;
  setSequenceTempoBpm: (bpm: number) => void;
  useBorrowedTones: boolean;
  setUseBorrowedTones: (borrowed: boolean) => void;
  toggleSequencer: () => void;
  stopSequencer: () => void;
}

export function useTuningStrum({ scene, midi }: UseTuningStrumOptions): UseTuningStrumResult {
  const [isStrumMode, setIsStrumModeState] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeSystemIndex, setActiveSystemIndex] = useState<number | null>(null);
  const [isSequencing, setIsSequencing] = useState(false);
  const [sequencePattern, setSequencePattern] = useState<SequencePatternId>('step-up');
  const [boundaryRule, setBoundaryRule] = useState<BoundaryRule>('wrap');
  const [periodSpan, setPeriodSpan] = useState(1);
  const [customSteps, setCustomSteps] = useState<SequencerStep[]>([
    { scaleDelta: 2, chromaticDelta: 0 },
    { scaleDelta: -1, chromaticDelta: 0 },
    { scaleDelta: 1, chromaticDelta: 0 },
  ]);
  const [sequenceTempoBpm, setSequenceTempoBpm] = useState(140);
  const [useBorrowedTones, setUseBorrowedTones] = useState(false);

  const seqStartTimeRef = useRef<number>(0);
  const seqIntervalRef = useRef<number | null>(null);
  const gateTimerRef = useRef<number | null>(null);
  const activeVoiceMidiRef = useRef<number | null>(null);
  const playTargetRef = useRef<(target: SequencerTarget, all: TuningDegree[]) => void>(() => {});
  const releaseVoiceRef = useRef<() => void>(() => {});
  const stopSequencerRef = useRef<() => void>(() => {});
  const placementD = scene.placements[0]?.d ?? -3.0;

  const systemSpec = useMemo(
    () => resolveSystemSpec(midi.midiTuning),
    [midi.midiTuning]
  );
  const periodRatio = systemSpec.periodRatio ?? 2.0;

  const allDegrees = useMemo(
    () => resolveTuningDegrees(midi.midiTuning),
    [midi.midiTuning]
  );

  const activeDegrees = useMemo(
    () => (useBorrowedTones ? allDegrees : allDegrees.filter((d) => d.active)),
    [allDegrees, useBorrowedTones]
  );

  const clearGateTimer = useCallback(() => {
    if (gateTimerRef.current !== null) {
      window.clearTimeout(gateTimerRef.current);
      gateTimerRef.current = null;
    }
  }, []);

  const releaseActiveVoice = useCallback(() => {
    clearGateTimer();
    if (activeVoiceMidiRef.current !== null) {
      midi.virtualNoteOff(activeVoiceMidiRef.current);
      activeVoiceMidiRef.current = null;
    }
    setActiveSystemIndex(null);
  }, [clearGateTimer, midi]);

  const playTarget = useCallback(
    (target: SequencerTarget, all: TuningDegree[]) => {
      const deg = all[target.systemDegreeIndex];
      if (!deg) return;
      const nextMidiId = SCALE_STRIP_MIDI_BASE + deg.index + target.periodOffset * 100;
      const mapping = tuningDegreeToRelativeMapping(
        deg,
        target.periodOffset,
        nextMidiId,
        placementD,
        scene.anchors.tplFrequencyHz,
        periodRatio
      );
      if (activeVoiceMidiRef.current !== null && activeVoiceMidiRef.current !== nextMidiId) {
        midi.virtualNoteOff(activeVoiceMidiRef.current);
      }
      activeVoiceMidiRef.current = nextMidiId;
      midi.virtualNoteOn(nextMidiId, 0.85, undefined, mapping.d);
      setActiveSystemIndex(deg.index);
      if (target.activeIndex >= 0) {
        setActiveIndex(target.activeIndex);
      }
    },
    [midi, periodRatio, placementD, scene.anchors.tplFrequencyHz]
  );

  const playDegreeAtIndex = useCallback(
    (index: number, list: TuningDegree[]) => {
      if (list.length === 0) return;
      const clamped = Math.max(0, Math.min(list.length - 1, index));
      const deg = list[clamped];
      playTarget(
        { activeIndex: clamped, systemDegreeIndex: deg.index, periodOffset: 0 },
        allDegrees
      );
    },
    [allDegrees, playTarget]
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

  playTargetRef.current = playTarget;
  releaseVoiceRef.current = releaseActiveVoice;
  stopSequencerRef.current = stopSequencer;

  useEffect(() => {
    if (!isSequencing || activeDegrees.length === 0 || allDegrees.length === 0) return;

    const targets = buildSequenceTargets({
      activeDegreeIndices: activeDegrees.map((d) => d.index),
      systemSize: allDegrees.length,
      patternId: sequencePattern,
      customSteps,
      boundaryRule,
      periodSpan,
    });
    const stepMs = Math.max(80, Math.round(60000 / Math.max(30, sequenceTempoBpm)));
    const gateMs = Math.max(40, Math.round(stepMs * 0.78));
    let lastStepPos = -1;

    const tick = () => {
      const elapsed = performance.now() - seqStartTimeRef.current;
      const { stepPosition, target, done } = evaluateSequenceStep(
        elapsed,
        stepMs,
        targets,
        boundaryRule
      );
      if (stepPosition !== lastStepPos && target) {
        lastStepPos = stepPosition;
        clearGateTimer();
        playTargetRef.current(target, allDegrees);
        gateTimerRef.current = window.setTimeout(() => {
          gateTimerRef.current = null;
          releaseVoiceRef.current();
        }, gateMs);
      }
      if (done) {
        stopSequencerRef.current();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, Math.min(30, Math.floor(stepMs / 3)));
    seqIntervalRef.current = intervalId;
    return () => {
      clearGateTimer();
      window.clearInterval(intervalId);
      if (seqIntervalRef.current === intervalId) {
        seqIntervalRef.current = null;
      }
    };
  }, [
    isSequencing,
    activeDegrees,
    allDegrees,
    sequencePattern,
    customSteps,
    boundaryRule,
    periodSpan,
    sequenceTempoBpm,
    clearGateTimer,
  ]);

  return {
    isStrumMode,
    setIsStrumMode,
    toggleStrumMode,
    allDegrees,
    activeDegrees,
    activeIndex,
    activeSystemIndex,
    strumToIndex,
    strumStep,
    toggleDegreeActive,
    isSequencing,
    sequencePattern,
    setSequencePattern,
    boundaryRule,
    setBoundaryRule,
    periodSpan,
    setPeriodSpan,
    customSteps,
    setCustomSteps,
    sequenceTempoBpm,
    setSequenceTempoBpm,
    useBorrowedTones,
    setUseBorrowedTones,
    toggleSequencer,
    stopSequencer,
  };
}
