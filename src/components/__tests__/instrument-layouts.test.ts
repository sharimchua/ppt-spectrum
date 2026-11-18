import { describe, it, expect } from 'vitest';
import { createDefaultMidiTuningConfig, resolveRootAnchorD } from '../../core/midi-tuning';
import {
  buildScaleStripPads,
  buildIsomorphicGrid,
  buildGuitarFretboard,
  mergeAutoPlayActiveIds,
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

    // 5-limit Scale Strip uses true 5-limit ratios (5:4 = 386¢), not 12-TET 400¢
    const just5 = buildScaleStripPads(createDefaultMidiTuningConfig('5-limit'), -3.0, 440, 25.8);
    expect(just5[4].subLabel).toBe('5:4');
    expect(just5[4].d).toBeCloseTo(-3.0 - Math.log2(5 / 4), 5);
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
    // Centre tile should be Root (0\31 with DuPeriod register)
    const centerRowIdx = grid.length - 1 - Math.floor(4 / 2);
    const centerPad = grid[centerRowIdx][Math.floor(8 / 2)];
    expect(centerPad.isRoot).toBe(true);
    expect(centerPad.label).toMatch(/^0\\31[+-]\d+$/);

    // Wide 12-TET grid caps keys beyond the DuMetric 8-octave range
    const wideGrid = buildIsomorphicGrid(
      { tileShape: 'hex', layoutPreset: 'harmonic', rows: 6, cols: 26 },
      createDefaultMidiTuningConfig('5-limit'),
      -3.0,
      440,
      25.8
    );
    expect(wideGrid.some((row) => row.some((p) => p.outOfRange))).toBe(true);
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

    const custom = buildGuitarFretboard(
      {
        presetId: 'custom',
        fretCount: 18,
        customStrings: [
          { name: 'C4', openMidi: 60 },
          { name: 'G3', openMidi: 55 },
          { name: 'C3', openMidi: 48 },
        ],
      },
      cfg,
      -3.0,
      440,
      25.8
    );
    expect(custom.length).toBe(3);
    expect(custom[0].stringName).toBe('C4');
    expect(custom[0].frets.length).toBe(19);
  });

  it('highlights Auto-Play notes on Iso & Guitar even when placementD differs from Root Anchor', () => {
    const cfg = createDefaultMidiTuningConfig('5-limit');
    const placementD = -2.5; // shifted from G#4 (-4.0)
    const rootD = resolveRootAnchorD(cfg, placementD, 440, 25.8);
    const iso = buildIsomorphicGrid({ tileShape: 'hex', layoutPreset: 'harmonic', rows: 5, cols: 10 }, cfg, placementD, 440, 25.8);
    const guitar = buildGuitarFretboard({ presetId: '6-std', fretCount: 12 }, cfg, placementD, 440, 25.8);
    const heldDoD = placementD; // Auto-Play playing Do (ratio 1:1)
    const active = mergeAutoPlayActiveIds([], [heldDoD], [], iso, guitar, placementD, rootD, 2.0);
    expect(active.size).toBeGreaterThan(0);

    // 5-limit M3 (386¢) and P5 (702¢) should show true tuned cents, not 400¢ / 700¢ 12-TET
    const allIsoCents = iso.flat().map((p) => p.subLabel);
    expect(allIsoCents).toContain('386¢');
    expect(allIsoCents).toContain('702¢');
    const allGuitarCents = guitar.flatMap((s) => s.frets.map((f) => f.centsLabel));
    expect(allGuitarCents).toContain('386¢');
    expect(allGuitarCents).toContain('702¢');
  });
});
