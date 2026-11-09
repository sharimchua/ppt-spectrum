import React from 'react';
import {
  X,
  Compass,
  Sparkles,
  ExternalLink,
  BookOpen,
  Layers,
  Play,
  Keyboard,
} from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayDemo?: () => void;
}

export const STORAGE_KEY_DONT_SHOW_INTRO = 'ppt_spectrum_dont_show_intro_v1';

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, onPlayDemo }) => {
  const [dontShowAgain, setDontShowAgain] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY_DONT_SHOW_INTRO) === 'true';
  });

  if (!isOpen) return null;

  const handleDontShowChange = (checked: boolean) => {
    setDontShowAgain(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DONT_SHOW_INTRO, checked ? 'true' : 'false');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-800 bg-[#0c101a] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-[#080b12]/90">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-red-500" />
            <h2 className="text-sm font-bold tracking-wider text-white uppercase">
              Prime Period Theory — Spectrum Shapes
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs text-slate-300 leading-relaxed font-sans">
          {/* Hero Banner */}
          <div className="p-4 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-950/40 via-slate-900/60 to-purple-950/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-red-400 tracking-wider font-bold">
                The Core Thesis
              </span>
              <h3 className="text-sm font-bold text-white">
                Rhythm, Pitch, Harmony & Timbre are the Same Thing
              </h3>
              <p className="text-[11px] text-slate-300">
                Periodic amplitude events in time, observed at different timescales either side of the Temporal-Place Limen (~25.8 Hz).
              </p>
            </div>
            {onPlayDemo && (
              <button
                onClick={() => { onPlayDemo(); onClose(); }}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(238,54,16,0.3)] transition cursor-pointer"
              >
                <Play className="h-4 w-4" />
                <span>Hear the Crossing</span>
              </button>
            )}
          </div>

          {/* Key Concepts Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Compass className="h-4 w-4 text-cyan-400" />
              <span>Core Instruments & Concepts</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span>The Temporal-Place Limen (TPL)</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Located at <strong>~25.8 Hz (38.7 ms)</strong>. Below 10 Hz, events are perceived as discrete rhythmic pulses. Above 40 Hz, they fuse into continuous musical pitch.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span>DuPeriod Coordinates (d)</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  A logarithmic period continuum: d = log₂(f_TPL / f). Positive d maps to rhythmic meters &amp; tempos; negative d maps to audible audio frequencies.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>The Ghost Fundamental</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  The greatest common frequency divisor of harmonic partials. In rhythm, it is the cyclical downbeat (the <em>Sam</em>); in pitch, it is the virtual missing root.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span>3:2 as Hemiola & Fifth</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  A 3:2 ratio placed in rhythmic space creates a 3-against-2 polyrhythm (Do to So); sliding it into pitch space transforms it into a pure Perfect Fifth!
                </p>
              </div>
            </div>
          </div>

          {/* Modular Lenses Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" />
              <span>Modular Lens Suite</span>
            </h4>
            <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 space-y-2">
              <p className="text-[11px] text-slate-300">
                Switch between different visual representations in the top toolbar or layout presets:
              </p>
              <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc list-inside">
                <li><strong>Spectrum Ruler</strong>: Horizontal log axis showing partial amplitudes and the shaded TPL transition zone.</li>
                <li><strong>Ring Clock</strong>: Concentric DuPeriod bands with 12 Solfège spokes, showing spiral motion across octaves.</li>
                <li><strong>Cycle Wheel</strong>: Circular periodic ring primitive with rotating sweep playhead and coincidence spokes.</li>
                <li><strong>Wave / Phasor</strong>: Time-domain composite waveform paired with rotating partial phasor vectors.</li>
                <li><strong>Prime Profile</strong>: Amplitude distribution across prime factor families (2-prime octaves, 3-prime fifths, 5-prime thirds, etc.).</li>
              </ul>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-cyan-400" />
              <span>Keyboard Shortcuts</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold shadow-sm">
                  Space
                </kbd>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-200 font-medium">Play / Pause</span>
                  <span className="text-[9px] text-slate-400">Audio & simulation</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold shadow-sm">
                  S
                </kbd>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-200 font-medium">Toggle Sweep</span>
                  <span className="text-[9px] text-slate-400">Oscillate A ↔ B</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold shadow-sm">
                  F
                </kbd>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-200 font-medium">Toggle Filter</span>
                  <span className="text-[9px] text-slate-400">Band aperture</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold shadow-sm">
                  T
                </kbd>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-200 font-medium">Strike Note</span>
                  <span className="text-[9px] text-slate-400">Acoustic ADSR trigger</span>
                </div>
              </div>
            </div>
          </div>

          {/* External Links */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-4 text-[11px]">
            <a
              href="https://ppt.midlifemuso.com/reference/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-red-400 hover:text-red-300 underline font-medium"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>PPT Knowledge Base</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://midlifemuso.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-slate-400 hover:text-white underline font-medium"
            >
              <span>Midlife Muso Music Pedagogy</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800/80 px-6 py-3.5 bg-[#080b12]/90">
          <label className="flex items-center gap-2 text-slate-400 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => handleDontShowChange(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-red-600 focus:ring-0 cursor-pointer"
            />
            <span>Don't show this intro on startup</span>
          </label>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold text-xs text-white transition cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};
