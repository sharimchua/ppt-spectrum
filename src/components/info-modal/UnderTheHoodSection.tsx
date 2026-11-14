import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Filter,
  Activity,
  Radio,
  Keyboard,
  Play,
  Volume2,
  Sparkles,
} from 'lucide-react';
import {
  TutorialDemoId,
  TutorialSectionId,
  CustomTutorialDemoOverride,
} from './tutorial-demos';

interface UnderTheHoodSectionProps {
  onPlayDemo: (
    demoId: TutorialDemoId,
    fromSection?: TutorialSectionId,
    customOverride?: CustomTutorialDemoOverride
  ) => void;
}

const SIEVE_PATTERNS: { id: string; label: string; slots: boolean[]; desc: string }[] = [
  {
    id: 'tresillo',
    label: 'Tresillo (3+3+2)',
    slots: [true, false, false, true, false, false, true, false],
    desc: 'Keeps slots 0, 3, and 6 out of 8—carving a steady 8th-note pulse into the classic Afro-Cuban 3+3+2 groove.',
  },
  {
    id: 'cinquillo',
    label: 'Euclidean (5 in 8)',
    slots: [true, false, true, true, false, true, true, false],
    desc: 'Spreads 5 hits as evenly as possible across 8 slots (Björklund Euclidean algorithm).',
  },
  {
    id: 'backbeat',
    label: 'Backbeat (Slots 2 & 6)',
    slots: [false, false, true, false, false, false, true, false],
    desc: 'Mutes the downbeat and isolates beats 2 and 4—turning a dense loop into a snappy snare backbeat.',
  },
];

export const UnderTheHoodSection: React.FC<UnderTheHoodSectionProps> = ({ onPlayDemo }) => {
  const [sieveSlots, setSieveSlots] = useState<boolean[]>(SIEVE_PATTERNS[0].slots);
  const [activePatternId, setActivePatternId] = useState<string>('tresillo');

  const handleSelectPattern = (id: string, slots: boolean[]) => {
    setActivePatternId(id);
    setSieveSlots(slots);
  };

  const handleToggleSlot = (idx: number) => {
    setActivePatternId('custom');
    setSieveSlots((prev) => {
      const next = prev.map((v, i) => (i === idx ? !v : v));
      // Keep at least one slot open so the live demo remains audible
      if (next.every((v) => !v)) {
        next[0] = true;
      }
      return next;
    });
  };

  const activePattern = SIEVE_PATTERNS.find((p) => p.id === activePatternId);
  const keptCount = sieveSlots.filter(Boolean).length;
  const openIndices = sieveSlots
    .map((open, i) => (open ? i : -1))
    .filter((i) => i >= 0)
    .join(', ');

  const handleTrySieveLive = () => {
    const label = activePattern ? activePattern.label : `Custom 8-Slot Sieve (Slots ${openIndices})`;
    onPlayDemo('tresillo-sieve', 'hood', {
      title: `${label} — Rhythm Sieve Live`,
      shortTitle: activePattern ? activePattern.label : 'Custom 8-Slot Sieve',
      badge: `${keptCount}/8 Slots Open`,
      listenHint: `Listening to your active 8-slot Cycle Sieve (keeping slots ${openIndices}) carving a polyrhythmic loop in real time!`,
      customSieveSlots: sieveSlots,
    });
  };

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-4 text-xs leading-relaxed text-stone-300">
        <div className="flex items-center gap-2 font-semibold text-cyan-300 mb-1">
          <Sparkles className="h-4 w-4" />
          <span>Under the Hood: Musical Sound Design &amp; Studio Tools</span>
        </div>
        <p>
          Once you feel how rhythm and pitch connect across the 25.8 Hz horizon, PPT Spectrum opens up a full suite of sound-design
          tools. Every tool below is just another way of shaping <strong>amplitude across time</strong>—whether you are crafting
          grooves, exploring tuning systems, or designing acoustic timbres.
        </p>
      </div>

      {/* 1. Voice Anchors, Overtones & Inharmonic String Stretch */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-stone-100">
                1. Voice Anchors vs Overtones — Plus Real-World String Stretch (B)
              </h3>
              <p className="text-[11px] text-stone-400">
                How chords, drum kits, and warm piano strings are built inside the Shape Studio
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto rounded-md border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 font-mono text-[10px] text-amber-300">
            Toolbar: Library (L / Shift+L)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3 space-y-1">
            <strong className="text-amber-300">Two-Layer Architecture (Band vs Overtones):</strong>
            <p className="text-stone-300 leading-relaxed">
              Every Shape is organised like a band. <strong>Voice Anchors</strong> are the individual players (each note of a chord
              or each drum in a groove, with its own pitch ratio, drum sound, and timing offset around the bar). Inside each Voice
              Anchor lives its own stack of <strong>Harmonic Partials</strong> (1×, 2×, 3× overtones) with individual amplitudes.
            </p>
          </div>
          <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3 space-y-1">
            <strong className="text-cyan-300">Inharmonicity Stretch (B) &amp; Damping Macros:</strong>
            <p className="text-stone-300 leading-relaxed">
              Mathematically exact harmonics can sound cold and electronic. Real steel piano strings have physical stiffness that
              pushes higher overtones slightly sharp (<span className="font-mono text-cyan-300">B &gt; 0</span>). Adding a touch of
              stretch creates warm acoustic chorus; pushing it further turns strings into shimmering bells!
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-950/15 px-3.5 py-2.5 text-xs">
          <span className="text-stone-300">
            <strong>Hear it in action:</strong> Listen to stretched piano strings paired with a hammer envelope and harmonic comb filter.
          </span>
          <button
            onClick={() => onPlayDemo('piano-comb', 'hood')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-[11px] shrink-0 self-start sm:self-auto transition cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Try Piano + Comb Live</span>
          </button>
        </div>
      </div>

      {/* 2. Compound Filters: Rhythm Sieves & Acoustic Formants */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <Filter className="h-4 w-4 text-sky-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-stone-100">
                2. Sculpting by Subtraction: Rhythm Sieves &amp; Vocal Formants
              </h3>
              <p className="text-[11px] text-stone-400">
                How one filter engine carves both danceable syncopation and acoustic tone colours
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto rounded-md border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 font-mono text-[10px] text-sky-300">
            Toolbar: Filters (F · Shift+F · Edit E)
          </span>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          In synthesis, a <strong>spectral filter</strong> reduces the amplitude of certain frequencies to mimic a violin body or a
          human voice singing vowels. In PPT Spectrum, you can also apply <strong>Cycle Sieves</strong> in rhythm space: just like
          placing a stencil over a steady 8th-note groove, a sieve gates specific slots around the bar (setting muted slots to zero
          amplitude) so only your chosen syncopated accents pass through!
        </p>

        {/* Interactive 8-Slot Rhythm Sieve Mini-Explorer */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/85 p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-white font-mono">
              Interactive 8-Slot Cycle Sieve: Toggle Slots &amp; Hear Your Pattern Live
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {SIEVE_PATTERNS.map((pat) => (
                <button
                  key={pat.id}
                  onClick={() => handleSelectPattern(pat.id, pat.slots)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer border ${
                    activePatternId === pat.id
                      ? 'bg-sky-950 border-sky-400 text-sky-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {pat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {sieveSlots.map((open, idx) => (
              <button
                key={idx}
                onClick={() => handleToggleSlot(idx)}
                className={`p-2 rounded-lg border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                  open
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                <span className="text-[9px] font-mono">Slot {idx}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${open ? 'bg-sky-400' : 'bg-slate-700'}`} />
                <span className="text-[9px] font-mono font-bold">{open ? 'KEEP' : 'MUTE'}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1">
            <span className="text-slate-300 text-[11px]">
              {activePattern
                ? activePattern.desc
                : `Custom sieve (${keptCount}/8 slots open: ${openIndices}): only beats landing on KEEP slots sound in the live scene.`}
            </span>
            <button
              onClick={handleTrySieveLive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-semibold text-[11px] shrink-0 self-start sm:self-auto transition cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{activePattern ? `Try ${activePattern.label} Live` : `Try Custom Sieve (${keptCount}/8) Live`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Envelopes Studio: Pitch ADSR vs Rhythm Supercycles */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-stone-100">
                3. Envelopes Across Two Timescales: Shaping Amplitude Over Macro Time
              </h3>
              <p className="text-[11px] text-stone-400">
                Shaping a single note strike (Press T) vs making a groove swell and breathe across multiple bars
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
            Toolbar: Envelope (V / Shift+V)
          </span>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          An <strong>envelope</strong> is simply a curve that controls how overall <strong>amplitude rises and falls over time</strong>.
          In Pitch space, it shapes the Attack, Decay, Sustain, and Release (<strong>ADSR</strong>) of each note strike (press{' '}
          <kbd className="font-mono text-amber-300">T</kbd> or play a MIDI key) so a note can pluck like a harp or bow like a cello.
          In Rhythm space, that exact same idea becomes a <strong>Supercycle Envelope</strong> that swells, gates, or accents your
          groove across 2, 4, or 8 bars so repeating loops feel alive and phrased.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-950/15 px-3.5 py-2.5 text-xs">
          <span className="text-stone-300">
            <strong>Hear it in action:</strong> Experience a Tibetan Singing Bowl breathing across a 4-bar Supercycle amplitude swell.
          </span>
          <button
            onClick={() => onPlayDemo('bowl-swell', 'hood')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-semibold text-[11px] shrink-0 self-start sm:self-auto transition cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Try Bowl + 4-Bar Swell Live</span>
          </button>
        </div>
      </div>

      {/* 4. Mic Sampling, Web MIDI & Library Bundles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-300 font-bold text-xs">
              <Radio className="h-4 w-4 text-red-400" />
              <span>Mic Sampler: Rhythm &amp; 24-Partial Timbre</span>
            </div>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-red-950/50 text-red-300 border border-red-500/30">
              Sample (P)
            </span>
          </div>
          <p className="text-xs text-stone-300 leading-relaxed">
            <strong>Rhythm Tab:</strong> Clap or tap a beat into your mic; the app trims silence, plots your hits on the Cycle Wheel,
            and quantises them into a playable groove. <strong>Pitch/Timbre Tab:</strong> Sing or pluck an instrument into your mic to
            extract up to <strong>24 overtones</strong> (and their amplitudes) and slide your own acoustic sound across the continuum!
          </p>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
              <Keyboard className="h-4 w-4 text-purple-400" />
              <span>Web MIDI Performance &amp; Library Bundles</span>
            </div>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-950/50 text-purple-300 border border-purple-500/30">
              MIDI · Bundles (U)
            </span>
          </div>
          <p className="text-xs text-stone-300 leading-relaxed">
            Plug in a <strong>MIDI keyboard</strong> to play shapes polyphonically with velocity-sensitive amplitude and see harmonic
            ghost notes light up on the Spectrum Ruler. Use <strong>Bundles (U)</strong> to explore curated musical scenes or share
            complete Shape + Filter + Envelope patches via a single link.
          </p>
        </div>
      </div>

      {/* Small-Speaker Assist Note */}
      <div className="flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-950/60 p-3.5 text-xs text-stone-300">
        <Volume2 className="h-4 w-4 text-amber-400 shrink-0" />
        <span>
          <strong>Small-Speaker Bass Assist:</strong> Listening on a phone or laptop? Enable <em>Small-Speaker Assist</em> in Settings—it
          uses the Ghost Fundamental principle to boost upper harmonics so your brain clearly hears deep 20–40 Hz crossover pitches.
        </span>
      </div>
    </div>
  );
};
