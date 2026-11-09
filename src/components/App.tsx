import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

export const App: React.FC = () => {
  const [scene, setScene] = useState<Scene>(() => loadSavedScene() || DEFAULT_SCENE);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Initialize layout from URL slug if present, otherwise default to PRESET_SOLO
  const [layout, setLayout] = useState<LayoutDefinition>(() => {
    const slug = extractLayoutSlugFromUrl();
    if (slug) {
      const decoded = decodeLayoutFromSlug(slug);
      if (decoded) return decoded.layout;
    }
    return PRESET_SOLO;
  });

  const [isCaptureOpen, setIsCaptureOpen] = useState<boolean>(false);

  // Check if intro primer modal should be shown on launch
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY_DONT_SHOW_INTRO) !== 'true';
  });

  const coordinator = useMemo(() => new RenderCoordinator(scene), []);
  const audioEngine = useMemo(() => new AudioEngine(scene), []);

  // Connect AudioEngine sample-accurate telemetry to RenderCoordinator
  useEffect(() => {
    coordinator.setAudioPhaseProvider((shapeId) => audioEngine.getMasterPhase(shapeId));
    coordinator.setIsAudioActiveProvider(() => audioEngine.isAudioActive());
  }, [coordinator, audioEngine]);

  // Sync state updates to audio engine and persistence
  useEffect(() => {
    coordinator.setScene(scene);
    audioEngine.updateScene(scene);
    saveScene(scene);
  }, [scene, coordinator, audioEngine]);

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

  const handleTogglePlay = async () => {
    if (!isPlaying) {
      const ok = await audioEngine.unlock();
      if (ok) {
        setIsPlaying(true);
        coordinator.cosmeticsEngine.triggerShockwave(window.innerWidth / 2, window.innerHeight / 2, '#E13610', 100);
        coordinator.cosmeticsEngine.spawnNoteSparks(window.innerWidth / 2, window.innerHeight / 2, '#FF4D4D', 1.0, 24);
      }
    } else {
      audioEngine.updateScene({
        ...scene,
        audio: { ...scene.audio, masterGain: 0 },
      });
      setIsPlaying(false);
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleUpdatePlacementD = (d: number) => {
    setScene((prev) => {
      const updatedPlacements = prev.placements.map((p, idx) => (idx === 0 ? { ...p, d } : p));
      return { ...prev, placements: updatedPlacements };
    });
  };

  const handleSelectPreset = (shapeId: string) => {
    setScene((prev) => {
      const updatedPlacements = prev.placements.map((p, idx) => (idx === 0 ? { ...p, shapeId } : p));
      return { ...prev, placements: updatedPlacements };
    });
  };

  const handleToggleAudioMode = () => {
    setScene((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        audioMode: prev.audio.audioMode === 'poetic' ? 'literal' : 'poetic',
      },
    }));
  };

  const handleCaptureShape = (capturedShape: Shape, dPosition: number) => {
    setScene((prev) => ({
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
        onSelectLayout={setLayout}
        onTogglePlay={handleTogglePlay}
        onUpdatePlacementD={handleUpdatePlacementD}
        onSelectPreset={handleSelectPreset}
        onToggleAudioMode={handleToggleAudioMode}
        onToggleEditMode={() => setIsEditMode((prev) => !prev)}
        onShareLayout={handleShareLayout}
        onToggleFullscreen={handleToggleFullscreen}
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
    </div>
  );
};

export default App;
