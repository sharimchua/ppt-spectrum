import { describe, it, expect } from 'vitest';
import {
  PRESET_SOLO,
  PRESET_DUO_VERTICAL,
  PRESET_TRIO,
  getAllCellNodes,
  findCellNodeById,
  splitCellInTree,
  removeCellFromTree,
  duplicateCellInTree,
  addCellToTree,
  updateCellInTree,
  encodeLayoutToSlug,
  decodeLayoutFromSlug,
  LayoutDefinition,
} from '../layout-models';
import { calculateRingClockBands } from '../../renderers/ring-clock-lens';
import { Scene } from '../types';
import { DEFAULT_SCENE } from '../config';
import { PRESET_SHAPES } from '../presets';

describe('Layout Models & Tree Operations', () => {
  it('correctly queries all cells and finds cell by id', () => {
    const cells = getAllCellNodes(PRESET_TRIO.root);
    expect(cells.length).toBe(3);
    expect(cells.map((c) => c.module)).toEqual(['ruler', 'cycle-wheel', 'waveform-phasor']);

    const found = findCellNodeById(PRESET_TRIO.root, 'cell-trio-top');
    expect(found).toBeDefined();
    expect(found?.module).toBe('ruler');

    const notFound = findCellNodeById(PRESET_TRIO.root, 'non-existent-cell');
    expect(notFound).toBeNull();
  });

  it('splits a cell in the tree horizontally and vertically', () => {
    const root = PRESET_SOLO.root;
    const split = splitCellInTree(root, 'cell-main', 'row', 'cycle-wheel');
    const cells = getAllCellNodes(split);
    expect(cells.length).toBe(2);
    expect(cells[0].module).toBe('ruler');
    expect(cells[1].module).toBe('cycle-wheel');
  });

  it('duplicates a cell with identical properties but unique id', () => {
    const root = PRESET_DUO_VERTICAL.root;
    const duplicated = duplicateCellInTree(root, 'cell-left');
    const cells = getAllCellNodes(duplicated);
    expect(cells.length).toBe(3);
    expect(cells[0].module).toBe('ruler');
    expect(cells[1].module).toBe('ruler');
    expect(cells[1].id).not.toBe(cells[0].id);
    expect(cells[2].module).toBe('cycle-wheel');
  });

  it('removes a cell and prunes tree cleanly, enforcing at least 1 cell', () => {
    const root = PRESET_TRIO.root;
    const pruned = removeCellFromTree(root, 'cell-trio-left');
    const cells = getAllCellNodes(pruned);
    expect(cells.length).toBe(2);
    expect(cells.some((c) => c.id === 'cell-trio-left')).toBe(false);

    // Enforce minimum 1 cell
    const solo = PRESET_SOLO.root;
    const cannotPrune = removeCellFromTree(solo, 'cell-main');
    expect(getAllCellNodes(cannotPrune).length).toBe(1);
  });

  it('appends a new cell to the layout', () => {
    const root = PRESET_SOLO.root;
    const added = addCellToTree(root, 'row', 'waveform-phasor');
    const cells = getAllCellNodes(added);
    expect(cells.length).toBe(2);
    expect(cells[1].module).toBe('waveform-phasor');
  });

  it('updates cell module and title in tree', () => {
    const root = PRESET_SOLO.root;
    const updated = updateCellInTree(root, {
      id: 'cell-main',
      type: 'cell',
      module: 'ring-clock',
      title: 'Concentric Ring Clock',
    });
    const found = findCellNodeById(updated, 'cell-main');
    expect(found?.module).toBe('ring-clock');
    expect(found?.title).toBe('Concentric Ring Clock');
  });

  it('encodes and decodes layout slug into identical layout structure', () => {
    const slug = encodeLayoutToSlug(PRESET_TRIO);
    expect(typeof slug).toBe('string');
    expect(slug.length).toBeGreaterThan(10);
    // URL safe (no +, /, or = characters)
    expect(slug).not.toMatch(/[+/=]/);

    const decoded = decodeLayoutFromSlug(slug);
    expect(decoded).not.toBeNull();
    expect(decoded?.layout.id).toBe(PRESET_TRIO.id);
    expect(decoded?.layout.name).toBe(PRESET_TRIO.name);

    const decodedCells = getAllCellNodes(decoded!.layout.root);
    expect(decodedCells.length).toBe(3);
    expect(decodedCells[0].module).toBe('ruler');
    expect(decodedCells[1].module).toBe('cycle-wheel');
    expect(decodedCells[2].module).toBe('waveform-phasor');
  });

  it('preserves ringClockMode and minRings during layout encoding and decoding', () => {
    const layoutWithRingClock: LayoutDefinition = {
      id: 'custom-ring-layout',
      name: 'Custom Ring Layout',
      description: 'Testing compact ring clock settings',
      root: {
        id: 'root-c',
        type: 'container',
        direction: 'row',
        children: [
          {
            id: 'cell-ring',
            type: 'cell',
            module: 'ring-clock',
            ringClockMode: 'auto-compact',
            minRings: 4,
            title: 'Compact Clock',
          },
        ],
      },
    };

    const slug = encodeLayoutToSlug(layoutWithRingClock);
    const decoded = decodeLayoutFromSlug(slug);
    expect(decoded).not.toBeNull();
    const cell = getAllCellNodes(decoded!.layout.root)[0];
    expect(cell.module).toBe('ring-clock');
    expect(cell.ringClockMode).toBe('auto-compact');
    expect(cell.minRings).toBe(4);
  });
});

describe('RingClock Dynamic Compact Bands', () => {
  const pureToneShape = PRESET_SHAPES.find((s) => s.id === 'pure-tone')!;
  const dupleShape = PRESET_SHAPES.find((s) => s.id === 'duple-1-2')!;

  const dummyScene: Scene = {
    ...DEFAULT_SCENE,
    shapes: [pureToneShape, dupleShape],
    placements: [
      {
        shapeId: pureToneShape.id,
        d: 0,
        gain: 1.0,
        mute: false,
        solo: false,
      },
    ],
  };

  it('calculates full 16-octave continuum in full mode', () => {
    const bands = calculateRingClockBands(dummyScene, 'full');
    expect(bands.bandMin).toBe(-8);
    expect(bands.bandMax).toBe(8);
    expect(bands.bandMax - bands.bandMin + 1).toBe(17);
  });

  it('calculates 8 bands centred around placement fundamental in standard mode', () => {
    const bands = calculateRingClockBands(dummyScene, 'standard');
    expect(bands.bandMax - bands.bandMin + 1).toBe(8);
    expect(bands.bandMin).toBeLessThanOrEqual(0);
    expect(bands.bandMax).toBeGreaterThanOrEqual(0);
  });

  it('enforces a minimum of 4 rings in auto-compact mode for a single partial', () => {
    const bands = calculateRingClockBands(dummyScene, 'auto-compact', 4);
    const count = bands.bandMax - bands.bandMin + 1;
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThanOrEqual(6);
    // Limen (0) should be included when placement is at d = 0
    expect(bands.bandMin).toBeLessThanOrEqual(0);
    expect(bands.bandMax).toBeGreaterThanOrEqual(0);
  });

  it('dynamically encompasses duple partials and contextualises relative to Limen', () => {
    const dupleScene: Scene = {
      ...dummyScene,
      placements: [
        {
          shapeId: dupleShape.id,
          d: 1.0,
          gain: 1.0,
          mute: false,
          solo: false,
        },
      ],
    };
    const bands = calculateRingClockBands(dupleScene, 'auto-compact', 4);
    const count = bands.bandMax - bands.bandMin + 1;
    expect(count).toBeGreaterThanOrEqual(4);
    // Placed at d = 1 with 1:2 ratio (d = 1 and d = 0), so Limen (0) is included
    expect(bands.bandMin).toBeLessThanOrEqual(0);
    expect(bands.bandMax).toBeGreaterThanOrEqual(1);
  });

  it('guarantees the TPL line (d = 0) is always visible regardless of placement octave', () => {
    // Deep in rhythm regime (d = 5.0)
    const rhythmScene: Scene = {
      ...dummyScene,
      placements: [
        {
          shapeId: pureToneShape.id,
          d: 5.0,
          gain: 1.0,
          mute: false,
          solo: false,
        },
      ],
    };
    const rhythmBands = calculateRingClockBands(rhythmScene, 'auto-compact', 4);
    expect(rhythmBands.bandMin).toBeLessThanOrEqual(0);
    expect(rhythmBands.bandMax).toBeGreaterThanOrEqual(5);

    // Deep in pitch regime (d = -5.0)
    const pitchScene: Scene = {
      ...dummyScene,
      placements: [
        {
          shapeId: pureToneShape.id,
          d: -5.0,
          gain: 1.0,
          mute: false,
          solo: false,
        },
      ],
    };
    const pitchBands = calculateRingClockBands(pitchScene, 'auto-compact', 4);
    expect(pitchBands.bandMin).toBeLessThanOrEqual(-5);
    expect(pitchBands.bandMax).toBeGreaterThanOrEqual(0);
  });
});
