import React from 'react';
import { Layers, Play } from 'lucide-react';
import { TutorialDemoId, TutorialSectionId } from './tutorial-demos';

interface WhatIsAShapeCardProps {
  onPlayDemo: (demoId: TutorialDemoId, fromSection?: TutorialSectionId) => void;
}

interface ShapeExampleTile {
  title: string;
  description: string;
  demoId: TutorialDemoId;
}

const SHAPE_EXAMPLES: ShapeExampleTile[] = [
  {
    title: 'One partial.',
    description: 'A single click per cycle: a metronome when slow, a pure sine tone when fast.',
    demoId: 'sine-timbre',
  },
  {
    title: 'Two players, 4 against 3.',
    description: 'A cross-rhythm that becomes a Perfect Fourth.',
    demoId: 'polyrhythm-4-3-sweep',
  },
  {
    title: 'A stack of partials.',
    description: 'Layered accents that become a bright, brass-like tone.',
    demoId: 'sawtooth-timbre',
  },
];

export const WhatIsAShapeCard: React.FC<WhatIsAShapeCardProps> = ({ onPlayDemo }) => {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-3.5">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-emerald-400 shrink-0" />
        <h3 className="text-sm font-bold text-stone-100">What is a Shape?</h3>
      </div>

      <div className="space-y-2 text-xs leading-relaxed text-stone-300">
        <p>
          Everything you hear in PPT Spectrum is a <strong>Shape</strong>: a pattern of speed ratios and amplitudes.
        </p>
        <p>
          Picture a small band. Each player is a <strong>Voice Anchor</strong>: one note of a chord, or one drum in a groove, with
          its own speed ratio and its own place in the bar. Inside each player is a stack of <strong>partials</strong>: layers
          running at 1×, 2×, 3× … that player&apos;s speed. Every partial has an <strong>amplitude</strong>, which is how strong it
          is, from 0 to 1.
        </p>
        <p>
          Slide a Shape along the Spectrum Ruler and its pattern never changes; only the speed does. Go slowly and you hear a
          groove. Go fast and the same pattern fuses into a chord or a tone colour.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SHAPE_EXAMPLES.map((example) => (
          <div
            key={example.demoId}
            className="flex flex-col justify-between rounded-lg border border-stone-800 bg-stone-950/60 p-3.5 space-y-2.5"
          >
            <div className="space-y-1">
              <div className="text-xs font-bold text-stone-100">{example.title}</div>
              <p className="text-xs leading-relaxed text-stone-400">{example.description}</p>
            </div>
            <button
              onClick={() => onPlayDemo(example.demoId, 'overview')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-xs self-start transition cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Hear it</span>
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-stone-400 leading-relaxed">
        A Voice Anchor is this app&apos;s word for one player in a Shape. It isn&apos;t the same as a PPT &ldquo;anchor&rdquo;,
        which is a fixed reference point such as the 25.8 Hz crossover.
      </p>
    </div>
  );
};
