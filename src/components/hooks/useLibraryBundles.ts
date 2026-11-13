/**
 * Hook for Library Bundles, non-destructive/idempotent import/export, and ?bundle= deeplink loading.
 */

import { useState, useEffect, useCallback } from 'react';
import { Scene } from '../../core/types';
import {
  LibraryBundle,
  LibraryImportStats,
  PRESET_LIBRARY_BUNDLES,
  buildSingleBundleExport,
  buildLibrarySetExport,
  encodeLibraryToSlug,
  decodeLibraryFromSlug,
  importLibraryPayload,
  applyLibraryBundleToScene,
} from '../../core/library-models';

export interface UseLibraryBundlesOptions {
  scene: Scene;
  updateScene: (updater: Scene | ((prev: Scene) => Scene)) => void;
}

export interface UseLibraryBundlesResult {
  isBundleModalOpen: boolean;
  openBundleModal: () => void;
  closeBundleModal: () => void;
  bundles: LibraryBundle[];
  lastImportStats: LibraryImportStats | null;
  lastImportError: string | null;
  handleApplyBundle: (bundle: LibraryBundle) => void;
  handleShareCurrentBundleUrl: (customName?: string) => Promise<string>;
  handleExportSetJson: () => string;
  handleImportText: (raw: string, applyFirstBundle?: boolean) => boolean;
}

function extractBundleSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const searchParams = new URLSearchParams(window.location.search);
  const querySlug = searchParams.get('bundle');
  if (querySlug) return querySlug;
  const hash = window.location.hash;
  if (hash && hash.includes('bundle=')) {
    const match = hash.match(/bundle=([^&]+)/);
    if (match && match[1]) return match[1];
  }
  return null;
}

export function useLibraryBundles({
  scene,
  updateScene,
}: UseLibraryBundlesOptions): UseLibraryBundlesResult {
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [lastImportStats, setLastImportStats] = useState<LibraryImportStats | null>(null);
  const [lastImportError, setLastImportError] = useState<string | null>(null);

  useEffect(() => {
    const slug = extractBundleSlugFromUrl();
    if (!slug) return;
    const decoded = decodeLibraryFromSlug(slug);
    if (!decoded) return;

    updateScene((prev) => {
      const merged = importLibraryPayload(prev, decoded);
      if (merged.primaryBundle && decoded.kind === 'bundle') {
        return applyLibraryBundleToScene(merged.scene, merged.primaryBundle);
      }
      return merged.scene;
    });
  }, [updateScene]);

  const bundles =
    scene.libraryBundles && scene.libraryBundles.length > 0
      ? scene.libraryBundles
      : PRESET_LIBRARY_BUNDLES;

  const openBundleModal = useCallback(() => {
    setLastImportError(null);
    setIsBundleModalOpen(true);
  }, []);

  const closeBundleModal = useCallback(() => setIsBundleModalOpen(false), []);

  const handleApplyBundle = useCallback(
    (bundle: LibraryBundle) => {
      updateScene((prev) => applyLibraryBundleToScene(prev, bundle));
    },
    [updateScene]
  );

  const handleShareCurrentBundleUrl = useCallback(
    async (customName?: string): Promise<string> => {
      const payload = buildSingleBundleExport(scene, customName);
      const slug = encodeLibraryToSlug(payload);
      const url =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}?bundle=${slug}`
          : `?bundle=${slug}`;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          // Ignore clipboard permission errors in restricted contexts
        }
      }
      return url;
    },
    [scene]
  );

  const handleExportSetJson = useCallback((): string => {
    return JSON.stringify(buildLibrarySetExport(scene), null, 2);
  }, [scene]);

  const handleImportText = useCallback(
    (raw: string, applyFirstBundle: boolean = false): boolean => {
      const trimmed = raw.trim();
      if (!trimmed) {
        setLastImportError('Paste a library JSON payload or ?bundle= slug first.');
        return false;
      }

      let payload = null;
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && parsed.version === 1 && Array.isArray(parsed.bundles)) {
            payload = parsed;
          }
        } catch {
          payload = null;
        }
      } else {
        const slugMatch = trimmed.match(/bundle=([^&\s]+)/);
        const slug = slugMatch ? slugMatch[1] : trimmed;
        payload = decodeLibraryFromSlug(slug);
      }

      if (!payload) {
        setLastImportError('Unrecognised bundle slug or library JSON format.');
        return false;
      }

      setLastImportError(null);
      updateScene((prev) => {
        const result = importLibraryPayload(prev, payload);
        setLastImportStats(result.stats);
        if (applyFirstBundle && result.primaryBundle) {
          return applyLibraryBundleToScene(result.scene, result.primaryBundle);
        }
        return result.scene;
      });
      return true;
    },
    [updateScene]
  );

  return {
    isBundleModalOpen,
    openBundleModal,
    closeBundleModal,
    bundles,
    lastImportStats,
    lastImportError,
    handleApplyBundle,
    handleShareCurrentBundleUrl,
    handleExportSetJson,
    handleImportText,
  };
}
