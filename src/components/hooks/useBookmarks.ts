/**
 * Musical bookmarks and continuum sweep oscillation hook.
 * Manages A/B bookmarks, jump/set actions, and requestAnimationFrame cosine glide loop.
 */

import { useState, useEffect, useCallback, MutableRefObject } from 'react';
import { Scene } from '../../core/types';
import { RenderCoordinator } from '../../renderers/render-coordinator';
import { setPrimaryPlacementD } from '../../core/scene-ops';
import { computeSweepTiming, sweepProgress } from '../../core/sweep';
import {
  BookmarkSettings,
  loadSavedBookmarks,
  saveBookmarks,
  createBookmarkPointFromD,
} from '../bookmarks-storage';

export interface UseBookmarksOptions {
  sceneRef: MutableRefObject<Scene>;
  updateScene: (updater: Scene | ((prev: Scene) => Scene)) => void;
  coordinator: RenderCoordinator;
  setPrimaryD: (d: number) => void;
}

export interface UseBookmarksResult {
  bookmarks: BookmarkSettings;
  setBookmarks: React.Dispatch<React.SetStateAction<BookmarkSettings>>;
  isOscillating: boolean;
  setIsOscillating: React.Dispatch<React.SetStateAction<boolean>>;
  toggleOscillating: () => void;
  handleJumpBookmarkA: () => void;
  handleJumpBookmarkB: () => void;
  handleSetBookmarkA: () => void;
  handleSetBookmarkB: () => void;
  setBookmarkFromCurrent: (slot: 'a' | 'b', withSparks?: boolean) => void;
}

export function useBookmarks({
  sceneRef,
  updateScene,
  coordinator,
  setPrimaryD,
}: UseBookmarksOptions): UseBookmarksResult {
  const [bookmarks, setBookmarks] = useState<BookmarkSettings>(loadSavedBookmarks);
  const [isOscillating, setIsOscillating] = useState<boolean>(false);

  // Smooth Continuum Sweep Oscillation with Destination Dwell Time
  useEffect(() => {
    if (!isOscillating) return;
    let animId: number;
    const startTime = performance.now();
    const startD = bookmarks.a.d;
    const targetD = bookmarks.b.d;
    const span = targetD - startD;

    const timing = computeSweepTiming({
      periodSec: bookmarks.periodSec,
      dwellSec: bookmarks.dwellSec,
    });

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = sweepProgress(elapsed, timing);
      const currentGlideD = startD + span * progress;

      updateScene((prev) => setPrimaryPlacementD(prev, currentGlideD));
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [
    isOscillating,
    bookmarks.a.d,
    bookmarks.b.d,
    bookmarks.periodSec,
    bookmarks.dwellSec,
    updateScene,
  ]);

  const handleJumpBookmarkA = useCallback(() => {
    setPrimaryD(bookmarks.a.d);
  }, [bookmarks.a.d, setPrimaryD]);

  const handleJumpBookmarkB = useCallback(() => {
    setPrimaryD(bookmarks.b.d);
  }, [bookmarks.b.d, setPrimaryD]);

  const setBookmarkFromCurrent = useCallback(
    (slot: 'a' | 'b', withSparks: boolean = false) => {
      const curD = sceneRef.current.placements[0]?.d ?? 0;
      const pt = createBookmarkPointFromD(curD);
      setBookmarks((prev) => {
        const next = { ...prev, [slot]: pt };
        saveBookmarks(next);
        return next;
      });

      if (withSparks && typeof window !== 'undefined') {
        const sparkColour = slot === 'a' ? '#38bdf8' : '#f59e0b';
        coordinator.cosmeticsEngine.spawnNoteSparks(window.innerWidth / 2, 48, sparkColour, 0.9, 14);
      }
    },
    [coordinator, sceneRef]
  );

  const handleSetBookmarkA = useCallback(() => {
    setBookmarkFromCurrent('a', false);
  }, [setBookmarkFromCurrent]);

  const handleSetBookmarkB = useCallback(() => {
    setBookmarkFromCurrent('b', false);
  }, [setBookmarkFromCurrent]);

  const toggleOscillating = useCallback(() => {
    setIsOscillating((prev) => !prev);
  }, []);

  return {
    bookmarks,
    setBookmarks,
    isOscillating,
    setIsOscillating,
    toggleOscillating,
    handleJumpBookmarkA,
    handleJumpBookmarkB,
    handleSetBookmarkA,
    handleSetBookmarkB,
    setBookmarkFromCurrent,
  };
}
