import React from 'react';
import { Play, Sparkles, Layers, Sliders, Volume2, Compass, Activity, AudioWaveform, Users, GraduationCap, Music2, Ear } from 'lucide-react';
import {
  TutorialDemoId,
  TutorialSectionId,
  CustomTutorialDemoOverride,
} from './tutorial-demos';
import { LensPreviewGrid } from './LensPreviewGrid';
import { WhatIsAShapeCard } from './WhatIsAShapeCard';

interface OverviewSectionProps {
  onPlayDemo: (
    demoId?: TutorialDemoId,
    fromSection?: TutorialSectionId,
    customOverride?: CustomTutorialDemoOverride
  ) => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({ onPlayDemo }) => {
  return (
    <div className="space-y-6">
      {/* Hero Card: Everyday Language + Amplitude Across Time + Bicycle Wheel Thought Experiment */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-stone-900/60 to-black p-5 sm:p-6 shadow-xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-3 max-w-3xl">
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
                <strong>pitch and timbre</strong>. Your ears treat these as different things. PPT&apos;s idea is that the pattern
                underneath is the same.
              </p>
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
                  10-Second Listening Demo
                </div>
                <div className="text-sm font-extrabold text-stone-950">Hear 3:2 Beat Become a 5th</div>
              </div>
            </button>
          </div>

          {/* Plain-English Amplitude Callout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                separate clicks: a beat you can tap your foot to. Spin it faster and the clicks start to blur together. Around{' '}
                <strong>26 clicks per second (25.8 Hz)</strong> most of us stop hearing separate clicks and hear a low musical
                hum instead. It&apos;s a gradual crossover, not a switch.
              </p>
            </div>
          </div>
        </div>

        {/* Who is PPT Spectrum for? */}
        <div className="mt-5 border-t border-stone-800/80 pt-5 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-400 shrink-0" />
              <h3 className="text-sm font-bold text-stone-100">Who is PPT Spectrum for?</h3>
            </div>
            <p className="text-xs leading-relaxed text-stone-300">
              Anyone who can hear a beat and a note. No theory or maths is needed to start; the ideas build on what your ears
              already do.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                <span>Teachers and students</span>
              </div>
              <p className="text-[11px] leading-relaxed text-stone-300">
                Explore why music works instead of memorising rules. Each question below comes down to how cycles and layers of
                sound line up—and here you can change them and hear the result:
              </p>
              <ul className="space-y-1 text-[11px] leading-relaxed text-stone-400 list-disc list-inside">
                <li>Why does a clarinet sound hollow next to a violin on the same note?</li>
                <li>Why do triplets and straight eighths feel so different when they divide the same beat?</li>
                <li>Why do some intervals sound smooth while others beat?</li>
              </ul>
            </div>

            <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                <Music2 className="h-3.5 w-3.5 shrink-0" />
                <span>Musicians and producers</span>
              </div>
              <p className="text-[11px] leading-relaxed text-stone-300">
                Find new rhythms and timbres from a single idea. Because rhythm, pitch, and timbre are the same pattern at
                different speeds, you can use one <strong>Shape</strong> across both worlds:
              </p>
              <ul className="space-y-1 text-[11px] leading-relaxed text-stone-400 list-disc list-inside">
                <li>
                  <strong className="text-stone-200">Sample a rhythm:</strong> clap or tap a repeating pattern, then speed it up
                  into a new chord or tone colour.
                </li>
                <li>
                  <strong className="text-stone-200">Sample a sound:</strong> sing or pluck a note, then slow it down to hear its
                  overtones as a rhythm you can reshape.
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <Ear className="h-3.5 w-3.5 shrink-0" />
                <span>The curious</span>
              </div>
              <p className="text-[11px] leading-relaxed text-stone-300">
                Start from sound itself—no instruments, notation, or theory required. Listen directly to how rhythm, pitch, and
                tone colour connect:
              </p>
              <ul className="space-y-1 text-[11px] leading-relaxed text-stone-400 list-disc list-inside">
                <li>
                  <strong className="text-stone-200">Hear the crossover:</strong> slide a steady beat faster until the clicks
                  blend into a note, or slow a tone down to hear the rhythm inside it.
                </li>
                <li>
                  <strong className="text-stone-200">See what your ears hear:</strong> watch spinning cycles and waves line up so
                  you can see <em>why</em> sounds feel steady, restless, or bright.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Terminology Primer Strip */}
        <div className="mt-5 space-y-3 border-t border-stone-800/80 pt-4 text-xs text-stone-300">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start gap-2">
              <Activity className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 mr-1.5">
                  TPL ≈ 25.8 Hz
                </span>
                <span className="text-stone-400">The <strong>Temporal-Place Limen</strong>: the crossover zone where beats blend into pitch.</span>
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

          <p className="text-xs leading-relaxed text-stone-300">
            Put together, you pick or sample a <strong>Shape</strong> and slide it along <strong>DuPeriod (d)</strong>—crossing
            the <strong>25.8 Hz TPL</strong> to hear that same pattern as a slow beat on one side or a musical tone on the other.
          </p>
        </div>
      </div>

      {/* What is a Shape? */}
      <WhatIsAShapeCard onPlayDemo={onPlayDemo} />

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
