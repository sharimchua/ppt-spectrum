import React, { useState } from 'react';
import {
  Sliders,
  Smartphone,
  Monitor,
  Layers,
  Sparkles,
  Zap,
  Volume2,
  Bookmark,
  ShieldCheck,
  Disc,
  Play,
  RotateCcw,
} from 'lucide-react';

interface KeyShortcut {
  key: string;
  shift?: boolean;
  desc: string;
}

const DESKTOP_SHORTCUTS: KeyShortcut[] = [
  { key: 'Space', desc: 'Toggle audio playback and animation' },
  { key: 'L', desc: 'Open / close Shape Synthesiser tray' },
  { key: 'L', shift: true, desc: 'Quick Shape Search with autocomplete' },
  { key: 'S', desc: 'Toggle automatic Bookmark A/B sweep' },
  { key: 'A', desc: 'Jump frequency directly to Bookmark A' },
  { key: 'A', shift: true, desc: 'Store current frequency to Bookmark A' },
  { key: 'B', desc: 'Jump frequency directly to Bookmark B' },
  { key: 'B', shift: true, desc: 'Store current frequency to Bookmark B' },
  { key: 'T', desc: 'Trigger / strike acoustic ADSR note' },
  { key: 'F', desc: 'Toggle compound filter bypass on / off' },
  { key: 'F', shift: true, desc: 'Open Quick Filter Search modal' },
  { key: 'E', desc: 'Toggle filter interactive edit mode HUD' },
  { key: 'M', desc: 'Open / close Bookmarks panel' },
  { key: 'P', desc: 'Open Rhythm Tap-Tempo capture pad' },
  { key: '← / →', desc: 'Step frequency by 1 octave (Shift: 0.5 oct)' },
  { key: '↑ / ↓', desc: 'Navigate shape selection history' },
];

export const CustomiseSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mobile' | 'desktop'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0
        ? 'mobile'
        : 'desktop';
    }
    return 'desktop';
  });

  return (
    <div className="space-y-6">
      {/* Platform Adaptive Toggle Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-900/60 p-4">
        <div>
          <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-amber-400" />
            <span>Interaction &amp; Navigation Controls</span>
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Tailored interaction guides for touchscreens and desktop workstations.
          </p>
        </div>

        <div className="flex items-center rounded-lg border border-stone-700 bg-stone-950 p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('mobile')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'mobile'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Touch &amp; Mobile</span>
          </button>
          <button
            onClick={() => setActiveTab('desktop')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'desktop'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>Desktop &amp; Keyboard</span>
          </button>
        </div>
      </div>

      {/* Platform Content */}
      {activeTab === 'mobile' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Radial Menu Card */}
            <div className="rounded-xl border border-amber-500/30 bg-stone-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                <Disc className="h-4 w-4 text-amber-400" />
                <span>Annular Radial Menu (Thumb-Driven)</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Long-press on any canvas cell or tap the floating menu button to deploy the circular radial menu under your thumb.
                Access shapes, filters, bookmarks, and viewport lenses with single-handed ergonomic gestures.
              </p>
              <div className="text-[11px] text-amber-400/90 font-mono bg-amber-950/30 p-2 rounded border border-amber-900/40">
                Action: Long-press canvas → Glide thumb to action icon → Release
              </div>
            </div>

            {/* Rotary Jog-Wheel Card */}
            <div className="rounded-xl border border-cyan-500/30 bg-stone-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
                <RotateCcw className="h-4 w-4 text-cyan-400" />
                <span>Rotary Jog-Wheel Continuous Scrubbing</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Use our virtual iPod-style rotary scrub wheel to glide seamlessly across octaves without running out of screen width.
                Circle your thumb clockwise to pitch up into acoustic frequencies, or counter-clockwise to decelerate into sub-audible polyrhythms.
              </p>
              <div className="text-[11px] text-cyan-400/90 font-mono bg-cyan-950/30 p-2 rounded border border-cyan-900/40">
                Action: Circular drag on rotary dial = continuous smooth DuPeriod scrub
              </div>
            </div>

            {/* Double Tap Gestures */}
            <div className="rounded-xl border border-emerald-500/30 bg-stone-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs">
                <Play className="h-4 w-4 text-emerald-400" />
                <span>Double-Tap Transport</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Double-tap quickly on any lens cell to instantaneously toggle audio synthesis and timeline oscillation, giving you
                immediate control without searching for toolbar buttons.
              </p>
            </div>

            {/* Bottom Sheets & Touch Filter Pinch */}
            <div className="rounded-xl border border-purple-500/30 bg-stone-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs">
                <Sliders className="h-4 w-4 text-purple-400" />
                <span>Bottom Drawers &amp; Touch Filter Scrub</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Swipe up from the bottom bar to expand the Shape Synthesiser or Filter Drawers. When in Filter HUD mode,
                touch and slide the lower and upper frequency boundaries directly on the Spectrum Ruler.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Flexbox & Mouse Gestures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-stone-200 font-semibold text-xs">
                <Layers className="h-4 w-4 text-amber-400" />
                <span>Flexible Multi-Cell Layout Engine</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Split your viewport into rows or columns. Drag cell dividers to adjust flex ratios.
                Use presets (Solo, Duo, Teaching Trio, Quad 2×2) or build your custom lens arrangement.
              </p>
            </div>

            <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-stone-200 font-semibold text-xs">
                <Sliders className="h-4 w-4 text-cyan-400" />
                <span>Mouse Wheel &amp; Drag Scrubbing</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Click and drag along the Spectrum Ruler to scrub primary frequency. Hold <kbd className="font-mono text-amber-300">Shift</kbd> while dragging filter boundary markers to adjust bandwidth. Scroll mouse wheel over axes to fine-nudge values.
              </p>
            </div>
          </div>

          {/* Keyboard Shortcuts Matrix */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-stone-200 uppercase tracking-wide">
                Keyboard Shortcuts Matrix
              </h4>
              <span className="text-[11px] text-stone-400">Works everywhere outside text inputs</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {DESKTOP_SHORTCUTS.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 rounded-lg border border-stone-800/80 bg-stone-950/60 p-2.5 text-xs"
                >
                  <div className="flex shrink-0 items-center gap-1 font-mono">
                    {item.shift && (
                      <span className="rounded bg-stone-800 px-1.5 py-0.5 text-[10px] font-semibold text-stone-300 border border-stone-700">
                        Shift
                      </span>
                    )}
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/40">
                      {item.key}
                    </span>
                  </div>
                  <span className="text-[11px] leading-tight text-stone-300">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Synthesis & Sweep Engine Cards (Shared) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Shape Synthesiser */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-stone-200 font-semibold text-xs">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Acoustic Wave Synthesiser</span>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Sculpt waveforms using harmonic presets (Sine, Sawtooth, Square, Triangle, Bells) or customise partial amplitudes and phase angles. An ADSR envelope provides tactile strike articulation.
          </p>
        </div>

        {/* Bookmarks & Sweep */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-stone-200 font-semibold text-xs">
            <Bookmark className="h-4 w-4 text-cyan-400" />
            <span>Musical Bookmarks &amp; Sweep</span>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Store distinct reference frequencies at Bookmark A and B. Activate Sweep oscillation to dynamically glide back and forth across the TPL boundary at adjustable speeds.
          </p>
        </div>

        {/* GPU Shaders & Audio Assist */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-stone-200 font-semibold text-xs">
            <Zap className="h-4 w-4 text-emerald-400" />
            <span>GPU Shaders &amp; Safety Profiles</span>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Hardware WebGL bloom, halation, and CRT scanlines with Max Effects, Balanced, and Eco Mode profiles. Strictly adheres to WCAG 2.2 Three-Flashes safety with Small-Speaker low-end assist.
          </p>
        </div>
      </div>

      {/* Deep-Link Sharing */}
      <div className="flex items-center justify-between rounded-xl border border-stone-800/80 bg-stone-950/60 p-4 text-xs text-stone-300">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            <strong>Base64 URL Deep Links:</strong> Share button in toolbar exports your active shape, filter boundaries, and viewport layout to an instant shareable link.
          </span>
        </div>
        <Volume2 className="h-4 w-4 text-stone-500 shrink-0 hidden sm:block" />
      </div>
    </div>
  );
};
