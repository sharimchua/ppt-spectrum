import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { freqToD, dToFreq, bpmToD, resolveDuPeriodAddress, freqToPitchRegister } from '../axis';
import { gcd, lcm, reduceRational, rationalise, primeFactors, primeLimit } from '../rational';
import { calculateGhostFundamental, calculatePlompLevelt } from '../alignment';
import { calculateFilterGain } from '../shape';
import { PRESET_SHAPES, createPianoPartials } from '../presets';
import { TPL_FREQUENCY_HZ } from '../ppt-constants';
import { loadSavedScene, saveScene, STORAGE_KEY_GRAPHICS_PROFILE, DEFAULT_SCENE } from '../config';

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

  it('converts frequencies to pitch register and cent deviation', () => {
    // 440 Hz -> A4 ±0¢
    const a4 = freqToPitchRegister(440, 440);
    expect(a4.note).toBe('A');
    expect(a4.octave).toBe(4);
    expect(a4.cents).toBe(0);
    expect(a4.formatted).toBe('A4 ±0¢');

    // Middle C (261.63 Hz) -> C4 ±0¢
    const c4 = freqToPitchRegister(261.63, 440);
    expect(c4.note).toBe('C');
    expect(c4.octave).toBe(4);
    expect(Math.abs(c4.cents)).toBeLessThanOrEqual(1);

    // Microtonal pitch (445 Hz) -> A4 +20¢
    const micro = freqToPitchRegister(445, 440);
    expect(micro.note).toBe('A');
    expect(micro.octave).toBe(4);
    expect(micro.cents).toBeGreaterThan(15);
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

  it('supports relative fundamental tracking mode', () => {
    const filter = {
      enabled: true,
      centreD: 0.0, // exactly at fundamental
      widthD: 2.0,
      softnessD: 1.0,
      mode: 'band-pass' as const,
      trackingMode: 'relative' as const,
    };

    // When fundamental is placed at d = 3.5:
    // Effective center is 3.5 + 0.0 = 3.5.
    // At d = 3.5, gain is 1.0.
    expect(calculateFilterGain(3.5, filter, 3.5)).toBe(1.0);
    // At d = 0.0 (far from fundamental), gain is 0.0.
    expect(calculateFilterGain(0.0, filter, 3.5)).toBe(0.0);

    // If fundamental moves to d = -2.0:
    // Effective center is -2.0.
    expect(calculateFilterGain(-2.0, filter, -2.0)).toBe(1.0);
    expect(calculateFilterGain(3.5, filter, -2.0)).toBe(0.0);
  });
});

describe('Presets & Piano Inharmonicity', () => {
  it('organises presets into rhythmic, harmonic, and timbral categories', () => {
    const rhythmPresets = PRESET_SHAPES.filter((s) => s.category === 'rhythm');
    const harmonyPresets = PRESET_SHAPES.filter((s) => s.category === 'harmony');
    const timbrePresets = PRESET_SHAPES.filter((s) => s.category === 'timbre');

    expect(rhythmPresets.length).toBeGreaterThanOrEqual(5);
    expect(harmonyPresets.length).toBeGreaterThanOrEqual(4);
    expect(timbrePresets.length).toBeGreaterThanOrEqual(5);

    // 4-on-the-floor exists in rhythmic
    expect(rhythmPresets.some((s) => s.id === 'four-on-the-floor')).toBe(true);
    // Major triad and Dominant 7th exist in harmonies
    expect(harmonyPresets.some((s) => s.id === 'major-triad-4-5-6')).toBe(true);
    expect(harmonyPresets.some((s) => s.id === 'dominant-7th-4-5-6-7')).toBe(true);
    // Piano exists in timbral
    expect(timbrePresets.some((s) => s.id === 'piano')).toBe(true);
  });
  it('includes duple presets (1:2 and 1:4)', () => {
    const duple12 = PRESET_SHAPES.find((s) => s.id === 'duple-1-2');
    const duple14 = PRESET_SHAPES.find((s) => s.id === 'duple-1-4');
    expect(duple12).toBeDefined();
    expect(duple14).toBeDefined();
    expect(duple12?.partials.length).toBe(2);
    expect(duple14?.partials.length).toBe(3);
  });

  it('generates acoustic piano inharmonic partials with stretch coefficient B', () => {
    const piano = PRESET_SHAPES.find((s) => s.id === 'piano');
    expect(piano).toBeDefined();
    expect(piano?.partials.length).toBeGreaterThanOrEqual(10);

    const partials = createPianoPartials(8, 0.0004);
    // 1st partial is fundamental ratio 1 * sqrt(1 + 0.0004) ≈ 1.0002
    expect(partials[0].ratio.kind).toBe('real');
    if (partials[0].ratio.kind === 'real') {
      expect(partials[0].ratio.value).toBeCloseTo(1.0, 3);
    }
    // 8th partial has noticeable stretch > 8
    if (partials[7].ratio.kind === 'real') {
      expect(partials[7].ratio.value).toBeGreaterThan(8.0);
    }
  });

  it('calculates ghost fundamental of inharmonic piano string close to f0 rather than 7 octaves below', () => {
    const piano = PRESET_SHAPES.find((s) => s.id === 'piano')!;
    const f0 = 100.0;
    const ghost = calculateGhostFundamental(piano, f0);
    // Ghost fundamental must match f0 (100 Hz), NOT drop to f0 / 100 (1 Hz)
    expect(ghost.ghostFreqHz).toBeCloseTo(f0, 1);
    expect(ghost.ghostD).toBeCloseTo(freqToD(f0), 2);
  });
});

describe('Graphics Profile Persistence & Restoration', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, val: string) => {
          mockStorage[key] = val;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          mockStorage = {};
        },
      },
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('persists and restores performance profile across saves', () => {
    const scene = {
      ...DEFAULT_SCENE,
      cosmetics: {
        ...DEFAULT_SCENE.cosmetics,
        performanceProfile: 'max' as const,
      },
    };

    saveScene(scene);
    expect(mockStorage[STORAGE_KEY_GRAPHICS_PROFILE]).toBe('max');

    const restored = loadSavedScene();
    expect(restored.cosmetics.performanceProfile).toBe('max');
  });

  it('preserves none profile and prioritises dedicated profile storage', () => {
    const scene = {
      ...DEFAULT_SCENE,
      cosmetics: {
        ...DEFAULT_SCENE.cosmetics,
        performanceProfile: 'none' as const,
      },
    };

    saveScene(scene);
    expect(mockStorage[STORAGE_KEY_GRAPHICS_PROFILE]).toBe('none');

    const restored = loadSavedScene();
    expect(restored.cosmetics.performanceProfile).toBe('none');
  });
});
