import React, { useState } from 'react';
import { PRIME_FAMILY_COLORS } from '../../core/ppt-constants';

interface PrimeFamilyInfo {
  id: string;
  name: string;
  nickname: string;
  symbol: string;
  color: string;
  intervals: string;
  rhythmFeel: string;
  harmonicQuality: string;
  instruments: string;
  coincidence: string;
}

const PRIME_FAMILIES: PrimeFamilyInfo[] = [
  {
    id: '2',
    name: 'Prime 2 (Du)',
    nickname: 'The Mirror (Octaves & Halves)',
    symbol: '2×, 4×, 8×',
    color: PRIME_FAMILY_COLORS['2'],
    intervals: 'Octaves (2:1, 4:1, 8:1)',
    rhythmFeel: 'Straight binary subdivisions (half notes, quarters, 8ths, 16ths). The steady grid of modern music.',
    harmonicQuality: 'Doubling a frequency gives you the exact same note one octave higher—it adds size without changing the harmonic colour.',
    instruments: 'Bass octaves, pipe organ stops, four-on-the-floor kick and hi-hat grids.',
    coincidence: 'Locks every 1 or 2 beats.',
  },
  {
    id: '3',
    name: 'Prime 3 (Tri)',
    nickname: 'The Backbone (Fifths & Triplets)',
    symbol: '3×, 6×, 9×',
    color: PRIME_FAMILY_COLORS['3'],
    intervals: 'Perfect 5th (3:2), Perfect 4th (4:3), Whole Step (9:8)',
    rhythmFeel: 'Waltz time (3/4), jazz triplet swing, and 3-against-2 hemiola polyrhythms.',
    harmonicQuality: 'Open, strong, and grounded—the classic "power chord" fifth and circle-of-fifths gravity.',
    instruments: 'Violin open strings, brass fanfares, jazz ride cymbal swing.',
    coincidence: 'Locks every 2 or 3 beats.',
  },
  {
    id: '5',
    name: 'Prime 5 (Qui)',
    nickname: 'The Emotion (Sweet Thirds & 5s)',
    symbol: '5×, 10×, 15×',
    color: PRIME_FAMILY_COLORS['5'],
    intervals: 'Major 3rd (5:4), Minor 3rd (6:5), Major 6th (5:3)',
    rhythmFeel: '5/4 grooves ("Take Five") and expressive 5-against-4 cross-rhythms.',
    harmonicQuality: 'Brings warmth, sweetness, and major/minor emotional colour into an otherwise stark fifth.',
    instruments: 'Barbershop vocal harmonies, warm acoustic chords, 5-stroke clave patterns.',
    coincidence: 'Locks every 4 or 5 beats.',
  },
  {
    id: '7',
    name: 'Prime 7 (Sep)',
    nickname: 'The Soul (Blues 7ths & 7/8 Groove)',
    symbol: '7×, 14×',
    color: PRIME_FAMILY_COLORS['7'],
    intervals: 'Harmonic 7th (7:4), Septimal Tritone (7:5), Septimal Minor 3rd (7:6)',
    rhythmFeel: 'Balkan 7/8 dances, Indian Carnatic tisra/misra cycles, and 7-against-4 polyrhythms.',
    harmonicQuality: 'The natural acoustic "blue note"—a smooth, soulful tension that doesn’t even want to resolve.',
    instruments: 'Blues harmonica, barbershop 7th chords, Balkan folk percussion.',
    coincidence: 'Locks every 4 or 7 beats.',
  },
  {
    id: '11',
    name: 'Prime 11 (Undec)',
    nickname: 'The Horizon (Halfway Neutral)',
    symbol: '11×',
    color: PRIME_FAMILY_COLORS['11'],
    intervals: 'Neutral 4th (11:8), Neutral 3rd (11:9 — halfway between major & minor)',
    rhythmFeel: '11-beat macro-cycles and loose, speech-like tuplets right at the edge of what the ear can count.',
    harmonicQuality: 'Otherworldly "neutral" intervals that sit exactly between major and minor, central to Arabic maqam and Swiss alphorn.',
    instruments: 'Arabic oud (maqam Rast), Swiss alphorn natural 11th harmonic.',
    coincidence: 'Takes 8 to 11 beats to realign.',
  },
  {
    id: 'higher',
    name: '>11 (Inharmonic)',
    nickname: 'The Shimmer (Bells & Chimes)',
    symbol: 'Stretched',
    color: PRIME_FAMILY_COLORS['higher'],
    intervals: 'Stretched Piano Strings (B), Metal Bar Modes (2.76×), Church Bell Tierce',
    rhythmFeel: 'Drifting, un-gridded rhythms that never repeat the same way twice.',
    harmonicQuality: 'Metallic shimmer, bell-like ring, and slow hypnotic acoustic beating.',
    instruments: 'Church bells, Tibetan singing bowls, Indonesian gamelan, vibraphone.',
    coincidence: 'Never neatly locks into a short bar.',
  },
];

export const PrimeFamiliesDiagram: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('3');
  const selected = PRIME_FAMILIES.find((f) => f.id === selectedId) || PRIME_FAMILIES[1];

  return (
    <div className="w-full flex flex-col p-3.5 sm:p-4 bg-slate-950/85 border border-slate-800/90 rounded-xl select-none space-y-3.5 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div>
          <span className="text-xs sm:text-sm font-bold text-white font-mono">
            The Primary Colours of Music: The Five Prime Families
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            You can&apos;t make a 3 or a 5 by multiplying 2s—each new prime number unlocks a brand-new musical flavour.
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 self-start sm:self-auto">
          11-Limit Ceiling
        </span>
      </div>

      {/* Prime Family Selector Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {PRIME_FAMILIES.map((fam) => {
          const isSelected = selectedId === fam.id;
          return (
            <button
              key={fam.id}
              onClick={() => setSelectedId(fam.id)}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-amber-500 ring-1 ring-amber-400/50 shadow-md'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fam.color }} />
                <span className="text-[9px] font-mono text-slate-400">{fam.symbol}</span>
              </div>
              <span className="text-xs font-bold text-white font-mono mt-1.5">{fam.name}</span>
            </button>
          );
        })}
      </div>

      {/* Detailed Card for Selected Prime Family */}
      <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-2.5 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/60 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
            <h4 className="font-bold text-white font-mono text-sm">
              {selected.name} — <span className="text-amber-300 font-sans">{selected.nickname}</span>
            </h4>
          </div>
          <span className="text-[11px] font-mono text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {selected.intervals}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11.5px]">
          <div className="space-y-1">
            <span className="font-semibold text-blue-400 block">How it feels in Rhythm:</span>
            <p className="text-slate-300 leading-relaxed">{selected.rhythmFeel}</p>
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-purple-400 block">How it sounds in Harmony &amp; Timbre:</span>
            <p className="text-slate-300 leading-relaxed">{selected.harmonicQuality}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1.5 border-t border-slate-800/60 text-[11px]">
          <div className="text-slate-400">
            <strong className="text-slate-200">Where you hear it:</strong> {selected.instruments}
          </div>
          <div className="text-slate-400">
            <strong className="text-slate-200">Cycle Alignment:</strong> {selected.coincidence}
          </div>
        </div>
      </div>
    </div>
  );
};
