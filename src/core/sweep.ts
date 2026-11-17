/**
 * Pure bookmark continuum sweep timing and easing calculations.
 * Computes four-phase cyclical progression (A -> dwell -> B -> dwell) with cosine easing.
 */

export interface SweepTimingConfig {
  periodSec?: number;
  dwellSec?: number;
}

export interface SweepTiming {
  transitMs: number;
  dwellMs: number;
  totalCycleMs: number;
}

/**
 * Computes cycle timing components from period and dwell duration specifications.
 */
export function computeSweepTiming(config: SweepTimingConfig): SweepTiming {
  const transitMs = Math.max(0.5, (config.periodSec || 10) / 2) * 1000;
  const dwellMs = Math.max(0, config.dwellSec ?? 1.5) * 1000;
  const totalCycleMs = Math.max(100, 2 * transitMs + 2 * dwellMs);
  return { transitMs, dwellMs, totalCycleMs };
}

/**
 * Computes normalised progress [0, 1] across the 4-phase continuum sweep:
 * Phase 1: Cosine glide from A (0.0) to B (1.0)
 * Phase 2: Dwell hold at B (1.0)
 * Phase 3: Cosine glide from B (1.0) back to A (0.0)
 * Phase 4: Dwell hold at A (0.0)
 */
export function sweepProgress(cycleTimeMs: number, timing: SweepTiming): number {
  const { transitMs, dwellMs, totalCycleMs } = timing;
  const cycleTime = ((cycleTimeMs % totalCycleMs) + totalCycleMs) % totalCycleMs;

  if (cycleTime < transitMs) {
    // Phase 1: Glide from Bookmark A to Bookmark B (Smooth Cosine Ease)
    const tNorm = cycleTime / transitMs;
    return (1 - Math.cos(Math.PI * tNorm)) * 0.5;
  } else if (cycleTime < transitMs + dwellMs) {
    // Phase 2: Dwell / Hold rock-steady at Bookmark B
    return 1.0;
  } else if (cycleTime < 2 * transitMs + dwellMs) {
    // Phase 3: Glide from Bookmark B back to Bookmark A (Smooth Cosine Ease)
    const tNorm = (cycleTime - (transitMs + dwellMs)) / transitMs;
    return (1 + Math.cos(Math.PI * tNorm)) * 0.5;
  } else {
    // Phase 4: Dwell / Hold rock-steady at Bookmark A
    return 0.0;
  }
}

export type SweepDirection = 1 | -1;

/**
 * Returns the sweep travel direction at a given cycle time (1 = A->B, -1 = B->A).
 */
export function getSweepDirectionAtTime(cycleTimeMs: number, timing: SweepTiming): SweepDirection {
  const { transitMs, dwellMs, totalCycleMs } = timing;
  const cycleTime = ((cycleTimeMs % totalCycleMs) + totalCycleMs) % totalCycleMs;
  if (cycleTime < transitMs + dwellMs) {
    return 1;
  }
  return -1;
}

/**
 * Computes the phase offset (ms) into the 4-phase cycle corresponding to `currentD`
 * between `startD` (Bookmark A) and `targetD` (Bookmark B), preserving `direction`
 * so starting or resuming a sweep never jumps back to Bookmark A.
 */
export function computeSweepPhaseOffsetMs(
  currentD: number,
  startD: number,
  targetD: number,
  timing: SweepTiming,
  direction: SweepDirection = 1
): number {
  const span = targetD - startD;
  if (Math.abs(span) < 1e-6) return 0;

  const norm = Math.max(0, Math.min(1, (currentD - startD) / span));

  if (direction === 1) {
    // Invert (1 - cos(PI * tNorm)) * 0.5 = norm -> cos(PI * tNorm) = 1 - 2 * norm
    const tNorm = Math.acos(Math.max(-1, Math.min(1, 1 - 2 * norm))) / Math.PI;
    return tNorm * timing.transitMs;
  }

  // Invert (1 + cos(PI * tNorm)) * 0.5 = norm -> cos(PI * tNorm) = 2 * norm - 1
  const tNormBack = Math.acos(Math.max(-1, Math.min(1, 2 * norm - 1))) / Math.PI;
  return timing.transitMs + timing.dwellMs + tNormBack * timing.transitMs;
}
