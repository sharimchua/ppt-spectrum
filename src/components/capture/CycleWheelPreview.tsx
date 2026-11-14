import React, { useEffect, useRef } from 'react';
import { Shape, Scene } from '../../core/types';
import { DEFAULT_SCENE } from '../../core/config';
import { CycleWheelLensRenderer } from '../../renderers/cycle-wheel-lens';

export interface CycleWheelPreviewProps {
  shape: Shape;
  cyclePeriodSec: number;
  tplHz: number;
  isPlaying?: boolean;
  getAudioPhase?: () => number;
}

/**
 * Lightweight Cycle Wheel preview canvas for reviewing captured rhythm VoiceAnchors
 * and observing phase coherence before applying to the main scene.
 */
export const CycleWheelPreview: React.FC<CycleWheelPreviewProps> = ({
  shape,
  cyclePeriodSec,
  tplHz,
  isPlaying = false,
  getAudioPhase,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CycleWheelLensRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!rendererRef.current) {
      rendererRef.current = new CycleWheelLensRenderer();
    }

    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
    const cssWidth = canvas.clientWidth || 220;
    const cssHeight = canvas.clientHeight || 220;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const f0 = 1 / Math.max(0.1, cyclePeriodSec);
    const d = Math.log2(tplHz / f0);
    const previewScene: Scene = {
      ...DEFAULT_SCENE,
      anchors: { ...DEFAULT_SCENE.anchors, tplFrequencyHz: tplHz },
      shapes: [shape],
      placements: [
        {
          shapeId: shape.id,
          d,
          gain: 1.0,
          mute: false,
          solo: false,
        },
      ],
    };

    const drawFrame = (transportSec: number, phase: number, active: boolean) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      rendererRef.current?.render(ctx, cssWidth, cssHeight, previewScene, transportSec, phase, active);
    };

    if (!isPlaying) {
      drawFrame(0, 0, false);
      return;
    }

    let animId = 0;
    const startMs = performance.now();
    const tick = () => {
      const transportSec = (performance.now() - startMs) / 1000;
      const phase = getAudioPhase ? getAudioPhase() : transportSec / Math.max(0.1, cyclePeriodSec);
      drawFrame(transportSec, phase, true);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animId);
  }, [shape, cyclePeriodSec, tplHz, isPlaying, getAudioPhase]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-2 flex flex-col items-center">
      <div className="w-full flex items-center justify-between text-[9px] font-mono text-slate-400 px-1 mb-1">
        <span>Cycle Wheel Preview</span>
        <span>{shape.anchors?.length ?? shape.partials.length} anchors</span>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-48 block"
        aria-label="Captured rhythm Cycle Wheel preview"
      />
    </div>
  );
};
