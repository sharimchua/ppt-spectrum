/**
 * Layout persistence helpers and URL slug extraction.
 * Manages localStorage synchronization and initial layout restoration for deep linking.
 */

import {
  LayoutDefinition,
  PRESET_TRIO,
  PRESET_DUO_HORIZONTAL,
  PRESET_LAYOUTS,
  decodeLayoutFromSlug,
} from '../../core/layout-models';

export const STORAGE_KEY_LAYOUT = 'ppt_spectrum_last_layout_v1';
export const STORAGE_KEY_CUSTOM_LAYOUT = 'ppt_spectrum_custom_layout_v1';

/**
 * Extracts a layout slug from the current URL search parameters or hash.
 */
export function extractLayoutSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get('layout');
  if (querySlug) return querySlug;

  if (window.location.hash) {
    const match = window.location.hash.match(/layout=([^&]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Loads the initial custom layout definition from localStorage if available.
 */
export function loadInitialCustomLayout(): LayoutDefinition | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_CUSTOM_LAYOUT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.root) {
          return {
            ...parsed,
            id: 'custom',
            name: parsed.name || 'Custom Layout',
          };
        }
      }
    } catch {
      // Fall through
    }
  }
  return null;
}

/**
 * Resolves the initial layout based on URL deep link slug, localStorage, or mobile viewport default.
 */
export function loadInitialLayout(): LayoutDefinition {
  // 1. URL parameter takes highest precedence (for deep links)
  const slug = extractLayoutSlugFromUrl();
  if (slug) {
    const decoded = decodeLayoutFromSlug(slug);
    if (decoded) return decoded.layout;
  }

  // Small portrait screens default to a stacked Duo Split layout for optimal lens visibility
  const isMobilePortrait =
    typeof window !== 'undefined' &&
    window.innerWidth < 768 &&
    window.innerHeight > window.innerWidth;

  // 2. Persisted last selected layout in localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_LAYOUT);
      if (saved) {
        // Upgrade mobile portrait from solo to Duo Split so users never get trapped on solo
        if (isMobilePortrait && saved === 'solo') {
          return PRESET_DUO_HORIZONTAL;
        }
        if (PRESET_LAYOUTS[saved]) {
          return PRESET_LAYOUTS[saved];
        }
        const parsed = JSON.parse(saved);
        if (parsed && parsed.root) {
          return parsed as LayoutDefinition;
        }
      }
    } catch {
      // Fall through to default
    }
  }

  return isMobilePortrait ? PRESET_DUO_HORIZONTAL : PRESET_TRIO;
}
