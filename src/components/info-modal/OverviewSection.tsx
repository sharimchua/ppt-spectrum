import React from 'react';
import { Play, Sparkles, Layers, Sliders, Volume2, Compass, Activity, Eye, Zap } from 'lucide-react';

interface OverviewSectionProps {
  onPlayDemo: () => void;
}

interface LensCard {
  name: string;
  badge: string;
  summary: string;
  accent: string;
}

const LENS_CARDS: LensCard[] = [
  {
    name: 'Spectrum Ruler',
    badge: 'Logarithmic Axis',
    summary: 'Panoramic view spanning sub-audible rhythms, through the Temporal-Place Limen (25.8 Hz), up to brilliant audio overtones.',
    accent: 'border-amber-500/30 text-amber-300',
  },
  {
    name: 'Concentric Ring Clock',
    badge: 'Harmonic Orbits',
    summary: 'Rhythmic cycles and audio partials arranged as planetary rings, revealing coincident beats at the top-dead-centre Sam downbeat.',
    accent: 'border-cyan-500/30 text-cyan-300',
  },
  {
    name: 'Cycle Wheel',
    badge: 'Polar Waveform',
    summary: 'Single-period circular projection mapping phase angle to perimeter displacement, highlighting waveform symmetry.',
    accent: 'border-emerald-500/30 text-emerald-300',
  },
  {
    name: 'Composite Waveform',
    badge: 'Oscilloscope',
    summary: 'Time-domain oscilloscope tracing the exact acoustic summation of all active harmonics across multiple fundamental periods.',
    accent: 'border-sky-500/30 text-sky-300',
  },
  {
    name: 'Rotating Phasors',
    badge: 'Fourier Vectors',
    summary: 'Deconstructed harmonic vectors spinning in complex polar space, showing how partial amplitudes and phase offsets construct the timbre.',
    accent: 'border-purple-500/30 text-purple-300',
  },
  {
    name: 'Event Lanes',
    badge: 'Polyphonic Grid',
    summary: 'Individual rhythmic pulse tracks aligned across metric time, illustrating how polyrhythmic ratios assemble complex grooves.',
    accent: 'border-rose-500/30 text-rose-300',
  },
  {
    name: 'Prime Profile',
    badge: 'Harmonic DNA',
    summary: 'Energy distribution partitioned across prime number families (2, 3, 5, 7, 11, and >11), exposing the psychoacoustic signature.',
    accent: 'border-indigo-500/30 text-indigo-300',
  },
  {
    name: 'Alignment Meter',
    badge: 'Phase Coincidence',
    summary: 'Real-time phase synchronisation gauge measuring instantaneous harmonic reinforcement and periodic convergence.',
    accent: 'border-teal-500/30 text-teal-300',
  },
];

export const OverviewSection: React.FC<OverviewSectionProps> = ({ onPlayDemo }) => {
  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-stone-900/60 to-black p-6 shadow-xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Spatial Synthesis & Theory Visualiser</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-stone-100">
              Unifying Rhythm, Pitch, and Timbre Across One Single Continuum
            </h2>
            <p className="text-sm leading-relaxed text-stone-300">
              PPT Spectrum reveals acoustic sound not as isolated notes or detached rhythms, but as a continuous logarithmic spectrum.
              Sub-audible beats accelerate smoothly into tactile pitch buzzes, and harmonised overtones crystallise into rich acoustic timbre.
            </p>
          </div>

          <button
            onClick={onPlayDemo}
            className="group relative flex-shrink-0 inline-flex items-center gap-3 overflow-hidden rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 font-medium text-stone-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-950/20 text-stone-950 group-hover:bg-stone-950/30">
              <Play className="h-4 w-4 fill-current ml-0.5" />
            </div>
            <div className="text-left">
              <div className="text-xs uppercase font-bold tracking-wider text-amber-950">Interactive Experience</div>
              <div className="text-sm font-extrabold text-stone-950">Play 3:2 Hemiola Sweep Demo</div>
            </div>
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-stone-800/80 pt-4 text-xs text-stone-300">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <span><strong>Logarithmic DuPeriod:</strong> Octave-symmetric coordinates</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400 flex-shrink-0" />
            <span><strong>TPL Boundary:</strong> The 25.8 Hz perceptual transition zone</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span><strong>Flex Grid:</strong> Dynamic multi-lens customisation</span>
          </div>
        </div>
      </div>

      {/* 8 Visual Lenses Overview */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold tracking-wide text-stone-200 uppercase">
              Eight Specialised Analytical Lenses
            </h3>
          </div>
          <span className="text-xs text-stone-400">Choose any lens combination in the multi-cell flex layout</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {LENS_CARDS.map((lens) => (
            <div
              key={lens.name}
              className="flex flex-col justify-between rounded-lg border border-stone-800/80 bg-stone-950/50 p-3.5 transition-colors hover:border-stone-700 hover:bg-stone-900/60"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className={`text-[11px] font-mono font-medium px-1.5 py-0.5 rounded border ${lens.accent} bg-stone-900/80`}>
                    {lens.badge}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-stone-200">{lens.name}</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-400">{lens.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Interaction Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-stone-800/80 bg-stone-900/30 p-4">
          <div className="flex items-center gap-2 text-stone-200 font-semibold text-xs mb-2">
            <Sliders className="h-4 w-4 text-amber-400" />
            <span>Direct Frequency Scrubbing</span>
          </div>
          <p className="text-xs leading-relaxed text-stone-400">
            Click or drag across the Spectrum Ruler or Cycle Wheel to scrub DuPeriod position. In mobile mode, rotate the iPod-style rotary Click-Wheel or swipe with touch.
          </p>
        </div>

        <div className="rounded-xl border border-stone-800/80 bg-stone-900/30 p-4">
          <div className="flex items-center gap-2 text-stone-200 font-semibold text-xs mb-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span>Customise Your Viewport</span>
          </div>
          <p className="text-xs leading-relaxed text-stone-400">
            Split cells horizontally or vertically. Toggle between Solo, Duo, Trio, or 2×2 Quad configurations to monitor time-domain waveforms and polar phasors side-by-side.
          </p>
        </div>

        <div className="rounded-xl border border-stone-800/80 bg-stone-900/30 p-4">
          <div className="flex items-center gap-2 text-stone-200 font-semibold text-xs mb-2">
            <Volume2 className="h-4 w-4 text-emerald-400" />
            <span>Focus & Safety Guardrails</span>
          </div>
          <p className="text-xs leading-relaxed text-stone-400">
            Audio automatically mutes and animation pauses when switching browser tabs. The synthesiser complies strictly with WCAG 2.2 Three-Flashes photosensitivity safety.
          </p>
        </div>
      </div>
    </div>
  );
};
