import React from 'react';
import { Scene, Shape } from '../core/types';
import { dToFreq, dToBpm, resolveDuPeriodAddress } from '../core/axis';
import { Play, Pause } from 'lucide-react';

interface ControlToolbarProps {
  scene: Scene;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onUpdatePlacementD: (d: number) => void;
  onSelectPreset: (shapeId: string) => void;
  onToggleAudioMode: () => void;
}

export const ControlToolbar: React.FC<ControlToolbarProps> = ({
  scene,
  isPlaying,
  onTogglePlay,
  onUpdatePlacementD,
  onSelectPreset,
  onToggleAudioMode,
}) => {
  const activePlacement = scene.placements[0];
  const dVal = activePlacement ? activePlacement.d : 0;
  const freqHz = dToFreq(dVal, scene.anchors.tplFrequencyHz);
  const bpm = dToBpm(dVal, scene.anchors.tplFrequencyHz);
  const addr = resolveDuPeriodAddress(dVal);

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-slate-800 bg-[#080b12]/90 px-4 backdrop-blur-md z-40 select-none">
      {/* Left: Branding & Play */}
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
            isPlaying
              ? 'border-red-500 bg-red-600/30 text-red-400 shadow-[0_0_12px_rgba(238,54,16,0.4)]'
              : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-slate-500'
          }`}
          title={isPlaying ? 'Pause Audio' : 'Start Audio (Unlock Web Audio)'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>

        <div>
          <span className="text-xs font-bold tracking-wider text-ppt-do">SPECTRUM SHAPES</span>
          <span className="ml-2 font-mono text-[10px] text-slate-400">Prime Period Theory</span>
        </div>
      </div>

      {/* Centre: Placement D Slider & Frequency/BPM Readout */}
      <div className="flex items-center gap-4 max-w-md w-full px-4">
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-slate-400">Position (d): <strong className="text-white">{dVal.toFixed(2)}</strong></span>
            <span className="text-ppt-mi">{addr.formatted}</span>
            <span className="text-cyan-400">{freqHz >= 10 ? `${freqHz.toFixed(1)} Hz` : `${bpm.toFixed(0)} BPM`}</span>
          </div>
          <input
            type="range"
            min={-7}
            max={7}
            step={0.05}
            value={dVal}
            onChange={(e) => onUpdatePlacementD(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-red-500"
          />
        </div>
      </div>

      {/* Right: Preset Selector & Audio Mode Toggle */}
      <div className="flex items-center gap-2">
        <select
          value={activePlacement?.shapeId || ''}
          onChange={(e) => onSelectPreset(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 focus:border-red-500 focus:outline-none cursor-pointer font-mono"
        >
          {scene.shapes.map((s: Shape) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <button
          onClick={onToggleAudioMode}
          className={`px-2 py-1 rounded border text-[10px] font-mono transition ${
            scene.audio.audioMode === 'poetic'
              ? 'border-purple-500 bg-purple-950/40 text-purple-300'
              : 'border-slate-700 bg-slate-800 text-slate-300'
          }`}
          title="Toggle Literal vs Poetic Audio Synthesis"
        >
          {scene.audio.audioMode.toUpperCase()}
        </button>
      </div>
    </header>
  );
};
