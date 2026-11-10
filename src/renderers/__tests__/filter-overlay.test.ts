import { describe, it, expect } from 'vitest';
import {
  getApertureColours,
  endpointToRulerD,
  shouldUseDutyGain,
  computeGhostAlpha,
} from '../filter-render-utils';

describe('filter-render-utils', () => {
  describe('getApertureColours', () => {
    it('returns sky blue palette for keep mode', () => {
      const colours = getApertureColours('keep');
      expect(colours.text).toBe('#38bdf8');
      expect(colours.stroke).toContain('56, 189, 248');
    });

    it('returns rose palette for remove mode', () => {
      const colours = getApertureColours('remove');
      expect(colours.text).toBe('#f43f5e');
      expect(colours.stroke).toContain('244, 63, 94');
    });
  });

  describe('endpointToRulerD', () => {
    it('maps absolute endpoints directly to -x', () => {
      const d1 = endpointToRulerD({ unit: 'd', value: 2.5 }, 'absolute', 0);
      expect(d1).toBeCloseTo(2.5);

      const d2 = endpointToRulerD({ unit: 'hz', value: 4.0 }, 'absolute', 0, 0, 4.0);
      // log2(4.0 / 4.0) = 0 -> d = 0
      expect(d2).toBeCloseTo(0);
    });

    it('maps scene-relative endpoints to sceneD - x', () => {
      // ratio 2/1 -> x = 1 -> rulerD = sceneD - 1
      const d = endpointToRulerD(
        { unit: 'ratio', ratio: { kind: 'rational', num: 2, den: 1 } },
        'scene',
        3.0
      );
      expect(d).toBeCloseTo(2.0);
    });

    it('maps cents endpoints to sceneD - cents / 1200', () => {
      const d = endpointToRulerD({ unit: 'cents', value: 1200 }, 'scene', 4.0);
      expect(d).toBeCloseTo(3.0);
    });
  });

  describe('shouldUseDutyGain (WCAG 2.2 Photosensitivity Rule)', () => {
    it('permits discrete kinetic pulse only at <= 3.0 Hz', () => {
      expect(shouldUseDutyGain(0.5)).toBe(false);
      expect(shouldUseDutyGain(1.0)).toBe(false);
      expect(shouldUseDutyGain(3.0)).toBe(false);
    });

    it('mandates steady-state duty gain for frequencies > 3.0 Hz', () => {
      expect(shouldUseDutyGain(3.01)).toBe(true);
      expect(shouldUseDutyGain(4.0)).toBe(true);
      expect(shouldUseDutyGain(440.0)).toBe(true);
    });
  });

  describe('computeGhostAlpha', () => {
    it('retains ghost floor visibility when fully attenuated', () => {
      const alpha = computeGhostAlpha(0.0, 0.8);
      expect(alpha).toBeCloseTo(0.12);
    });

    it('scales to full base alpha when duty gain is 1.0', () => {
      const alpha = computeGhostAlpha(1.0, 0.8);
      expect(alpha).toBeCloseTo(0.8);
    });

    it('interpolates linearly for intermediate gain values', () => {
      const alpha = computeGhostAlpha(0.5, 0.8);
      expect(alpha).toBeCloseTo(0.46);
    });
  });
});
