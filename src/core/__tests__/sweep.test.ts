import { describe, it, expect } from 'vitest';
import { computeSweepTiming, sweepProgress } from '../sweep';

describe('sweep', () => {
  describe('computeSweepTiming', () => {
    it('computes transit, dwell and totalCycle duration with defaults', () => {
      // Default periodSec: 10 -> transit = 5s (5000ms), default dwellSec: 1.5 -> dwell = 1500ms
      const timing = computeSweepTiming({});
      expect(timing.transitMs).toBe(5000);
      expect(timing.dwellMs).toBe(1500);
      expect(timing.totalCycleMs).toBe(2 * 5000 + 2 * 1500); // 13000ms
    });

    it('enforces min transit duration of 0.5s (500ms) and min total cycle of 100ms', () => {
      const timing = computeSweepTiming({ periodSec: 0.1, dwellSec: 0 });
      expect(timing.transitMs).toBe(500);
      expect(timing.dwellMs).toBe(0);
      expect(timing.totalCycleMs).toBe(1000);
    });

    it('handles custom period and dwell settings', () => {
      const timing = computeSweepTiming({ periodSec: 4, dwellSec: 1 });
      expect(timing.transitMs).toBe(2000);
      expect(timing.dwellMs).toBe(1000);
      expect(timing.totalCycleMs).toBe(6000);
    });
  });

  describe('sweepProgress', () => {
    const timing = computeSweepTiming({ periodSec: 4, dwellSec: 1 });
    // transitMs = 2000, dwellMs = 1000, totalCycleMs = 6000

    it('evaluates Phase 1: Cosine glide A -> B [0ms .. 2000ms]', () => {
      expect(sweepProgress(0, timing)).toBeCloseTo(0.0, 5);
      expect(sweepProgress(1000, timing)).toBeCloseTo(0.5, 5); // Halfway cosine ease
      expect(sweepProgress(1999, timing)).toBeCloseTo(1.0, 2);
    });

    it('evaluates Phase 2: Dwell hold at B (1.0) [2000ms .. 3000ms]', () => {
      expect(sweepProgress(2000, timing)).toBe(1.0);
      expect(sweepProgress(2500, timing)).toBe(1.0);
      expect(sweepProgress(2999, timing)).toBe(1.0);
    });

    it('evaluates Phase 3: Cosine glide B -> A [3000ms .. 5000ms]', () => {
      expect(sweepProgress(3000, timing)).toBeCloseTo(1.0, 5);
      expect(sweepProgress(4000, timing)).toBeCloseTo(0.5, 5); // Halfway return glide
      expect(sweepProgress(4999, timing)).toBeCloseTo(0.0, 2);
    });

    it('evaluates Phase 4: Dwell hold at A (0.0) [5000ms .. 6000ms]', () => {
      expect(sweepProgress(5000, timing)).toBe(0.0);
      expect(sweepProgress(5500, timing)).toBe(0.0);
      expect(sweepProgress(5999, timing)).toBe(0.0);
    });

    it('cycles cleanly on exact totalCycle multiples and negative values', () => {
      expect(sweepProgress(6000, timing)).toBeCloseTo(0.0, 5);
      expect(sweepProgress(8000, timing)).toBe(1.0); // 6000 + 2000ms = peak B
      expect(sweepProgress(-1000, timing)).toBe(0.0); // Wrap into Phase 4
    });
  });
});
