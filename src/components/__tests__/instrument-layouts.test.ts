import { describe, it, expect } from 'vitest';
import { createDefaultMidiTuningConfig } from '../../core/midi-tuning';
import {
  buildScaleStripPads,
  buildIsomorphicGrid,
  buildGuitarFretboard,
} from '../keyboard/instrument-layouts';

describe('Alternate Instrument Surfaces', () => {
  it('builds Scale-Degree Strip pads relative to currentFundamentalD', () => {
    const cfg = { ...createDefaultMidiTuningConfig('pythagorean'), subsetId: 'pentatonic' as const };
    const padsAtNeg3 = buildScaleStripPads(cfg, -3.0, 440, 25.8);
    expect(padsAtNeg3.length).toBe(24);
    expect(padsAtNeg3.filter((p) => p.inScale).length).toBe(10);
    expect(padsAtNeg3[0].d).toBeCloseTo(-3.0, 4);
    expect(padsAtNeg3[12].d).toBeCloseTo(-4.0, 4);

    // Shifting base frequency shifts the Scale Strip tonic
    const padsAtNeg2 = buildScaleStripPads(cfg, -2.0, 440, 25.8);
    expect(padsAtNeg2[0].d).toBeCloseTo(-2.0, 4);
  });

  it('builds 2D Isomorphic Grid with 31-EDO and Wicki-Hayden support', () => {
    const cfg = { ...createDefaultMidiTuningConfig('31edo'), subsetId: 'meantone' as const };
    const grid = buildIsomorphicGrid(
      { tileShape: 'hex', layoutPreset: 'harmonic', rows: 4, cols: 8 },
      cfg, -3.0, 440, 25.8
    );
    expect(grid.length).toBe(4);
    expect(grid[0].length).toBe(8);
    expect(grid[0][0].label).toContain('\\31');
  });

  it('builds configurable Guitar / Bass / Ukulele Fretboard', () => {
    const cfg = { ...createDefaultMidiTuningConfig('pythagorean'), subsetId: 'pentatonic' as const };
    const strings6 = buildGuitarFretboard({ presetId: '6-std', fretCount: 12 }, cfg, -3.0, 440, 25.8);
    expect(strings6.length).toBe(6);
    expect(strings6[0].frets.length).toBe(13);
    expect(strings6.some((s) => s.frets.some((f) => f.inScale))).toBe(true);

    const bass4 = buildGuitarFretboard({ presetId: '4-bass', fretCount: 15 }, cfg, -3.0, 440, 25.8);
    expect(bass4.length).toBe(4);
    expect(bass4[0].frets.length).toBe(16);
  });
});
