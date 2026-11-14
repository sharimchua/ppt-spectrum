/**
 * Pure DuMetric octave coordinate helpers and nearby rational ratio suggestions.
 * Powers the continuous pitch-clock scrubber and autocomplete snap pills.
 */

import { Ratio } from './types';
import { ratioToValue, reduceRational } from './rational';

export interface RatioSuggestion {
  label: string;
  shortTag: string;
  name: string;
  ratio: Ratio;
  octaves: number;
  distCents: number;
}

const BASE_OCTAVE_INTERVALS: Array<{ num: number; den: number; shortTag: string; name: string }> = [
  { num: 1, den: 1, shortTag: 'Unison Do', name: 'Unison / Octave (Do)' },
  { num: 16, den: 15, shortTag: 'Just m2', name: 'Just Minor 2nd (Ra)' },
  { num: 9, den: 8, shortTag: 'Pyth M2', name: 'Pythagorean Major 2nd (Re)' },
  { num: 10, den: 9, shortTag: 'Just m2+', name: 'Minor Whole Tone (Re-)' },
  { num: 6, den: 5, shortTag: 'Just m3', name: 'Just Minor 3rd (Me)' },
  { num: 5, den: 4, shortTag: 'Just M3', name: 'Just Major 3rd (Mi)' },
  { num: 4, den: 3, shortTag: 'P4 Fa', name: 'Perfect 4th (Fa)' },
  { num: 7, den: 5, shortTag: 'Sept TT', name: 'Septimal Tritone (Fi)' },
  { num: 45, den: 32, shortTag: 'Just TT', name: 'Just Augmented 4th (Fi+)' },
  { num: 3, den: 2, shortTag: 'P5 So', name: 'Perfect 5th (So)' },
  { num: 8, den: 5, shortTag: 'Just m6', name: 'Just Minor 6th (Le)' },
  { num: 5, den: 3, shortTag: 'Just M6', name: 'Just Major 6th (La)' },
  { num: 7, den: 4, shortTag: 'Harm 7th', name: 'Harmonic / Septimal 7th (Te)' },
  { num: 16, den: 9, shortTag: 'Pyth m7', name: 'Pythagorean Minor 7th (Te)' },
  { num: 9, den: 5, shortTag: 'Just m7', name: 'Just Minor 7th (Te+)' },
  { num: 15, den: 8, shortTag: 'Just M7', name: 'Just Major 7th (Ti)' },
];

const TET12_STEPS: Array<{ step: number; shortTag: string; name: string }> = [
  { step: 1, shortTag: '12ET m2', name: '12-TET Minor 2nd (100¢)' },
  { step: 2, shortTag: '12ET M2', name: '12-TET Major 2nd (200¢)' },
  { step: 3, shortTag: '12ET m3', name: '12-TET Minor 3rd (300¢)' },
  { step: 4, shortTag: '12ET M3', name: '12-TET Major 3rd (400¢)' },
  { step: 5, shortTag: '12ET P4', name: '12-TET Perfect 4th (500¢)' },
  { step: 6, shortTag: '12ET TT', name: '12-TET Tritone (600¢)' },
  { step: 7, shortTag: '12ET P5', name: '12-TET Perfect 5th (700¢)' },
  { step: 8, shortTag: '12ET m6', name: '12-TET Minor 6th (800¢)' },
  { step: 9, shortTag: '12ET M6', name: '12-TET Major 6th (900¢)' },
  { step: 10, shortTag: '12ET m7', name: '12-TET Minor 7th (1000¢)' },
  { step: 11, shortTag: '12ET M7', name: '12-TET Major 7th (1100¢)' },
];

/**
 * Converts a Ratio to continuous DuMetric octaves (log2(ratio)).
 */
export function ratioToOctaves(ratio: Ratio): number {
  const val = Math.max(1e-4, ratioToValue(ratio));
  return Math.log2(val);
}

/**
 * Converts continuous DuMetric octaves to a Ratio (rational if exact integer/simple power, else real).
 */
export function octavesToRatio(octaves: number): Ratio {
  const val = Math.pow(2, octaves);
  return { kind: 'real', value: Number(val.toFixed(5)) };
}

/**
 * Formats a Ratio for compact display (e.g. "3/2", "1.414x").
 */
export function formatRatioShort(ratio: Ratio): string {
  if (ratio.kind === 'rational') {
    return ratio.den === 1 ? `${ratio.num}x` : `${ratio.num}/${ratio.den}`;
  }
  return `${ratio.value.toFixed(3)}x`;
}

/**
 * Returns the closest canonical rational ratio suggestions around a continuous octave value.
 */
export function getNearbyRatioSuggestions(
  octValue: number,
  maxResults: number = 5,
  minOct: number = -1,
  maxOct: number = 4
): RatioSuggestion[] {
  const candidates = new Map<string, RatioSuggestion>();

  const minBand = Math.max(Math.floor(minOct), Math.floor(octValue) - 1);
  const maxBand = Math.min(Math.ceil(maxOct), Math.ceil(octValue) + 1);

  for (let band = minBand; band <= maxBand; band++) {
    for (const base of BASE_OCTAVE_INTERVALS) {
      const rawNum = band >= 0 ? base.num * Math.pow(2, band) : base.num;
      const rawDen = band >= 0 ? base.den : base.den * Math.pow(2, -band);
      const reduced = reduceRational(rawNum, rawDen);
      const oct = Math.log2(reduced.num / reduced.den);
      if (oct < minOct - 0.01 || oct > maxOct + 0.01) continue;

      const key = `${reduced.num}/${reduced.den}`;
      const distCents = Math.round((oct - octValue) * 1200);
      candidates.set(key, {
        label: reduced.den === 1 ? `${reduced.num}x` : key,
        shortTag: band === 0 ? base.shortTag : `${base.shortTag} ${band > 0 ? `+${band}o` : `${band}o`}`,
        name: base.name,
        ratio: { kind: 'rational', num: reduced.num, den: reduced.den },
        octaves: oct,
        distCents,
      });
    }

    // Include 12-TET equal-tempered chromatic steps (irrational real ratios)
    for (const tet of TET12_STEPS) {
      const oct = band + tet.step / 12;
      if (oct < minOct - 0.01 || oct > maxOct + 0.01) continue;
      const val = Number(Math.pow(2, oct).toFixed(5));
      const key = `12et:${band}:${tet.step}`;
      candidates.set(key, {
        label: `${val.toFixed(3)}x`,
        shortTag: band === 0 ? tet.shortTag : `${tet.shortTag} ${band > 0 ? `+${band}o` : `${band}o`}`,
        name: tet.name,
        ratio: { kind: 'real', value: val },
        octaves: oct,
        distCents: Math.round((oct - octValue) * 1200),
      });
    }
  }

  // Also include integer harmonic overtones 1..32
  for (let h = 1; h <= 32; h++) {
    const oct = Math.log2(h);
    if (oct < minOct - 0.01 || oct > maxOct + 0.01) continue;
    const key = `${h}/1`;
    if (!candidates.has(key)) {
      candidates.set(key, {
        label: `${h}x`,
        shortTag: `Harm ${h}`,
        name: `Harmonic ${h}`,
        ratio: { kind: 'rational', num: h, den: 1 },
        octaves: oct,
        distCents: Math.round((oct - octValue) * 1200),
      });
    }
  }

  return Array.from(candidates.values())
    .sort((a, b) => Math.abs(a.distCents) - Math.abs(b.distCents))
    .slice(0, maxResults);
}
