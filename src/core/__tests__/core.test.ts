import { describe, it, expect } from 'vitest';
import { freqToD, dToFreq, bpmToD, resolveDuPeriodAddress } from '../axis';
import { gcd, lcm, reduceRational, rationalise, primeFactors, primeLimit } from '../rational';
import { calculateGhostFundamental, calculatePlompLevelt } from '../alignment';
import { calculateFilterGain } from '../shape';
import { PRESET_SHAPES } from '../presets';
import { TPL_FREQUENCY_HZ } from '../ppt-constants';

describe('Axis Mathematics', () => {
  it('round-trips frequency and DuPeriod d accurately', () => {
    const freqs = [1.0, 10.0, 25.8, 40.0, 100.0, 440.0, 1000.0, 15000.0];
    for (const f of freqs) {
      const d = freqToD(f);
      const recovered = dToFreq(d);
      expect(recovered).toBeCloseTo(f, 4);
    }
  });

  it('verifies TPL landmarks', () => {
    expect(freqToD(TPL_FREQUENCY_HZ)).toBeCloseTo(0.0, 6);
    expect(dToFreq(0.0)).toBeCloseTo(TPL_FREQUENCY_HZ, 6);
    // 120 BPM = 2 Hz => d ≈ +3.69
    expect(bpmToD(120)).toBeCloseTo(3.689, 2);
    // A4 = 440 Hz => d ≈ -4.09
    expect(freqToD(440)).toBeCloseTo(-4.092, 2);
  });

  it('resolves DuPeriod addresses correctly', () => {
    const addrTpl = resolveDuPeriodAddress(0.0);
    expect(addrTpl.syllable).toBe('Do');

    // 440 Hz is d ≈ -4.09 => Band -5, Ra
    const addrA440 = resolveDuPeriodAddress(freqToD(440));
    expect(addrA440.band).toBe(-5);
    expect(addrA440.syllable).toBe('Ra');
  });
});

describe('Rational Algebra & Prime Limits', () => {
  it('computes exact GCD and LCM', () => {
    expect(gcd(12, 18)).toBe(6);
    expect(lcm(4, 6)).toBe(12);
    expect(reduceRational(15, 20)).toEqual({ num: 3, den: 4 });
  });

  it('rationalises real values via continued fractions', () => {
    const r1 = rationalise(1.5);
    expect(r1).toEqual({ num: 3, den: 2 });
    const r2 = rationalise(1.25);
    expect(r2).toEqual({ num: 5, den: 4 });
  });

  it('computes prime factors and limits', () => {
    expect(primeFactors(12)).toEqual([2, 2, 3]);
    expect(primeLimit(12)).toBe(3);
    expect(primeFactors(35)).toEqual([5, 7]);
    expect(primeLimit(35)).toBe(7);
  });
});

describe('Alignment & Ghost Fundamental', () => {
  it('computes ghost fundamental for a 3:2 hemiola / fifth', () => {
    const hemiola = PRESET_SHAPES.find((s) => s.id === 'hemiola-3-2')!;
    const f0 = 100;
    const ghost = calculateGhostFundamental(hemiola, f0);
    // Ratios are 2 and 3 => GCD is 1 => ghost freq = 100 Hz * 1 = 100 Hz
    expect(ghost.ghostFreqHz).toBe(100);
    expect(ghost.cycleDurationSec).toBe(0.01);
  });

  it('evaluates Plomp-Levelt roughness', () => {
    // Unison has zero roughness
    expect(calculatePlompLevelt(440, 1.0, 440, 1.0)).toBe(0);
    // Dissonance peaking near critical bandwidth fraction
    const roughnessCents50 = calculatePlompLevelt(440, 1.0, 452, 1.0);
    expect(roughnessCents50).toBeGreaterThan(0);
  });
});

describe('BandFilter', () => {
  it('applies raised-cosine window smoothly', () => {
    const filter = {
      enabled: true,
      centreD: 0.0,
      widthD: 2.0,
      softnessD: 1.0,
      mode: 'band-pass' as const,
    };
    // Centre has gain 1.0
    expect(calculateFilterGain(0.0, filter)).toBe(1.0);
    // Edge of flat top has gain 1.0
    expect(calculateFilterGain(1.0, filter)).toBe(1.0);
    // Halfway through softness (d = 1.5) has gain 0.5
    expect(calculateFilterGain(1.5, filter)).toBeCloseTo(0.5, 3);
    // Outside filter has gain 0.0
    expect(calculateFilterGain(2.2, filter)).toBe(0.0);
  });
});
