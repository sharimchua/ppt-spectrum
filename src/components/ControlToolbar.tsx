import React, { useState } from 'react';
import { Scene, Shape } from '../core/types';
import { dToFreq, dToBpm, dToPeriodMs, resolveDuPeriodAddress } from '../core/axis';
import { LayoutDefinition, PRESET_LAYOUTS } from '../core/layout-models';
import {
  Play,
  Pause,
  Radio,
  Layers,
  LayoutGrid,
  Share2,
  Check,
  Maximize2,
  Minimize2,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';

interface ControlToolbarProps {
  scene: Scene;
  isPlaying: boolean;
  currentLayoutId: string;
  isEditMode?: boolean;
  isFullscreen?: boolean;
  onSelectLayout: (layout: LayoutDefinition) => void;
  onTogglePlay: () => void;
  onUpdatePlacementD: (d: number) => void;
  onSelectPreset: (shapeId: string) => void;
  onToggleAudioMode: () => void;
  onToggleEditMode?: () => void;
  onShareLayout?: () => void;
  onToggleFullscreen?: () => void;
  onOpenCapture: () => void;
  onOpenInfo: () => void;
}

export const ControlToolbar: React.FC<ControlToolbarProps> = ({
  scene,
  isPlaying,
  currentLayoutId,
  isEditMode = false,
  isFullscreen = false,
  onSelectLayout,
  onTogglePlay,
  onUpdatePlacementD,
  onSelectPreset,
  onToggleAudioMode,
  onToggleEditMode,
  onShareLayout,
  onToggleFullscreen,
  onOpenCapture,
  onOpenInfo,
}) => {
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const activePlacement = scene.placements[0];
  const dVal = activePlacement ? activePlacement.d : 0;
  const freqHz = dToFreq(dVal, scene.anchors.tplFrequencyHz);
  const bpm = dToBpm(dVal, scene.anchors.tplFrequencyHz);
  const addr = resolveDuPeriodAddress(dVal);

  const handleShareClick = () => {
    if (onShareLayout) {
      onShareLayout();
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <header className="flex flex-col border-b border-slate-800 bg-[#080b12]/95 backdrop-blur-md z-40 select-none">
      {/* Primary Top Bar */}
      <div className="flex h-14 w-full items-center justify-between px-3 sm:px-4 gap-2">
        {/* Left Group: Branding, App Name & Help */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Unified Branding Icon & Title */}
          <div className="flex items-center gap-2">
            <img
              src="/logo.svg"
              alt="PPT Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 drop-shadow-[0_0_8px_rgba(225,54,16,0.3)]"
            />
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-bold tracking-wider text-slate-100 flex items-center gap-1.5">
                <span className="text-ppt-do">PPT</span>
                <span>SPECTRUM</span>
              </span>
              <span className="text-[9px] font-mono text-slate-400 hidden md:inline">
                Prime Period Theory
              </span>
            </div>
          </div>

          {/* Help Button */}
          <button
            onClick={onOpenInfo}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
            title="Theory Primer & Walkthrough"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Audio Play/Pause Button */}
          <button
            onClick={onTogglePlay}
            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border transition cursor-pointer shadow-md ${
              isPlaying
                ? 'border-red-500 bg-red-600/30 text-red-400 shadow-[0_0_12px_rgba(238,54,16,0.4)]'
                : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-slate-500 hover:bg-slate-700'
            }`}
            title={isPlaying ? 'Pause Audio' : 'Start Audio Synthesis'}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5 fill-current" />}
          </button>
        </div>

        {/* Center: Continuum Timeline Slider & Parameter Readouts */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-xl px-2">
          <div className="flex-1 space-y-0.5">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-300">
                Tempo / Pitch:{' '}
                <strong className="text-white">
                  {dVal > 0 ? `${bpm.toFixed(0)} BPM` : `${freqHz.toFixed(1)} Hz`}
                </strong>{' '}
                <span className="text-slate-500">(d: {dVal.toFixed(2)})</span>
              </span>
              <span className="text-ppt-mi font-semibold">{addr.formatted}</span>
              <span className="text-cyan-400">
                {dVal > 0 ? `${dToPeriodMs(dVal).toFixed(0)} ms` : `${freqHz.toFixed(1)} Hz`}
              </span>
            </div>

            {/* Inverted slider: slower is on left (-d), faster is on right (+d) */}
            <input
              type="range"
              min={-7}
              max={7}
              step={0.05}
              value={-dVal}
              onChange={(e) => onUpdatePlacementD(-parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-red-500"
              title="Drag to navigate from macro rhythm (slower) to micro pitch (faster)"
            />

            <div className="flex justify-between text-[8px] sm:text-[9px] text-slate-500 font-mono">
              <span>◄ Slower (Rhythm)</span>
              <span className="text-slate-400">TPL (25.8 Hz)</span>
              <span>Faster (Pitch) ►</span>
            </div>
          </div>
        </div>

        {/* Right Tools Group: Presets, Audio Mode, Capture, Layout Tools, Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Preset Selector */}
          <select
            value={activePlacement?.shapeId || ''}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900/90 px-2 py-1 text-xs text-slate-200 focus:border-red-500 focus:outline-none cursor-pointer font-mono max-w-[110px] sm:max-w-[140px] truncate"
            title="Select PPT Preset Shape"
          >
            {scene.shapes.map((s: Shape) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Audio Synthesis Mode (Literal vs Poetic) */}
          <button
            onClick={onToggleAudioMode}
            className={`px-2 py-1 rounded-md border text-[10px] font-mono font-semibold transition cursor-pointer ${
              scene.audio.audioMode === 'poetic'
                ? 'border-purple-500/80 bg-purple-950/50 text-purple-300'
                : 'border-slate-700 bg-slate-800 text-slate-300'
            }`}
            title="Toggle Literal Sinusoid vs Poetic Pitched Click Synthesis"
          >
            {scene.audio.audioMode.toUpperCase()}
          </button>

          {/* Capture Pad / Mic Pitch Modal */}
          <button
            onClick={onOpenCapture}
            className="hidden sm:flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-600/20 px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-600/30 transition cursor-pointer"
            title="Capture Rhythm via Tap Pad or Pitch via Mic"
          >
            <Radio className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Capture</span>
          </button>

          {/* Layout Presets Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLayoutMenu((prev) => !prev)}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition text-xs font-medium cursor-pointer"
              title="Choose Layout Preset"
            >
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden xl:inline capitalize">
                {currentLayoutId.replace('-', ' ')}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showLayoutMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#0e1320] border border-slate-700 rounded-lg shadow-2xl p-1.5 z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                  Layout Presets
                </div>
                {Object.values(PRESET_LAYOUTS).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onSelectLayout(preset);
                      setShowLayoutMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition cursor-pointer ${
                      currentLayoutId === preset.id
                        ? 'bg-purple-950/70 text-purple-200 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{preset.name}</span>
                    {currentLayoutId === preset.id && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Layout Edit Mode Toggle */}
          {onToggleEditMode && (
            <button
              onClick={onToggleEditMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer ${
                isEditMode
                  ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] ring-1 ring-purple-400/50'
                  : 'border-slate-700/80 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title={isEditMode ? 'Exit Layout Editor' : 'Enter Layout Editor (Split, rearrange, and configure lenses)'}
            >
              <LayoutGrid className={`w-3.5 h-3.5 ${isEditMode ? 'text-white animate-pulse' : 'text-purple-400'}`} />
              <span className="hidden xl:inline">{isEditMode ? 'Editing' : 'Edit Layout'}</span>
            </button>
          )}

          {/* Share Layout & Deep Link Button */}
          {onShareLayout && (
            <button
              onClick={handleShareClick}
              className={`p-1.5 rounded-md border transition cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Share Layout & Deep Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 rounded-md border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Mode'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
