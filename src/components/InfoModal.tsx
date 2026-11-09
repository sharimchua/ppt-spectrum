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
  GitBranch,
  Clock,
} from 'lucide-react';
import { SOLFEGE_SYLLABLES, SOLFEGE_COLORS } from '../core/ppt-constants';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayDemo?: () => void;
}

export const STORAGE_KEY_DONT_SHOW_INTRO = 'ppt_spectrum_dont_show_intro_v1';

const SOLFEGE_GLYPHS: { glyph: string; role: string; ratio: string }[] = [
  { glyph: '○', role: 'Root / Downbeat', ratio: '1/1 (0)' },
  { glyph: '◇', role: 'Phrygian / 12th', ratio: '16/15 (1/12)' },
  { glyph: '□', role: 'Major 2nd / 6th-beat', ratio: '9/8 (1/6)' },
  { glyph: '▽', role: 'Minor 3rd / Quarter', ratio: '6/5 (1/4)' },
  { glyph: '△', role: 'Major 3rd / Triplet', ratio: '5/4 (1/3)' },
  { glyph: '⊂', role: 'Perfect 4th', ratio: '4/3 (5/12)' },
  { glyph: '×', role: 'Tritone / Offbeat Antipode', ratio: '7/5 (1/2)' },
  { glyph: '⊃', role: 'Perfect 5th', ratio: '3/2 (7/12)' },
  { glyph: '▽', role: 'Minor 6th / 2nd Triplet', ratio: '8/5 (2/3)' },
  { glyph: '△', role: 'Major 6th / 4th Quarter', ratio: '5/3 (3/4)' },
  { glyph: '◇', role: 'Harmonic 7th / Pickup', ratio: '7/4 (5/6)' },
  { glyph: '□', role: 'Leading Tone', ratio: '15/8 (11/12)' },
];

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
      <div className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl border border-slate-800 bg-[#0c101a] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-[#080b12]/90">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-red-500" />
            <h2 className="text-sm font-bold tracking-wider text-white uppercase">
              Prime Period Theory — Spectrum Shapes &amp; DuMetric Architecture
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
                Rhythm, Pitch, Harmony &amp; Timbre are the Same Thing
              </h3>
              <p className="text-[11px] text-slate-300">
                Periodic amplitude events in time, observed at different timescales either side of the Temporal-Place Limen (~25.8 Hz).
              </p>
            </div>
            {onPlayDemo && (
              <button
                onClick={() => {
                  onPlayDemo();
                  onClose();
                }}
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
              <span>Core Continuum Concepts</span>
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
                  A logarithmic period continuum: <code>d = log₂(f_TPL / f)</code>. Positive <code>d</code> maps to rhythmic metres &amp; tempos; negative <code>d</code> maps to audible pitch registers.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>The Ghost Fundamental (Sam)</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  When a shape omits the <code>1/1</code> root (such as a <code>2:3</code> Hemiola or <code>4:5</code> Polyrhythm), its greatest common divisor forms an implied cyclical downbeat (<em>Sam</em>) or virtual missing root.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span>3:2 as Hemiola &amp; Perfect Fifth</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  A <code>3:2</code> ratio placed in rhythmic space creates a 3-against-2 polyrhythm (<code>Do</code> to <code>So</code>); sliding it across the TPL into pitch space transforms it into a pure Perfect Fifth!
                </p>
              </div>
            </div>
          </div>

          {/* NEW SECTION: Voice Anchors & DuMetric Time (from ppt-engraver) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-amber-400" />
              <span>Voice Anchors, Overtone Trees &amp; DuMetric Time</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg border border-amber-500/25 bg-slate-900/60 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>DuMetric Solfège Offsets &amp; Fi Offbeat</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  In PPT, the 12 Solfège degrees subdivide both pitch octaves and rhythmic cycles: <strong>Do</strong> (<code>0</code>) is the downbeat, <strong>Fi</strong> (<code>1/2</code>, 6 o’clock) is the antipode offbeat, <strong>Me</strong> (<code>1/4</code>) and <strong>La</strong> (<code>3/4</code>) mark the quarters, and compound recursive midpoints like <strong>DoLa</strong> (<code>3/8</code>) express the Afro-Cuban Tresillo (<code>3+3+2</code>) cleanly as <strong>Do – DoLa – La</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-cyan-500/25 bg-slate-900/60 space-y-1.5">
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5" />
                  <span>Hierarchical Voice Anchors</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Every shape is built from one or more <strong>Voice Anchors</strong>. The Root Anchor sits directly on the scene’s fundamental (<code>1/1 Do</code>). Additional chord tones (e.g. <code>5/4 Mi</code>, <code>3/2 So</code>) or rhythm voices (<code>Kick</code>, <code>Snare</code>, <code>Clave</code>, <code>Hi-Hat</code>) form secondary anchors, each carrying its own overtone partial series (<code>1x, 2x, 3x</code> up to P5).
                </p>
              </div>
            </div>
          </div>

          {/* NEW SECTION: 12 Chromatic Solfège Degrees & Geometric Glyphs */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>12 Chromatic Solfège Degrees &amp; PPT Engraver Glyphs</span>
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {SOLFEGE_SYLLABLES.map((syl, idx) => {
                const col = SOLFEGE_COLORS[idx] || '#ffffff';
                const info = SOLFEGE_GLYPHS[idx];
                return (
                  <div
                    key={syl}
                    className="p-2 rounded-lg border border-slate-800/90 bg-slate-950/70 flex flex-col items-center text-center gap-0.5"
                  >
                    <div className="flex items-center gap-1 font-mono font-bold text-xs" style={{ color: col }}>
                      <span>{info.glyph}</span>
                      <span>{syl}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">{info.ratio}</span>
                    <span className="text-[8px] text-slate-500 leading-tight">{info.role}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modular Lenses Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" />
              <span>Modular Lens Suite</span>
            </h4>
            <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 space-y-2">
              <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc list-inside">
                <li><strong>Spectrum Ruler</strong>: Horizontal log axis showing partial amplitudes, Ghost Sam when <code>1/1</code> is absent, and the Acoustic Aperture filter.</li>
                <li><strong>Ring Clock</strong>: Concentric DuPeriod bands with 12 Solfège spokes, showing spiral motion across octaves.</li>
                <li><strong>Cycle Wheel</strong>: Circular periodic ring primitive with rotating sweep playhead and DuMetric phase offsets.</li>
                <li><strong>Wave / Phasor</strong>: Time-domain composite waveform paired with rotating partial phasor vectors.</li>
                <li><strong>Prime Profile &amp; Event Lanes</strong>: Prime harmonic family weights (2, 3, 5, 7, 11) and multi-voice timeline ripples.</li>
              </ul>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-cyan-400" />
              <span>Keyboard &amp; Mouse Shortcuts</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold shadow-sm">
                  Space
                </kbd>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-200 font-medium">Play / Pause</span>
                  <span className="text-[9px] text-slate-400">Always toggles scene playback</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold shadow-sm">
                  L / Shift+L
                </kbd>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-200 font-medium">Library / Quick Search</span>
                  <span className="text-[9px] text-slate-400">Toggle editor or autocomplete search</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold shadow-sm">
                  ↑ / ↓
                </kbd>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-200 font-medium">Shape History</span>
                  <span className="text-[9px] text-slate-400">Cycle back/forth through session shapes</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold shadow-sm">
                  A / B
                </kbd>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-200 font-medium">Jump to Bookmark</span>
                  <span className="text-[9px] text-slate-400">Jump to Anchor A or Anchor B</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold shadow-sm">
                  Shift+A / B
                </kbd>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-200 font-medium">Set Bookmark A / B</span>
                  <span className="text-[9px] text-slate-400">Save current d to Anchor A or B</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold shadow-sm">
                  Shift+Scrub
                </kbd>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-200 font-medium">Scrub Band Filter</span>
                  <span className="text-[9px] text-slate-400">Shift + Drag or Wheel moves Filter</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold shadow-sm">
                  ← / →
                </kbd>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-200 font-medium">Step 1 Octave</span>
                  <span className="text-[9px] text-slate-400">Shift + ←/→ steps 1/2 Octave</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold shadow-sm">
                  T
                </kbd>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-200 font-medium">Strike Note</span>
                  <span className="text-[9px] text-slate-400">Acoustic ADSR envelope trigger</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 flex items-center gap-2.5">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold shadow-sm">
                  S / F
                </kbd>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-200 font-medium">Sweep / Filter</span>
                  <span className="text-[9px] text-slate-400">Toggle A↔B Sweep or Band Filter</span>
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
