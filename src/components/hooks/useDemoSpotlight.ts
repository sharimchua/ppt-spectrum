/**
 * Manages automated Cycle-2 bandpass spotlight cues and one-tap contextual
 * actions (voice isolation & tuning A/B comparison) for guided tutorial demos.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Scene, Filter } from '../../core/types';
import { createBandPassCondition } from '../../core/filter-presets';
import { createDefaultMidiTuningConfig } from '../../core/midi-tuning';
import { TutorialDemoConfig, SpotlightVoiceConfig } from '../info-modal/tutorial-demos';
import { UseMidiResult } from './useMidi';

export interface DemoQuickAction {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export interface UseDemoSpotlightOptions {
  activeDemo: TutorialDemoConfig | null;
  currentD: number;
  isOscillating: boolean;
  hasCompletedRoundTrip: boolean;
  updateScene: (updater: Scene | ((prev: Scene) => Scene)) => void;
  midi: UseMidiResult;
}

export interface UseDemoSpotlightResult {
  overrideNarration: string | null;
  quickAction: DemoQuickAction | null;
}

function applySpotlightFilter(
  updateScene: (updater: Scene | ((prev: Scene) => Scene)) => void,
  voice: SpotlightVoiceConfig | null
): void {
  updateScene((prev) => {
    if (!voice) {
      if (!prev.filter.enabled && prev.filter.id !== 'demo-spotlight-filter') {
        return prev;
      }
      return {
        ...prev,
        filter: { ...prev.filter, enabled: false },
      };
    }

    const spotlightFilter: Filter = {
      id: 'demo-spotlight-filter',
      name: `Spotlight: ${voice.label}`,
      origin: 'user',
      category: 'aperture',
      description: 'Automated tutorial bandpass spotlight isolating a single voice.',
      enabled: true,
      action: 'keep',
      combine: 'all',
      depth: 1.0,
      conditions: [
        createBandPassCondition('scene', voice.centreD, voice.widthD, voice.softnessD, 'cond-demo-spotlight'),
      ],
      focus: { conditionId: 'cond-demo-spotlight', spanIndex: 0 },
      centreD: voice.centreD,
      widthD: voice.widthD,
      softnessD: voice.softnessD,
      mode: 'band-pass',
      trackingMode: 'relative',
    };

    return {
      ...prev,
      filter: spotlightFilter,
    };
  });
}

export function useDemoSpotlight({
  activeDemo,
  currentD,
  isOscillating,
  hasCompletedRoundTrip,
  updateScene,
  midi,
}: UseDemoSpotlightOptions): UseDemoSpotlightResult {
  const [spotlightIndex, setSpotlightIndex] = useState<number | null>(null);
  const [isAltTuning, setIsAltTuning] = useState<boolean>(false);
  const [autoSequenceDone, setAutoSequenceDone] = useState<boolean>(false);
  const manualOverrideRef = useRef<boolean>(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  // Reset spotlight state whenever the active demo changes or closes
  useEffect(() => {
    clearTimers();
    manualOverrideRef.current = false;
    setSpotlightIndex(null);
    setIsAltTuning(false);
    setAutoSequenceDone(false);
  }, [activeDemo?.id, clearTimers]);

  // Automated Cycle-2 Pitch Dwell spotlight (runs once per demo launch)
  useEffect(() => {
    const voices = activeDemo?.spotlightVoices;
    if (
      !activeDemo ||
      !voices ||
      voices.length === 0 ||
      !hasCompletedRoundTrip ||
      !isOscillating ||
      manualOverrideRef.current ||
      autoSequenceDone ||
      timersRef.current.length > 0
    ) {
      return;
    }

    // Trigger once the sweep enters Pitch Space on Cycle 2
    if (currentD > -2.0) return;

    const stepMs = 1550;
    setSpotlightIndex(0);
    applySpotlightFilter(updateScene, voices[0]);

    voices.slice(1).forEach((voice, idx) => {
      const t = window.setTimeout(() => {
        if (manualOverrideRef.current) return;
        setSpotlightIndex(idx + 1);
        applySpotlightFilter(updateScene, voice);
      }, stepMs * (idx + 1));
      timersRef.current.push(t);
    });

    const endTimer = window.setTimeout(() => {
      timersRef.current = [];
      if (manualOverrideRef.current) return;
      setSpotlightIndex(null);
      setAutoSequenceDone(true);
      applySpotlightFilter(updateScene, null);
    }, stepMs * voices.length);
    timersRef.current.push(endTimer);
  }, [
    activeDemo,
    currentD,
    isOscillating,
    hasCompletedRoundTrip,
    autoSequenceDone,
    updateScene,
  ]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const cycleSpotlight = useCallback(() => {
    const voices = activeDemo?.spotlightVoices;
    if (!voices || voices.length === 0) return;

    clearTimers();
    manualOverrideRef.current = true;
    setAutoSequenceDone(true);

    setSpotlightIndex((prev) => {
      const next = prev === null ? 0 : prev + 1 < voices.length ? prev + 1 : null;
      applySpotlightFilter(updateScene, next === null ? null : voices[next]);
      return next;
    });
  }, [activeDemo, clearTimers, updateScene]);

  const toggleTuningCompare = useCallback(() => {
    const cfg = activeDemo?.tuningCompare;
    const basePreset = activeDemo?.keyboardConfig?.tuningPresetId;
    if (!cfg || !basePreset) return;

    setIsAltTuning((prev) => {
      const nextAlt = !prev;
      const targetPreset = nextAlt ? cfg.altPresetId : basePreset;
      const nextTuning = createDefaultMidiTuningConfig(targetPreset);
      if (activeDemo.keyboardConfig?.rhythmPhaseMode) {
        nextTuning.rhythmPhaseMode = activeDemo.keyboardConfig.rhythmPhaseMode;
      }
      midi.setMidiTuning(nextTuning);
      return nextAlt;
    });
  }, [activeDemo, midi]);

  // Compute narration override & contextual quick-action pill
  let overrideNarration: string | null = null;
  let quickAction: DemoQuickAction | null = null;

  const voices = activeDemo?.spotlightVoices;
  if (voices && voices.length > 0) {
    if (spotlightIndex !== null && voices[spotlightIndex]) {
      overrideNarration = voices[spotlightIndex].narration;
    }
    quickAction = {
      label: spotlightIndex === null ? 'Split Voices' : voices[spotlightIndex].label,
      isActive: spotlightIndex !== null,
      onClick: cycleSpotlight,
    };
  } else if (activeDemo?.tuningCompare) {
    const cfg = activeDemo.tuningCompare;
    if (isAltTuning) {
      overrideNarration = cfg.altNarration;
    }
    quickAction = {
      label: isAltTuning ? cfg.altLabel : cfg.label,
      isActive: isAltTuning,
      onClick: toggleTuningCompare,
    };
  }

  return { overrideNarration, quickAction };
}
