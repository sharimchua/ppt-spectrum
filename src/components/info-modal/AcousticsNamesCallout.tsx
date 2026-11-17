import React from 'react';

interface AcousticsTerm {
  term: string;
  definition: string;
}

const ACOUSTICS_TERMS: AcousticsTerm[] = [
  {
    term: 'Partial',
    definition: 'Any single frequency component of a sound.',
  },
  {
    term: 'Fundamental',
    definition: 'The 1× partial; the main speed of a note.',
  },
  {
    term: 'Harmonic',
    definition: 'A partial at a whole-number multiple of the fundamental (2×, 3×, 4× …).',
  },
  {
    term: 'Overtone',
    definition: 'Any partial above the fundamental, so 2× is the first overtone.',
  },
  {
    term: 'Inharmonic',
    definition: 'Partials that aren’t whole-number multiples, as in bells and singing bowls.',
  },
  {
    term: 'Missing fundamental',
    definition: 'The bass note your brain adds when only its multiples are present. PPT Spectrum calls it the Ghost Root.',
  },
  {
    term: 'Beating',
    definition: 'The slow pulsing you hear when two nearly equal frequencies play together. It is the rhythm-to-pitch crossover seen from the other side.',
  },
];

export const AcousticsNamesCallout: React.FC = () => {
  return (
    <div className="rounded-lg border border-stone-800/80 bg-stone-950/50 p-3.5 space-y-2.5">
      <div className="text-xs font-bold text-stone-200">Textbook names for what you&apos;re hearing</div>
      <dl className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        {ACOUSTICS_TERMS.map((item) => (
          <React.Fragment key={item.term}>
            <dt className="font-semibold text-stone-200 whitespace-nowrap">{item.term}</dt>
            <dd className="text-stone-400 leading-relaxed">{item.definition}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
};
