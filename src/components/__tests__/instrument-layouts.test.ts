import { describe, it, expect } from 'vitest';
import { createDefaultMidiTuningConfig } from '../../core/midi-tuning';
import {
  buildScaleStripPads,
  buildIsomorphicGrid,
  buildGuitarFretboard,
} from '../keyboard/instrument-layouts';

describe('Alternate Instrument Surfaces', () => {
  it('builds Scale-Degree Strip pads for Pythagorean Pentatonic (2 octaves = 10 pads)', () => {
    const cfg = createDefaultMidiTuningConfig('pythagorean-pentatonic');
    const pads = buildScaleStripPads(cfg, -3.0, 440, 25.8);
    expect(pads.length).toBe(10);
    expect(pads[0].isRoot).toBe(true);
    expect(pads[5].isRoot).toBe(true);
    expect(pads[5].d).toBeCloseTo(pads[0].d - 1.0, 4);
  });

  it('builds 2D Isomorphic Grid with 31-EDO support', () => {
    const cfg = createDefaultMidiTuningConfig('31edo-meantone');
    const grid = buildIsomorphicGrid(4, 8, cfg, -3.0, 440, 25.8);
    expect(grid.length).toBe(4);
    expect(grid[0].length).toBe(8);
    expect(grid[0][0].label).toContain('\\31');
  });

  it('builds 6-string Guitar Fretboard with scale-degree highlighting', () => {
    const cfg = createDefaultMidiTuningConfig('pythagorean-pentatonic');
    const strings = buildGuitarFretboard(12, cfg, -3.0, 440, 25.8);
    expect(strings.length).toBe(6);
    expect(strings[0].frets.length).toBe(13);
    expect(strings.some((s) => s.frets.some((f) => f.inScale))).toBe(true);
  });
});
