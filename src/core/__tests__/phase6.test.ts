import { describe, it, expect } from 'vitest';
import { calculatePlompLevelt, calculateTenneyHeight, calculateGhostFundamental } from '../alignment';
import { PRESET_SHAPES } from '../presets';
import { rationalise } from '../rational';

describe('Phase 6 Features: Alignment & Inharmonicity Models', () => {
  it('computes Plomp-Levelt roughness accurately', () => {
    // Unison: roughness is 0
    expect(calculatePlompLevelt(440, 1.0, 440, 1.0)).toBe(0);

    // Minor second (dissonant): high roughness (~0.18)
    const minorSecondRoughness = calculatePlompLevelt(440, 1.0, 466.16, 1.0);
    expect(minorSecondRoughness).toBeGreaterThan(0.15);

    // Perfect fifth (consonant): significantly lower roughness than minor second
    const fifthRoughness = calculatePlompLevelt(440, 1.0, 660, 1.0);
    expect(fifthRoughness).toBeLessThan(minorSecondRoughness);
  });

  it('calculates Tenney harmonic height correctly', () => {
    // Octave 2/1 -> log2(2 * 1) = 1
    expect(calculateTenneyHeight(2, 1)).toBe(1);

    // Perfect fifth 3/2 -> log2(3 * 2) = log2(6) ≈ 2.585
    expect(calculateTenneyHeight(3, 2)).toBeCloseTo(Math.log2(6), 4);

    // Minor third 6/5 -> log2(30) ≈ 4.906
    expect(calculateTenneyHeight(6, 5)).toBeCloseTo(Math.log2(30), 4);
  });

  it('validates Acoustic Piano inharmonicity preset structure', () => {
    const pianoPreset = PRESET_SHAPES.find((s) => s.id === 'piano');
    expect(pianoPreset).toBeDefined();
    expect(pianoPreset!.id).toBe('piano');
    expect(pianoPreset!.partials.length).toBeGreaterThan(1);

    // Verify first partial is fundamental (1.0)
    const fundamental = pianoPreset!.partials[0];
    expect(fundamental.ratio.kind).toBe('real');
    if (fundamental.ratio.kind === 'real') {
      expect(fundamental.ratio.value).toBeCloseTo(1.0, 3);
    }

    // Verify higher harmonics exhibit positive inharmonic stretch
    const p8 = pianoPreset!.partials[7];
    if (p8.ratio.kind === 'real') {
      // Harmonic 8 stretched: 8 * sqrt(1 + 0.0004 * 64) > 8
      expect(p8.ratio.value).toBeGreaterThan(8.0);
    }
  });

  it('validates ghost fundamental for 3:2 Hemiola across the limen', () => {
    const hemiolaPreset = PRESET_SHAPES.find((s) => s.id === 'hemiola-3-2');
    expect(hemiolaPreset).toBeDefined();

    const f0 = 1.0; // 1 Hz macro rhythm
    const ghost = calculateGhostFundamental(hemiolaPreset!, f0);
    expect(ghost.ghostFreqHz).toBeCloseTo(1.0, 3);
    expect(ghost.cycleDurationSec).toBeCloseTo(1.0, 3);
  });

  it('rationalises arbitrary frequencies to nearest harmonic ratio', () => {
    const r = rationalise(1.5);
    expect(r.num).toBe(3);
    expect(r.den).toBe(2);

    const rQuarter = rationalise(1.25);
    expect(rQuarter.num).toBe(5);
    expect(rQuarter.den).toBe(4);
  });
});
