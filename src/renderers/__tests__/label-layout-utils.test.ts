import { describe, it, expect } from 'vitest';
import {
  truncateTextToFit,
  computeTickLabelStep,
  canPlaceHorizontalLabel,
  HorizontalInterval,
} from '../label-layout-utils';

describe('label-layout-utils', () => {
  const monoMeasure = (s: string) => s.length * 6;

  it('truncates long strings with an ellipsis when exceeding maxWidth', () => {
    expect(truncateTextToFit(monoMeasure, 'HARMONIC CADENCE', 200)).toBe('HARMONIC CADENCE');
    expect(truncateTextToFit(monoMeasure, 'HARMONIC CADENCE', 48)).toBe('HARMONI…');
    expect(truncateTextToFit(monoMeasure, 'ABC', 0)).toBe('');
  });

  it('computes power-of-two tick label steps for narrow spans', () => {
    expect(computeTickLabelStep(4, 200, 30)).toBe(1);
    expect(computeTickLabelStep(16, 200, 30)).toBe(4);
    expect(computeTickLabelStep(16, 100, 30)).toBe(8);
  });

  it('prevents overlapping horizontal intervals', () => {
    const occupied: HorizontalInterval[] = [];
    expect(canPlaceHorizontalLabel(100, 20, occupied, 4)).toBe(true);
    expect(canPlaceHorizontalLabel(115, 20, occupied, 4)).toBe(false);
    expect(canPlaceHorizontalLabel(145, 20, occupied, 4)).toBe(true);
  });
});
