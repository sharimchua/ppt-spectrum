import { describe, it, expect } from 'vitest';
import { quantisePhaseTo11Limit, decomposeTapIntervals } from '../decompose';

describe('Rhythm Decomposer & 11-Limit Quantiser', () => {
  it('quantises typical rhythmic phase fractions to 11-limit denominators', () => {
    // 0.5 => 1/2
    const half = quantisePhaseTo11Limit(0.5);
    expect(half.p).toBe(1);
    expect(half.q).toBe(2);

    // 0.333... => 1/3
    const third = quantisePhaseTo11Limit(0.3333);
    expect(third.p).toBe(1);
    expect(third.q).toBe(3);

    // 0.25 => 1/4
    const quarter = quantisePhaseTo11Limit(0.25);
    expect(quarter.p).toBe(1);
    expect(quarter.q).toBe(4);

    // 0.2 => 1/5
    const fifth = quantisePhaseTo11Limit(0.2);
    expect(fifth.p).toBe(1);
    expect(fifth.q).toBe(5);
  });

  it('infers polyrhythm candidates from tap intervals', () => {
    // Steady taps every 500ms (120 BPM)
    const timestamps = [1.0, 1.5, 2.0, 2.5, 3.0];
    const candidates = decomposeTapIntervals(timestamps);
    expect(candidates.length).toBeGreaterThan(0);

    const pulse = candidates.find((c) => c.name.includes('Steady Pulse'));
    expect(pulse).toBeDefined();
    expect(pulse?.cyclePeriodSec).toBeCloseTo(0.5, 2);
  });
});
