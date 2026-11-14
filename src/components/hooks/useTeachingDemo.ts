/**
 * Hook to launch guided educational walkthrough demos from the tutorial modal.
 * Supports continuum sweep demos (3:2, 4:3, 5:4, 4:5:6, Sine, Sawtooth, Clarinet, Bell, Custom Mix)
 * and sound-design bundle demos (Custom 8-Slot Cycle Sieves, Stretched Piano, Supercycle Bowls),
 * while managing the context-aware "Back to Guide" toast state and scroll bookmarking.
 */

import { useState, useCallback } from 'react';
import { Scene, Shape, Filter } from '../../core/types';
import { PRESET_TRIO, LayoutDefinition } from '../../core/layout-models';
import { PRESET_LIBRARY_BUNDLES, applyLibraryBundleToScene } from '../../core/library-models';
import { PRESET_FILTERS } from '../../core/filter-presets';
import { BookmarkSettings } from '../bookmarks-storage';
import {
  TutorialDemoId,
  TutorialDemoConfig,
  TutorialSectionId,
  CustomTutorialDemoOverride,
  FEATURED_TOUR_DEMOS,
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
  isPlaying: boolean;
  handleTogglePlay: () => void;
  setIsInfoOpen: (open: boolean) => void;
}

export interface UseTeachingDemoResult {
  activeDemo: TutorialDemoConfig | null;
  tutorialSection: TutorialSectionId;
  setTutorialSection: (section: TutorialSectionId) => void;
  tutorialScrollTop: number;
  setTutorialScrollTop: (scrollTop: number) => void;
  handlePlayDemo: (
    demoId?: TutorialDemoId,
    fromSection?: TutorialSectionId,
    customOverride?: CustomTutorialDemoOverride
  ) => void;
  handleCycleDemo: (direction: -1 | 1) => void;
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
  isPlaying,
  handleTogglePlay,
  setIsInfoOpen,
}: UseTeachingDemoOptions): UseTeachingDemoResult {
  const [activeDemo, setActiveDemo] = useState<TutorialDemoConfig | null>(null);
  const [tutorialSection, setTutorialSection] = useState<TutorialSectionId>('overview');
  const [tutorialScrollTop, setTutorialScrollTop] = useState<number>(0);

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

      if (layout.id === 'solo') {
        setLayout(PRESET_TRIO);
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

        if (customOverride?.customPartials && customOverride.customPartials.length > 0) {
          const activePartials = customOverride.customPartials.filter((p) => p.amp > 0);
          const customShape: Shape = {
            id: 'tutorial-custom-overtone-mix',
            name: 'Tutorial Overtone Mix',
            origin: 'user',
            category: 'timbre',
            description: 'Custom overtone bar mix created in the interactive tutorial mixer.',
            adsr: { attack: 0.03, decay: 0.4, sustain: 0.85, release: 0.25, damping: 0.1 },
            partials: activePartials.map((p, idx) => ({
              id: `tut_p_${idx + 1}`,
              ratio: Number.isInteger(p.ratioVal)
                ? { kind: 'rational', num: p.ratioVal, den: 1 }
                : { kind: 'real', value: p.ratioVal },
              amp: p.amp,
              phase: 0,
              voice: VOICE_CYCLE[idx % VOICE_CYCLE.length],
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
                idx === 0 ? { ...pl, shapeId: customShape.id, d: rhythmD } : pl
              ),
              filter: { ...prev.filter, enabled: false },
            };
          });
        } else {
          handleSelectPreset(shapeId);
          handleUpdatePlacementD(rhythmD);
          if (scene.filter.enabled) {
            toggleFilter();
          }
        }

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
          periodSec: 10,
          dwellSec: 0.5,
        }));

        if (!isOscillating) {
          toggleOscillating();
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

  const handleCycleDemo = useCallback(
    (direction: -1 | 1) => {
      const currentIdx = activeDemo
        ? FEATURED_TOUR_DEMOS.findIndex((d) => d.id === activeDemo.id)
        : 0;
      const baseIdx = currentIdx >= 0 ? currentIdx : 0;
      const nextIdx =
        (baseIdx + direction + FEATURED_TOUR_DEMOS.length) % FEATURED_TOUR_DEMOS.length;
      const nextDemo = FEATURED_TOUR_DEMOS[nextIdx];
      launchDemoConfig(nextDemo, tutorialSection);
    },
    [activeDemo, launchDemoConfig, tutorialSection]
  );

  const handleReturnToTutorial = useCallback(() => {
    if (isPlaying) {
      handleTogglePlay();
    } else if (isOscillating) {
      toggleOscillating();
    }
    setIsInfoOpen(true);
  }, [isPlaying, handleTogglePlay, isOscillating, toggleOscillating, setIsInfoOpen]);

  const handleDismissDemoToast = useCallback(() => {
    setActiveDemo(null);
  }, []);

  return {
    activeDemo,
    tutorialSection,
    setTutorialSection,
    tutorialScrollTop,
    setTutorialScrollTop,
    handlePlayDemo,
    handleCycleDemo,
    handleReturnToTutorial,
    handleDismissDemoToast,
  };
}
