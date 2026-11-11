import React from 'react';
import { TplContinuumDiagram } from './TplContinuumDiagram';
import { OvertoneTimbreDiagram } from './OvertoneTimbreDiagram';
import { DuMetricCycleDiagram } from './DuMetricCycleDiagram';
import { PrimeFamiliesDiagram } from './PrimeFamiliesDiagram';
import { BookOpen, Sparkles, Disc, Filter, Music, ArrowRight } from 'lucide-react';

export const ConceptsSection: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Introduction Banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-xs leading-relaxed text-stone-300">
        <div className="flex items-center gap-2 font-semibold text-amber-300 mb-1">
          <BookOpen className="h-4 w-4" />
          <span>Interactive Theoretical Foundations of Prime Period Theory (PPT)</span>
        </div>
        <p>
          Prime Period Theory demonstrates that rhythm, pitch, and timbre are not fundamentally separate phenomena. They are different
          regions of a single perceptual continuum governed by harmonic integer proportions and prime factorisation. Explore each concept below.
        </p>
      </div>

      {/* Concept 1: Physical Hz vs Log DuPeriod & TPL */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400 shrink-0">1</span>
            <h3 className="text-sm font-bold text-stone-100">Physical Hertz vs Logarithmic DuPeriod &amp; The TPL Boundary</h3>
          </div>
          <div className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-1 font-mono text-xs text-amber-300 shadow-sm whitespace-nowrap shrink-0">
            <span className="italic font-serif font-bold text-sm">d</span>
            <span className="text-stone-400">=</span>
            <span className="font-bold">log₂</span>
            <span className="text-stone-400">(</span>
            <span className="italic font-serif">f</span><sub className="text-[9px] -bottom-0.5 font-sans font-bold text-amber-300/90">TPL</sub>
            <span className="text-stone-400 mx-0.5">/</span>
            <span className="italic font-serif">f</span>
            <span className="text-stone-400">)</span>
          </div>
        </div>

        <p className="text-xs text-stone-400 leading-relaxed">
          Standard frequency is measured in linear Hertz (cycles per second), but human hearing perceives frequency logarithmically in octaves.
          PPT maps the entire acoustic spectrum into DuPeriod coordinates (<span className="font-mono text-amber-300 font-semibold">d</span>), where zero marks the Temporal-Place Limen (<span className="whitespace-nowrap font-mono text-cyan-300">f<sub>TPL</sub> ≈ 25.8 Hz</span>).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-stone-300 bg-stone-950/40 p-3 rounded-lg border border-stone-800/80">
          <div>
            <strong className="text-amber-300">Positive DuPeriod (d &gt; 0) — Rhythm Space:</strong>
            <p className="text-stone-400 mt-0.5">
              Events occur slower than 25 Hz and are processed in the brain&apos;s temporal cortex as discrete pulses, beats, polyrhythms, and grooves.
            </p>
          </div>
          <div>
            <strong className="text-cyan-300">Negative DuPeriod (d &lt; 0) — Pitch Space:</strong>
            <p className="text-stone-400 mt-0.5">
              Repetitions exceed 25 Hz and stimulate the ear&apos;s basilar membrane as continuous tone, musical intervals, and acoustic pitch.
            </p>
          </div>
        </div>

        {/* Embedded Interactive Diagram 1 */}
        <TplContinuumDiagram />
      </div>

      {/* Concept 2: One Primitive: Polyrhythm to Harmony */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">2</span>
          <h3 className="text-sm font-bold text-stone-100">One Single Primitive: How Polyrhythm Becomes Harmony</h3>
        </div>
        <p className="text-xs text-stone-300 leading-relaxed">
          Imagine a drummer tapping 3 beats against 2 beats (a 3:2 hemiola polyrhythm). At 120 BPM, you hear syncopation.
          If you speed up that exact same drum track 100 times, the individual taps blur past the 25.8 Hz limen. Your ears no longer hear rhythm—instead,
          your brain perceives the musical interval of a pure <strong>Harmonic Perfect Fifth</strong> (ratio 3:2, 702 cents)!
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="rounded border border-stone-800 bg-stone-950/60 p-2.5">
            <div className="font-mono font-bold text-amber-300 text-sm">3:2 Ratio</div>
            <div className="text-stone-300 font-medium mt-0.5">Hemiola Polyrhythm</div>
            <div className="flex items-center gap-1 text-[11px] text-stone-400 mt-1">
              <span>Accelerate</span> <ArrowRight className="h-3 w-3 text-cyan-400" /> <span>Perfect Fifth (702¢)</span>
            </div>
          </div>
          <div className="rounded border border-stone-800 bg-stone-950/60 p-2.5">
            <div className="font-mono font-bold text-amber-300 text-sm">4:3 Ratio</div>
            <div className="text-stone-300 font-medium mt-0.5">Cross-Rhythm</div>
            <div className="flex items-center gap-1 text-[11px] text-stone-400 mt-1">
              <span>Accelerate</span> <ArrowRight className="h-3 w-3 text-cyan-400" /> <span>Perfect Fourth (498¢)</span>
            </div>
          </div>
          <div className="rounded border border-stone-800 bg-stone-950/60 p-2.5">
            <div className="font-mono font-bold text-amber-300 text-sm">5:4 Ratio</div>
            <div className="text-stone-300 font-medium mt-0.5">Quintuplet Groove</div>
            <div className="flex items-center gap-1 text-[11px] text-stone-400 mt-1">
              <span>Accelerate</span> <ArrowRight className="h-3 w-3 text-cyan-400" /> <span>Major Third (386¢)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Concept 3: Ghost Fundamental & The Sam */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">3</span>
          <h3 className="text-sm font-bold text-stone-100">The Ghost Fundamental & The Sam (Cyclical Convergence)</h3>
        </div>
        <p className="text-xs text-stone-300 leading-relaxed">
          If you play harmonics 3, 4, and 5 (e.g. 300 Hz, 400 Hz, 500 Hz), your auditory nervous system automatically reconstructs the missing 100 Hz root.
          This is the <em>acoustic ghost fundamental</em>. In rhythm space, this exact mathematical principle is known in Indian classical music as the <strong>Sam</strong>—the
          primary cyclical downbeat where all polyrhythmic cycles realign to complete one macro-period.
        </p>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-200">
          <strong>Perceptual Invariance:</strong> Whether resolving acoustic overtones down to a virtual root, or tracking complex African polyrhythms to a common downbeat, the brain relies on the identical integer greatest common divisor.
        </div>
      </div>

      {/* Concept 4: Timbre as Micro-Polyphony */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-400">4</span>
              <h3 className="text-sm font-bold text-stone-100">Timbre as Micro-Polyphony & The Rhythmic Mirror</h3>
            </div>
            <p className="mt-1 text-xs text-stone-400 leading-relaxed">
              Timbre is not an opaque single colour; it is micro-polyphony. Every waveform shape (sawtooth, square, triangle, or bell)
              is a precise chord of integer harmonics. In the interactive explorer below, observe how harmonic ratios translate to rhythm pulses.
            </p>
          </div>
          <Sparkles className="h-5 w-5 text-sky-400 hidden sm:block flex-shrink-0" />
        </div>

        {/* Embedded Interactive Diagram 2 */}
        <OvertoneTimbreDiagram />
      </div>

      {/* Concept 5: DuMetric Time & Solfège Glyphs */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">5</span>
              <h3 className="text-sm font-bold text-stone-100">Voice Anchors, DuMetric Time & Geometric Solfège Glyphs</h3>
            </div>
            <p className="mt-1 text-xs text-stone-400 leading-relaxed">
              Prime Period Theory assigns geometric Solfège glyphs to pitch intervals and metric fractions.
              Click the noteheads on the dial below to explore pitch ratios, Solfège syllables, and classic rhythmic groove overlays.
            </p>
          </div>
          <Disc className="h-5 w-5 text-purple-400 hidden sm:block flex-shrink-0" />
        </div>

        {/* Embedded Interactive Diagram 3 */}
        <DuMetricCycleDiagram />
      </div>

      {/* Concept 6: Five Prime Families */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-xs font-bold text-rose-400">6</span>
              <h3 className="text-sm font-bold text-stone-100">The Five Prime Families & Harmonic Signatures</h3>
            </div>
            <p className="mt-1 text-xs text-stone-400 leading-relaxed">
              Any acoustic waveform can be factored into prime numbers. Prime 2 forms octaves, Prime 3 introduces fifths and triplets,
              Prime 5 brings sweet major thirds, Prime 7 creates bluesy sevenths, and Prime 11 provides neutral intervals.
            </p>
          </div>
          <Music className="h-5 w-5 text-rose-400 hidden sm:block flex-shrink-0" />
        </div>

        {/* Embedded Interactive Diagram 4 */}
        <PrimeFamiliesDiagram />
      </div>

      {/* Concept 7: Compound Filters as Rhythm Sieves */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-400">7</span>
          <h3 className="text-sm font-bold text-stone-100">Compound Filters: Reductive Rhythm Sieves & Acoustic Formants</h3>
        </div>
        <p className="text-xs text-stone-300 leading-relaxed">
          In acoustic synthesis, filters carve away frequencies to create vocal formants or instrument bodies.
          In Prime Period Theory, a filter applied in rhythm space acts as a <strong>reductive sieve</strong> (similar to Iannis Xenakis&apos; sieves
          or West African bell patterns). By gating or attenuating specific DuPeriod bands, complex polyphonic grids condense into syncopated, danceable grooves.
        </p>
        <div className="flex items-center gap-3 rounded-lg border border-teal-500/20 bg-stone-950/40 p-3 text-xs text-stone-300">
          <Filter className="h-5 w-5 text-teal-400 flex-shrink-0" />
          <span>
            Explore PPT Spectrum&apos;s dual high-pass and low-pass compound filters to sculpt both frequency timbre and rhythmic density in real time.
          </span>
        </div>
      </div>
    </div>
  );
};
