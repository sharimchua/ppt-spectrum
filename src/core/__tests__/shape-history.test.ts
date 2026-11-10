import { describe, it, expect } from 'vitest';
import {
  createHistory,
  pushHistory,
  stepHistory,
  removeFromHistory,
} from '../shape-history';

describe('shape-history', () => {
  it('creates history initialised to starting shapeId at index 0', () => {
    const h = createHistory('pure-tone');
    expect(h.stack).toEqual(['pure-tone']);
    expect(h.index).toBe(0);
  });

  it('pushes new shapeId and advances index', () => {
    let h = createHistory('s1');
    h = pushHistory(h, 's2');
    expect(h.stack).toEqual(['s1', 's2']);
    expect(h.index).toBe(1);

    // Pushing same shape repeatedly is deduplicated
    h = pushHistory(h, 's2');
    expect(h.stack).toEqual(['s1', 's2']);
    expect(h.index).toBe(1);
  });

  it('truncates redo history when pushing after stepping back', () => {
    let h = createHistory('s1');
    h = pushHistory(h, 's2');
    h = pushHistory(h, 's3');
    expect(h.index).toBe(2);

    // Step back to s2
    const step1 = stepHistory(h, -1);
    expect(step1.shapeId).toBe('s2');
    expect(step1.history.index).toBe(1);

    // Push new s4; s3 should be truncated
    const branched = pushHistory(step1.history, 's4');
    expect(branched.stack).toEqual(['s1', 's2', 's4']);
    expect(branched.index).toBe(2);
  });

  it('guards against stepping out of bounds in both directions', () => {
    let h = createHistory('s1');
    h = pushHistory(h, 's2');

    // Stepping forward when already at top returns unmodified history
    const fwdEnd = stepHistory(h, 1);
    expect(fwdEnd.shapeId).toBeUndefined();
    expect(fwdEnd.history.index).toBe(1);

    // Step back to index 0
    const back1 = stepHistory(h, -1);
    expect(back1.shapeId).toBe('s1');
    expect(back1.history.index).toBe(0);

    // Step back further when at start returns unmodified history
    const backEnd = stepHistory(back1.history, -1);
    expect(backEnd.shapeId).toBeUndefined();
    expect(backEnd.history.index).toBe(0);
  });

  it('removes shape from history and clamps index', () => {
    let h = createHistory('s1');
    h = pushHistory(h, 's2');
    h = pushHistory(h, 's3');
    expect(h.index).toBe(2);

    // Remove active s3
    const removedActive = removeFromHistory(h, 's3');
    expect(removedActive.stack).toEqual(['s1', 's2']);
    expect(removedActive.index).toBe(1);

    // Remove remaining shapes until empty -> fallback
    const removed2 = removeFromHistory(removedActive, 's2');
    const removedAll = removeFromHistory(removed2, 's1', 'fallback-shape');
    expect(removedAll.stack).toEqual(['fallback-shape']);
    expect(removedAll.index).toBe(0);
  });
});
