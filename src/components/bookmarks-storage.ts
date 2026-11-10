/**
 * Musical bookmark types, defaults, and localStorage persistence.
 * Stores continuum anchor coordinates for rapid jumping and cyclical sweep oscillation.
 */

import { resolveDuPeriodAddress, dToFreq, dToPeriodMs, dToBpm } from '../core/axis';

export interface BookmarkPoint {
  d: number;
  label: string;
  type: 'rhythm' | 'pitch' | 'custom';
  bpm?: number;
  noteIndex?: number;
  octave?: number;
}

export interface BookmarkSettings {
  a: BookmarkPoint;
  b: BookmarkPoint;
  periodSec: number;
  dwellSec?: number; // Destination rest duration at Bookmarks A and B
}

export const STORAGE_KEY_BOOKMARKS = 'ppt_spectrum_bookmarks_v1';

export const DEFAULT_BOOKMARKS: BookmarkSettings = {
  a: {
    d: 3.689,
    label: '120 BPM',
    type: 'rhythm',
    bpm: 120,
  },
  b: {
    d: -4.092,
    label: 'A4 (440 Hz)',
    type: 'pitch',
    noteIndex: 9, // A
    octave: 4,
  },
  periodSec: 10,
  dwellSec: 1.5,
};

export function loadSavedBookmarks(): BookmarkSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_BOOKMARKS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_BOOKMARKS);
    if (!raw) return DEFAULT_BOOKMARKS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BOOKMARKS,
      ...parsed,
      a: { ...DEFAULT_BOOKMARKS.a, ...(parsed.a || {}) },
      b: { ...DEFAULT_BOOKMARKS.b, ...(parsed.b || {}) },
      dwellSec: parsed.dwellSec !== undefined ? parsed.dwellSec : DEFAULT_BOOKMARKS.dwellSec,
    };
  } catch {
    return DEFAULT_BOOKMARKS;
  }
}

export function saveBookmarks(bookmarks: BookmarkSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(bookmarks));
  } catch (err) {
    console.warn('[Bookmarks] Failed to save bookmarks:', err);
  }
}

export function createBookmarkPointFromD(currentD: number): BookmarkPoint {
  const addr = resolveDuPeriodAddress(currentD);
  const freq = dToFreq(currentD);
  if (currentD > 0) {
    const bpm = dToBpm(currentD);
    return {
      d: currentD,
      label: `${bpm.toFixed(0)} BPM (${dToPeriodMs(currentD).toFixed(0)} ms)`,
      type: 'rhythm',
      bpm: Math.round(bpm),
    };
  }
  return {
    d: currentD,
    label: `${addr.formatted} (${freq.toFixed(1)} Hz)`,
    type: 'pitch',
  };
}
