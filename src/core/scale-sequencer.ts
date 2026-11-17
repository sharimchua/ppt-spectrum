/**
 * Pure scale sequencer patterns and deterministic step timing.
 * Parallels sweep.ts for automated playback through active Tuning degrees.
 */

export type SequencePattern = 'ascend' | 'descend' | 'pendulum' | 'triads' | 'fifths-chain';

export const SEQUENCE_PATTERNS: Array<{ id: SequencePattern; label: string; description: string }> = [
  { id: 'ascend', label: 'Ascend', description: 'Walk upwards through active tuning degrees' },
  { id: 'descend', label: 'Descend', description: 'Walk downwards through active tuning degrees' },
  { id: 'pendulum', label: 'Pendulum', description: 'Sweep up and back down smoothly' },
  { id: 'triads', label: 'Triad Steps', description: 'Arpeggiate in skipped-degree triadic steps' },
  { id: 'fifths-chain', label: '3:2 Chain', description: 'Jump through degrees by fifth-like steps' },
];

/**
 * Generates an ordered list of degree indices [0..degreeCount-1] for a given pattern.
 */
export function buildSequenceIndices(degreeCount: number, pattern: SequencePattern): number[] {
  if (degreeCount <= 0) return [];
  if (degreeCount === 1) return [0];

  switch (pattern) {
    case 'ascend':
      return Array.from({ length: degreeCount }, (_, i) => i);

    case 'descend':
      return Array.from({ length: degreeCount }, (_, i) => degreeCount - 1 - i);

    case 'pendulum': {
      const up = Array.from({ length: degreeCount }, (_, i) => i);
      const down = Array.from({ length: Math.max(0, degreeCount - 2) }, (_, i) => degreeCount - 2 - i);
      return [...up, ...down];
    }

    case 'triads': {
      const result: number[] = [];
      for (let root = 0; root < degreeCount; root++) {
        result.push(root);
        result.push((root + 2) % degreeCount);
        result.push((root + 4) % degreeCount);
      }
      return result;
    }

    case 'fifths-chain': {
      let step = Math.max(1, Math.round((degreeCount * 7) / 12));
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      while (step > 1 && gcd(step, degreeCount) !== 1) {
        step--;
      }
      const result: number[] = [];
      for (let i = 0; i < degreeCount; i++) {
        result.push((i * step) % degreeCount);
      }
      return result;
    }
  }
}

/**
 * Evaluates the current sequence step position and target degree index at `elapsedMs`.
 */
export function evaluateSequenceStep(
  elapsedMs: number,
  stepDurationMs: number,
  indices: number[]
): { stepPosition: number; degreeIndex: number } {
  if (indices.length === 0) {
    return { stepPosition: 0, degreeIndex: -1 };
  }
  const safeStepMs = Math.max(60, stepDurationMs);
  const totalSteps = indices.length;
  const rawStep = Math.floor(Math.max(0, elapsedMs) / safeStepMs);
  const stepPosition = ((rawStep % totalSteps) + totalSteps) % totalSteps;
  return {
    stepPosition,
    degreeIndex: indices[stepPosition],
  };
}
