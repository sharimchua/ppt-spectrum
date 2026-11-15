/**
 * Cross-Limen Coupling selector pill component.
 * Renders an interactive dropdown pill for Pitch Carrier (Rhythm Space, d > 0)
 * or Rhythm Container (Pitch Space, d <= 0) on desktop continuum slider sub-labels
 * and outside the rotary dial in the mobile Radial Menu.
 * Australian English spelling maintained.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles, Disc, Layers } from 'lucide-react';
import {
  Scene,
  PitchCarrierMode,
  RhythmContainerMode,
} from '../core/types';
import {
  resolvePitchCarrier,
  resolveRhythmContainer,
} from '../core/coupling';

export interface CouplingSelectorPillProps {
  kind: 'carrier' | 'container';
  scene: Scene;
  isActiveRegime: boolean;
  onUpdatePitchCarrier?: (mode: PitchCarrierMode) => void;
  onUpdateRhythmContainer?: (mode: RhythmContainerMode) => void;
  /** Compact variant for RadialMenu outer bar */
  compact?: boolean;
  /** Drop menu upwards instead of downwards */
  dropUp?: boolean;
}

export const CouplingSelectorPill: React.FC<CouplingSelectorPillProps> = ({
  kind,
  scene,
  isActiveRegime,
  onUpdatePitchCarrier,
  onUpdateRhythmContainer,
  compact = false,
  dropUp = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activePlacement = scene.placements[0];
  const activeShape =
    scene.shapes.find((s) => s.id === activePlacement?.shapeId) || scene.shapes[0];

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!activeShape) return null;

  const isCarrier = kind === 'carrier';
  const resolvedCarrier = isCarrier ? resolvePitchCarrier(scene, activeShape) : null;
  const resolvedContainer = !isCarrier ? resolveRhythmContainer(scene, activeShape) : null;

  const currentRawMode = isCarrier
    ? scene.audio.pitchCarrier || 'auto'
    : scene.audio.rhythmContainer || 'auto';

  const shortText = isCarrier
    ? resolvedCarrier!.shortLabel
    : resolvedContainer!.shortLabel;

  // Determine what 'auto' resolves to for this shape so the menu option is clear
  const autoResolvedWord = isCarrier
    ? (activeShape.defaultCarrier ?? (activeShape.category === 'timbre' ? 'Kit' : 'Self'))
    : (activeShape.defaultContainer ??
        (resolveRhythmContainer({ ...scene, audio: { ...scene.audio, rhythmContainer: 'auto' } }, activeShape).mode === 'self'
          ? 'Self'
          : 'Static'));

  const handleSelectCarrier = (mode: PitchCarrierMode) => {
    onUpdatePitchCarrier?.(mode);
    setIsOpen(false);
  };

  const handleSelectContainer = (mode: RhythmContainerMode) => {
    onUpdateRhythmContainer?.(mode);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono transition cursor-pointer select-none border ${
          compact ? 'text-[10px]' : 'text-[8px] sm:text-[9px]'
        } ${
          isActiveRegime
            ? isCarrier
              ? 'border-amber-500/50 bg-amber-950/50 text-amber-200 hover:bg-amber-900/60'
              : 'border-cyan-500/50 bg-cyan-950/50 text-cyan-200 hover:bg-cyan-900/60'
            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
        }`}
        title={
          isCarrier
            ? `Pitch Carrier (${resolvedCarrier!.label}): Choose what sound rings out on each rhythmic onset in Rhythm Space (d > 0)`
            : `Rhythm Container (${resolvedContainer!.label}): Choose how the harmonic spectrum is articulated in Pitch Space (d ≤ 0)`
        }
      >
        {isCarrier ? (
          <>
            {!compact && <span className="text-slate-400">◄</span>}
            <span className="font-semibold">Carrier:</span>
            <span className="font-bold text-white">{shortText}</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-75 shrink-0" />
          </>
        ) : (
          <>
            <span className="font-semibold">Container:</span>
            <span className="font-bold text-white">{shortText}</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-75 shrink-0" />
            {!compact && <span className="text-slate-400">►</span>}
          </>
        )}
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${
            isCarrier ? 'left-0' : 'right-0'
          } ${
            dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } w-60 rounded-xl border border-slate-700 bg-[#0c111d] p-1.5 shadow-2xl z-[120] text-[11px] font-sans space-y-1 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="px-2 py-1 border-b border-slate-800">
            <div className="font-bold text-white flex items-center gap-1.5 text-xs">
              {isCarrier ? (
                <>
                  <Disc className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Pitch Carrier (Rhythm Space)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Rhythm Container (Pitch Space)</span>
                </>
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
              {isCarrier
                ? 'Sound struck on each rhythmic beat below 25.8 Hz'
                : 'Rhythmic articulation of notes above 25.8 Hz'}
            </p>
          </div>

          {isCarrier ? (
            <>
              <button
                type="button"
                onClick={() => handleSelectCarrier('auto')}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition cursor-pointer ${
                  currentRawMode === 'auto'
                    ? 'bg-amber-950/70 text-amber-200 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-mono text-[11px]">
                    Auto ({String(autoResolvedWord).toUpperCase()})
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Smart preset default for this shape
                  </div>
                </div>
                {currentRawMode === 'auto' && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => handleSelectCarrier('self')}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition cursor-pointer ${
                  currentRawMode === 'self'
                    ? 'bg-amber-950/70 text-amber-200 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-mono text-[11px]">Self (Fractal Chord)</div>
                  <div className="text-[9px] text-slate-400">
                    Strikes anchor chord pitched at each beat&apos;s ratio
                  </div>
                </div>
                {currentRawMode === 'self' && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => handleSelectCarrier('kit')}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition cursor-pointer ${
                  currentRawMode === 'kit'
                    ? 'bg-amber-950/70 text-amber-200 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-mono text-[11px]">Drum Kit (Neutral)</div>
                  <div className="text-[9px] text-slate-400">
                    Un-pitched Poetic percussion voices
                  </div>
                </div>
                {currentRawMode === 'kit' && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              </button>

              <div className="pt-1 mt-1 border-t border-slate-800 px-2 py-0.5 text-[9px] uppercase font-mono font-bold text-slate-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-amber-400" />
                <span>Library Shape Carrier</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5">
                {scene.shapes.map((sh) => {
                  const modeKey: PitchCarrierMode = `shape:${sh.id}`;
                  const isSelected = currentRawMode === modeKey;
                  return (
                    <button
                      key={sh.id}
                      type="button"
                      onClick={() => handleSelectCarrier(modeKey)}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-[10px] font-mono transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/70 text-amber-200 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{sh.name}</span>
                      {isSelected && <Check className="w-3 h-3 text-amber-400 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSelectContainer('auto')}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition cursor-pointer ${
                  currentRawMode === 'auto'
                    ? 'bg-cyan-950/70 text-cyan-200 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-mono text-[11px]">
                    Auto ({String(autoResolvedWord).toUpperCase()})
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Self for compact chords; Static for complex timbres
                  </div>
                </div>
                {currentRawMode === 'auto' && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => handleSelectContainer('self')}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition cursor-pointer ${
                  currentRawMode === 'self'
                    ? 'bg-cyan-950/70 text-cyan-200 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-mono text-[11px]">Self (Fractal Rhythm)</div>
                  <div className="text-[9px] text-slate-400">
                    Pulses voices at their own harmonic ratios
                  </div>
                </div>
                {currentRawMode === 'self' && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => handleSelectContainer('static')}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition cursor-pointer ${
                  currentRawMode === 'static'
                    ? 'bg-cyan-950/70 text-cyan-200 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-mono text-[11px]">Static (Unified)</div>
                  <div className="text-[9px] text-slate-400">
                    Continuous sustain or unified note strike
                  </div>
                </div>
                {currentRawMode === 'static' && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
              </button>

              <div className="pt-1 mt-1 border-t border-slate-800 px-2 py-0.5 text-[9px] uppercase font-mono font-bold text-slate-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>Library Shape Container</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5">
                {scene.shapes.map((sh) => {
                  const modeKey: RhythmContainerMode = `shape:${sh.id}`;
                  const isSelected = currentRawMode === modeKey;
                  return (
                    <button
                      key={sh.id}
                      type="button"
                      onClick={() => handleSelectContainer(modeKey)}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-[10px] font-mono transition cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/70 text-cyan-200 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{sh.name}</span>
                      {isSelected && <Check className="w-3 h-3 text-cyan-400 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
