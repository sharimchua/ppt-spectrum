import React, { useState, useEffect, useMemo } from 'react';
import { Scene, Shape } from '../core/types';
import { DEFAULT_SCENE, loadSavedScene, saveScene } from '../core/config';
import { RenderCoordinator } from '../renderers/render-coordinator';
import { AudioEngine } from '../audio/audio-engine';
import {
  LayoutDefinition,
  PRESET_SOLO,
  SpectrumLensType,
} from '../core/layout-models';
import { SpectrumViewport } from './SpectrumViewport';
import { ControlToolbar } from './ControlToolbar';
import { FlexLayoutRenderer } from './FlexLayoutRenderer';
import { CaptureModal } from './CaptureModal';
import { InfoModal, STORAGE_KEY_DONT_SHOW_INTRO } from './InfoModal';

export const App: React.FC = () => {
  const [scene, setScene] = useState<Scene>(() => loadSavedScene() || DEFAULT_SCENE);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [layout, setLayout] = useState<LayoutDefinition>(PRESET_SOLO);
  const [isCaptureOpen, setIsCaptureOpen] = useState<boolean>(false);

  // Check if intro should be shown on launch
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY_DONT_SHOW_INTRO) !== 'true';
  });

  const coordinator = useMemo(() => new RenderCoordinator(scene), []);
  const audioEngine = useMemo(() => new AudioEngine(scene), []);

  // Sync state updates to audio engine and persistence
  useEffect(() => {
    coordinator.setScene(scene);
    audioEngine.updateScene(scene);
    saveScene(scene);
  }, [scene, coordinator, audioEngine]);

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

  const handleUpdateCellModule = (cellId: string, newModule: SpectrumLensType) => {
    const updateRecursive = (node: any): any => {
      if (node.type === 'cell') {
        if (node.id === cellId) {
          return { ...node, module: newModule, title: newModule };
        }
        return node;
      }
      return {
        ...node,
        children: node.children.map(updateRecursive),
      };
    };

    setLayout((prev) => ({
      ...prev,
      root: updateRecursive(prev.root),
    }));
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b0d13] text-slate-100 font-sans">
      <ControlToolbar
        scene={scene}
        isPlaying={isPlaying}
        currentLayoutId={layout.id}
        onSelectLayout={setLayout}
        onTogglePlay={handleTogglePlay}
        onUpdatePlacementD={handleUpdatePlacementD}
        onSelectPreset={handleSelectPreset}
        onToggleAudioMode={handleToggleAudioMode}
        onOpenCapture={() => setIsCaptureOpen(true)}
        onOpenInfo={() => setIsInfoOpen(true)}
      />

      <SpectrumViewport scene={scene} coordinator={coordinator}>
        <div className="relative w-full h-full p-2 sm:p-3">
          <FlexLayoutRenderer
            node={layout.root}
            scene={scene}
            coordinator={coordinator}
            onUpdateCellModule={handleUpdateCellModule}
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
