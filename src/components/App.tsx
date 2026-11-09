import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Scene, Shape } from '../core/types';
import { DEFAULT_SCENE, loadSavedScene, saveScene } from '../core/config';
import { RenderCoordinator } from '../renderers/render-coordinator';
import { AudioEngine } from '../audio/audio-engine';
import { RegisteredLensRenderer } from '../renderers/render-coordinator';
import { RulerLensRenderer } from '../renderers/ruler-lens';
import { RingClockLensRenderer } from '../renderers/ring-clock-lens';
import { CycleWheelLensRenderer } from '../renderers/cycle-wheel-lens';
import { WaveformPhasorLensRenderer } from '../renderers/waveform-phasor-lens';
import { PrimeProfileLensRenderer } from '../renderers/prime-profile-lens';
import { SpectrumViewport } from './SpectrumViewport';
import { ControlToolbar, ActiveLensTab } from './ControlToolbar';
import { CaptureModal } from './CaptureModal';

export const App: React.FC = () => {
  const [scene, setScene] = useState<Scene>(() => loadSavedScene() || DEFAULT_SCENE);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeLens, setActiveLens] = useState<ActiveLensTab>('ruler');
  const [isCaptureOpen, setIsCaptureOpen] = useState<boolean>(false);

  const coordinator = useMemo(() => new RenderCoordinator(scene), []);
  const audioEngine = useMemo(() => new AudioEngine(scene), []);
  const lensCanvasRef = useRef<HTMLCanvasElement>(null);

  // Instantiated lenses
  const rulerLens = useMemo(() => new RulerLensRenderer(), []);
  const ringClockLens = useMemo(() => new RingClockLensRenderer(), []);
  const cycleWheelLens = useMemo(() => new CycleWheelLensRenderer(), []);
  const waveformPhasorLens = useMemo(() => new WaveformPhasorLensRenderer(), []);
  const primeProfileLens = useMemo(() => new PrimeProfileLensRenderer(), []);

  // Sync state updates to audio engine and persistence
  useEffect(() => {
    coordinator.setScene(scene);
    audioEngine.updateScene(scene);
    saveScene(scene);
  }, [scene, coordinator, audioEngine]);

  // Register active lens with coordinator
  useEffect(() => {
    const canvas = lensCanvasRef.current;
    if (!canvas) return;

    let renderer: RegisteredLensRenderer = rulerLens;
    if (activeLens === 'ring-clock') renderer = ringClockLens;
    else if (activeLens === 'cycle-wheel') renderer = cycleWheelLens;
    else if (activeLens === 'waveform-phasor') renderer = waveformPhasorLens;
    else if (activeLens === 'prime-profile') renderer = primeProfileLens;

    coordinator.registerLens('active-lens', canvas, renderer);

    return () => {
      coordinator.unregisterLens('active-lens');
    };
  }, [coordinator, activeLens, rulerLens, ringClockLens, cycleWheelLens, waveformPhasorLens, primeProfileLens]);

  // High-DPI canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = lensCanvasRef.current;
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
        const canvas = lensCanvasRef.current;
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

    // Trigger visual celebration
    const canvas = lensCanvasRef.current;
    if (canvas) {
      coordinator.cosmeticsEngine.triggerShockwave(canvas.width / 2, canvas.height / 2, '#38bdf8', 120);
      coordinator.cosmeticsEngine.spawnFluidDroplets(canvas.width / 2, canvas.height / 2, '#38bdf8', 1.0, 32);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b0d13] text-slate-100 font-sans">
      <ControlToolbar
        scene={scene}
        isPlaying={isPlaying}
        activeLens={activeLens}
        onSelectLens={setActiveLens}
        onTogglePlay={handleTogglePlay}
        onUpdatePlacementD={handleUpdatePlacementD}
        onSelectPreset={handleSelectPreset}
        onToggleAudioMode={handleToggleAudioMode}
        onOpenCapture={() => setIsCaptureOpen(true)}
      />

      <SpectrumViewport scene={scene} coordinator={coordinator}>
        <div className="relative w-full h-full">
          <canvas ref={lensCanvasRef} className="absolute inset-0 block w-full h-full cursor-grab active:cursor-grabbing" />
        </div>
      </SpectrumViewport>

      <CaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onCaptureShape={handleCaptureShape}
        tplHz={scene.anchors.tplFrequencyHz}
      />
    </div>
  );
};

export default App;
