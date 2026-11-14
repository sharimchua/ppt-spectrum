import React from 'react';
import { Play, Sparkles, Layers, Sliders, Volume2, Compass, Activity, AudioWaveform } from 'lucide-react';
import {
  TutorialDemoId,
  TutorialSectionId,
  CustomTutorialDemoOverride,
  FEATURED_TOUR_DEMOS,
} from './tutorial-demos';
import { LensPreviewGrid } from './LensPreviewGrid';

interface OverviewSectionProps {
  onPlayDemo: (
    demoId?: TutorialDemoId,
    fromSection?: TutorialSectionId,
    customOverride?: CustomTutorialDemoOverride
  ) => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({ onPlayDemo }) => {
  const featuredDemos = FEATURED_TOUR_DEMOS.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Hero Card: Everyday Language + Amplitude Across Time + Bicycle Wheel Thought Experiment */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-stone-900/60 to-black p-5 sm:p-6 shadow-xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Welcome to PPT Spectrum — An Interactive Musical Microscope</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-stone-100">
              What if Rhythm, Harmony, and Timbre are all the exact same thing—just moving at different speeds?
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed text-stone-300">
              At its heart, all of music is simply <strong>changes in amplitude (energy or loudness) over time</strong>. When a
              drummer strikes a drum every half-second, we feel each spike of amplitude as <strong>rhythm</strong>. When a guitar
              string pushes the air back and forth hundreds of times a second, those rapid waves of amplitude fuse into{' '}
              <strong>pitch and timbre</strong>.
            </p>

            {/* Plain-English Amplitude Callout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
              <div className="rounded-lg border border-cyan-500/25 bg-stone-950/65 p-3 text-xs text-stone-300">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300 mb-1">
                  <AudioWaveform className="h-3.5 w-3.5 shrink-0" />
                  <span>What is Amplitude? (One Principle, Every Scale)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-stone-300">
                  <strong>Amplitude</strong> is simply how hard the air—or a drumstick—pushes at any moment:
                </p>
                <ul className="mt-1 space-y-0.5 text-[11px] text-stone-400 list-disc list-inside">
                  <li>
                    <strong className="text-stone-200">How fast</strong> it repeats = <strong>Tempo</strong> or <strong>Pitch</strong>
                  </li>
                  <li>
                    <strong className="text-stone-200">How strong</strong> each layer is = <strong>Accent</strong> or <strong>Timbre</strong>
                  </li>
                  <li>
                    <strong className="text-stone-200">How it swells &amp; fades</strong> = <strong>Envelope</strong> &amp; <strong>Phrasing</strong>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-amber-500/25 bg-stone-950/65 p-3 text-xs text-stone-300">
                <strong className="text-amber-300 block mb-1">The Bicycle-Spoke Thought Experiment:</strong>
                <p className="text-[11px] leading-relaxed text-stone-300">
                  Imagine pegging a playing card against the spokes of a spinning bicycle wheel. Turn it slowly and you hear
                  separate clicks—a beat you can tap your foot to. Spin it faster past about{' '}
                  <strong>26 clicks per second (25.8 Hz)</strong> and your ear can no longer separate the clicks. Suddenly, the
                  rhythm melts into a low musical hum!
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => onPlayDemo('hemiola-sweep', 'overview')}
            className="group relative flex-shrink-0 inline-flex items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3.5 font-medium text-stone-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-950/20 text-stone-950 group-hover:bg-stone-950/30">
              <Play className="h-4 w-4 fill-current ml-0.5" />
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-950">
                10-Second Audio Proof
              </div>
              <div className="text-sm font-extrabold text-stone-950">Hear 3:2 Beat Become a 5th</div>
            </div>
          </button>
        </div>

        {/* UI Reference Badges Strip */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-stone-800/80 pt-4 text-xs text-stone-300">
          <div className="flex items-start gap-2">
            <Activity className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 mr-1.5">
                TPL ≈ 25.8 Hz
              </span>
              <span className="text-stone-400">The <strong>Auditory Horizon</strong> where beats fuse into pitch.</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Compass className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 mr-1.5">
                d (DuPeriod)
              </span>
              <span className="text-stone-400">Counts octave doublings slower (<strong>+d</strong>) or faster (<strong>−d</strong>) than 25.8 Hz.</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Layers className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mr-1.5">
                Shape
              </span>
              <span className="text-stone-400">One pattern of ratios &amp; amplitudes that plays as a groove on the left and a tone on the right.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Guided Live Demos Strip */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-stone-100">
              Try a Guided Live Demo (With One-Click Return Banner)
            </h3>
          </div>
          <span className="text-[11px] text-stone-400">
            Launching any demo keeps a floating <strong>&ldquo;Back to Guide&rdquo;</strong> bar at the bottom of your screen.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {featuredDemos.map((demo) => (
            <button
              key={demo.id}
              onClick={() => onPlayDemo(demo.id, 'overview')}
              className="group text-left flex flex-col justify-between rounded-xl border border-stone-800 bg-stone-950/60 p-3.5 transition-all hover:border-amber-500/50 hover:bg-stone-900/80 cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    {demo.badge}
                  </span>
                  <Play className="h-3.5 w-3.5 text-stone-500 group-hover:text-amber-400 fill-current transition-colors" />
                </div>
                <h4 className="text-xs font-bold text-stone-100 group-hover:text-amber-300 transition-colors">
                  {demo.title}
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-400">{demo.summary}</p>
              </div>
              <div className="mt-3 text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                <span>Listen in Studio</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 8 Visual Lenses Interactive Flip Grid */}
      <LensPreviewGrid />

      {/* Quick First-Step Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-stone-800/80 bg-stone-900/30 p-4">
          <div className="flex items-center gap-2 text-stone-200 font-semibold text-xs mb-1.5">
            <Sliders className="h-4 w-4 text-amber-400" />
            <span>Slide Across the Spectrum</span>
          </div>
          <p className="text-xs leading-relaxed text-stone-400">
            Drag along the <strong>Spectrum Ruler</strong> or use the top timeline slider to glide any pattern from slow
            drum beats into high musical notes. On mobile, touch anywhere on the main screen to summon the rotary scrub wheel.
          </p>
        </div>

        <div className="rounded-xl border border-stone-800/80 bg-stone-900/30 p-4">
          <div className="flex items-center gap-2 text-stone-200 font-semibold text-xs mb-1.5">
            <Layers className="h-4 w-4 text-cyan-400" />
            <span>Split &amp; Customise Cells</span>
          </div>
          <p className="text-xs leading-relaxed text-stone-400">
            Switch between <strong>Solo</strong>, <strong>Duo</strong>, <strong>Teaching Trio</strong>, or <strong>Quad</strong>{' '}
            layouts—or click <strong>Edit Layout</strong> to split cells and watch rhythms and waveforms side by side.
          </p>
        </div>

        <div className="rounded-xl border border-stone-800/80 bg-stone-900/30 p-4">
          <div className="flex items-center gap-2 text-stone-200 font-semibold text-xs mb-1.5">
            <Volume2 className="h-4 w-4 text-emerald-400" />
            <span>Safe for Ears &amp; Eyes</span>
          </div>
          <p className="text-xs leading-relaxed text-stone-400">
            Audio automatically mutes when you switch browser tabs, and fast visual pulses smoothly blend into steady glow
            above 3 Hz to meet strict WCAG 2.2 flash-safety standards.
          </p>
        </div>
      </div>
    </div>
  );
};
