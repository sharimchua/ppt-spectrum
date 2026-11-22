/**
 * Interactive Playable Surfaces & Auto-Play Explorer for Section 4 (Tuning Systems & Playable Surfaces).
 * Lets learners inspect and audition the Scale-Degree Strip, 2D Isomorphic Lattice,
 * SVG Guitar/Bass/Ukulele Fretboard, and Dual-Coordinate Auto-Play Sequencer.
 * Australian English spelling maintained.
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Play, Grid3X3, Sliders, Music } from 'lucide-react';
import {
  ContextualDemoAction,
  CustomTutorialDemoOverride,
  TutorialDemoId,
  TutorialSectionId,
} from './tutorial-demos';

export interface InstrumentSurfacesGuideCardProps {
  onPlayDemo?: (
    demoId?: TutorialDemoId,
    fromSection?: TutorialSectionId,
    customOverride?: CustomTutorialDemoOverride
  ) => void;
  onRegisterContextualDemo?: (action: ContextualDemoAction) => void;
}

type SurfaceGuideTab = 'scale-strip' | 'isomorphic' | 'guitar' | 'projection';

interface SurfaceGuideItem {
  id: SurfaceGuideTab;
  tabLabel: string;
  title: string;
  badge: string;
  demoId: TutorialDemoId;
  demoCta: string;
  summary: string;
  highlights: { heading: string; body: string }[];
}

const SURFACE_GUIDE_ITEMS: SurfaceGuideItem[] = [
  {
    id: 'scale-strip',
    tabLabel: '1. Scale Strip & Auto-Play',
    title: 'Scale-Degree Strip & Dual-Coordinate Auto-Play Sequencer',
    badge: 'Toolbar: Keys (K) → Scale · Auto',
    demoId: 'surface-scale-autoplay-demo',
    demoCta: 'Try Scale Strip + Auto-Play',
    summary:
      'While the Piano always shows 12 fixed keys per octave, the Scale Strip adapts directly to your active Tuning System and Scale Subset—showing 5 pads for Pentatonic, 7 for Heptatonic or Gamelan Pélog, or 13 for a Bohlen-Pierce Tritave.',
    highlights: [
      {
        heading: 'Relative to Your Active Fundamental',
        body: 'Pad 1 is always anchored to your current slider speed (in Pitch Space or Rhythm Space). Drag across pads to strum, or click "Layout" to toggle between Active Subset Only and All Tuning Steps.',
      },
      {
        heading: 'Dual-Coordinate Auto-Play Sequencer',
        body: 'Click "Auto" in the keyboard header to walk through your scale automatically (Up, Down, Thirds, Fourths, Pendulum, Chromatic Approach, or Custom Steps) with Bounce/Wrap boundary rules and Tap Tempo.',
      },
    ],
  },
  {
    id: 'isomorphic',
    tabLabel: '2. Isomorphic Lattice',
    title: '2D Isomorphic Harmonic Lattice (Hexagons or Squares)',
    badge: 'Toolbar: Keys (K) → Iso',
    demoId: 'surface-isomorphic-demo',
    demoCta: 'Try Isomorphic Hex Lattice',
    summary:
      'On a traditional piano, a major triad changes shape depending on which black or white key you start on. An Isomorphic Lattice arranges intervals on a 2D grid so every chord and scale has the exact same geometric shape in every key.',
    highlights: [
      {
        heading: 'Harmonic (3:2 × 5:4), Wicki-Hayden & All-Fourths',
        body: 'In Harmonic layout, moving right steps by a 3:2 Perfect Fifth and moving diagonally up-right steps by a 5:4 Major Third—making any Major or Minor triad a compact 3-tile triangle!',
      },
      {
        heading: 'Adapts to 12-Tone & 31-EDO Microtonal Tunings',
        body: 'Each tile displays its DuPeriod Solfège address and exact tuned cents (e.g. 386¢ for a 5:4 Major Third). In 31-EDO, the lattice automatically switches to 18\\31 fifths × 10\\31 thirds.',
      },
    ],
  },
  {
    id: 'guitar',
    tabLabel: '3. Guitar Fretboard',
    title: 'Interactive Guitar, Bass & Ukulele Fretboard',
    badge: 'Toolbar: Keys (K) → Guitar',
    demoId: 'surface-guitar-demo',
    demoCta: 'Try Tuned Guitar Fretboard',
    summary:
      'Explore how Just Intonation, Pythagorean chains, and microtonal subsets map across fretted strings—with graduated string gauges, inlay dots, and click-and-drag strumming across strings.',
    highlights: [
      {
        heading: '9 Instrument Presets + Per-String Custom Tuning',
        body: 'Open "Layout" to switch between 6-String Standard, All-Fourths, Drop D, DADGAD, Open G, Open D, 7-String, 4-String Bass, or Ukulele—or nudge individual open strings up and down by semitone.',
      },
      {
        heading: 'Solfège, Note & True Cents Readouts',
        body: 'Dim frets outside your active Layer 2 Scale Subset to visualise scale shapes down the neck, and flip labels between Solfège (Do, Mi, So), Note names, and exact tuned Cents.',
      },
    ],
  },
  {
    id: 'projection',
    tabLabel: '4. World & Non-Octave',
    title: '3-Layer Tuning Architecture: Lattice → Subset Sieve → Key Projection',
    badge: 'Tuning Studio (Shift+T)',
    demoId: '31edo-septimal-demo',
    demoCta: 'Try 31-EDO Septimal Lattice',
    summary:
      'Every tuning in PPT Spectrum is organised into three clean layers inside the Tuning Studio (Shift+T), separating relative scale maths from physical keyboard and concert-pitch mapping.',
    highlights: [
      {
        heading: 'Layer 1 (Lattice) + Layer 2 (Scale Subset Sieve)',
        body: 'Layer 1 defines the period and step generator (e.g. 12/24/31/53-EDO, 3:2 ratio chain, Javanese Pélog/Sléndro, or Bohlen-Pierce 3:1 Tritave). Layer 2 sieves which degrees are active (Pentatonic, Meantone, Maqam Rast/Bayati/Hijaz, Pathet Nem).',
      },
      {
        heading: 'Layer 3: Physical Key / MIDI Projection & World Hz Anchors',
        body: 'Choose how 12-key pianos and guitars project onto N-step systems ("Nearest-12", "Step: System", or "Step: Subset"), and anchor Do to A440, TPL Mirror (412.8 Hz), Baroque A415, Verdi C256, or Gamelan Tumbuk.',
      },
    ],
  },
];

export const InstrumentSurfacesGuideCard: React.FC<InstrumentSurfacesGuideCardProps> = ({
  onPlayDemo,
  onRegisterContextualDemo,
}) => {
  const [activeTab, setActiveTab] = useState<SurfaceGuideTab>('scale-strip');
  const activeItem =
    SURFACE_GUIDE_ITEMS.find((item) => item.id === activeTab) ?? SURFACE_GUIDE_ITEMS[0];

  useEffect(() => {
    if (!onRegisterContextualDemo) return;
    onRegisterContextualDemo({
      cardId: 'instrument-surfaces-guide',
      label: activeItem.demoCta,
      demoId: activeItem.demoId,
      fromSection: 'tuning',
    });
  }, [activeItem, onRegisterContextualDemo]);

  return (
    <div
      data-demo-card="instrument-surfaces-guide"
      className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 space-y-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-stone-100">
              Playable Surfaces &amp; Auto-Play: Piano, Scale Strip, Isomorphic &amp; Guitar
            </h4>
            <p className="text-[11px] text-stone-400">
              How the Virtual Keyboard (<kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] font-mono">K</kbd>) transforms into four tuning-aware instruments
            </p>
          </div>
        </div>
        {onPlayDemo && (
          <button
            type="button"
            onClick={() => onPlayDemo(activeItem.demoId, 'tuning')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 px-2.5 py-1 text-[11px] font-semibold text-rose-200 transition cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{activeItem.demoCta}</span>
          </button>
        )}
      </div>

      {/* Interactive Surface Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-800 pb-2.5">
        {SURFACE_GUIDE_ITEMS.map((item) => {
          const isSelected = item.id === activeTab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                isSelected
                  ? 'bg-rose-600/25 border-rose-500 text-rose-200 shadow-sm'
                  : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {item.tabLabel}
            </button>
          );
        })}
      </div>

      {/* Active Surface Detail Body */}
      <div className="rounded-lg bg-stone-950/80 border border-stone-800/90 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {activeTab === 'isomorphic' ? (
              <Grid3X3 className="w-3.5 h-3.5 text-rose-400" />
            ) : activeTab === 'projection' ? (
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Music className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className="text-xs font-bold text-stone-100">{activeItem.title}</span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-stone-900 border border-stone-700/80 text-rose-300">
            {activeItem.badge}
          </span>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">{activeItem.summary}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          {activeItem.highlights.map((hl) => (
            <div
              key={hl.heading}
              className="rounded-lg border border-stone-800/80 bg-stone-900/50 p-2.5 space-y-1"
            >
              <strong className="text-rose-300 block text-[11px]">{hl.heading}</strong>
              <p className="text-stone-300 text-[11px] leading-relaxed">{hl.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
