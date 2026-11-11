import { describe, it, expect } from 'vitest';
import {
  bjorklund,
  sieveWeights,
  createBandPassCondition,
  createLowPassCondition,
  createHighPassCondition,
  createJustTo12TetCondition,
  createOddHarmonicsCondition,
  createPrimeLimitCondition,
  createEuclideanCycleCondition,
  createGridCycleCondition,
  createSupercycleCondition,
  PRESET_FILTERS,
  STARTER_FILTERS,
} from '../filter-presets';
import { resolveEndpoint } from '../filter-eval';

describe('filter-presets', () => {
  describe('bjorklund Euclidean generator', () => {
    it('generates standard Tresillo (3, 8) rhythm pattern', () => {
      // 3 pulses across 8 steps: 3 + 3 + 2
      const tresillo = bjorklund(3, 8);
      expect(tresillo).toHaveLength(8);
      expect(tresillo.filter((w) => w === 1)).toHaveLength(3);
      expect(tresillo).toEqual([1, 0, 0, 1, 0, 0, 1, 0]);
    });

    it('generates Cinquillo (5, 8) rhythm pattern', () => {
      const cinquillo = bjorklund(5, 8);
      expect(cinquillo).toHaveLength(8);
      expect(cinquillo.filter((w) => w === 1)).toHaveLength(5);
      expect(cinquillo).toEqual([1, 0, 1, 1, 0, 1, 1, 0]);
    });

    it('handles boundary pulse counts', () => {
      expect(bjorklund(0, 4)).toEqual([0, 0, 0, 0]);
      expect(bjorklund(4, 4)).toEqual([1, 1, 1, 1]);
    });
  });

  describe('sieveWeights Xenakis residue generator', () => {
    it('generates residue class union', () => {
      // 12 steps, union of every 3rd step (mod 3 = 0) and every 4th step (mod 4 = 1)
      const weights = sieveWeights(12, [
        { modulus: 3, residue: 0 },
        { modulus: 4, residue: 1 },
      ]);
      expect(weights).toHaveLength(12);
      // Step 0: 0 mod 3 == 0 (active)
      expect(weights[0]).toBe(1.0);
      // Step 1: 1 mod 4 == 1 (active)
      expect(weights[1]).toBe(1.0);
      // Step 2: neither (inactive)
      expect(weights[2]).toBe(0.0);
      // Step 3: 3 mod 3 == 0 (active)
      expect(weights[3]).toBe(1.0);
    });
  });

  describe('preset condition generators', () => {
    it('creates acoustic aperture conditions with valid coordinates', () => {
      const bp = createBandPassCondition('scene', 0.0, 4.0, 1.0);
      expect(bp.kind).toBe('range');
      expect(bp.reference).toBe('scene');
      expect(bp.spans).toHaveLength(1);

      const lp = createLowPassCondition('scene', 2.0, 0.5);
      expect(lp.spans[0].lo).toBeNull();
      const lpHi = lp.spans[0].hi;
      expect(lpHi && lpHi.unit === 'd' ? lpHi.value : undefined).toBe(2.0);

      const hp = createHighPassCondition('scene', -1.0, 0.5);
      const hpLo = hp.spans[0].lo;
      expect(hpLo && hpLo.unit === 'd' ? hpLo.value : undefined).toBe(-1.0);
      expect(hp.spans[0].hi).toBeNull();
    });

    it('creates Just <-> 12-TET interval windows', () => {
      const m3Cond = createJustTo12TetCondition('M3', 'anchor');
      expect(m3Cond.spans).toHaveLength(1);
      const span = m3Cond.spans[0];
      expect(span.lo).toEqual({ unit: 'ratio', ratio: { kind: 'rational', num: 5, den: 4 } });
      expect(span.hi).toEqual({ unit: 'edo', steps: 4, divisions: 12 });

      // In octaves, 5/4 is ~0.3219 oct (386.31¢) and 4\12 is ~0.3333 oct (400¢)
      const loX = resolveEndpoint(span.lo!);
      const hiX = resolveEndpoint(span.hi!);
      expect(loX).toBeCloseTo(Math.log2(1.25), 5);
      expect(hiX).toBeCloseTo(4 / 12, 5);
      expect(hiX).toBeGreaterThan(loX);
    });

    it('creates Odd Harmonics conditions', () => {
      const odd = createOddHarmonicsCondition(15);
      expect(odd.spans.length).toBeGreaterThanOrEqual(8);
      // First harmonic is 1/1 (0¢)
      const oddLo = odd.spans[0].lo;
      const oddHi = odd.spans[0].hi;
      expect(oddLo && oddLo.unit === 'cents' ? oddLo.value : undefined).toBe(-12);
      expect(oddHi && oddHi.unit === 'cents' ? oddHi.value : undefined).toBe(12);
    });

    it('creates Prime-limit conditions with octave reduction', () => {
      const limit5 = createPrimeLimitCondition(5);
      expect(limit5.reductionPeriod).toEqual({ kind: 'rational', num: 2, den: 1 });
      expect(limit5.spans.length).toBeGreaterThan(0);
    });

    it('creates Euclidean, grid, and supercycle conditions', () => {
      const euclid = createEuclideanCycleCondition(3, 8);
      expect(euclid.divisions).toBe(8);
      expect(euclid.slotWeights).toEqual([1, 0, 0, 1, 0, 0, 1, 0]);

      const grid = createGridCycleCondition(3, 0.0);
      expect(grid.divisions).toBe(3);
      expect(grid.slotWeights).toEqual([1, 1, 1]);

      const supercycle = createSupercycleCondition(4, [0, 1, 2]);
      expect(supercycle.supercycle?.length).toBe(4);
      expect(supercycle.supercycle?.cycleWeights).toEqual([1, 1, 1, 0]);
    });
  });

  describe('PRESET_FILTERS', () => {
    it('initialises all preset filters with proper category and preset origin', () => {
      expect(PRESET_FILTERS.length).toBeGreaterThanOrEqual(18);
      for (const filter of PRESET_FILTERS) {
        expect(filter.enabled).toBe(true);
        expect(filter.conditions.length).toBeGreaterThan(0);
        expect(filter.id).toBeTruthy();
        expect(filter.origin).toBe('preset');
        expect(['aperture', 'rhythm', 'interval', 'harmonic']).toContain(filter.category);
      }

      // Check key presets across all 4 categories
      const rhythmIds = PRESET_FILTERS.filter((f) => f.category === 'rhythm').map((f) => f.id);
      expect(rhythmIds).toContain('filter-tresillo');
      expect(rhythmIds).toContain('filter-cinquillo');
      expect(rhythmIds).toContain('filter-son-clave');
      expect(rhythmIds).toContain('filter-bossa-clave');
      expect(rhythmIds).toContain('filter-bembe-bell');
      expect(rhythmIds).toContain('filter-backbeat');
      expect(rhythmIds).toContain('filter-reggae-skank');

      const apertureIds = PRESET_FILTERS.filter((f) => f.category === 'aperture').map((f) => f.id);
      expect(apertureIds).toContain('filter-band-pass');
      expect(apertureIds).toContain('filter-high-shimmer');
      expect(apertureIds).toContain('filter-vocal-formant');

      const intervalIds = PRESET_FILTERS.filter((f) => f.category === 'interval').map((f) => f.id);
      expect(intervalIds).toContain('filter-tritone-window');
      expect(intervalIds).toContain('filter-consonant-fifth');
    });
  });

  describe('STARTER_FILTERS', () => {
    it('initialises all starter filters without error', () => {
      expect(STARTER_FILTERS.length).toBeGreaterThanOrEqual(6);
      for (const starter of STARTER_FILTERS) {
        const filter = starter.build();
        expect(filter.enabled).toBe(true);
        expect(filter.conditions.length).toBeGreaterThan(0);
        expect(filter.name).toBeTruthy();
      }
    });
  });
});
