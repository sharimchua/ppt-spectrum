import React from 'react';
import { TplContinuumDiagram } from './TplContinuumDiagram';
import { PolyrhythmSamDiagram } from './PolyrhythmSamDiagram';
import { OvertoneTimbreDiagram } from './OvertoneTimbreDiagram';
import { DuMetricCycleDiagram } from './DuMetricCycleDiagram';
import { PrimeFamiliesDiagram } from './PrimeFamiliesDiagram';
import { FractalCouplingDiagram } from './FractalCouplingDiagram';
import { KeyboardTuningDiagram } from './KeyboardTuningDiagram';
import { AcousticsNamesCallout } from './AcousticsNamesCallout';
import { BookOpen, Sparkles, Disc, Music, Repeat, Keyboard } from 'lucide-react';
import {
  TutorialDemoId,
  TutorialSectionId,
  CustomTutorialDemoOverride,
  ContextualDemoAction,
} from './tutorial-demos';

interface ConceptsSectionProps {
  onPlayDemo?: (
    demoId: TutorialDemoId,
    fromSection?: TutorialSectionId,
    customOverride?: CustomTutorialDemoOverride
  ) => void;
  onRegisterContextualDemo?: (action: ContextualDemoAction) => void;
}

export const ConceptsSection: React.FC<ConceptsSectionProps> = ({
  onPlayDemo,
  onRegisterContextualDemo,
}) => {
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
          <span>Seven Thought Experiments: Music as Amplitude Organised Across Time</span>
        </div>
        <p>
          Music lessons usually teach rhythm, harmony and instrument tone as separate subjects with separate vocabularies. Prime
          Period Theory (PPT) starts from a simpler idea: <strong>sound is air moving back and forth</strong>, and{' '}
          <strong>amplitude</strong> is how big each push is. Try these seven experiments with your own ears and eyes.
        </p>
        <p className="mt-2">
          PPT is a lens, not a law. It describes patterns that other traditions (just intonation, spectral music, raga and tala,
          functional harmony) also describe, in their own words.
        </p>
      </div>

      {/* Thought Experiment 1: Polyrhythm IS Harmony & The Missing Root (The Sam) */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400 shrink-0">
              1
            </span>
            <div>
              <h3 className="text-sm font-bold text-stone-100">Polyrhythm Is Harmony</h3>
              <p className="text-[11px] text-stone-400">
                Speed a 3-against-2 beat up and it becomes a Perfect Fifth, with a bass note nobody played
              </p>
            </div>
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
        <p className="text-xs text-stone-300 leading-relaxed">
          Acousticians call that invented bass note the <strong>missing fundamental</strong> (or virtual pitch). In PPT&apos;s lens,
          the same idea explains why some intervals sound smooth and others tense:{' '}
          <strong>the simpler the ratio, the sooner the cycles line up again.</strong> A 3:2 fifth lines up after just 3 cycles of
          one and 2 of the other. A 16:15 semitone needs 16 and 15. At pitch speeds, a quick realignment is what we hear as
          consonance, and a slow one as tension.
        </p>

        <PolyrhythmSamDiagram
          onPlayDemo={handleTriggerDemo}
          onRegisterContextualDemo={onRegisterContextualDemo}
        />
      </div>

      {/* Thought Experiment 2: Every Instrument Sound is a Hidden Chord (and a Hidden Groove) */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-400 shrink-0">
              2
            </span>
            <div>
              <h3 className="text-sm font-bold text-stone-100">
                Every Instrument Tone Hides a Chord and a Groove
              </h3>
              <p className="text-[11px] text-stone-400">
                Why a flute, a clarinet, a violin and a bell sound different on the same note
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
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

        <AcousticsNamesCallout />

        <OvertoneTimbreDiagram
          onPlayDemo={handleTriggerDemo}
          onRegisterContextualDemo={onRegisterContextualDemo}
        />
      </div>

      {/* Thought Experiment 3: Why 25.8 Hz & DuPeriods? (Kelvin vs Celsius) */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400 shrink-0">
              3
            </span>
            <div>
              <h3 className="text-sm font-bold text-stone-100">Giving Musical Speed a Zero Point</h3>
              <p className="text-[11px] text-stone-400">
                The &ldquo;Kelvin versus Celsius&rdquo; idea for musical time
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          Have you ever wondered why we measure tempo in <em>Beats Per Minute</em> and pitch in <em>Hertz (cycles per second)</em>?
          The &ldquo;second&rdquo; began life as 1/86,400th of the time the Earth takes to spin once. That&apos;s handy for clocks,
          but your inner ear doesn&apos;t care how fast the Earth rotates. Concert pitch is the same kind of agreement:{' '}
          <strong>A = 440 Hz</strong> today, nearer A415 for many Baroque ensembles. It&apos;s a convention people settled on, not
          a law of nature.
        </p>
        <p className="text-xs text-stone-400 leading-relaxed">
          We still show A440 and BPM as familiar landmarks. They are optional overlays, not the foundation.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-stone-300 bg-stone-950/50 p-3.5 rounded-lg border border-stone-800/80">
          <div>
            <strong className="text-amber-300">Human Hearing as &ldquo;Zero&rdquo; (The Temporal-Place Limen):</strong>
            <p className="text-stone-400 mt-1 leading-relaxed">
              Just as physicists use <strong>Kelvin</strong> (anchored at Absolute Zero) instead of Fahrenheit, PPT puts zero
              (<span className="font-mono text-amber-300">d = 0</span>) at the ear&apos;s own biological crossover: roughly{' '}
              <strong>25.8 Hz (38.8 ms per cycle)</strong>, the middle of the crossover zone where separate rhythmic clicks blend
              into continuous pitch.
            </p>
          </div>
          <div>
            <strong className="text-cyan-300">Counting in Doublings (DuPeriods):</strong>
            <p className="text-stone-400 mt-1 leading-relaxed">
              Instead of adding raw Hertz, our ears hear in <strong>doublings</strong> (octaves in pitch, halving/doubling in tempo).
              Each step of <span className="font-mono text-cyan-300">d</span> is one doubling: positive <span className="font-mono">+d</span> slows
              down into rhythm; negative <span className="font-mono">−d</span> speeds up into pitch. Four doublings above 25.8 Hz (
              <span className="font-mono text-amber-300">d = −4</span>, written{' '}
              <span className="font-mono text-amber-300">Do-4</span> in PPT&apos;s octave naming) lands at 412.8 Hz, right beside
              the Baroque pitch of A415.
            </p>
          </div>
        </div>

        <TplContinuumDiagram />
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
                One 12-Position Clock for Notes and Beats
              </h3>
              <p className="text-[11px] text-stone-400">
                How Solfège syllables name both intervals and rhythmic positions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Disc className="h-4 w-4 text-purple-400 hidden sm:block" />
          </div>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          An octave in pitch is a 2:1 step, and a bar of music is one full cycle of the beat. PPT divides both into the same 12
          positions and names them with familiar Solfège syllables (
          <strong>Do, Ra, Re, Me, Mi, Fa, Fi, So, Le, La, Te, Ti</strong>) and consistent colours. Top-dead-centre (12 o&apos;clock)
          is always <strong>Do</strong>: the root of a scale, or Beat 1 of a bar. Bottom-dead-centre (6 o&apos;clock) is{' '}
          <strong>Fi</strong>. In pitch, Fi sits at √2 in equal temperament, the exact halfway point and the dramatic{' '}
          <em>tritone</em>. In rhythm, 6 o&apos;clock is the halfway point of the bar: the strongest offbeat. Different tuning
          systems place Fi slightly differently; try them in the Tuning Studio.
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
                Why Primes Are the Primary Colours of Music
              </h3>
              <p className="text-[11px] text-stone-400">
                How 2, 3, 5, 7 and 11 give intervals and rhythms their feel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Music className="h-4 w-4 text-rose-400 hidden sm:block" />
          </div>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          Think of prime numbers (2, 3, 5, 7, 11) like primary colours in painting. If you only divide or multiply by <strong>2</strong>,
          you only ever get octaves and straight half/quarter notes. The moment you mix in <strong>3</strong>, you unlock triplet swing and
          the Perfect Fifth. Mixing in <strong>5</strong> brings the sweet warmth of Major and Minor Thirds; <strong>7</strong> brings natural
          bluesy tension; <strong>11</strong> creates neutral, halfway intervals. PPT stops at 11 because beyond that, listeners
          can&apos;t reliably tell a deliberate interval from an out-of-tune one. Bells and singing bowls sit outside this grid
          altogether: their partials aren&apos;t simple ratios of the fundamental, so they never lock together, and we hear a shimmer
          instead of a clean chord. Real instruments also contain partials past the 11-limit; PPT describes the intervals you can
          deliberately play and hear, not every detail of a timbre.
        </p>

        <PrimeFamiliesDiagram
          onPlayDemo={handleTriggerDemo}
          onRegisterContextualDemo={onRegisterContextualDemo}
        />
      </div>

      {/* Thought Experiment 6: The Fractal Mirror — Pitch Carrier & Rhythm Container */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400 shrink-0">
              6
            </span>
            <div>
              <h3 className="text-sm font-bold text-stone-100">
                The Fractal Mirror: Carrier and Container
              </h3>
              <p className="text-[11px] text-stone-400">
                How <span className="font-mono text-amber-300">Pitch Carrier</span> (Rhythm Space) and{' '}
                <span className="font-mono text-cyan-300">Rhythm Container</span> (Pitch Space) reflect shapes across 25.8 Hz
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Repeat className="h-4 w-4 text-emerald-400 hidden sm:block" />
          </div>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          Here is a fascinating puzzle about the speed continuum: you can never hear a pure rhythm in silence (each beat needs a{' '}
          <strong>carrier sound</strong> to ring out), and you can never hear a musical note outside of time (every pitch lives inside a{' '}
          <strong>rhythmic container</strong>). What happens when a shape provides <em>both</em>?
        </p>
        <p className="text-xs text-stone-300 leading-relaxed">
          When you set the <strong>Carrier</strong> or <strong>Container</strong> to <strong>Self</strong> (the default for chords and
          polyrhythms), the shape acts like a <strong>fractal mirror</strong> across the 25.8 Hz horizon: in Rhythm Space, each beat
          strikes the shape&apos;s own chord transposed to that beat&apos;s ratio; in Pitch Space, each chord note pulses at its own
          harmonic ratio! For complex instrument tones (like a Piano or Church Bell), <strong>Auto</strong> mode smartly switches the
          Pitch Container to <strong>Static</strong> so all overtones stay fused as one realistic instrument.
        </p>

        <FractalCouplingDiagram
          onPlayDemo={handleTriggerDemo}
          onRegisterContextualDemo={onRegisterContextualDemo}
        />
      </div>

      {/* Thought Experiment 7: Playing Tempo Melodies & Polyrhythms on the Solfège Keyboard */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-300 shrink-0">
              7
            </span>
            <div>
              <h3 className="text-sm font-bold text-stone-100">
                Tempo Melodies, and Why Tuning Matters in Rhythm
              </h3>
              <p className="text-[11px] text-stone-400">
                How the Solfège Keyboard (<span className="font-mono text-cyan-300">K</span>), Hold (<span className="font-mono text-amber-300">H</span>) and Tuning (<span className="font-mono text-purple-300">Shift+T</span>) turn tempo steps into cadences
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Keyboard className="h-4 w-4 text-cyan-400 hidden sm:block" />
          </div>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          We usually think of a piano keyboard as a tool for playing high and low notes. But what happens when you open the{' '}
          <strong>Solfège Keyboard (K)</strong> below 25.8 Hz in Rhythm Space? Playing <strong>one key at a time</strong> steps your
          tempo by exact musical ratios—creating <strong>melodic rhythm and tempo cadences</strong> (like stepping from{' '}
          <span className="font-mono text-emerald-300">So</span> at 145 BPM down to{' '}
          <span className="font-mono text-red-400">Do</span> at 96.75 BPM for a 3:2 Perfect Cadence in tempo).
        </p>
        <p className="text-xs text-stone-300 leading-relaxed">
          Even more remarkably, if you turn on <strong>Hold (H)</strong> and press <strong>two or more keys at once</strong>—even on a
          plain <strong>Pure Sine</strong> (which is just a single 1× click per bar)—each key launches its own rhythmic stream at that
          key&apos;s tempo! And this reveals why <strong>Tuning Systems (Shift+T)</strong> matter in rhythm: on a standard{' '}
          <strong>12-TET</strong> piano, a Major Third (<span className="font-mono">Do + Mi</span>) is slightly sharp (1.2599×), so the
          two drummers slowly drift out of phase. Switch to <strong>5-Limit Just (Qui)</strong> and{' '}
          <span className="font-mono">Mi</span> snaps to an exact <strong>5:4</strong> ratio, locking both rhythms onto The Sam every 4
          bars! Hit <strong>Tab</strong> at any time to flip your held rhythm into Pitch Space and hear the exact same keys as a chord.
        </p>
        <p className="text-xs text-stone-300 leading-relaxed">
          In pitch space the same drift is heard as <strong>beating</strong>. Switch to a bright tone such as <strong>Sawtooth</strong>{' '}
          and try the same Tab flip: on a 12-TET major third, the 5th partial of Do and the 4th partial of Mi sit about 10 Hz apart
          at middle C, so the sound shimmers. In 5-Limit Just tuning those two partials coincide, and the shimmer disappears.
        </p>

        <KeyboardTuningDiagram
          onPlayDemo={handleTriggerDemo}
          onRegisterContextualDemo={onRegisterContextualDemo}
        />
      </div>
    </div>
  );
};
