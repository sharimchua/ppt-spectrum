/**
 * Pure Scene manipulation operations.
 * Manages placement updates, filter states, and shape library modifications.
 */

import { Scene, Shape, BandFilter } from './types';

/**
 * Updates the primary placement's DuPeriod coordinate d.
 */
export function setPrimaryPlacementD(scene: Scene, d: number): Scene {
  if (scene.placements.length === 0) {
    return {
      ...scene,
      placements: [
        {
          shapeId: scene.shapes[0]?.id || 'hemiola-3-2',
          d,
          gain: 1,
          mute: false,
          solo: false,
        },
      ],
    };
  }
  return {
    ...scene,
    placements: scene.placements.map((p, idx) => (idx === 0 ? { ...p, d } : p)),
  };
}

/**
 * Steps the primary placement's DuPeriod coordinate d by step, clamped to [min, max].
 */
export function stepPrimaryPlacementD(
  scene: Scene,
  step: number,
  min: number = -7,
  max: number = 7
): Scene {
  const curD = scene.placements[0]?.d ?? 0;
  const targetD = Math.max(min, Math.min(max, curD + step));
  return setPrimaryPlacementD(scene, targetD);
}

/**
 * Updates the shapeId of the primary placement.
 */
export function setPrimaryShapeId(scene: Scene, shapeId: string): Scene {
  if (scene.placements.length === 0) {
    return {
      ...scene,
      placements: [{ shapeId, d: 0, gain: 1, mute: false, solo: false }],
    };
  }
  return {
    ...scene,
    placements: scene.placements.map((p, idx) => (idx === 0 ? { ...p, shapeId } : p)),
  };
}

/**
 * Toggles the enabled state of the scene's aperture band filter.
 */
export function toggleFilterEnabled(scene: Scene): Scene {
  return {
    ...scene,
    filter: {
      ...scene.filter,
      enabled: !scene.filter?.enabled,
    },
  };
}

/**
 * Enables the filter and optionally patches its centre, width, or softness coordinates.
 */
export function enableFilter(
  scene: Scene,
  params?: Partial<Pick<BandFilter, 'centreD' | 'widthD' | 'softnessD'>>
): Scene {
  return {
    ...scene,
    filter: {
      ...scene.filter,
      enabled: true,
      ...params,
    },
  };
}

/**
 * Cycles the filter mode through the sequence:
 * off -> band-pass -> low-pass -> high-pass -> off.
 */
export function cycleFilterMode(scene: Scene): Scene {
  const f = scene.filter;
  if (!f || !f.enabled) {
    return { ...scene, filter: { ...f, enabled: true, mode: 'band-pass' } };
  }
  if (f.mode === 'band-pass') {
    return { ...scene, filter: { ...f, enabled: true, mode: 'low-pass' } };
  }
  if (f.mode === 'low-pass') {
    return { ...scene, filter: { ...f, enabled: true, mode: 'high-pass' } };
  }
  return { ...scene, filter: { ...f, enabled: false, mode: 'band-pass' } };
}

/**
 * Prepends a new shape to the scene shapes and selects it in the primary placement.
 */
export function addShapeAndSelect(scene: Scene, shape: Shape): Scene {
  const placements =
    scene.placements.length > 0
      ? scene.placements.map((pl, idx) => (idx === 0 ? { ...pl, shapeId: shape.id } : pl))
      : [{ shapeId: shape.id, d: 0, gain: 1, mute: false, solo: false }];

  return {
    ...scene,
    shapes: [shape, ...scene.shapes],
    placements,
  };
}

/**
 * Replaces placements with a single placement for a captured shape at coordinate d.
 */
export function replaceWithCapturedShape(scene: Scene, shape: Shape, d: number): Scene {
  return {
    ...scene,
    shapes: [shape, ...scene.shapes],
    placements: [
      {
        shapeId: shape.id,
        d,
        gain: 0.85,
        mute: false,
        solo: false,
      },
    ],
  };
}

/**
 * Updates an active shape in the scene:
 * - If preset, forks to a custom user shape and selects it (returns selectedId).
 * - If not yet in the shapes collection, prepends it and selects it (returns selectedId).
 * - If already existing, replaces it in-place without changing selection.
 */
export function upsertActiveShape(
  scene: Scene,
  shape: Shape,
  createId: (prefix: string) => string = (prefix) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`
): { scene: Scene; selectedId?: string } {
  if (shape.origin === 'preset') {
    const userShape: Shape = {
      ...shape,
      id: createId('user-shape'),
      name: `${shape.name} (Custom)`,
      origin: 'user',
    };
    return {
      scene: {
        ...scene,
        shapes: [userShape, ...scene.shapes],
        placements: scene.placements.map((pl, idx) =>
          idx === 0 ? { ...pl, shapeId: userShape.id } : pl
        ),
      },
      selectedId: userShape.id,
    };
  }

  const exists = scene.shapes.some((s) => s.id === shape.id);
  if (!exists) {
    return {
      scene: {
        ...scene,
        shapes: [shape, ...scene.shapes],
        placements: scene.placements.map((pl, idx) =>
          idx === 0 ? { ...pl, shapeId: shape.id } : pl
        ),
      },
      selectedId: shape.id,
    };
  }

  return {
    scene: {
      ...scene,
      shapes: scene.shapes.map((s) => (s.id === shape.id ? shape : s)),
    },
  };
}

/**
 * Deletes a user shape from the scene shapes, falling back to pure-tone if active.
 */
export function deleteUserShape(scene: Scene, shapeId: string): Scene {
  const remainingShapes = scene.shapes.filter(
    (s) => s.id !== shapeId || s.origin === 'preset'
  );
  const fallbackId = remainingShapes[0]?.id || 'pure-tone';
  return {
    ...scene,
    shapes: remainingShapes,
    placements: scene.placements.map((pl) =>
      pl.shapeId === shapeId ? { ...pl, shapeId: fallbackId } : pl
    ),
  };
}

/**
 * Duplicates a shape with freshly allocated IDs for the shape, anchors, and partials.
 */
export function duplicateShapeWithFreshIds(
  shape: Shape,
  createId: (prefix: string) => string = (prefix) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`
): Shape {
  return {
    ...shape,
    id: createId('user-shape'),
    name: `${shape.name} (Copy)`,
    origin: 'user',
    anchors: shape.anchors
      ? shape.anchors.map((a) => ({
          ...a,
          id: createId('a'),
          partials: a.partials.map((p) => ({
            ...p,
            id: createId('p'),
          })),
        }))
      : undefined,
    partials: shape.partials.map((p) => ({
      ...p,
      id: createId('p'),
    })),
  };
}
