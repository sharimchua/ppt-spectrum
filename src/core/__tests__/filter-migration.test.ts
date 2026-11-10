import { describe, it, expect } from 'vitest';
import {
  bandFilterToFilter,
  legacyBandFilterGain,
  sanitiseFilter,
  DEFAULT_FILTER,
} from '../filter-migration';
import { evaluateDutyGain } from '../filter-eval';
import { BandFilter } from '../types';

describe('filter-migration', () => {
  describe('Golden Equivalence between legacy BandFilter and migrated Filter', () => {
    const modes: Array<'band-pass' | 'low-pass' | 'high-pass'> = ['band-pass', 'low-pass', 'high-pass'];
    const trackings: Array<'fixed' | 'relative'> = ['fixed', 'relative'];

    for (const mode of modes) {
      for (const tracking of trackings) {
        it(`matches legacy gain for mode=${mode}, tracking=${tracking}`, () => {
          const legacy: BandFilter = {
            enabled: true,
            centreD: 0.5,
            widthD: 3.0,
            softnessD: 1.0,
            mode,
            trackingMode: tracking,
          };

          const modern = bandFilterToFilter(legacy);
          const fundamentalD = 1.5;

          // Sweep partialD across continuum from -6 to +6 in 0.25 step increments
          for (let partialD = -6.0; partialD <= 6.0; partialD += 0.25) {
            const expected = legacyBandFilterGain(partialD, legacy, fundamentalD);
            const actual = evaluateDutyGain(modern, {
              partialD,
              ratio: { kind: 'real', value: 1.0 },
              phase: 0,
              placementD: fundamentalD,
              sceneD: fundamentalD,
            });

            expect(actual).toBeCloseTo(expected, 3);
          }
        });
      }
    }
  });

  describe('sanitiseFilter', () => {
    it('returns DEFAULT_FILTER when input is null, undefined, or empty', () => {
      expect(sanitiseFilter(null)).toEqual(DEFAULT_FILTER);
      expect(sanitiseFilter(undefined)).toEqual(DEFAULT_FILTER);
      expect(sanitiseFilter({})).toEqual(DEFAULT_FILTER);
    });

    it('migrates legacy BandFilter JSON objects from localStorage', () => {
      const rawLegacy = {
        enabled: true,
        centreD: 1.2,
        widthD: 2.5,
        softnessD: 0.8,
        mode: 'low-pass',
        trackingMode: 'relative',
      };

      const result = sanitiseFilter(rawLegacy);
      expect(result.enabled).toBe(true);
      expect(result.conditions).toHaveLength(1);
      expect(result.conditions[0].kind).toBe('range');
      expect((result.conditions[0] as { reference: string }).reference).toBe('scene');
    });

    it('clamps modern Filter depths, divisions, and weights', () => {
      const modernRaw = {
        enabled: true,
        name: 'Custom Filter',
        action: 'keep',
        combine: 'all',
        depth: 2.5, // Should clamp to 1.0
        conditions: [
          {
            kind: 'cycle',
            id: 'c-test',
            divisions: 120, // Should clamp to MAX_DIVISIONS (64)
            slotWeights: [5.0, -1.0], // Should clamp to 1.0 and 0.0
            rotation: 2,
            tolerance: 0.9, // Should clamp to 0.5
            offGridMatch: -0.5, // Should clamp to 0.0
          },
        ],
      };

      const result = sanitiseFilter(modernRaw);
      expect(result.depth).toBe(1.0);
      const cycleCond = result.conditions[0] as {
        divisions: number;
        slotWeights: number[];
        tolerance: number;
        offGridMatch: number;
      };
      expect(cycleCond.divisions).toBe(64);
      expect(cycleCond.slotWeights[0]).toBe(1.0);
      expect(cycleCond.slotWeights[1]).toBe(0.0);
      expect(cycleCond.tolerance).toBe(0.5);
      expect(cycleCond.offGridMatch).toBe(0.0);
    });
  });
});
