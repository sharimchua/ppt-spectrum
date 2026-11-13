/**
 * Pure DuMetric octave coordinate helpers and nearby rational ratio suggestions.
 * Powers the continuous pitch-clock scrubber and autocomplete snap pills.
 */

import { Ratio } from './types';
import { ratioToValue, reduceRational } from './rational';

export interface RatioSuggestion {
  label: string;
  name: string;
  ratio: Ratio;
  octaves: number;
  distCents: number;
}

const BASE_OCTAVE_INTERVALS: Array<{ num: number; den: number; name: string }> = [
  { num: 1, den: 1, name: 'Unison (Do)' },
  { num: 16, den: 15, name: 'Minor 2nd (Ra)' },
  { num: 9, den: 8, name: 'Major 2nd (Re)' },
  { num: 6, den: 5, name: 'Minor 3rd (Me)' },
  { num: 5, den: 4, name: 'Major 3rd (Mi)' },
  { num: 4, den: 3, name: 'Perfect 4th (Fa)' },
  { num: 7, den: 5, name: 'Tritone (Fi)' },
  { num: 3, den: 2, name: 'Perfect 5th (So)' },
  { num: 8, den: 5, name: 'Minor 6th (Le)' },
  { num: 5, den: 3, name: 'Major 6th (La)' },
  { num: 7, den: 4, name: 'Harmonic 7th (Te)' },
  { num: 15, den: 8, name: 'Major 7th (Ti)' },
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
        name: base.name,
        ratio: { kind: 'rational', num: reduced.num, den: reduced.den },
        octaves: oct,
        distCents,
      });
    }
  }

  // Also include integer harmonic overtones 1..12
  for (let h = 1; h <= 12; h++) {
    const oct = Math.log2(h);
    if (oct < minOct - 0.01 || oct > maxOct + 0.01) continue;
    const key = `${h}/1`;
    if (!candidates.has(key)) {
      candidates.set(key, {
        label: `${h}x`,
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
