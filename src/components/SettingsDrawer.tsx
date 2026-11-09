import React from 'react';
import {
  X,
  Sliders,
  Sparkles,
  Volume2,
  Tv,
  Zap,
  BookOpen,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Compass,
} from 'lucide-react';
import { Scene, CosmeticsConfig } from '../core/types';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scene: Scene;
  onUpdateScene: (updater: (prev: Scene) => Scene) => void;
  onOpenInfoModal?: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  scene,
  onUpdateScene,
  onOpenInfoModal,
}) => {
  if (!isOpen) return null;

  const cosmetics = scene.cosmetics;

  const updateCosmetics = (partial: Partial<CosmeticsConfig>) => {
    onUpdateScene((prev) => ({
      ...prev,
      cosmetics: {
        ...prev.cosmetics,
        ...partial,
      },
    }));
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-full sm:w-96 max-w-full bg-[#0b0e17]/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-red-500" />
          <h2 className="font-bold text-slate-100 text-sm tracking-wide">Spectrum Settings</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          title="Close Settings"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-slate-300">
        {/* Walkthrough & Theory Primer Banner */}
        {onOpenInfoModal && (
          <button
            onClick={() => {
              onClose();
              onOpenInfoModal();
            }}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-red-950/40 via-slate-900/70 to-purple-950/40 border border-slate-700/80 hover:border-red-500/80 text-left transition group shadow-md cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-md bg-red-950/80 border border-red-800/60 text-red-400 group-hover:scale-105 transition-transform shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-xs group-hover:text-red-300 transition-colors truncate">
                  Prime Period Theory Walkthrough
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Interactive primer, concepts & guides
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-white transition-all shrink-0 ml-1" />
          </button>
        )}

        {/* SECTION 1: PERFORMANCE PROFILES & FLASH SAFETY */}
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs uppercase tracking-wider">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Performance & Flash Safety</span>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/70 space-y-3">
            <label className="block text-[11px] font-medium text-slate-300">
              Rendering Performance Profile:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['max', 'balanced', 'eco'] as const).map((profile) => (
                <button
                  key={profile}
                  onClick={() => updateCosmetics({ performanceProfile: profile })}
                  className={`py-2 px-1 rounded text-center text-xs font-semibold capitalize transition border cursor-pointer ${
                    cosmetics.performanceProfile === profile
                      ? 'bg-red-600 border-red-400 text-white shadow-[0_0_8px_rgba(225,54,16,0.4)]'
                      : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {profile === 'max' ? 'Max Effects' : profile === 'balanced' ? 'Balanced' : 'Eco Mode'}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-slate-400 leading-relaxed">
              {cosmetics.performanceProfile === 'max'
                ? 'High-precision WebGL shaders with 24 FPS film grain, 16 optical Solfège lights, halation bloom, and lens flares.'
                : cosmetics.performanceProfile === 'balanced'
                ? 'Optimised shaders with reduced particle count and post-processing for smooth 60 FPS mobile performance.'
                : 'Eco Mode bypasses hardware shaders and uses lightweight 2D canvas drawing to preserve battery and CPU.'}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] text-slate-300 font-medium">WCAG 3-Flash Limiter</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/40">
                Active (Auto-Glow)
              </span>
            </div>
          </div>
        </section>

        {/* SECTION 2: WEBGL POST-PROCESSING COSMETICS */}
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>WebGL Optical Cosmetics</span>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/70 space-y-3">
            {/* Film Grain */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">24 FPS Film Grain:</span>
                <span className="font-mono text-purple-300">{(cosmetics.filmGrainIntensity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={cosmetics.filmGrainIntensity}
                onChange={(e) => updateCosmetics({ filmGrainIntensity: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Optical Glow & Bloom */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">Optical Halation Bloom:</span>
                <span className="font-mono text-purple-300">{(cosmetics.glowBloom * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={cosmetics.glowBloom}
                onChange={(e) => updateCosmetics({ glowBloom: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Lens Flare Intensity */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">Lens Flare Intensity:</span>
                <span className="font-mono text-purple-300">{(cosmetics.lensFlareIntensity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={cosmetics.lensFlareIntensity}
                onChange={(e) => updateCosmetics({ lensFlareIntensity: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Lens Flare Style */}
            <div className="space-y-1 pt-1">
              <span className="block text-[11px] text-slate-300">Lens Flare Style:</span>
              <div className="grid grid-cols-3 gap-1">
                {(['cinematic', 'starburst', 'anamorphic'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => updateCosmetics({ lensFlareStyle: style })}
                    className={`py-1 px-1 rounded text-center text-[10px] font-semibold capitalize transition border cursor-pointer ${
                      cosmetics.lensFlareStyle === style
                        ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Theme */}
            <div className="space-y-1 pt-1">
              <span className="block text-[11px] text-slate-300">Background Theme:</span>
              <div className="grid grid-cols-3 gap-1">
                {(['carbon-grid', 'studio-obsidian', 'cosmic-abyss'] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => updateCosmetics({ backgroundTheme: theme })}
                    className={`py-1 px-1 rounded text-center text-[10px] font-semibold capitalize transition border cursor-pointer ${
                      cosmetics.backgroundTheme === theme
                        ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {theme.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: CRT & ANALOG COSMETICS */}
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs uppercase tracking-wider">
            <Tv className="w-4 h-4 text-cyan-400" />
            <span>CRT & Analogue Monitor</span>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/70 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">CRT Scanlines:</span>
                <span className="font-mono text-cyan-300">{(cosmetics.scanlineIntensity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={cosmetics.scanlineIntensity}
                onChange={(e) => updateCosmetics({ scanlineIntensity: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">CRT Curvature & Vignette:</span>
                <span className="font-mono text-cyan-300">{(cosmetics.crtVignette * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={cosmetics.crtVignette}
                onChange={(e) => updateCosmetics({ crtVignette: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>
        </section>

        {/* SECTION 4: AUDIO & FOCUS MANAGEMENT */}
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs uppercase tracking-wider">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>Audio & Real-time Focus</span>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/70 space-y-3">
            {/* Master Gain */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">Master Volume:</span>
                <span className="font-mono text-emerald-300">{(scene.audio.masterGain * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={scene.audio.masterGain}
                onChange={(e) => {
                  const gain = parseFloat(e.target.value);
                  onUpdateScene((prev) => ({
                    ...prev,
                    audio: { ...prev.audio, masterGain: gain },
                  }));
                }}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Small Speaker Assist */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="font-medium text-slate-200 text-[11px]">Small-Speaker Assist</div>
                <div className="text-[9px] text-slate-400">Virtual bass harmonics reinforcement</div>
              </div>
              <input
                type="checkbox"
                checked={scene.audio.speakerAssist}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onUpdateScene((prev) => ({
                    ...prev,
                    audio: { ...prev.audio, speakerAssist: checked },
                  }));
                }}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Real-time Focus Mode */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <div>
                <div className="font-medium text-slate-200 text-[11px]">Auto-Mute on Blur</div>
                <div className="text-[9px] text-slate-400">Silences audio when tab is backgrounded</div>
              </div>
              <input
                type="checkbox"
                checked={cosmetics.focusModeEnabled}
                onChange={(e) => updateCosmetics({ focusModeEnabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </section>

        {/* SECTION 5: THEORY ANCHORS & CONCERT PITCH */}
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs uppercase tracking-wider">
            <Compass className="w-4 h-4 text-ppt-mi" />
            <span>Theory Anchors & Tuning</span>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/70 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-300">TPL Frequency (f_TPL):</span>
              <span className="font-mono text-white font-bold">{scene.anchors.tplFrequencyHz} Hz</span>
            </div>
            <div className="text-[10px] text-slate-400 leading-relaxed">
              Temporal-Place Limen boundary (38.7 ms) separating macro-rhythmic beats from micro-tonal pitch.
            </div>

            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800">
              <span className="text-slate-300">Concert Pitch Reference:</span>
              <span className="font-mono text-white font-bold">{scene.anchors.tuningA4Hz} Hz</span>
            </div>
          </div>
        </section>

        {/* SECTION 6: EXTERNAL THEORY & PEDAGOGY LINKS */}
        <section className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider">
            Theory Resources & Coaching
          </div>
          <div className="space-y-1">
            <a
              href="https://ppt.midlifemuso.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 rounded bg-slate-900/50 hover:bg-slate-800/80 text-slate-300 hover:text-white transition group border border-slate-800"
            >
              <span>Prime Period Theory (PPT) Docs</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-400 transition" />
            </a>
            <a
              href="https://ppt.midlifemuso.com/reference"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 rounded bg-slate-900/50 hover:bg-slate-800/80 text-slate-300 hover:text-white transition group border border-slate-800"
            >
              <span>PPT Reference Library</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-400 transition" />
            </a>
            <a
              href="https://midlifemuso.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 rounded bg-slate-900/50 hover:bg-slate-800/80 text-slate-300 hover:text-white transition group border border-slate-800"
            >
              <span>Midlife Muso Music Pedagogy</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-400 transition" />
            </a>
          </div>
        </section>
      </div>
    </aside>
  );
};
