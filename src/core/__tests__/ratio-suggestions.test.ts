import { describe, it, expect } from 'vitest';
import {
  ratioToOctaves,
  octavesToRatio,
  getNearbyRatioSuggestions,
  formatRatioShort,
} from '../ratio-suggestions';

describe('Ratio Suggestions & DuMetric Octave Helpers', () => {
  it('converts rational ratios to octaves accurately', () => {
    expect(ratioToOctaves({ kind: 'rational', num: 1, den: 1 })).toBeCloseTo(0, 6);
    expect(ratioToOctaves({ kind: 'rational', num: 2, den: 1 })).toBeCloseTo(1, 6);
    expect(ratioToOctaves({ kind: 'rational', num: 4, den: 1 })).toBeCloseTo(2, 6);
    expect(ratioToOctaves({ kind: 'rational', num: 3, den: 2 })).toBeCloseTo(Math.log2(1.5), 6);
  });

  it('suggests exact nearby rational ratios sorted by cent distance', () => {
    // Near Perfect 5th (log2(1.5) ≈ 0.585)
    const nearP5 = getNearbyRatioSuggestions(Math.log2(1.5), 4);
    expect(nearP5[0].label).toBe('3/2');
    expect(nearP5[0].distCents).toBe(0);

    // Near 5/4 Major 3rd (log2(1.25) ≈ 0.322)
    const nearM3 = getNearbyRatioSuggestions(Math.log2(1.25), 4);
    expect(nearM3[0].label).toBe('5/4');
    expect(nearM3[0].distCents).toBe(0);

    // Sub-octave 1/2 (octaves = -1)
    const nearSubOct = getNearbyRatioSuggestions(-1.0, 4);
    expect(nearSubOct[0].label).toBe('1/2');

    // Near 12-TET Minor 7th (10/12 octaves ≈ 1000¢): includes 12ET m7, Pyth 16/9, Just 9/5, and Septimal 7/4
    const nearM7 = getNearbyRatioSuggestions(10 / 12, 6);
    const tags = nearM7.map((s) => s.shortTag);
    expect(tags).toContain('12ET m7');
    expect(tags).toContain('Pyth m7');
    expect(tags).toContain('Just m7');
    expect(tags).toContain('Harm 7th');
  });

  it('formats ratios and converts octaves back to real ratio', () => {
    expect(formatRatioShort({ kind: 'rational', num: 3, den: 2 })).toBe('3/2');
    expect(formatRatioShort({ kind: 'rational', num: 2, den: 1 })).toBe('2x');
    const r = octavesToRatio(1.0);
    expect(r.kind).toBe('real');
    if (r.kind === 'real') {
      expect(r.value).toBeCloseTo(2.0, 4);
    }
  });
});
