/**
 * Hook to launch the educational walkthrough demo.
 * Selects the prototypical 3 against 2 (Do to So) hemiola shape,
 * sets bookmarks across the TPL boundary, switches to Teaching Trio layout,
 * and starts sweep oscillation and audio.
 */

import { useCallback } from 'react';
import { Scene } from '../../core/types';
import { PRESET_TRIO, LayoutDefinition } from '../../core/layout-models';
import { BookmarkSettings } from '../bookmarks-storage';

export interface UseTeachingDemoOptions {
  handleSelectPreset: (presetId: string) => void;
  setBookmarks: React.Dispatch<React.SetStateAction<BookmarkSettings>>;
  handleUpdatePlacementD: (d: number) => void;
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

export function useTeachingDemo({
  handleSelectPreset,
  setBookmarks,
  handleUpdatePlacementD,
  layout,
  setLayout,
  scene,
  toggleFilter,
  isOscillating,
  toggleOscillating,
  isPlaying,
  handleTogglePlay,
  setIsInfoOpen,
}: UseTeachingDemoOptions): () => void {
  return useCallback(() => {
    // 1. Select the prototypical 3:2 Hemiola preset shape (Do to So / Perfect Fifth)
    handleSelectPreset('hemiola-3-2');

    // 2. Configure bookmarks across the TPL boundary: 120 BPM in rhythm to 440 Hz in pitch
    const rhythmD = 3.689;
    const pitchD = -4.092;
    setBookmarks((prev) => ({
      ...prev,
      a: {
        d: rhythmD,
        label: '120 BPM (Rhythm)',
        type: 'rhythm',
        bpm: 120,
      },
      b: {
        d: pitchD,
        label: 'A4 440 Hz (Pitch)',
        type: 'pitch',
        noteIndex: 9,
        octave: 4,
      },
      periodSec: 10,
      dwellSec: 0.5,
    }));

    // 3. Place initial position at Bookmark A in rhythm space
    handleUpdatePlacementD(rhythmD);

    // 4. Upgrade layout to Teaching Trio for comprehensive multi-lens view if currently solo
    if (layout.id === 'solo') {
      setLayout(PRESET_TRIO);
    }

    // 5. Bypass active filter so 3:2 hemiola partials are heard cleanly
    if (scene.filter.enabled) {
      toggleFilter();
    }

    // 6. Start continuous sweep oscillation across TPL
    if (!isOscillating) {
      toggleOscillating();
    }

    // 7. Start audio playback if paused
    if (!isPlaying) {
      handleTogglePlay();
    }

    // 8. Close info modal
    setIsInfoOpen(false);
  }, [
    handleSelectPreset,
    setBookmarks,
    handleUpdatePlacementD,
    layout.id,
    setLayout,
    scene.filter.enabled,
    toggleFilter,
    isOscillating,
    toggleOscillating,
    isPlaying,
    handleTogglePlay,
    setIsInfoOpen,
  ]);
}
