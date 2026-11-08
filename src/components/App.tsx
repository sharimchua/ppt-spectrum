import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Scene } from '../core/types';
import { DEFAULT_SCENE, loadSavedScene, saveScene } from '../core/config';
import { RenderCoordinator } from '../renderers/render-coordinator';
import { AudioEngine } from '../audio/audio-engine';
import { RulerLensRenderer } from '../renderers/ruler-lens';
import { SpectrumViewport } from './SpectrumViewport';
import { ControlToolbar } from './ControlToolbar';

export const App: React.FC = () => {
  const [scene, setScene] = useState<Scene>(() => loadSavedScene() || DEFAULT_SCENE);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const coordinator = useMemo(() => new RenderCoordinator(scene), []);
  const audioEngine = useMemo(() => new AudioEngine(scene), []);
  const rulerCanvasRef = useRef<HTMLCanvasElement>(null);
  const rulerRenderer = useMemo(() => new RulerLensRenderer(), []);

  // Sync state updates to audio engine and persistence
  useEffect(() => {
    coordinator.setScene(scene);
    audioEngine.updateScene(scene);
    saveScene(scene);
  }, [scene, coordinator, audioEngine]);

  // Register main ruler lens
  useEffect(() => {
    const canvas = rulerCanvasRef.current;
    if (canvas) {
      coordinator.registerLens('ruler-main', canvas, rulerRenderer);
    }
    return () => {
      coordinator.unregisterLens('ruler-main');
    };
  }, [coordinator, rulerRenderer]);

  // Resize ruler canvas on window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = rulerCanvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTogglePlay = async () => {
    if (!isPlaying) {
      const ok = await audioEngine.unlock();
      if (ok) {
        setIsPlaying(true);
        // Trigger celebratory shockwave and sparks on limen crossing / play
        const canvas = rulerCanvasRef.current;
        if (canvas) {
          coordinator.cosmeticsEngine.triggerShockwave(canvas.width / 2, canvas.height * 0.72, '#E13610', 90);
          coordinator.cosmeticsEngine.spawnNoteSparks(canvas.width / 2, canvas.height * 0.72, '#FF4D4D', 1.0, 24);
        }
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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b0d13] text-slate-100 font-sans">
      <ControlToolbar
        scene={scene}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onUpdatePlacementD={handleUpdatePlacementD}
        onSelectPreset={handleSelectPreset}
        onToggleAudioMode={handleToggleAudioMode}
      />

      <SpectrumViewport scene={scene} coordinator={coordinator}>
        <div className="relative w-full h-full">
          <canvas ref={rulerCanvasRef} className="absolute inset-0 block w-full h-full cursor-grab active:cursor-grabbing" />
        </div>
      </SpectrumViewport>
    </div>
  );
};

export default App;
