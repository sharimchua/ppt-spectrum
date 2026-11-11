import React, { useState } from 'react';
import { PRIME_FAMILY_COLORS } from '../../core/ppt-constants';

interface PrimeFamilyInfo {
  id: string;
  name: string;
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
    name: '2-Prime (Du)',
    symbol: '2^k',
    color: PRIME_FAMILY_COLORS['2'],
    intervals: 'Octaves (2:1, 4:1, 8:1)',
    rhythmFeel: 'Binary duple subdivision (1/2, 1/4, 1/8, 16th notes). Universal metric foundation.',
    harmonicQuality: 'Perfect octave equivalence without changing pitch-class colour.',
    instruments: 'Bass guitar octaves, pipe organ 8ft/4ft stops, kick drum downbeats.',
    coincidence: 'Locks every 1 or 2 root cycles.',
  },
  {
    id: '3',
    name: '3-Prime (Tri)',
    symbol: '3^k',
    color: PRIME_FAMILY_COLORS['3'],
    intervals: 'Perfect 5th (3:2), Perfect 4th (4:3), Major 2nd (9:8)',
    rhythmFeel: 'Triple metre, waltz, triplet swing, and 3:2 hemiola polyrhythms.',
    harmonicQuality: 'The Pythagorean harmonic backbone. Open, resonant, and consonant.',
    instruments: 'Acoustic violin fifths, French horn overtones, ride cymbal triplets.',
    coincidence: 'Locks every 2 or 3 root cycles.',
  },
  {
    id: '5',
    name: '5-Prime (Qui)',
    symbol: '5^k',
    color: PRIME_FAMILY_COLORS['5'],
    intervals: 'Major 3rd (5:4), Minor 3rd (6:5), Major 6th (5:3)',
    rhythmFeel: 'Quintuple metre (5/4 time, Dave Brubeck grooves) and 5:4 cross-rhythms.',
    harmonicQuality: 'Pure Ptolemaic sweetness; defines the major and minor triad third.',
    instruments: 'Barbershop choir pure thirds, acoustic piano chords, tuned claves.',
    coincidence: 'Locks every 4 or 5 root cycles.',
  },
  {
    id: '7',
    name: '7-Prime (Sep)',
    symbol: '7^k',
    color: PRIME_FAMILY_COLORS['7'],
    intervals: 'Harmonic 7th (7:4), Septimal Tritone (7:5), Septimal 3rd (7:6)',
    rhythmFeel: 'Septuple metre (7/8 Balkan dances, Carnatic chhanda) and 7:4 cross-beats.',
    harmonicQuality: 'The natural harmonic blue note; soulful tension and pure dominant seventh.',
    instruments: 'Blues harmonica bends, barbershop seventh chords, Bulgarian folk dances.',
    coincidence: 'Locks every 4 or 7 root cycles.',
  },
  {
    id: '11',
    name: '11-Prime (Undec)',
    symbol: '11^k',
    color: PRIME_FAMILY_COLORS['11'],
    intervals: 'Neutral 4th (11:8), Neutral 3rd (11:9), Alphorn Fa (11:8)',
    rhythmFeel: '11-beat macro-cycles and micro-metric tuplets at the threshold of human parsing.',
    harmonicQuality: 'Neutral intervals bridging major and minor; microtonal Arabic maqamat.',
    instruments: 'Arabic oud maqam Rast, Swiss alphorn, microtonal synthesiser scales.',
    coincidence: 'Requires 8 to 11 cycles to realign.',
  },
  {
    id: 'higher',
    name: '>11 (Inharmonic)',
    symbol: 'Irrat / >11',
    color: PRIME_FAMILY_COLORS['higher'],
    intervals: 'Inharmonic Modes, Stiff String Stretch (B), Free-Free Bar (2.76x)',
    rhythmFeel: 'Aperiodic drift and organic, non-repeating polyrhythmic fills.',
    harmonicQuality: 'Metallic shimmer, singing resonance, and complex acoustic beating.',
    instruments: 'Church bells, Indonesian gamelan bonang, Tibetan singing bowls, vibraphone.',
    coincidence: 'Aperiodic; never neatly realigns into a repeating cycle.',
  },
];

export const PrimeFamiliesDiagram: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('3');
  const selected = PRIME_FAMILIES.find((f) => f.id === selectedId) || PRIME_FAMILIES[1];

  return (
    <div className="w-full flex flex-col p-3.5 sm:p-4 bg-slate-950/80 border border-slate-800/90 rounded-xl select-none space-y-3.5 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div>
          <span className="text-xs sm:text-sm font-bold text-white font-mono flex items-center gap-2">
            <span>The Five Prime Families &amp; Spectral Profiles</span>
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            &ldquo;Ratios tell you the relationship. Primes tell you the family.&rdquo;
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 self-start sm:self-auto">
          11-Limit Rational Boundary
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
                <span className="text-[10px] font-mono text-slate-400">{fam.symbol}</span>
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
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selected.color }} />
            <h4 className="font-bold text-white font-mono text-sm">{selected.name}</h4>
          </div>
          <span className="text-[11px] font-mono text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            Intervals: {selected.intervals}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11.5px]">
          <div className="space-y-1">
            <span className="font-semibold text-blue-400 block">Rhythmic Subdivision &amp; Metre:</span>
            <p className="text-slate-300 leading-relaxed">{selected.rhythmFeel}</p>
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-purple-400 block">Harmonic Quality &amp; Consonance:</span>
            <p className="text-slate-300 leading-relaxed">{selected.harmonicQuality}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/60 text-[11px]">
          <div className="text-slate-400">
            <strong className="text-slate-300">Acoustic Examples:</strong> {selected.instruments}
          </div>
          <div className="text-slate-400">
            <strong className="text-slate-300">Coincidence Cycle:</strong> {selected.coincidence}
          </div>
        </div>
      </div>
    </div>
  );
};
