import React, { useRef, useEffect } from 'react';
import { Scene } from '../core/types';
import { RenderCoordinator } from '../renderers/render-coordinator';

interface SpectrumViewportProps {
  scene: Scene;
  coordinator: RenderCoordinator;
  children?: React.ReactNode;
}

export const SpectrumViewport: React.FC<SpectrumViewportProps> = ({
  scene,
  coordinator,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const effectsCanvasRef = useRef<HTMLCanvasElement>(null);
  const postProcessingCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (bgCanvasRef.current) coordinator.registerBgCanvas(bgCanvasRef.current);
    if (effectsCanvasRef.current) coordinator.registerEffectsCanvas(effectsCanvasRef.current);
    if (postProcessingCanvasRef.current) coordinator.registerPostProcessingCanvas(postProcessingCanvasRef.current);

    coordinator.start();

    return () => {
      coordinator.stop();
    };
  }, [coordinator]);

  useEffect(() => {
    coordinator.setScene(scene);
  }, [coordinator, scene]);

  // High-DPI canvas resizing
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);

      const canvases = [bgCanvasRef.current, effectsCanvasRef.current, postProcessingCanvasRef.current];
      for (const c of canvases) {
        if (c) {
          c.width = w;
          c.height = h;
          c.style.width = `${rect.width}px`;
          c.style.height = `${rect.height}px`;
        }
      }
      coordinator.renderBackground();
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [coordinator]);

  return (
    <div ref={containerRef} className="relative flex-1 w-full h-full min-h-0 min-w-0 overflow-hidden">
      {/* 1. Global display theme background */}
      <canvas ref={bgCanvasRef} className="absolute inset-0 block w-full h-full pointer-events-none" />

      {/* 2. Interactive lens viewports */}
      <div className="relative z-10 w-full h-full min-h-0 min-w-0">
        {children}
      </div>

      {/* 3. 2D Kinetic effects layer (sparks, shockwaves) */}
      <canvas ref={effectsCanvasRef} className="absolute inset-0 block w-full h-full pointer-events-none z-20" />

      {/* 4. Fullscreen Hardware WebGL post-processing shader (CRT, lens flares, halation, film grain) */}
      <canvas ref={postProcessingCanvasRef} className="absolute inset-0 block w-full h-full pointer-events-none z-30" />
    </div>
  );
};
