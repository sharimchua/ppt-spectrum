/**
 * Hook to launch guided educational walkthrough demos from the tutorial modal.
 * Supports continuum sweep demos (3:2, 4:3, 5:4, 4:5:6, Sine, Sawtooth, Clarinet, Bell, Custom Mix)
 * and sound-design bundle demos (Custom 8-Slot Cycle Sieves, Stretched Piano, Supercycle Bowls),
 * while managing the context-aware "Back to Guide" toast state and scroll bookmarking.
 */

import { useState, useCallback, useEffect } from 'react';
import { Scene, Shape, Filter } from '../../core/types';
import { PRESET_TRIO, PRESET_DUO_HORIZONTAL, PRESET_LAYOUTS, LayoutDefinition } from '../../core/layout-models';
import { PRESET_LIBRARY_BUNDLES, applyLibraryBundleToScene } from '../../core/library-models';
import { PRESET_FILTERS } from '../../core/filter-presets';
import { createDefaultMidiTuningConfig } from '../../core/midi-tuning';
import { BookmarkSettings } from '../bookmarks-storage';
import { UseMidiResult } from './useMidi';
import { UseTuningStrumResult } from './useTuningStrum';
import {
  TutorialDemoId,
  TutorialDemoConfig,
  TutorialSectionId,
  CustomTutorialDemoOverride,
  getTutorialDemoById,
} from '../info-modal/tutorial-demos';

export interface UseTeachingDemoOptions {
  handleSelectPreset: (presetId: string) => void;
  setBookmarks: React.Dispatch<React.SetStateAction<BookmarkSettings>>;
  handleUpdatePlacementD: (d: number) => void;
  updateScene: (updater: Scene | ((prev: Scene) => Scene)) => void;
  layout: LayoutDefinition;
  setLayout: (layout: LayoutDefinition) => void;
  scene: Scene;
  toggleFilter: () => void;
  isOscillating: boolean;
  toggleOscillating: () => void;
  resetRoundTrip?: () => void;
  isPlaying: boolean;
  handleTogglePlay: () => void;
  setIsInfoOpen: (open: boolean) => void;
  midi: UseMidiResult;
  tuningStrum?: UseTuningStrumResult;
}

export interface UseTeachingDemoResult {
  activeDemo: TutorialDemoConfig | null;
  tutorialSection: TutorialSectionId;
  setTutorialSection: (section: TutorialSectionId) => void;
  tutorialScrollTop: number;
  setTutorialScrollTop: (scrollTop: number) => void;
  userTookControl: boolean;
  notifyUserTookControl: () => void;
  handlePlayDemo: (
    demoId?: TutorialDemoId,
    fromSection?: TutorialSectionId,
    customOverride?: CustomTutorialDemoOverride
  ) => void;
  handleReturnToTutorial: () => void;
  handleDismissDemoToast: () => void;
}

const VOICE_CYCLE = ['kick', 'snare', 'woodblock', 'clave', 'hihat', 'triangle', 'click'] as const;

export function useTeachingDemo({
  handleSelectPreset,
  setBookmarks,
  handleUpdatePlacementD,
  updateScene,
  layout,
  setLayout,
  scene,
  toggleFilter,
  isOscillating,
  toggleOscillating,
  resetRoundTrip,
  isPlaying,
  handleTogglePlay,
  setIsInfoOpen,
  midi,
  tuningStrum,
}: UseTeachingDemoOptions): UseTeachingDemoResult {
  const [activeDemo, setActiveDemo] = useState<TutorialDemoConfig | null>(null);
  const [tutorialSection, setTutorialSection] = useState<TutorialSectionId>('overview');
  const [tutorialScrollTop, setTutorialScrollTop] = useState<number>(0);
  const [userTookControl, setUserTookControl] = useState<boolean>(false);

  const notifyUserTookControl = useCallback(() => {
    setUserTookControl(true);
  }, []);

  // Resuming sweep clears manual-control override so narration returns to live sweep phases
  useEffect(() => {
    if (isOscillating) {
      setUserTookControl(false);
    }
  }, [isOscillating]);

  const launchDemoConfig = useCallback(
    (
      baseDemo: TutorialDemoConfig,
      sectionOverride?: TutorialSectionId,
      customOverride?: CustomTutorialDemoOverride
    ) => {
      const effectiveDemo: TutorialDemoConfig = customOverride
        ? {
            ...baseDemo,
            title: customOverride.title || baseDemo.title,
            shortTitle: customOverride.shortTitle || baseDemo.shortTitle,
            badge: customOverride.badge || baseDemo.badge,
            listenHint: customOverride.listenHint || baseDemo.listenHint,
          }
        : baseDemo;

      setActiveDemo(effectiveDemo);
      setTutorialSection(sectionOverride || baseDemo.fromSection);
      setUserTookControl(false);
      resetRoundTrip?.();

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      const targetLayoutId = isMobile ? effectiveDemo.mobileLayoutId : effectiveDemo.desktopLayoutId;
      const targetLayout = targetLayoutId ? PRESET_LAYOUTS[targetLayoutId] : undefined;
      if (targetLayout) {
        if (layout.id !== targetLayout.id) {
          setLayout(targetLayout);
        }
      } else if (layout.id === 'solo') {
        setLayout(isMobile ? PRESET_DUO_HORIZONTAL : PRESET_TRIO);
      }

      // Explicitly clear any previous keyboard notes and sequencer before configuring the scene
      tuningStrum?.setIsStrumMode(false);
      midi.clearAllNotes();
      if (!effectiveDemo.requiresKeyboard) {
        midi.closeKeyboard();
      }

      if (baseDemo.mode === 'bundle' && baseDemo.bundleId) {
        const bundle = PRESET_LIBRARY_BUNDLES.find((b) => b.id === baseDemo.bundleId);
        if (bundle) {
          if (isOscillating) {
            toggleOscillating();
          }
          updateScene((prev) => {
            const next = applyLibraryBundleToScene(prev, bundle);
            if (customOverride?.customSieveSlots) {
              const slotWeights: number[] = customOverride.customSieveSlots.map((open) =>
                open ? 1 : 0
              );
              if (!slotWeights.some((w) => w > 0)) {
                slotWeights[0] = 1;
              }
              const sig = slotWeights.join(',');
              const isTresillo = sig === '1,0,0,1,0,0,1,0';
              const isCinquillo = sig === '1,0,1,1,0,1,1,0';

              let activeFilter: Filter;
              let nextFilters = [...(next.filters && next.filters.length > 0 ? next.filters : PRESET_FILTERS)];

              if (isTresillo) {
                activeFilter =
                  PRESET_FILTERS.find((f) => f.id === 'filter-tresillo') || next.filter;
              } else if (isCinquillo) {
                activeFilter =
                  PRESET_FILTERS.find((f) => f.id === 'filter-cinquillo') || next.filter;
              } else {
                const customFilterId = 'user-filter-tutorial-sieve';
                activeFilter = {
                  id: customFilterId,
                  name: effectiveDemo.shortTitle || 'Custom 8-Slot Sieve',
                  origin: 'user',
                  category: 'rhythm',
                  description: effectiveDemo.listenHint || 'Custom 8-slot cycle sieve from tutorial.',
                  enabled: true,
                  action: 'keep',
                  combine: 'all',
                  depth: 1.0,
                  conditions: [
                    {
                      kind: 'cycle',
                      id: 'cond-tutorial-sieve',
                      enabled: true,
                      divisions: 8,
                      slotWeights,
                      rotation: 0,
                      tolerance: 0.15,
                      offGridMatch: 0.0,
                      supercycle: null,
                    },
                  ],
                  focus: null,
                  centreD: 0.0,
                  widthD: 4.0,
                  softnessD: 1.0,
                  mode: 'band-pass',
                  trackingMode: 'fixed',
                };
                const existingIdx = nextFilters.findIndex((f) => f.id === customFilterId);
                if (existingIdx >= 0) {
                  nextFilters[existingIdx] = activeFilter;
                } else {
                  nextFilters = [...nextFilters, activeFilter];
                }
              }

              return {
                ...next,
                filters: nextFilters,
                filter: { ...activeFilter, enabled: true },
                envelope: next.envelope ? { ...next.envelope, enabled: false } : prev.envelope,
              };
            }
            return next;
          });
        }
      } else {
        const shapeId = baseDemo.shapeId || 'hemiola-3-2';
        const rhythmD = baseDemo.rhythmD ?? 3.689;
        const rhythmBpm = baseDemo.rhythmBpm ?? 120;
        const pitchD = baseDemo.pitchD ?? -4.092;
        const pitchLabel = baseDemo.pitchLabel ?? 'A4 440 Hz (Pitch)';
        const nextCarrier = customOverride?.pitchCarrier ?? baseDemo.pitchCarrier ?? 'auto';
        const nextContainer = customOverride?.rhythmContainer ?? baseDemo.rhythmContainer ?? 'auto';
        const isStaticPlace = baseDemo.mode === 'static-place';
        const initialD = isStaticPlace ? pitchD : rhythmD;

        const effectiveCustomPartials = customOverride?.customPartials ?? baseDemo.customPartials;
        if (effectiveCustomPartials && effectiveCustomPartials.length > 0) {
          const activePartials = effectiveCustomPartials.filter((p) => p.amp > 0);
          const customShape: Shape = {
            id: customOverride?.customPartials ? 'tutorial-custom-overtone-mix' : shapeId,
            name: customOverride?.customPartials ? 'Tutorial Overtone Mix' : baseDemo.shortTitle,
            origin: 'user',
            category: baseDemo.customPartials ? 'harmony' : 'timbre',
            description: baseDemo.summary,
            adsr: { attack: 0.03, decay: 0.4, sustain: 0.85, release: 0.25, damping: 0.1 },
            partials: activePartials.map((p, idx) => ({
              id: `tut_p_${idx + 1}`,
              ratio:
                p.num !== undefined && p.den !== undefined
                  ? { kind: 'rational', num: p.num, den: p.den }
                  : Number.isInteger(p.ratioVal)
                    ? { kind: 'rational', num: p.ratioVal, den: 1 }
                    : { kind: 'real', value: p.ratioVal },
              amp: p.amp,
              phase: 0,
              voice: p.voice ?? VOICE_CYCLE[idx % VOICE_CYCLE.length],
              label: p.label,
            })),
          };

          updateScene((prev) => {
            const exists = prev.shapes.some((s) => s.id === customShape.id);
            const nextShapes = exists
              ? prev.shapes.map((s) => (s.id === customShape.id ? customShape : s))
              : [...prev.shapes, customShape];
            return {
              ...prev,
              shapes: nextShapes,
              placements: prev.placements.map((pl, idx) =>
                idx === 0 ? { ...pl, shapeId: customShape.id, d: initialD } : pl
              ),
              filter: customOverride?.customFilter
                ? { ...customOverride.customFilter, enabled: true }
                : { ...prev.filter, enabled: false },
              audio: {
                ...prev.audio,
                pitchCarrier: nextCarrier,
                rhythmContainer: nextContainer,
              },
            };
          });
        } else {
          handleSelectPreset(shapeId);
          handleUpdatePlacementD(initialD);
          if (scene.filter.enabled) {
            toggleFilter();
          }
          updateScene((prev) => ({
            ...prev,
            audio: {
              ...prev.audio,
              pitchCarrier: nextCarrier,
              rhythmContainer: nextContainer,
            },
          }));
        }

        if (isStaticPlace) {
          if (isOscillating) {
            toggleOscillating();
          }
        } else {
          setBookmarks((prev) => ({
            ...prev,
            a: {
              d: rhythmD,
              label: `${rhythmBpm} BPM (Rhythm)`,
              type: 'rhythm',
              bpm: rhythmBpm,
            },
            b: {
              d: pitchD,
              label: pitchLabel,
              type: 'pitch',
              noteIndex: baseDemo.noteIndex ?? 9,
              octave: baseDemo.octave ?? 4,
            },
            periodSec: baseDemo.periodSec ?? 10,
            dwellSec: baseDemo.dwellSec ?? 4,
          }));

          if (!isOscillating) {
            toggleOscillating();
          }
        }
      }

      const effectiveKeyboardConfig = customOverride?.keyboardConfig ?? effectiveDemo.keyboardConfig;
      if (effectiveDemo.requiresKeyboard && effectiveKeyboardConfig) {
        const { tuningPresetId, subsetId, latchedMidiNotes, rhythmPhaseMode, autoPlay } = effectiveKeyboardConfig;
        const polarityD = baseDemo.mode === 'static-place' ? (baseDemo.pitchD ?? baseDemo.rhythmD ?? -3.0) : (baseDemo.rhythmD ?? 4.0);
        const presetCfg = createDefaultMidiTuningConfig(tuningPresetId);
        if (subsetId) presetCfg.subsetId = subsetId;
        if (rhythmPhaseMode) presetCfg.rhythmPhaseMode = rhythmPhaseMode;
        midi.setMidiTuning(presetCfg);
        midi.openKeyboard();
        if (autoPlay && tuningStrum) {
          tuningStrum.setIsStrumMode(true);
          if (!tuningStrum.isSequencing) {
            tuningStrum.toggleSequencer();
          }
        } else {
          if (!midi.isMidiHoldActive && latchedMidiNotes.length > 0) {
            midi.toggleMidiHold();
          }
          for (const note of latchedMidiNotes) {
            midi.virtualNoteOn(note, 0.85, polarityD);
          }
        }
      }

      if (!isPlaying) {
        handleTogglePlay();
      }

      setIsInfoOpen(false);
    },
    [
      layout.id,
      setLayout,
      midi,
      isOscillating,
      toggleOscillating,
      updateScene,
      handleSelectPreset,
      setBookmarks,
      handleUpdatePlacementD,
      scene.filter.enabled,
      toggleFilter,
      isPlaying,
      handleTogglePlay,
      setIsInfoOpen,
      resetRoundTrip,
      tuningStrum,
    ]
  );

  const handlePlayDemo = useCallback(
    (
      demoId: TutorialDemoId = 'hemiola-sweep',
      fromSection?: TutorialSectionId,
      customOverride?: CustomTutorialDemoOverride
    ) => {
      const demo = getTutorialDemoById(demoId);
      launchDemoConfig(demo, fromSection, customOverride);
    },
    [launchDemoConfig]
  );

  const handleReturnToTutorial = useCallback(() => {
    if (activeDemo?.requiresKeyboard) {
      tuningStrum?.setIsStrumMode(false);
      midi.clearAllNotes();
    }
    if (isPlaying) {
      handleTogglePlay();
    } else if (isOscillating) {
      toggleOscillating();
    }
    setActiveDemo(null);
    setIsInfoOpen(true);
  }, [activeDemo, tuningStrum, midi, isPlaying, handleTogglePlay, isOscillating, toggleOscillating, setIsInfoOpen]);

  const handleDismissDemoToast = useCallback(() => {
    setActiveDemo(null);
  }, []);

  return {
    activeDemo,
    tutorialSection,
    setTutorialSection,
    tutorialScrollTop,
    setTutorialScrollTop,
    userTookControl,
    notifyUserTookControl,
    handlePlayDemo,
    handleReturnToTutorial,
    handleDismissDemoToast,
  };
}
