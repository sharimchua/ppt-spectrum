/**
 * Musical bookmarks and continuum sweep oscillation hook.
 * Manages A/B bookmarks, jump/set actions, and requestAnimationFrame cosine glide loop.
 */

import { useState, useEffect, useCallback, useRef, MutableRefObject } from 'react';
import { Scene } from '../../core/types';
import { RenderCoordinator } from '../../renderers/render-coordinator';
import {
  computeSweepTiming,
  sweepProgress,
  computeSweepPhaseOffsetMs,
  getSweepDirectionAtTime,
  SweepDirection,
} from '../../core/sweep';
import {
  BookmarkSettings,
  loadSavedBookmarks,
  saveBookmarks,
  createBookmarkPointFromD,
} from '../bookmarks-storage';

export interface UseBookmarksOptions {
  sceneRef: MutableRefObject<Scene>;
  setPrimaryDSmooth: (d: number, syncReact?: boolean) => void;
  coordinator: RenderCoordinator;
  setPrimaryD: (d: number) => void;
}

export interface UseBookmarksResult {
  bookmarks: BookmarkSettings;
  setBookmarks: React.Dispatch<React.SetStateAction<BookmarkSettings>>;
  isOscillating: boolean;
  setIsOscillating: React.Dispatch<React.SetStateAction<boolean>>;
  toggleOscillating: () => void;
  hasCompletedRoundTrip: boolean;
  resetRoundTrip: () => void;
  handleJumpBookmarkA: () => void;
  handleJumpBookmarkB: () => void;
  handleSetBookmarkA: () => void;
  handleSetBookmarkB: () => void;
  setBookmarkFromCurrent: (slot: 'a' | 'b', withSparks?: boolean) => void;
}

export function useBookmarks({
  sceneRef,
  setPrimaryDSmooth,
  coordinator,
  setPrimaryD,
}: UseBookmarksOptions): UseBookmarksResult {
  const [bookmarks, setBookmarks] = useState<BookmarkSettings>(loadSavedBookmarks);
  const [isOscillating, setIsOscillating] = useState<boolean>(false);
  const [hasCompletedRoundTrip, setHasCompletedRoundTrip] = useState<boolean>(false);
  const sweepDirectionRef = useRef<SweepDirection>(1);
  const dwellOnStartRef = useRef<boolean>(false);

  const resetRoundTrip = useCallback(() => {
    setHasCompletedRoundTrip(false);
    sweepDirectionRef.current = 1;
    dwellOnStartRef.current = true;
  }, []);

  // Smooth Continuum Sweep Oscillation with Destination Dwell Time & Seamless Pause/Resume
  useEffect(() => {
    if (!isOscillating) return;
    let animId: number;
    const startTime = performance.now();
    let lastUiSyncTime = startTime;
    const startD = bookmarks.a.d;
    const targetD = bookmarks.b.d;
    const span = targetD - startD;
    const entryD = sceneRef.current.placements[0]?.d ?? startD;
    let latestGlideD = entryD;

    const timing = computeSweepTiming({
      periodSec: bookmarks.periodSec,
      dwellSec: bookmarks.dwellSec,
    });

    const minBound = Math.min(startD, targetD);
    const maxBound = Math.max(startD, targetD);
    const isOutsideRange = Math.abs(span) > 1e-6 && (entryD < minBound - 1e-4 || entryD > maxBound + 1e-4);
    const clampedEntryD = Math.max(minBound, Math.min(maxBound, entryD));
    const entryGlideMs = isOutsideRange ? 800 : 0;

    // If starting at/near Bookmark A or B, aim toward the other bookmark; otherwise preserve direction
    let initialDirection: SweepDirection = sweepDirectionRef.current;
    if (Math.abs(clampedEntryD - startD) < 1e-3) {
      initialDirection = 1;
    } else if (Math.abs(clampedEntryD - targetD) < 1e-3) {
      initialDirection = -1;
    }

    let phaseOffsetMs = computeSweepPhaseOffsetMs(
      clampedEntryD,
      startD,
      targetD,
      timing,
      initialDirection
    );
    if (dwellOnStartRef.current) {
      dwellOnStartRef.current = false;
      if (Math.abs(clampedEntryD - startD) < 1e-3 && timing.dwellMs > 0) {
        // Begin in Phase 4 (dwell at Bookmark A) before gliding A -> B
        phaseOffsetMs = 2 * timing.transitMs + timing.dwellMs;
      }
    }
    let reportedRoundTrip = false;

    const step = (now: number) => {
      const elapsed = now - startTime;

      if (elapsed < entryGlideMs) {
        const t = elapsed / entryGlideMs;
        const ease = (1 - Math.cos(Math.PI * t)) * 0.5;
        latestGlideD = entryD + (clampedEntryD - entryD) * ease;
      } else {
        const cycleElapsed = elapsed - entryGlideMs;
        const cycleTime = phaseOffsetMs + cycleElapsed;
        const progress = sweepProgress(cycleTime, timing);
        latestGlideD = startD + span * progress;
        sweepDirectionRef.current = getSweepDirectionAtTime(cycleTime, timing);

        if (!reportedRoundTrip && cycleElapsed >= timing.totalCycleMs) {
          reportedRoundTrip = true;
          setHasCompletedRoundTrip(true);
        }
      }

      const shouldSyncUi = now - lastUiSyncTime >= 100;
      if (shouldSyncUi) {
        lastUiSyncTime = now;
      }
      setPrimaryDSmooth(latestGlideD, shouldSyncUi);
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(animId);
      setPrimaryDSmooth(latestGlideD, true);
    };
  }, [
    isOscillating,
    bookmarks.a.d,
    bookmarks.b.d,
    bookmarks.periodSec,
    bookmarks.dwellSec,
    sceneRef,
    setPrimaryDSmooth,
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
    hasCompletedRoundTrip,
    resetRoundTrip,
    handleJumpBookmarkA,
    handleJumpBookmarkB,
    handleSetBookmarkA,
    handleSetBookmarkB,
    setBookmarkFromCurrent,
  };
}
