/**
 * Interactive Fractal Mirror (Carrier & Container) Explorer for the Tutorial Guide.
 * Explains in plain English how a rhythm below 25.8 Hz needs a Pitch Carrier (sound),
 * and a pitch/chord above 25.8 Hz lives inside a Rhythm Container (pulse),
 * with interactive comparisons between Self (Fractal), Neutral (Drum Kit / Static),
 * and Cross-Shape Coupling.
 * Australian English spelling maintained.
 */

import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Disc, Layers } from 'lucide-react';
import {
  TutorialDemoId,
  CustomTutorialDemoOverride,
  ContextualDemoAction,
} from './tutorial-demos';

export interface FractalCouplingDiagramProps {
  onPlayDemo?: (
    demoId: TutorialDemoId,
    customOverride?: CustomTutorialDemoOverride
  ) => void;
  onRegisterContextualDemo?: (action: ContextualDemoAction) => void;
}

type CouplingPresetKey = 'self' | 'neutral' | 'cross';

interface CouplingPresetCard {
  key: CouplingPresetKey;
  badge: string;
  title: string;
  subtitle: string;
  carrierLabel: string;
  carrierDesc: string;
  containerLabel: string;
  containerDesc: string;
  demoId: TutorialDemoId;
  buttonLabel: string;
}

const COUPLING_MODES: CouplingPresetCard[] = [
  {
    key: 'self',
    badge: 'Self (Fractal Mirror)',
    title: '1. Self Mode — The Shape Mirrors Itself',
    subtitle: 'Default for chords & polyrhythms: the rhythm IS the chord, and the chord IS the rhythm',
    carrierLabel: 'Carrier: Self (Chord on Beats)',
    carrierDesc:
      'In Rhythm Space (< 25.8 Hz), each beat strikes the shape’s own Voice Anchor chord pitched at that beat’s ratio (e.g. in 3:2, the 2-beat plays the root chord and the 3-beat plays a Perfect Fifth higher).',
    containerLabel: 'Container: Self (Ratio Pulse)',
    containerDesc:
      'In Pitch Space (> 25.8 Hz), the chord tones don’t just drone statically—each note gently pulses at its own harmonic ratio (e.g. 4 : 5 : 6), paced so its envelope has room to breathe.',
    demoId: 'fractal-self-triad',
    buttonLabel: 'Try Fractal Self Triad (4:5:6) Live',
  },
  {
    key: 'neutral',
    badge: 'Neutral (Pure Limen)',
    title: '2. Neutral Mode — Pure Auditory Fusion',
    subtitle: 'Isolates raw clicks vs continuous tone to test your ear’s 25.8 Hz horizon',
    carrierLabel: 'Carrier: Drum Kit',
    carrierDesc:
      'In Rhythm Space (< 25.8 Hz), beats play un-pitched Poetic percussion voices (Kick, Woodblock, Clave) with zero harmonic chord transposition.',
    containerLabel: 'Container: Static (Unified)',
    containerDesc:
      'In Pitch Space (> 25.8 Hz), all partials fuse into a single continuous tone or unified instrument strike (also used automatically by Auto mode for complex timbres like Piano or Bell).',
    demoId: 'neutral-limen-hemiola',
    buttonLabel: 'Try Pure Limen 3:2 Crossover Live',
  },
  {
    key: 'cross',
    badge: 'Library Shape Coupling',
    title: '3. Cross-Shape — Pair Any Two Shapes',
    subtitle: 'Use one Library Shape as the instrument and another Library Shape as the rhythm',
    carrierLabel: 'Carrier: Shape (e.g. Clarinet / Bell)',
    carrierDesc:
      'Pick any instrument shape from your Library to act as the acoustic mallet struck on every beat of your polyrhythm in Rhythm Space.',
    containerLabel: 'Container: Shape (e.g. Hemiola 3:2)',
    containerDesc:
      'Keep your instrument locked at its exact pitch in Pitch Space (e.g. Clarinet at A3 = 220 Hz) while a 3:2 Hemiola container strums its envelope!',
    demoId: 'cross-shape-clarinet-hemiola',
    buttonLabel: 'Try Clarinet in a 3:2 Container Live',
  },
];

export const FractalCouplingDiagram: React.FC<FractalCouplingDiagramProps> = ({
  onPlayDemo,
  onRegisterContextualDemo,
}) => {
  const [selectedKey, setSelectedKey] = useState<CouplingPresetKey>('self');
  const activeCard =
    COUPLING_MODES.find((m) => m.key === selectedKey) || COUPLING_MODES[0];

  useEffect(() => {
    onRegisterContextualDemo?.({
      cardId: 'fractal-coupling',
      label: `Hear ${activeCard.badge}`,
      demoId: activeCard.demoId,
      fromSection: 'concepts',
    });
  }, [activeCard, onRegisterContextualDemo]);

  return (
    <div
      data-demo-card="fractal-coupling"
      className="rounded-xl border border-slate-800 bg-slate-950/85 p-3.5 sm:p-4 space-y-3.5"
    >
      {/* Mode Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Interactive Carrier &amp; Container Explorer: Compare All 3 Lenses</span>
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {COUPLING_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setSelectedKey(m.key)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition cursor-pointer border ${
                selectedKey === m.key
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {m.badge}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Mode Split View: Left of TPL (Pitch Carrier) vs Right of TPL (Rhythm Container) */}
      <div className="space-y-2.5">
        <div>
          <h4 className="text-xs font-bold text-stone-100">{activeCard.title}</h4>
          <p className="text-[11px] text-stone-400">{activeCard.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          {/* Left Side: Rhythm Space -> Pitch Carrier */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/15 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1">
                <Disc className="w-3 h-3" />
                <span>Left of 25.8 Hz (Rhythm Space)</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 font-mono text-[9px] text-amber-200">
                {activeCard.carrierLabel}
              </span>
            </div>
            <p className="text-[11px] text-stone-300 leading-relaxed">
              {activeCard.carrierDesc}
            </p>
          </div>

          {/* Right Side: Pitch Space -> Rhythm Container */}
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/15 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>Right of 25.8 Hz (Pitch Space)</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 font-mono text-[9px] text-cyan-200">
                {activeCard.containerLabel}
              </span>
            </div>
            <p className="text-[11px] text-stone-300 leading-relaxed">
              {activeCard.containerDesc}
            </p>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <span className="text-[10px] text-slate-400 font-mono">
            Tip: Switch <strong className="text-amber-300">Carrier</strong> &amp;{' '}
            <strong className="text-cyan-300">Container</strong> anytime below the desktop slider or in the mobile Radial Menu.
          </span>
          {onPlayDemo && (
            <button
              type="button"
              onClick={() => onPlayDemo(activeCard.demoId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold text-[11px] shrink-0 self-start sm:self-auto transition cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{activeCard.buttonLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
