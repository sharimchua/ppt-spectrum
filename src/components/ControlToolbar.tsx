import React from 'react';
import { Scene, Shape } from '../core/types';
import { dToFreq, dToBpm, dToPeriodMs, resolveDuPeriodAddress } from '../core/axis';
import { LayoutDefinition, PRESET_LAYOUTS } from '../core/layout-models';
import { Play, Pause, Radio, Layers, HelpCircle } from 'lucide-react';

interface ControlToolbarProps {
  scene: Scene;
  isPlaying: boolean;
  currentLayoutId: string;
  onSelectLayout: (layout: LayoutDefinition) => void;
  onTogglePlay: () => void;
  onUpdatePlacementD: (d: number) => void;
  onSelectPreset: (shapeId: string) => void;
  onToggleAudioMode: () => void;
  onOpenCapture: () => void;
  onOpenInfo: () => void;
}

export const ControlToolbar: React.FC<ControlToolbarProps> = ({
  scene,
  isPlaying,
  currentLayoutId,
  onSelectLayout,
  onTogglePlay,
  onUpdatePlacementD,
  onSelectPreset,
  onToggleAudioMode,
  onOpenCapture,
  onOpenInfo,
}) => {
  const activePlacement = scene.placements[0];
  const dVal = activePlacement ? activePlacement.d : 0;
  const freqHz = dToFreq(dVal, scene.anchors.tplFrequencyHz);
  const bpm = dToBpm(dVal, scene.anchors.tplFrequencyHz);
  const addr = resolveDuPeriodAddress(dVal);

  const layoutButtons: { id: string; label: string }[] = [
    { id: 'solo', label: 'Solo Ruler' },
    { id: 'duo-horizontal', label: 'Stacked Duo' },
    { id: 'duo-vertical', label: 'Side-by-Side' },
    { id: 'trio', label: 'Teaching Trio' },
  ];

  return (
    <header className="flex flex-col border-b border-slate-800 bg-[#080b12]/95 backdrop-blur-md z-40 select-none">
      {/* Top primary controls */}
      <div className="flex h-14 w-full items-center justify-between px-4">
        {/* Left: Branding & Play */}
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition cursor-pointer ${
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
            <span className="ml-2 font-mono text-[10px] text-slate-400 hidden sm:inline">Prime Period Theory</span>
          </div>
        </div>

        {/* Centre: Placement D Slider & Frequency/BPM Readout */}
        <div className="flex items-center gap-4 max-w-md w-full px-4">
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-400">Tempo / Pitch: <strong className="text-white">{dVal > 0 ? `${bpm.toFixed(0)} BPM` : `${freqHz.toFixed(1)} Hz`}</strong> (d: {dVal.toFixed(2)})</span>
              <span className="text-ppt-mi">{addr.formatted}</span>
              <span className="text-cyan-400">{dVal > 0 ? `${dToPeriodMs(dVal).toFixed(0)} ms` : `${freqHz.toFixed(1)} Hz`}</span>
            </div>
            <input
              type="range"
              min={-7}
              max={7}
              step={0.05}
              value={-dVal}
              onChange={(e) => onUpdatePlacementD(-parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-red-500"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>◄ Slower (Rhythm / Macro)</span>
              <span>TPL (25.8 Hz)</span>
              <span>Faster (Pitch / Micro) ►</span>
            </div>
          </div>
        </div>

        {/* Right: Preset Selector, Audio Mode, Capture, Info */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCapture}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-600/20 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-600/30 transition cursor-pointer"
            title="Capture Rhythm via Tap Pad or Pitch via Mic"
          >
            <Radio className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Capture</span>
          </button>

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
            className={`px-2 py-1 rounded border text-[10px] font-mono transition cursor-pointer ${
              scene.audio.audioMode === 'poetic'
                ? 'border-purple-500 bg-purple-950/40 text-purple-300'
                : 'border-slate-700 bg-slate-800 text-slate-300'
            }`}
            title="Toggle Literal vs Poetic Audio Synthesis"
          >
            {scene.audio.audioMode.toUpperCase()}
          </button>

          <button
            onClick={onOpenInfo}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            title="Theory Primer & Walkthrough"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sub-bar: Layout Presets Selector */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-slate-800/80 bg-[#06080e]/60 text-xs">
        <div className="flex items-center gap-1">
          <Layers className="h-3.5 w-3.5 text-slate-500 mr-1" />
          <span className="text-[10px] uppercase font-bold text-slate-400 mr-2">Layout:</span>
          {layoutButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => {
                const layout = PRESET_LAYOUTS[btn.id];
                if (layout) onSelectLayout(layout);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                currentLayoutId === btn.id
                  ? 'bg-slate-700 text-white font-bold border border-slate-600'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
