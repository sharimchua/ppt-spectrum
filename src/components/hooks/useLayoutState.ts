/**
 * Modular layout tree state and persistence hook.
 * Manages active and custom layout definitions, cell splitting/removal, deeplink sharing, and hash changes.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDefinition,
  LayoutCellNode,
  LayoutFlexDirection,
  SpectrumLensType,
  PRESET_SOLO,
  PRESET_LAYOUTS,
  splitCellInTree,
  removeCellFromTree,
  duplicateCellInTree,
  addCellToTree,
  updateCellInTree,
  nudgeCellFlex,
  equaliseCellFlex,
  encodeLayoutToSlug,
  decodeLayoutFromSlug,
  getAllCellNodes,
  markLayoutCustom,
} from '../../core/layout-models';
import {
  STORAGE_KEY_LAYOUT,
  STORAGE_KEY_CUSTOM_LAYOUT,
  extractLayoutSlugFromUrl,
  loadInitialLayout,
  loadInitialCustomLayout,
} from './layout-persistence';

export interface UseLayoutStateResult {
  layout: LayoutDefinition;
  setLayout: (layout: LayoutDefinition) => void;
  customLayout: LayoutDefinition | null;
  canDelete: boolean;
  handleSplitCell: (targetCellId: string, direction: LayoutFlexDirection, newModule: SpectrumLensType) => void;
  handleRemoveCell: (targetCellId: string) => void;
  handleDuplicateCell: (targetCellId: string) => void;
  handleAddCell: (direction?: LayoutFlexDirection, module?: SpectrumLensType) => void;
  handleUpdateCell: (updatedCell: LayoutCellNode) => void;
  handleNudgeCellFlex: (targetCellId: string, delta: number) => void;
  handleEqualiseCellFlex: (targetCellId: string) => void;
  handleResetLayout: () => void;
  handleShareLayout: () => void;
}

export function useLayoutState(): UseLayoutStateResult {
  const initialLoadedLayout = useMemo(() => loadInitialLayout(), []);
  const [layout, setLayout] = useState<LayoutDefinition>(initialLoadedLayout);
  const [customLayout, setCustomLayout] = useState<LayoutDefinition | null>(() => {
    const savedCustom = loadInitialCustomLayout();
    if (savedCustom) return savedCustom;
    if (
      initialLoadedLayout &&
      (initialLoadedLayout.id === 'custom' ||
        initialLoadedLayout.id.startsWith('custom') ||
        !PRESET_LAYOUTS[initialLoadedLayout.id])
    ) {
      return markLayoutCustom(initialLoadedLayout, initialLoadedLayout.root);
    }
    return null;
  });

  // Persist last selected layout to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(layout));
      } catch (err) {
        console.warn('[Layout] Failed to save last layout:', err);
      }
    }
  }, [layout]);

  // Persist custom layout to localStorage
  useEffect(() => {
    if (customLayout && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_CUSTOM_LAYOUT, JSON.stringify(customLayout));
      } catch (err) {
        console.warn('[Layout] Failed to save custom layout:', err);
      }
    }
  }, [customLayout]);

  // Handle URL hash changes dynamically (#layout=<slug>)
  useEffect(() => {
    const handleHashChange = () => {
      const slug = extractLayoutSlugFromUrl();
      if (slug) {
        const decoded = decodeLayoutFromSlug(slug);
        if (decoded) {
          setLayout(decoded.layout);
          if (!PRESET_LAYOUTS[decoded.layout.id]) {
            const custom = markLayoutCustom(decoded.layout, decoded.layout.root);
            setCustomLayout(custom);
          }
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSplitCell = useCallback(
    (targetCellId: string, direction: LayoutFlexDirection, newModule: SpectrumLensType) => {
      setLayout((prev) => {
        const updated = markLayoutCustom(
          prev,
          splitCellInTree(prev.root, targetCellId, direction, newModule)
        );
        setCustomLayout(updated);
        return updated;
      });
    },
    []
  );

  const handleRemoveCell = useCallback((targetCellId: string) => {
    setLayout((prev) => {
      const updated = markLayoutCustom(prev, removeCellFromTree(prev.root, targetCellId));
      setCustomLayout(updated);
      return updated;
    });
  }, []);

  const handleDuplicateCell = useCallback((targetCellId: string) => {
    setLayout((prev) => {
      const updated = markLayoutCustom(prev, duplicateCellInTree(prev.root, targetCellId));
      setCustomLayout(updated);
      return updated;
    });
  }, []);

  const handleAddCell = useCallback(
    (direction: LayoutFlexDirection = 'row', module: SpectrumLensType = 'cycle-wheel') => {
      setLayout((prev) => {
        const updated = markLayoutCustom(prev, addCellToTree(prev.root, direction, module));
        setCustomLayout(updated);
        return updated;
      });
    },
    []
  );

  const handleUpdateCell = useCallback((updatedCell: LayoutCellNode) => {
    setLayout((prev) => {
      const updated = markLayoutCustom(prev, updateCellInTree(prev.root, updatedCell));
      setCustomLayout(updated);
      return updated;
    });
  }, []);

  const handleNudgeCellFlex = useCallback((targetCellId: string, delta: number) => {
    setLayout((prev) => {
      const updated = markLayoutCustom(prev, nudgeCellFlex(prev.root, targetCellId, delta));
      setCustomLayout(updated);
      return updated;
    });
  }, []);

  const handleEqualiseCellFlex = useCallback((targetCellId: string) => {
    setLayout((prev) => {
      const updated = markLayoutCustom(prev, equaliseCellFlex(prev.root, targetCellId));
      setCustomLayout(updated);
      return updated;
    });
  }, []);

  const handleResetLayout = useCallback(() => {
    const fallback = PRESET_LAYOUTS[layout.id] || PRESET_SOLO;
    setLayout(fallback);
  }, [layout.id]);

  const handleShareLayout = useCallback(() => {
    const slug = encodeLayoutToSlug(layout);
    if (!slug) return;

    const url = new URL(window.location.href);
    url.searchParams.set('layout', slug);
    const shareableUrl = url.toString();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareableUrl).catch(() => {});
    }
  }, [layout]);

  const allCells = getAllCellNodes(layout.root);
  const canDelete = allCells.length > 1;

  return {
    layout,
    setLayout,
    customLayout,
    canDelete,
    handleSplitCell,
    handleRemoveCell,
    handleDuplicateCell,
    handleAddCell,
    handleUpdateCell,
    handleNudgeCellFlex,
    handleEqualiseCellFlex,
    handleResetLayout,
    handleShareLayout,
  };
}
