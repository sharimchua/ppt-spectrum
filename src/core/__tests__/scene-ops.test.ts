import { describe, it, expect } from 'vitest';
import {
  setPrimaryPlacementD,
  stepPrimaryPlacementD,
  setPrimaryShapeId,
  toggleFilterEnabled,
  enableFilter,
  cycleFilterMode,
  addShapeAndSelect,
  replaceWithCapturedShape,
  upsertActiveShape,
  deleteUserShape,
  duplicateShapeWithFreshIds,
  setPrimaryFilter,
  forkFilter,
  duplicateFilter,
  deleteUserFilter,
  createUserFilter,
  renameActiveFilter,
  getFocusedSpanView,
  patchFocusedSpan,
} from '../scene-ops';
import { Scene, Shape, Filter } from '../types';
import { DEFAULT_SCENE } from '../config';
import { bandFilterToFilter } from '../filter-migration';

describe('scene-ops', () => {
  const baseScene: Scene = {
    ...DEFAULT_SCENE,
    placements: [
      { shapeId: 'hemiola-3-2', d: 0, gain: 1, mute: false, solo: false },
      { shapeId: 'pure-tone', d: 1, gain: 0.8, mute: false, solo: false },
    ],
    filter: bandFilterToFilter({
      enabled: false,
      mode: 'band-pass',
      centreD: 0,
      widthD: 2,
      softnessD: 0.5,
    }),
  };

  describe('setPrimaryPlacementD', () => {
    it('updates only the primary placement d coordinate', () => {
      const next = setPrimaryPlacementD(baseScene, 2.5);
      expect(next.placements[0]?.d).toBe(2.5);
      expect(next.placements[1]?.d).toBe(1);
    });

    it('creates a placement if placements array is empty', () => {
      const emptyScene: Scene = { ...baseScene, placements: [] };
      const next = setPrimaryPlacementD(emptyScene, -1.5);
      expect(next.placements).toHaveLength(1);
      expect(next.placements[0]?.d).toBe(-1.5);
    });
  });

  describe('stepPrimaryPlacementD', () => {
    it('steps d coordinate within default clamp bounds [-7, 7]', () => {
      const scene1 = setPrimaryPlacementD(baseScene, 6.5);
      const steppedUp = stepPrimaryPlacementD(scene1, 1.0);
      expect(steppedUp.placements[0]?.d).toBe(7.0);

      const steppedOver = stepPrimaryPlacementD(steppedUp, 1.0);
      expect(steppedOver.placements[0]?.d).toBe(7.0);

      const steppedDown = stepPrimaryPlacementD(baseScene, -1.0);
      expect(steppedDown.placements[0]?.d).toBe(-1.0);

      const scene2 = setPrimaryPlacementD(baseScene, -6.8);
      const clampedMin = stepPrimaryPlacementD(scene2, -1.0);
      expect(clampedMin.placements[0]?.d).toBe(-7.0);
    });

    it('supports custom min and max clamping boundaries', () => {
      const stepped = stepPrimaryPlacementD(baseScene, 5.0, -2, 3);
      expect(stepped.placements[0]?.d).toBe(3);
    });
  });

  describe('setPrimaryShapeId', () => {
    it('updates primary placement shapeId without mutating others', () => {
      const next = setPrimaryShapeId(baseScene, 'piano');
      expect(next.placements[0]?.shapeId).toBe('piano');
      expect(next.placements[1]?.shapeId).toBe('pure-tone');
    });

    it('creates placement if placements array is empty', () => {
      const emptyScene: Scene = { ...baseScene, placements: [] };
      const next = setPrimaryShapeId(emptyScene, 'piano');
      expect(next.placements).toHaveLength(1);
      expect(next.placements[0]?.shapeId).toBe('piano');
    });
  });

  describe('filter operations', () => {
    it('toggleFilterEnabled toggles filter enabled state', () => {
      const enabled = toggleFilterEnabled(baseScene);
      expect(enabled.filter.enabled).toBe(true);
      const disabled = toggleFilterEnabled(enabled);
      expect(disabled.filter.enabled).toBe(false);
    });

    it('enableFilter enables filter and applies optional params', () => {
      const next = enableFilter(baseScene, { centreD: 1.5, widthD: 3.0 });
      expect(next.filter.enabled).toBe(true);
      expect(next.filter.centreD).toBe(1.5);
      expect(next.filter.widthD).toBe(3.0);
    });

    it('cycleFilterMode cycles through off -> band-pass -> low-pass -> high-pass -> off', () => {
      const offScene: Scene = { ...baseScene, filter: { ...baseScene.filter, enabled: false } };

      const step1 = cycleFilterMode(offScene);
      expect(step1.filter.enabled).toBe(true);
      expect(step1.filter.mode).toBe('band-pass');

      const step2 = cycleFilterMode(step1);
      expect(step2.filter.enabled).toBe(true);
      expect(step2.filter.mode).toBe('low-pass');

      const step3 = cycleFilterMode(step2);
      expect(step3.filter.enabled).toBe(true);
      expect(step3.filter.mode).toBe('high-pass');

      const step4 = cycleFilterMode(step3);
      expect(step4.filter.enabled).toBe(false);
      expect(step4.filter.mode).toBe('high-pass');
    });
  });

  describe('shape library operations', () => {
    const testShape: Shape = {
      id: 'custom-1',
      name: 'Custom Shape 1',
      origin: 'user',
      partials: [{ id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1, phase: 0 }],
    };

    it('addShapeAndSelect adds shape to scene and assigns it to primary placement', () => {
      const next = addShapeAndSelect(baseScene, testShape);
      expect(next.shapes[0]).toEqual(testShape);
      expect(next.placements[0]?.shapeId).toBe('custom-1');
      expect(next.placements[1]?.shapeId).toBe('pure-tone');
    });

    it('replaceWithCapturedShape sets single placement with gain 0.85', () => {
      const next = replaceWithCapturedShape(baseScene, testShape, -1.2);
      expect(next.shapes[0]).toEqual(testShape);
      expect(next.placements).toHaveLength(1);
      expect(next.placements[0]).toEqual({
        shapeId: 'custom-1',
        d: -1.2,
        gain: 0.85,
        mute: false,
        solo: false,
      });
    });

    it('upsertActiveShape forks preset shape with (Custom) suffix and origin user', () => {
      const presetShape: Shape = {
        id: 'preset-bell',
        name: 'Bell',
        origin: 'preset',
        partials: [{ id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1, phase: 0 }],
      };

      const result = upsertActiveShape(baseScene, presetShape, (p) => `${p}-123`);
      expect(result.selectedId).toBe('user-shape-123');
      expect(result.scene.shapes[0]?.id).toBe('user-shape-123');
      expect(result.scene.shapes[0]?.name).toBe('Bell (Custom)');
      expect(result.scene.shapes[0]?.origin).toBe('user');
      expect(result.scene.placements[0]?.shapeId).toBe('user-shape-123');
    });

    it('upsertActiveShape adds new user shape and returns selectedId if not yet in scene', () => {
      const result = upsertActiveShape(baseScene, testShape);
      expect(result.selectedId).toBe('custom-1');
      expect(result.scene.shapes[0]?.id).toBe('custom-1');
      expect(result.scene.placements[0]?.shapeId).toBe('custom-1');
    });

    it('upsertActiveShape updates existing shape in-place without returning selectedId', () => {
      const sceneWithCustom = addShapeAndSelect(baseScene, testShape);
      const modified: Shape = { ...testShape, name: 'Renamed Custom' };
      const result = upsertActiveShape(sceneWithCustom, modified);
      expect(result.selectedId).toBeUndefined();
      expect(result.scene.shapes.find((s) => s.id === 'custom-1')?.name).toBe('Renamed Custom');
    });

    it('deleteUserShape removes user shape and replaces placement with fallback', () => {
      const sceneWithCustom = addShapeAndSelect(baseScene, testShape);
      const next = deleteUserShape(sceneWithCustom, 'custom-1');
      expect(next.shapes.find((s) => s.id === 'custom-1')).toBeUndefined();
      expect(next.placements[0]?.shapeId).toBe(next.shapes[0]?.id || 'pure-tone');
    });

    it('duplicateShapeWithFreshIds creates deep copy with fresh IDs and (Copy) suffix', () => {
      let idCounter = 0;
      const fakeIdGen = (p: string) => `${p}-${++idCounter}`;

      const source: Shape = {
        id: 'orig',
        name: 'My Timbre',
        origin: 'user',
        anchors: [
          {
            id: 'a-orig',
            name: 'A1',
            ratio: { kind: 'rational', num: 1, den: 1 },
            phaseOffset: 0,
            gain: 1,
            mute: false,
            partials: [
              { id: 'p-orig1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1, phase: 0 },
            ],
          },
        ],
        partials: [
          { id: 'p-flat1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1, phase: 0 },
        ],
      };

      const duplicated = duplicateShapeWithFreshIds(source, fakeIdGen);
      expect(duplicated.name).toBe('My Timbre (Copy)');
      expect(duplicated.origin).toBe('user');
      expect(duplicated.id).toBe('user-shape-1');
      expect(duplicated.anchors?.[0]?.id).toBe('a-2');
      expect(duplicated.anchors?.[0]?.partials[0]?.id).toBe('p-3');
      expect(duplicated.partials[0]?.id).toBe('p-4');
    });
  });

  describe('Filter Library Operations', () => {
    it('sets primary filter by id from presets', () => {
      const updated = setPrimaryFilter(baseScene, 'filter-tresillo');
      expect(updated.filter.id).toBe('filter-tresillo');
      expect(updated.filter.name).toContain('Tresillo');
    });

    it('forks a preset filter into user library', () => {
      const updated = forkFilter(baseScene, baseScene.filter, (p) => `${p}-test`);
      expect(updated.filter.origin).toBe('user');
      expect(updated.filter.id).toBe('user-filter-test');
      expect(updated.filters?.some((f) => f.id === 'user-filter-test')).toBe(true);
    });

    it('duplicates a filter into user library', () => {
      const updated = duplicateFilter(baseScene, baseScene.filter, (p) => `${p}-dup`);
      expect(updated.filter.origin).toBe('user');
      expect(updated.filter.id).toBe('user-filter-dup');
      expect(updated.filters?.some((f) => f.id === 'user-filter-dup')).toBe(true);
    });

    it('creates a new custom user filter', () => {
      const updated = createUserFilter(baseScene, 'My Custom Formant', (p) => `${p}-123`);
      expect(updated.filter.name).toBe('My Custom Formant');
      expect(updated.filter.origin).toBe('user');
      expect(updated.filters?.some((f) => f.name === 'My Custom Formant')).toBe(true);
    });

    it('renames active filter in both active filter and filters list', () => {
      const created = createUserFilter(baseScene, 'Initial Name', (p) => `${p}-ren`);
      const renamed = renameActiveFilter(created, 'Renamed Filter');
      expect(renamed.filter.name).toBe('Renamed Filter');
      expect(renamed.filters?.find((f) => f.id === 'user-filter-ren')?.name).toBe('Renamed Filter');
    });

    it('deletes user filter and falls back to preset', () => {
      const created = createUserFilter(baseScene, 'To Delete', (p) => `${p}-del`);
      const deleted = deleteUserFilter(created, 'user-filter-del');
      expect(deleted.filters?.some((f) => f.id === 'user-filter-del')).toBe(false);
      expect(deleted.filter.origin).toBe('preset');
    });
  });

  describe('Focused Span View & Patching', () => {
    it('identifies and preserves low-pass and high-pass conditions when patching centreD or softnessD', () => {
      const multiCondFilter: Filter = {
        ...baseScene.filter,
        id: 'multi',
        enabled: true,
        name: 'Multi',
        action: 'keep',
        focus: { conditionId: 'cond-lp', spanIndex: 0 },
        conditions: [
          {
            kind: 'range',
            id: 'cond-bp',
            reference: 'scene',
            reductionPeriod: null,
            spans: [{ lo: { unit: 'cents', value: -600 }, hi: { unit: 'cents', value: 600 } }],
            softness: { value: 300, unit: 'cents' },
          },
          {
            kind: 'range',
            id: 'cond-lp',
            reference: 'absolute',
            reductionPeriod: null,
            spans: [{ lo: null, hi: { unit: 'd', value: 1.5 } }],
            softness: { value: 0.5, unit: 'd' },
          },
          {
            kind: 'range',
            id: 'cond-hp',
            reference: 'absolute',
            reductionPeriod: null,
            spans: [{ lo: { unit: 'd', value: -1.0 }, hi: null }],
            softness: { value: 0.25, unit: 'd' },
          },
          {
            kind: 'cycle',
            id: 'cond-cyc',
            divisions: 8,
            slotWeights: [1, 0, 1, 0, 1, 0, 1, 0],
            rotation: 0,
            tolerance: 0.2,
            offGridMatch: 0,
            supercycle: null,
          },
        ],
      };

      const lpView = getFocusedSpanView(multiCondFilter);
      expect(lpView?.mode).toBe('low-pass');
      expect(lpView?.centreD).toBeCloseTo(1.5, 5);

      const patchedLp = patchFocusedSpan(multiCondFilter, { centreD: 2.25, softnessD: 0.75 });
      const lpCond = patchedLp.conditions.find((c) => c.id === 'cond-lp');
      expect(lpCond?.kind).toBe('range');
      if (lpCond?.kind === 'range') {
        expect(lpCond.spans[0].lo).toBeNull();
        expect(lpCond.spans[0].hi).toEqual({ unit: 'd', value: 2.25 });
        expect(lpCond.softness).toEqual({ value: 0.75, unit: 'd' });
      }

      const hpFocused: Filter = { ...multiCondFilter, focus: { conditionId: 'cond-hp', spanIndex: 0 } };
      const hpView = getFocusedSpanView(hpFocused);
      expect(hpView?.mode).toBe('high-pass');
      expect(hpView?.centreD).toBeCloseTo(-1.0, 5);

      const patchedHp = patchFocusedSpan(hpFocused, { centreD: -0.5 });
      const hpCond = patchedHp.conditions.find((c) => c.id === 'cond-hp');
      expect(hpCond?.kind).toBe('range');
      if (hpCond?.kind === 'range') {
        expect(hpCond.spans[0].hi).toBeNull();
        expect(hpCond.spans[0].lo).toEqual({ unit: 'd', value: -0.5 });
      }

      const cycFocused: Filter = { ...multiCondFilter, focus: { conditionId: 'cond-cyc', spanIndex: 0 } };
      expect(getFocusedSpanView(cycFocused)).toBeNull();
      const patchedCyc = patchFocusedSpan(cycFocused, { centreD: 1.0 });
      expect(patchedCyc.conditions.find((c) => c.id === 'cond-cyc')?.kind).toBe('cycle');
    });
  });
});
