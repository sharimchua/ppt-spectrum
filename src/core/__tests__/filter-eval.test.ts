import { describe, it, expect } from 'vitest';
import {
  resolveEndpoint,
  rangeCoordinate,
  evaluateSpanMatch,
  evaluateRangeMatch,
  evaluateCycleMatch,
  combineMatches,
  applyFilterAction,
  compileFilterForWorklet,
  computeOnsetGates,
} from '../filter-eval';
import { Filter, RangeCondition, CycleCondition } from '../filter-types';

describe('filter-eval', () => {
  describe('resolveEndpoint', () => {
    it('resolves d coordinates to pitch height x = -d', () => {
      expect(resolveEndpoint({ unit: 'd', value: 2.0 })).toBe(-2.0);
      expect(resolveEndpoint({ unit: 'd', value: -1.5 })).toBe(1.5);
    });

    it('resolves frequencies in Hz relative to tplHz', () => {
      // At tplHz = 25.8 Hz, 25.8 Hz resolves to x = log2(25.8 / 25.8) = 0.0
      expect(resolveEndpoint({ unit: 'hz', value: 25.8 }, 25.8)).toBeCloseTo(0.0, 5);
      // 51.6 Hz is one octave above 25.8 Hz => x = 1.0
      expect(resolveEndpoint({ unit: 'hz', value: 51.6 }, 25.8)).toBeCloseTo(1.0, 5);
    });

    it('resolves tempo in BPM', () => {
      // 60 BPM = 1 Hz. log2(1 / 25.8) â‰ˆ -4.689
      const expected = Math.log2(1.0 / 25.8);
      expect(resolveEndpoint({ unit: 'bpm', value: 60 }, 25.8)).toBeCloseTo(expected, 4);
    });

    it('resolves rational and real ratios to log2(ratio)', () => {
      expect(resolveEndpoint({ unit: 'ratio', ratio: { kind: 'rational', num: 2, den: 1 } })).toBeCloseTo(1.0, 5);
      expect(resolveEndpoint({ unit: 'ratio', ratio: { kind: 'rational', num: 3, den: 2 } })).toBeCloseTo(Math.log2(1.5), 5);
      expect(resolveEndpoint({ unit: 'ratio', ratio: { kind: 'real', value: 4.0 } })).toBeCloseTo(2.0, 5);
    });

    it('resolves cents to octaves (cents / 1200)', () => {
      expect(resolveEndpoint({ unit: 'cents', value: 1200 })).toBeCloseTo(1.0, 5);
      expect(resolveEndpoint({ unit: 'cents', value: 400 })).toBeCloseTo(1 / 3, 5);
      expect(resolveEndpoint({ unit: 'cents', value: -300 })).toBeCloseTo(-0.25, 5);
    });

    it('resolves EDO step notations with default 2/1 and custom periods', () => {
      // 7 steps of 12-EDO with standard 2/1 octave
      expect(resolveEndpoint({ unit: 'edo', steps: 7, divisions: 12 })).toBeCloseTo(7 / 12, 5);
      // 4 steps of 19-EDO with 3/1 tritave period
      expect(
        resolveEndpoint({
          unit: 'edo',
          steps: 4,
          divisions: 19,
          period: { kind: 'rational', num: 3, den: 1 },
        })
      ).toBeCloseTo((4 / 19) * Math.log2(3.0), 5);
    });
  });

  describe('rangeCoordinate', () => {
    it('computes coordinate correctly for absolute, scene, and anchor references', () => {
      const partialD = 1.0;
      const sceneD = 2.0;
      const anchorD = 1.5;

      expect(rangeCoordinate(partialD, 'absolute', sceneD, anchorD)).toBe(-1.0);
      expect(rangeCoordinate(partialD, 'scene', sceneD, anchorD)).toBe(1.0);
      expect(rangeCoordinate(partialD, 'anchor', sceneD, anchorD)).toBe(0.5);
    });
  });

  describe('evaluateSpanMatch', () => {
    const span = {
      lo: { unit: 'd' as const, value: 2.0 }, // x_lo = -2.0
      hi: { unit: 'd' as const, value: 0.0 }, // x_hi = 0.0
    };

    it('returns 1.0 inside span bounds', () => {
      expect(evaluateSpanMatch(-1.0, span, 1.0, null)).toBe(1.0);
      expect(evaluateSpanMatch(-2.0, span, 1.0, null)).toBe(1.0);
      expect(evaluateSpanMatch(0.0, span, 1.0, null)).toBe(1.0);
    });

    it('evaluates raised-cosine transition skirt outside span', () => {
      // Midpoint of softness transition (distance = 0.5 * softness)
      // x = 0.5 is 0.5 units above hi (0.0). With softness = 1.0:
      // dist = 0.5, cos(pi * 0.5) = 0 => gain = 0.5 * (1 + 0) = 0.5
      expect(evaluateSpanMatch(0.5, span, 1.0, null)).toBeCloseTo(0.5, 4);

      // Distance >= softness => gain 0.0
      expect(evaluateSpanMatch(1.0, span, 1.0, null)).toBe(0.0);
      expect(evaluateSpanMatch(2.5, span, 1.0, null)).toBe(0.0);
    });

    it('supports unbounded low-pass and high-pass spans', () => {
      const lowPassSpan = {
        lo: null,
        hi: { unit: 'd' as const, value: 0.0 }, // x <= 0.0
      };
      expect(evaluateSpanMatch(-10.0, lowPassSpan, 1.0, null)).toBe(1.0);
      expect(evaluateSpanMatch(0.0, lowPassSpan, 1.0, null)).toBe(1.0);
      expect(evaluateSpanMatch(0.5, lowPassSpan, 1.0, null)).toBeCloseTo(0.5, 4);
      expect(evaluateSpanMatch(1.0, lowPassSpan, 1.0, null)).toBe(0.0);

      const highPassSpan = {
        lo: { unit: 'd' as const, value: 0.0 }, // x >= 0.0
        hi: null,
      };
      expect(evaluateSpanMatch(10.0, highPassSpan, 1.0, null)).toBe(1.0);
      expect(evaluateSpanMatch(0.0, highPassSpan, 1.0, null)).toBe(1.0);
      expect(evaluateSpanMatch(-0.5, highPassSpan, 1.0, null)).toBeCloseTo(0.5, 4);
      expect(evaluateSpanMatch(-1.0, highPassSpan, 1.0, null)).toBe(0.0);
    });

    it('handles period-reduced modular wrapping spans', () => {
      // Octave reduction P = 1.0 (2/1 ratio)
      const period = { kind: 'rational' as const, num: 2, den: 1 };
      // Span from 1100Â¢ (11/12 oct) to 100Â¢ (1/12 oct), wrapping across the 0/1 octave boundary
      const wrapSpan = {
        lo: { unit: 'cents' as const, value: 1100 },
        hi: { unit: 'cents' as const, value: 100 },
      };

      // Inside wrapped interval (either near 1200Â¢ / 0Â¢)
      expect(evaluateSpanMatch(1150 / 1200, wrapSpan, 0.1, period)).toBe(1.0);
      expect(evaluateSpanMatch(50 / 1200, wrapSpan, 0.1, period)).toBe(1.0);
      // In multiple octaves, modular reduction applies
      expect(evaluateSpanMatch(2.0 + 50 / 1200, wrapSpan, 0.1, period)).toBe(1.0);

      // Outside interval (e.g. 600Â¢ = tritone)
      expect(evaluateSpanMatch(600 / 1200, wrapSpan, 0.1, period)).toBe(0.0);
    });
  });

  describe('evaluateRangeMatch', () => {
    it('evaluates union of multiple spans', () => {
      const condition: RangeCondition = {
        kind: 'range',
        id: 'test-multi-span',
        reference: 'absolute',
        reductionPeriod: null,
        spans: [
          { lo: { unit: 'd', value: 4.0 }, hi: { unit: 'd', value: 3.0 } }, // x in [-4, -3]
          { lo: { unit: 'd', value: 1.0 }, hi: { unit: 'd', value: 0.0 } }, // x in [-1, 0]
        ],
        softness: { value: 0.5, unit: 'd' },
      };

      expect(evaluateRangeMatch(-3.5, condition)).toBe(1.0);
      expect(evaluateRangeMatch(-0.5, condition)).toBe(1.0);
      expect(evaluateRangeMatch(-2.0, condition)).toBe(0.0);
    });
  });

  describe('evaluateCycleMatch', () => {
    it('evaluates 4-division on-grid slot weights and rotations', () => {
      const condition: CycleCondition = {
        kind: 'cycle',
        id: 'cond-backbeat',
        divisions: 4,
        slotWeights: [0.0, 1.0, 0.0, 1.0], // Backbeat: slots 1 and 3 active
        rotation: 0,
        tolerance: 0.25,
        offGridMatch: 0.0,
        supercycle: null,
      };

      // Downbeat (slot 0) should have weight 0
      expect(evaluateCycleMatch(0.0, condition)).toBe(0.0);
      // Slot 1 (t = 0.25 turns) should be 1.0
      expect(evaluateCycleMatch(0.25, condition)).toBe(1.0);
      // Slot 2 (t = 0.50 turns) should be 0.0
      expect(evaluateCycleMatch(0.50, condition)).toBe(0.0);
      // Slot 3 (t = 0.75 turns) should be 1.0
      expect(evaluateCycleMatch(0.75, condition)).toBe(1.0);
    });

    it('correctly handles boundary wrap when u is very close to 1.0', () => {
      const condition: CycleCondition = {
        kind: 'cycle',
        id: 'cond-downbeat',
        divisions: 4,
        slotWeights: [1.0, 0.0, 0.0, 0.0], // Only slot 0 is active
        rotation: 0,
        tolerance: 0.25,
        offGridMatch: 0.0,
        supercycle: null,
      };

      // Near end of cycle (u = 0.999 turns) should round to slot 0 of next cycle
      expect(evaluateCycleMatch(0.999, condition)).toBe(1.0);
      expect(evaluateCycleMatch(1.001, condition)).toBe(1.0);
    });

    it('evaluates supercycle cycle weights', () => {
      const condition: CycleCondition = {
        kind: 'cycle',
        id: 'cond-supercycle',
        divisions: 1,
        slotWeights: [1.0],
        rotation: 0,
        tolerance: 0.5,
        offGridMatch: 0.0,
        supercycle: {
          length: 4,
          cycleWeights: [1.0, 1.0, 1.0, 0.0], // 3-of-4: cycle 3 muted
        },
      };

      expect(evaluateCycleMatch(0.0, condition)).toBe(1.0); // Cycle 0
      expect(evaluateCycleMatch(1.0, condition)).toBe(1.0); // Cycle 1
      expect(evaluateCycleMatch(2.0, condition)).toBe(1.0); // Cycle 2
      expect(evaluateCycleMatch(3.0, condition)).toBe(0.0); // Cycle 3 (muted)
      expect(evaluateCycleMatch(4.0, condition)).toBe(1.0); // Cycle 4 wraps to 0
    });
  });

  describe('combineMatches and applyFilterAction', () => {
    it('combines matches using Zadeh fuzzy min (all) and max (any)', () => {
      expect(combineMatches([0.8, 0.4, 0.9], 'all', 'keep')).toBe(0.4);
      expect(combineMatches([0.8, 0.4, 0.9], 'any', 'keep')).toBe(0.9);
      // Empty matches return neutral element
      expect(combineMatches([], 'all', 'keep')).toBe(1.0);
      expect(combineMatches([], 'all', 'remove')).toBe(0.0);
    });

    it('applies action and depth attenuation', () => {
      // Keep: g = 1 - depth * (1 - m)
      expect(applyFilterAction(1.0, 'keep', 1.0)).toBe(1.0);
      expect(applyFilterAction(0.0, 'keep', 1.0)).toBe(0.0);
      expect(applyFilterAction(0.0, 'keep', 0.5)).toBe(0.5);

      // Remove: g = 1 - depth * m
      expect(applyFilterAction(1.0, 'remove', 1.0)).toBe(0.0);
      expect(applyFilterAction(0.0, 'remove', 1.0)).toBe(1.0);
      expect(applyFilterAction(1.0, 'remove', 0.6)).toBeCloseTo(0.4, 5);
    });
  });

  describe('compileFilterForWorklet and computeOnsetGates', () => {
    it('compiles filter into lightweight worklet contract', () => {
      const filter: Filter = {
        enabled: true,
        name: 'Test Filter',
        action: 'remove',
        combine: 'any',
        depth: 0.8,
        conditions: [
          {
            kind: 'cycle',
            id: 'c1',
            divisions: 8,
            slotWeights: [1, 0, 1, 0, 1, 0, 1, 0],
            rotation: 1,
            tolerance: 0.2,
            offGridMatch: 0.1,
            supercycle: { length: 2, cycleWeights: [1, 0.5] },
          },
        ],
        focus: null,
        centreD: 0,
        widthD: 4,
        softnessD: 1,
        mode: 'band-pass',
        trackingMode: 'fixed',
      };

      const compiled = compileFilterForWorklet(filter);
      expect(compiled.enabled).toBe(true);
      expect(compiled.action).toBe(1); // remove
      expect(compiled.combine).toBe(1); // any
      expect(compiled.depth).toBe(0.8);
      expect(compiled.hasCycle).toBe(true);
      expect(compiled.cycles).toHaveLength(1);
      expect(compiled.cycles[0].divisions).toBe(8);
      expect(compiled.cycles[0].rotation).toBe(1);
    });

    it('computes onset gates buffer into preallocated Float32Array', () => {
      const filter: Filter = {
        enabled: true,
        name: 'Downbeat Gate',
        action: 'keep',
        combine: 'all',
        depth: 1.0,
        conditions: [
          {
            kind: 'cycle',
            id: 'c1',
            divisions: 4,
            slotWeights: [1, 0, 0, 0], // Only downbeat passes
            rotation: 0,
            tolerance: 0.25,
            offGridMatch: 0.0,
            supercycle: null,
          },
        ],
        focus: null,
        centreD: 0,
        widthD: 4,
        softnessD: 1,
        mode: 'band-pass',
        trackingMode: 'fixed',
      };

      const out = new Float32Array(4);
      computeOnsetGates(
        filter,
        {
          partialD: 0,
          ratio: { kind: 'rational', num: 4, den: 1 },
          phase: 0,
          placementD: 0,
          sceneD: 0,
        },
        0.0,
        1.0,
        out
      );

      // Slot 0 (t=0) is 1, slots 1, 2, 3 are 0
      expect(out[0]).toBe(1.0);
      expect(out[1]).toBe(0.0);
      expect(out[2]).toBe(0.0);
      expect(out[3]).toBe(0.0);
    });

    it('bypasses disabled conditions (enabled: false) during evaluation and compilation', () => {
      const filter: Filter = {
        name: 'Disabled Condition Test',
        enabled: true,
        action: 'keep',
        combine: 'all',
        depth: 1.0,
        conditions: [
          {
            kind: 'cycle',
            id: 'c1',
            enabled: false, // Disabled condition should be ignored
            divisions: 4,
            slotWeights: [1, 0, 0, 0],
            rotation: 0,
            tolerance: 0.25,
            offGridMatch: 0.0,
            supercycle: null,
          },
        ],
        focus: null,
        centreD: 0,
        widthD: 4,
        softnessD: 1,
        mode: 'band-pass',
        trackingMode: 'fixed',
      };

      const out = new Float32Array(4);
      computeOnsetGates(
        filter,
        {
          partialD: 0,
          ratio: { kind: 'rational', num: 4, den: 1 },
          phase: 0,
          placementD: 0,
          sceneD: 0,
        },
        0.0,
        1.0,
        out
      );

      // Since the only condition is disabled, all slots should pass with 1.0 gain
      expect(out[0]).toBe(1.0);
      expect(out[1]).toBe(1.0);
      expect(out[2]).toBe(1.0);
      expect(out[3]).toBe(1.0);

      // Worklet compilation should report enabled: false when all conditions are disabled
      const compiled = compileFilterForWorklet(filter);
      expect(compiled.enabled).toBe(false);
      expect(compiled.cycles.length).toBe(0);
    });
  });
});
