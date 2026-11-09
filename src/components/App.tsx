import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Scene, Shape } from '../core/types';
import { DEFAULT_SCENE, loadSavedScene, saveScene } from '../core/config';
import { RenderCoordinator } from '../renderers/render-coordinator';
import { AudioEngine } from '../audio/audio-engine';
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
  encodeLayoutToSlug,
  decodeLayoutFromSlug,
  getAllCellNodes,
} from '../core/layout-models';
import { SpectrumViewport } from './SpectrumViewport';
import { ControlToolbar } from './ControlToolbar';
import { FlexLayoutRenderer } from './FlexLayoutRenderer';
import { CaptureModal } from './CaptureModal';
import { InfoModal, STORAGE_KEY_DONT_SHOW_INTRO } from './InfoModal';
import { SettingsDrawer } from './SettingsDrawer';
import { TraySheet } from './TraySheet';
import { MusicalBookmarksModal, loadSavedBookmarks, saveBookmarks, createBookmarkPointFromD, BookmarkSettings } from './MusicalBookmarksModal';
import { ShapeQuickSearchModal } from './ShapeQuickSearchModal';

const STORAGE_KEY_LAYOUT = 'ppt_spectrum_last_layout_v1';

// Helper to extract layout slug from URL query or hash
function extractLayoutSlugFromUrl(): string | null {
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

function loadInitialLayout(): LayoutDefinition {
  // 1. URL parameter takes highest precedence (for deep links)
  const slug = extractLayoutSlugFromUrl();
  if (slug) {
    const decoded = decodeLayoutFromSlug(slug);
    if (decoded) return decoded.layout;
  }

  // 2. Persisted last selected layout in localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_LAYOUT);
      if (saved) {
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

  return PRESET_SOLO;
}

export const App: React.FC = () => {
  const [scene, setScene] = useState<Scene>(() => loadSavedScene() || DEFAULT_SCENE);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isShapeEditorOpen, setIsShapeEditorOpen] = useState<boolean>(false);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [isOscillating, setIsOscillating] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<BookmarkSettings>(loadSavedBookmarks);

  // Session-only history of selected shapes for quick Up/Down arrow navigation
  const [, setShapeHistory] = useState<{ stack: string[]; index: number }>(() => {
    const initialId = scene.placements[0]?.shapeId || 'hemiola-3-2';
    return { stack: [initialId], index: 0 };
  });

  const pushShapeHistory = useCallback((shapeId: string) => {
    setShapeHistory((prev) => {
      if (prev.stack[prev.index] === shapeId) return prev;
      const truncated = prev.stack.slice(0, prev.index + 1);
      const nextStack = [...truncated, shapeId];
      return { stack: nextStack, index: nextStack.length - 1 };
    });
  }, []);

  // Initialize layout from URL slug, last saved layout, or default to PRESET_SOLO
  const [layout, setLayout] = useState<LayoutDefinition>(loadInitialLayout);

  const [isCaptureOpen, setIsCaptureOpen] = useState<boolean>(false);

  // Check if intro primer modal should be shown on launch
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY_DONT_SHOW_INTRO) !== 'true';
  });

  const coordinator = useMemo(() => new RenderCoordinator(scene), []);
  const audioEngine = useMemo(() => AudioEngine.getInstance(scene), []);
  const sceneRef = useRef<Scene>(scene);
  sceneRef.current = scene;

  const updateScene = useCallback(
    (updater: Scene | ((prev: Scene) => Scene)) => {
      setScene((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: Scene) => Scene)(prev) : updater;
        sceneRef.current = next;
        audioEngine.updateScene(next);
        coordinator.setScene(next);
        return next;
      });
    },
    [audioEngine, coordinator]
  );

  // Connect AudioEngine sample-accurate telemetry to RenderCoordinator
  useEffect(() => {
    coordinator.setAudioPhaseProvider((shapeId) => audioEngine.getMasterPhase(shapeId));
    coordinator.setIsAudioActiveProvider(() => audioEngine.isAudioActive());
    coordinator.setNoteAgeProvider((shapeId) => audioEngine.getNoteAge(shapeId));
  }, [coordinator, audioEngine]);

  // Sync state updates to audio engine and persistence (debounced to avoid localStorage thrash during 60 FPS sweep)
  useEffect(() => {
    coordinator.setScene(scene);
    audioEngine.updateScene(scene);
    if (!isOscillating) {
      const timer = setTimeout(() => {
        saveScene(scene);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [scene, coordinator, audioEngine, isOscillating]);

  // Smooth Continuum Sweep Oscillation with Destination Dwell Time
  useEffect(() => {
    if (!isOscillating) return;
    let animId: number;
    const startTime = performance.now();
    const startD = bookmarks.a.d;
    const targetD = bookmarks.b.d;
    const span = targetD - startD;

    // Single one-way glide duration (half of periodSec)
    const transitMs = Math.max(0.5, (bookmarks.periodSec || 10) / 2) * 1000;
    // Dwell/hold duration at each destination
    const dwellMs = Math.max(0, (bookmarks.dwellSec ?? 1.5)) * 1000;
    // Full roundtrip cycle: (Transit A->B) + (Dwell at B) + (Transit B->A) + (Dwell at A)
    const totalCycleMs = Math.max(100, 2 * transitMs + 2 * dwellMs);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const cycleTime = elapsed % totalCycleMs;

      let progress: number;
      if (cycleTime < transitMs) {
        // Phase 1: Glide from Bookmark A to Bookmark B (Smooth Cosine Ease)
        const tNorm = cycleTime / transitMs;
        progress = (1 - Math.cos(Math.PI * tNorm)) * 0.5;
      } else if (cycleTime < transitMs + dwellMs) {
        // Phase 2: Dwell / Hold rock-steady at Bookmark B
        progress = 1.0;
      } else if (cycleTime < 2 * transitMs + dwellMs) {
        // Phase 3: Glide from Bookmark B back to Bookmark A (Smooth Cosine Ease)
        const tNorm = (cycleTime - (transitMs + dwellMs)) / transitMs;
        progress = (1 + Math.cos(Math.PI * tNorm)) * 0.5;
      } else {
        // Phase 4: Dwell / Hold rock-steady at Bookmark A
        progress = 0.0;
      }

      const currentGlideD = startD + span * progress;

      updateScene((prev) => {
        const updatedPlacements = prev.placements.map((p, idx) =>
          idx === 0 ? { ...p, d: currentGlideD } : p
        );
        return { ...prev, placements: updatedPlacements };
      });

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isOscillating, bookmarks.a.d, bookmarks.b.d, bookmarks.periodSec, bookmarks.dwellSec, updateScene]);

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

  // Handle URL hash changes dynamically (#layout=<slug>)
  useEffect(() => {
    const handleHashChange = () => {
      const slug = extractLayoutSlugFromUrl();
      if (slug) {
        const decoded = decodeLayoutFromSlug(slug);
        if (decoded) {
          setLayout(decoded.layout);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleNoteOn = useCallback((shapeId?: string) => {
    audioEngine.noteOn(shapeId, sceneRef.current);
    coordinator.triggerNoteStrike();
    coordinator.cosmeticsEngine.spawnNoteSparks(window.innerWidth / 2, window.innerHeight / 2, '#f59e0b', 1.0, 16);
  }, [audioEngine, coordinator]);

  const handleNoteOff = useCallback((shapeId?: string) => {
    audioEngine.noteOff(shapeId);
  }, [audioEngine]);

  const handleTriggerNote = useCallback((shapeId?: string) => {
    audioEngine.triggerNote(shapeId, sceneRef.current);
    coordinator.triggerNoteStrike();
    coordinator.cosmeticsEngine.spawnNoteSparks(window.innerWidth / 2, window.innerHeight / 2, '#f59e0b', 1.0, 16);
  }, [audioEngine, coordinator]);

  const handleTogglePlay = async () => {
    if (!isPlaying) {
      const ok = await audioEngine.play();
      if (ok) {
        setIsPlaying(true);
        coordinator.cosmeticsEngine.triggerShockwave(window.innerWidth / 2, window.innerHeight / 2, '#E13610', 100);
      }
    } else {
      audioEngine.pause();
      setIsPlaying(false);
    }
  };

  // Keyboard shortcuts:
  // - Spacebar: toggles simulation/audio playback (intercepted in capture phase so focused buttons/dropdowns don't steal it)
  // - 'l' / 'L': toggles Shape Library & Synthesiser tray
  // - Shift + 'L': opens Quick Shape Search Modal with autocomplete
  // - 's' / 'S': toggles continuum sweep oscillation
  // - 'f' / 'F': toggles band filter aperture
  // - 't' / 'T': triggers/strikes acoustic ADSR note
  // - 'a' / 'A': jump fundamental to Bookmark A (Shift + A sets Bookmark A to current d)
  // - 'b' / 'B': jump fundamental to Bookmark B (Shift + B sets Bookmark B to current d)
  // - Left/Right arrows: step fundamental by 1 DuMetric octave (Shift + Left/Right steps by 0.5 octave)
  // - Up/Down arrows: navigate back and forth through session shape selection history
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If Quick Shape Search Modal is open, let it handle its own keyboard navigation
      if (isQuickSearchOpen) {
        return;
      }

      // Ignore browser modifier combinations (e.g. Ctrl+S, Ctrl+A, Alt+F)
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const isTextInput =
        target &&
        ((target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text') ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (isTextInput) {
        return;
      }

      // Spacebar Focus Guard: always toggle play/pause unless Capture Modal is open (where Space taps the rhythm pad)
      if (e.code === 'Space' || e.key === ' ') {
        if (isCaptureOpen) return;
        e.preventDefault();
        e.stopPropagation();
        if (
          document.activeElement instanceof HTMLElement &&
          (document.activeElement.tagName === 'BUTTON' ||
            document.activeElement.tagName === 'SELECT' ||
            document.activeElement.tagName === 'INPUT')
        ) {
          document.activeElement.blur();
        }
        handleTogglePlay();
        return;
      }

      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        if (e.shiftKey) {
          setIsQuickSearchOpen((prev) => !prev);
        } else {
          setIsShapeEditorOpen((prev) => !prev);
        }
        return;
      }

      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsOscillating((prev) => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        updateScene((prev) => ({
          ...prev,
          filter: {
            ...prev.filter,
            enabled: !prev.filter?.enabled,
          },
        }));
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        if (!e.repeat) {
          handleNoteOn();
        }
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (e.shiftKey) {
          const curD = sceneRef.current.placements[0]?.d ?? 0;
          const nextPoint = createBookmarkPointFromD(curD);
          setBookmarks((prev) => {
            const updated = { ...prev, a: nextPoint };
            saveBookmarks(updated);
            return updated;
          });
          coordinator.cosmeticsEngine.spawnNoteSparks(window.innerWidth / 2, 48, '#38bdf8', 0.9, 14);
        } else {
          const targetD = bookmarks.a.d;
          updateScene((prev) => ({
            ...prev,
            placements: prev.placements.map((p, idx) => (idx === 0 ? { ...p, d: targetD } : p)),
          }));
        }
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        if (e.shiftKey) {
          const curD = sceneRef.current.placements[0]?.d ?? 0;
          const nextPoint = createBookmarkPointFromD(curD);
          setBookmarks((prev) => {
            const updated = { ...prev, b: nextPoint };
            saveBookmarks(updated);
            return updated;
          });
          coordinator.cosmeticsEngine.spawnNoteSparks(window.innerWidth / 2, 48, '#f59e0b', 0.9, 14);
        } else {
          const targetD = bookmarks.b.d;
          updateScene((prev) => ({
            ...prev,
            placements: prev.placements.map((p, idx) => (idx === 0 ? { ...p, d: targetD } : p)),
          }));
        }
      } else if (e.key === 'ArrowRight') {
        // Move UP in frequency / pitch (decrease d)
        e.preventDefault();
        const step = e.shiftKey ? 0.5 : 1.0;
        updateScene((prev) => {
          const curD = prev.placements[0]?.d ?? 0;
          const targetD = Math.max(-7, Math.min(7, curD - step));
          return {
            ...prev,
            placements: prev.placements.map((p, idx) => (idx === 0 ? { ...p, d: targetD } : p)),
          };
        });
      } else if (e.key === 'ArrowLeft') {
        // Move DOWN in frequency / pitch (increase d)
        e.preventDefault();
        const step = e.shiftKey ? 0.5 : 1.0;
        updateScene((prev) => {
          const curD = prev.placements[0]?.d ?? 0;
          const targetD = Math.max(-7, Math.min(7, curD + step));
          return {
            ...prev,
            placements: prev.placements.map((p, idx) => (idx === 0 ? { ...p, d: targetD } : p)),
          };
        });
      } else if (e.key === 'ArrowUp') {
        // Navigate BACK in session shape selection history
        e.preventDefault();
        setShapeHistory((prev) => {
          if (prev.index <= 0) return prev;
          const nextIndex = prev.index - 1;
          const targetShapeId = prev.stack[nextIndex];
          if (targetShapeId) {
            updateScene((sc) => ({
              ...sc,
              placements: sc.placements.map((p, idx) => (idx === 0 ? { ...p, shapeId: targetShapeId } : p)),
            }));
          }
          return { ...prev, index: nextIndex };
        });
      } else if (e.key === 'ArrowDown') {
        // Navigate FORWARD in session shape selection history
        e.preventDefault();
        setShapeHistory((prev) => {
          if (prev.index >= prev.stack.length - 1) return prev;
          const nextIndex = prev.index + 1;
          const targetShapeId = prev.stack[nextIndex];
          if (targetShapeId) {
            updateScene((sc) => ({
              ...sc,
              placements: sc.placements.map((p, idx) => (idx === 0 ? { ...p, shapeId: targetShapeId } : p)),
            }));
          }
          return { ...prev, index: nextIndex };
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isQuickSearchOpen) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        ((target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text') ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        handleNoteOff();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, [isPlaying, isCaptureOpen, isQuickSearchOpen, handleTriggerNote, handleNoteOn, handleNoteOff, bookmarks, updateScene, coordinator]);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleUpdatePlacementD = (d: number) => {
    updateScene((prev) => {
      const updatedPlacements = prev.placements.map((p, idx) => (idx === 0 ? { ...p, d } : p));
      return { ...prev, placements: updatedPlacements };
    });
  };

  const handleUpdateFilterCentreD = useCallback((centreD: number) => {
    updateScene((prev) => ({
      ...prev,
      filter: {
        ...prev.filter,
        enabled: true,
        centreD,
      },
    }));
  }, [updateScene]);

  const handleSelectPreset = useCallback((shapeId: string) => {
    pushShapeHistory(shapeId);
    updateScene((prev) => {
      const updatedPlacements = prev.placements.map((p, idx) => (idx === 0 ? { ...p, shapeId } : p));
      return { ...prev, placements: updatedPlacements };
    });
  }, [pushShapeHistory, updateScene]);

  const handleToggleAudioMode = () => {
    updateScene((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        audioMode: prev.audio.audioMode === 'poetic' ? 'literal' : 'poetic',
      },
    }));
  };

  const handleCaptureShape = (capturedShape: Shape, dPosition: number) => {
    pushShapeHistory(capturedShape.id);
    updateScene((prev) => ({
      ...prev,
      shapes: [capturedShape, ...prev.shapes],
      placements: [
        {
          shapeId: capturedShape.id,
          d: dPosition,
          gain: 0.85,
          mute: false,
          solo: false,
        },
      ],
    }));

    coordinator.cosmeticsEngine.triggerShockwave(window.innerWidth / 2, window.innerHeight / 2, '#38bdf8', 120);
    coordinator.cosmeticsEngine.spawnFluidDroplets(window.innerWidth / 2, window.innerHeight / 2, '#38bdf8', 1.0, 32);
  };

  // Modular Layout Tree Editing Handlers
  const handleSplitCell = useCallback(
    (targetCellId: string, direction: LayoutFlexDirection, newModule: SpectrumLensType) => {
      setLayout((prev) => ({
        ...prev,
        id: `custom-${Date.now().toString(36)}`,
        name: 'Custom Layout',
        root: splitCellInTree(prev.root, targetCellId, direction, newModule),
      }));
    },
    []
  );

  const handleRemoveCell = useCallback((targetCellId: string) => {
    setLayout((prev) => ({
      ...prev,
      id: `custom-${Date.now().toString(36)}`,
      name: 'Custom Layout',
      root: removeCellFromTree(prev.root, targetCellId),
    }));
  }, []);

  const handleDuplicateCell = useCallback((targetCellId: string) => {
    setLayout((prev) => ({
      ...prev,
      id: `custom-${Date.now().toString(36)}`,
      name: 'Custom Layout',
      root: duplicateCellInTree(prev.root, targetCellId),
    }));
  }, []);

  const handleAddCell = useCallback(
    (direction: LayoutFlexDirection = 'row', module: SpectrumLensType = 'cycle-wheel') => {
      setLayout((prev) => ({
        ...prev,
        id: `custom-${Date.now().toString(36)}`,
        name: 'Custom Layout',
        root: addCellToTree(prev.root, direction, module),
      }));
    },
    []
  );

  const handleResetLayout = useCallback(() => {
    const fallback = PRESET_LAYOUTS[layout.id] || PRESET_SOLO;
    setLayout(fallback);
  }, [layout.id]);

  const activeShape = useMemo(() => {
    const primaryId = scene.placements[0]?.shapeId;
    return scene.shapes.find((s) => s.id === primaryId) || scene.shapes[0];
  }, [scene.shapes, scene.placements]);

  const handleUpdateActiveShape = useCallback((updated: Shape) => {
    updateScene((prev) => {
      // If the shape is a preset being modified, clone it into a user shape
      if (updated.origin === 'preset') {
        const userShape: Shape = {
          ...updated,
          id: `user-shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          name: `${updated.name} (Custom)`,
          origin: 'user',
        };
        pushShapeHistory(userShape.id);
        return {
          ...prev,
          shapes: [userShape, ...prev.shapes],
          placements: prev.placements.map((pl, idx) =>
            idx === 0 ? { ...pl, shapeId: userShape.id } : pl
          ),
        };
      }

      // If the shape is a new user shape not yet in shapes list, add it
      const exists = prev.shapes.some((s) => s.id === updated.id);
      if (!exists) {
        pushShapeHistory(updated.id);
        return {
          ...prev,
          shapes: [updated, ...prev.shapes],
          placements: prev.placements.map((pl, idx) =>
            idx === 0 ? { ...pl, shapeId: updated.id } : pl
          ),
        };
      }

      return {
        ...prev,
        shapes: prev.shapes.map((s) => (s.id === updated.id ? updated : s)),
      };
    });
  }, [updateScene, pushShapeHistory]);

  const handleDuplicateShape = useCallback((sourceShape: Shape) => {
    const duplicated: Shape = {
      ...sourceShape,
      id: `user-shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      name: `${sourceShape.name} (Copy)`,
      origin: 'user',
      anchors: sourceShape.anchors
        ? sourceShape.anchors.map((a) => ({
            ...a,
            id: `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
            partials: a.partials.map((p) => ({
              ...p,
              id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
            })),
          }))
        : undefined,
      partials: sourceShape.partials.map((p) => ({
        ...p,
        id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      })),
    };
    pushShapeHistory(duplicated.id);
    updateScene((prev) => ({
      ...prev,
      shapes: [duplicated, ...prev.shapes],
      placements: prev.placements.map((pl, idx) =>
        idx === 0 ? { ...pl, shapeId: duplicated.id } : pl
      ),
    }));
  }, [updateScene, pushShapeHistory]);

  const handleDeleteUserShape = useCallback((shapeId: string) => {
    setShapeHistory((prev) => {
      const nextStack = prev.stack.filter((id) => id !== shapeId);
      if (nextStack.length === 0) {
        return { stack: ['hemiola-3-2'], index: 0 };
      }
      return {
        stack: nextStack,
        index: Math.min(prev.index, nextStack.length - 1),
      };
    });
    updateScene((prev) => {
      const remainingShapes = prev.shapes.filter(
        (s) => s.id !== shapeId || s.origin === 'preset'
      );
      const fallbackId = remainingShapes[0]?.id || 'pure-tone';
      return {
        ...prev,
        shapes: remainingShapes,
        placements: prev.placements.map((pl) =>
          pl.shapeId === shapeId ? { ...pl, shapeId: fallbackId } : pl
        ),
      };
    });
  }, [updateScene]);

  const handleCreateShape = useCallback((newShape: Shape) => {
    pushShapeHistory(newShape.id);
    updateScene((prev) => ({
      ...prev,
      shapes: [newShape, ...prev.shapes],
      placements: prev.placements.map((pl, idx) =>
        idx === 0 ? { ...pl, shapeId: newShape.id } : pl
      ),
    }));
  }, [updateScene, pushShapeHistory]);

  const handleUpdateCell = useCallback((updatedCell: LayoutCellNode) => {
    setLayout((prev) => ({
      ...prev,
      root: updateCellInTree(prev.root, updatedCell),
    }));
  }, []);

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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b0d13] text-slate-100 font-sans">
      <ControlToolbar
        scene={scene}
        isPlaying={isPlaying}
        currentLayoutId={layout.id}
        isEditMode={isEditMode}
        isFullscreen={isFullscreen}
        isShapeEditorOpen={isShapeEditorOpen}
        isOscillating={isOscillating}
        onToggleOscillate={() => setIsOscillating((prev) => !prev)}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        bookmarks={bookmarks}
        onSelectLayout={setLayout}
        onTogglePlay={handleTogglePlay}
        onUpdatePlacementD={handleUpdatePlacementD}
        onToggleAudioMode={handleToggleAudioMode}
        onToggleEditMode={() => setIsEditMode((prev) => !prev)}
        onShareLayout={handleShareLayout}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleSettings={() => setIsSettingsOpen((prev) => !prev)}
        onToggleShapeEditor={() => setIsShapeEditorOpen((prev) => !prev)}
        onToggleFilter={() => updateScene((prev) => ({ ...prev, filter: { ...prev.filter, enabled: !prev.filter.enabled } }))}
        onOpenCapture={() => setIsCaptureOpen(true)}
        onOpenInfo={() => setIsInfoOpen(true)}
      />

      <SpectrumViewport
        scene={scene}
        coordinator={coordinator}
        layout={layout}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode((prev) => !prev)}
        onAddCell={handleAddCell}
        onResetLayout={handleResetLayout}
        onShareLayout={handleShareLayout}
      >
        <div className="relative w-full h-full p-2 sm:p-3">
          <FlexLayoutRenderer
            node={layout.root}
            scene={scene}
            coordinator={coordinator}
            onUpdatePlacementD={handleUpdatePlacementD}
            onUpdateFilterCentreD={handleUpdateFilterCentreD}
            onUpdateCell={handleUpdateCell}
            isEditMode={isEditMode}
            canDelete={canDelete}
            onSplitCell={handleSplitCell}
            onRemoveCell={handleRemoveCell}
            onDuplicateCell={handleDuplicateCell}
          />
        </div>
      </SpectrumViewport>

      <CaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onCaptureShape={handleCaptureShape}
        tplHz={scene.anchors.tplFrequencyHz}
      />

      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        onPlayDemo={handleTogglePlay}
      />

      <TraySheet
        isOpen={isShapeEditorOpen}
        onClose={() => setIsShapeEditorOpen(false)}
        activeShape={activeShape}
        onUpdateShape={handleUpdateActiveShape}
        filter={scene.filter}
        onUpdateFilter={(newFilter) => updateScene((prev) => ({ ...prev, filter: newFilter }))}
        allShapes={scene.shapes}
        onSelectShape={handleSelectPreset}
        onDuplicateShape={handleDuplicateShape}
        onDeleteShape={handleDeleteUserShape}
        onCreateShape={handleCreateShape}
        onTriggerNote={() => handleTriggerNote()}
        onNoteOn={() => handleNoteOn()}
        onNoteOff={() => handleNoteOff()}
      />

      <MusicalBookmarksModal
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        currentD={scene.placements[0]?.d ?? 0}
        bookmarks={bookmarks}
        onUpdateBookmarks={setBookmarks}
        onJumpToD={(targetD) => {
          handleUpdatePlacementD(targetD);
          setIsBookmarksOpen(false);
        }}
        isOscillating={isOscillating}
        onToggleOscillate={() => setIsOscillating((prev) => !prev)}
        onTriggerNote={() => handleTriggerNote()}
      />

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        scene={scene}
        onUpdateScene={updateScene}
        onOpenInfoModal={() => setIsInfoOpen(true)}
      />

      <ShapeQuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        shapes={scene.shapes}
        activeShapeId={activeShape?.id}
        onSelectShape={handleSelectPreset}
      />
    </div>
  );
};

export default App;
