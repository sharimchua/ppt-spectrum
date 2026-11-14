import React from 'react';
import { TplContinuumDiagram } from './TplContinuumDiagram';
import { PolyrhythmSamDiagram } from './PolyrhythmSamDiagram';
import { OvertoneTimbreDiagram } from './OvertoneTimbreDiagram';
import { DuMetricCycleDiagram } from './DuMetricCycleDiagram';
import { PrimeFamiliesDiagram } from './PrimeFamiliesDiagram';
import { BookOpen, Sparkles, Disc, Music } from 'lucide-react';
import {
  TutorialDemoId,
  TutorialSectionId,
  CustomTutorialDemoOverride,
} from './tutorial-demos';

interface ConceptsSectionProps {
  onPlayDemo?: (
    demoId: TutorialDemoId,
    fromSection?: TutorialSectionId,
    customOverride?: CustomTutorialDemoOverride
  ) => void;
}

export const ConceptsSection: React.FC<ConceptsSectionProps> = ({ onPlayDemo }) => {
  const handleTriggerDemo = (
    demoId: TutorialDemoId,
    customOverride?: CustomTutorialDemoOverride
  ) => {
    if (onPlayDemo) {
      onPlayDemo(demoId, 'concepts', customOverride);
    }
  };

  return (
    <div className="space-y-8">
      {/* Friendly Introduction Banner */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-4 text-xs leading-relaxed text-stone-300">
        <div className="flex items-center gap-2 font-semibold text-amber-300 mb-1">
          <BookOpen className="h-4 w-4" />
          <span>Five Thought Experiments: Music as Amplitude Organised Across Time</span>
        </div>
        <p>
          Traditional music lessons teach rhythm, harmony, and instrument tone as completely separate subjects with separate
          vocabularies. Prime Period Theory (PPT) starts from a simpler truth: <strong>sound is air moving back and forth</strong>,
          and <strong>amplitude</strong> is how big each push is. Test these five thought experiments right here with your own
          ears and eyes.
        </p>
      </div>

      {/* Thought Experiment 1: Why 25.8 Hz & DuPeriods? (Kelvin vs Celsius) */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400 shrink-0">
              1
            </span>
            <div>
              <h3 className="text-sm font-bold text-stone-100">
                Why Measure Speed from 25.8 Hz Instead of Seconds, BPM, or A440?
              </h3>
              <p className="text-[11px] text-stone-400">
                The &ldquo;Kelvin vs Celsius&rdquo; thought experiment for musical time
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="rounded-md border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 font-mono text-[10px] text-amber-300">
              UI Badge: TPL ≈ 25.8 Hz
            </span>
            <span className="rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
              UI Badge: d (DuPeriod)
            </span>
          </div>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          Have you ever wondered why we measure tempo in <em>Beats Per Minute</em> and pitch in <em>Hertz (cycles per second)</em>?
          The &ldquo;second&rdquo; is just 1/86,400th of the time it takes planet Earth to spin once! Astronomy is handy for clocks,
          but your inner ear doesn&apos;t care how fast the Earth rotates. Similarly, concert pitch <strong>A = 440 Hz</strong> (or A432)
          is just a 20th-century committee compromise.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-stone-300 bg-stone-950/50 p-3.5 rounded-lg border border-stone-800/80">
          <div>
            <strong className="text-amber-300">Human Biology as &ldquo;Zero&rdquo; (The Auditory Horizon):</strong>
            <p className="text-stone-400 mt-1 leading-relaxed">
              Just as physicists use <strong>Kelvin</strong> (anchored at Absolute Zero) instead of Fahrenheit, PPT puts zero
              (<span className="font-mono text-amber-300">d = 0</span>) at the ear&apos;s own biological crossover: roughly{' '}
              <strong>25.8 Hz (38.8 ms per cycle)</strong>, where separate rhythmic clicks fuse into continuous pitch.
            </p>
          </div>
          <div>
            <strong className="text-cyan-300">Counting in Doublings (DuPeriods):</strong>
            <p className="text-stone-400 mt-1 leading-relaxed">
              Instead of adding raw Hertz, our ears hear in <strong>doublings</strong> (octaves in pitch, halving/doubling in tempo).
              Each step of <span className="font-mono text-cyan-300">d</span> is one doubling: positive <span className="font-mono">+d</span> slows
              down into rhythm; negative <span className="font-mono">−d</span> speeds up into pitch. Notice that 4 doublings above 25.8 Hz
              (<span className="font-mono text-amber-300">Do−5 = 412.8 Hz</span>) lands right beside historical Baroque pitch (A415)!
            </p>
          </div>
        </div>

        <TplContinuumDiagram />
      </div>

      {/* Thought Experiment 2: Polyrhythm IS Harmony & The Missing Root (The Sam) */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400 shrink-0">
              2
            </span>
            <div>
              <h3 className="text-sm font-bold text-stone-100">
                Polyrhythm IS Harmony — And Why Your Brain Invents a Missing Bass Note
              </h3>
              <p className="text-[11px] text-stone-400">
                How a 3-against-2 drum beat becomes a Perfect Fifth, and how &ldquo;Beat 1&rdquo; creates the Ghost Root
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
              UI Badge: Ghost Root / The Sam
            </span>
          </div>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          Picture a drummer tapping <strong>3 even beats</strong> with the right hand against <strong>2 even beats</strong> with the left
          (a 3:2 polyrhythm). At 120 BPM you hear a groovy cross-rhythm that locks back together on <strong>Beat 1</strong> of every bar.
          In Indian classical music, that magnetic shared downbeat where all cycles meet is called <strong>The Sam</strong>.
        </p>
        <p className="text-xs text-stone-300 leading-relaxed">
          Now speed that exact 3:2 drum pattern up 100 times. Your ear can no longer count 3 against 2—instead, you hear the rich musical
          interval of a <strong>Perfect Fifth (3:2)</strong>! Better still: even if nobody plays the main <strong>1×</strong> bar pulse,
          your brain automatically feels where the 3× and 2× cycles meet. That is why a tiny phone speaker can make you &ldquo;hear&rdquo; a
          deep bass guitar note it is physically too small to produce!
        </p>

        <PolyrhythmSamDiagram onPlayDemo={handleTriggerDemo} />
      </div>

      {/* Thought Experiment 3: Every Instrument Sound is a Hidden Chord (and a Hidden Groove) */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-400 shrink-0">
              3
            </span>
            <div>
              <h3 className="text-sm font-bold text-stone-100">
                Every Instrument Tone is a Hidden Chord (and a Hidden Drum Groove)
              </h3>
              <p className="text-[11px] text-stone-400">
                Why a flute, a clarinet, a violin, and a church bell sound so different on the exact same note
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="rounded-md border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 font-mono text-[10px] text-sky-300">
              UI Badge: Partials (1×, 2×, 3×…)
            </span>
            <Sparkles className="h-4 w-4 text-sky-400 hidden sm:block" />
          </div>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          When you pluck a guitar string or blow a saxophone, it doesn&apos;t just vibrate at one speed. It vibrates at its main speed
          (<strong>1×</strong>), plus twice as fast (<strong>2×</strong>), three times as fast (<strong>3×</strong>), four times as fast
          (<strong>4×</strong>), and so on—all at once! Each of these layers (called a <strong>partial</strong>) has its own{' '}
          <strong>amplitude</strong> (how loud that layer is from 0 to 1). At high speeds, your ear reads those relative amplitudes as{' '}
          <strong>tone colour (timbre)</strong>—why a violin sounds bright and a clarinet sounds woody. Slow that exact same recipe down
          below 25.8 Hz, and each partial&apos;s amplitude becomes the <strong>accent weight</strong> of a drum subdivision!
        </p>

        <OvertoneTimbreDiagram onPlayDemo={handleTriggerDemo} />
      </div>

      {/* Thought Experiment 4: One Clock for Both Notes and Beats */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400 shrink-0">
              4
            </span>
            <div>
              <h3 className="text-sm font-bold text-stone-100">
                One 12-Hour Clock for Both Notes and Beats
              </h3>
              <p className="text-[11px] text-stone-400">
                How Solfège syllables (Do, Re, Mi…) map both musical intervals and rhythmic subdivisions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="rounded-md border border-purple-500/30 bg-purple-950/40 px-2 py-0.5 font-mono text-[10px] text-purple-300">
              UI Badge: Uniform Solfège
            </span>
            <Disc className="h-4 w-4 text-purple-400 hidden sm:block" />
          </div>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          Because an octave in pitch and a bar in rhythm are both a 2:1 doubling, PPT wraps both around the same 12-position clock using
          familiar Solfège names (<strong>Do, Ra, Re, Me, Mi, Fa, Fi, So, Le, La, Te, Ti</strong>) and consistent colours. Top-dead-centre
          (12 o&apos;clock) is always <strong>Do</strong>—the root note of a scale or Beat 1 of a bar. Bottom-dead-centre (6 o&apos;clock) is{' '}
          <strong>Fi (√2)</strong>—the exact geometric halfway point, creating the dramatic <em>tritone</em> in harmony and maximum offbeat
          syncopation in rhythm.
        </p>

        <DuMetricCycleDiagram />
      </div>

      {/* Thought Experiment 5: The Five Prime Families */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/20 text-xs font-bold text-rose-400 shrink-0">
              5
            </span>
            <div>
              <h3 className="text-sm font-bold text-stone-100">
                Why Prime Numbers Are the &ldquo;Primary Colours&rdquo; of Music
              </h3>
              <p className="text-[11px] text-stone-400">
                How 2, 3, 5, 7, and 11 give intervals and rhythms their unmistakable emotional feel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="rounded-md border border-rose-500/30 bg-rose-950/40 px-2 py-0.5 font-mono text-[10px] text-rose-300">
              UI Badge: Prime Profile (11-Limit)
            </span>
            <Music className="h-4 w-4 text-rose-400 hidden sm:block" />
          </div>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          Think of prime numbers (2, 3, 5, 7, 11) like primary colours in painting. If you only divide or multiply by <strong>2</strong>,
          you only ever get octaves and straight half/quarter notes. The moment you mix in <strong>3</strong>, you unlock triplet swing and
          the Perfect Fifth. Mixing in <strong>5</strong> brings the sweet warmth of Major and Minor Thirds; <strong>7</strong> brings natural
          bluesy tension; <strong>11</strong> creates neutral, halfway intervals; and ratios beyond 11 create the shimmering, un-gridded ring
          of bells and singing bowls.
        </p>

        <PrimeFamiliesDiagram />
      </div>
    </div>
  );
};
