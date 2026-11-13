/**
 * Pure Scene manipulation operations.
 * Manages placement updates, filter states, and shape library modifications.
 */

import { Scene, Shape, BandFilter, Filter, FilterCondition, RangeCondition, SpanView, Envelope } from './types';
import { MAX_CONDITIONS } from './filter-types';
import { resolveEndpoint } from './filter-eval';
import { rationalise } from './rational';
import { PRESET_FILTERS } from './filter-presets';
import { PRESET_ENVELOPES } from './envelope-presets';

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
 * Sets the filter enabled state. If enabled is undefined, toggles the current state.
 */
export function setFilterEnabled(scene: Scene, enabled?: boolean): Scene {
  const nextEnabled = enabled !== undefined ? enabled : !scene.filter.enabled;
  return {
    ...scene,
    filter: {
      ...scene.filter,
      enabled: nextEnabled,
    },
  };
}

/**
 * Toggles the enabled state of the scene's aperture band filter.
 * Retained for backwards-compatibility.
 */
export function toggleFilterEnabled(scene: Scene): Scene {
  return setFilterEnabled(scene);
}

/**
 * Updates filter top-level parameters (name, action, combine, depth, focus).
 */
function syncUserFilterInList(filters: Filter[] | undefined, updatedFilter: Filter): Filter[] | undefined {
  if (!filters || !updatedFilter.id || updatedFilter.origin !== 'user') return filters;
  return filters.map((f) => (f.id === updatedFilter.id ? updatedFilter : f));
}

/**
 * Updates filter parameters (action, combine, depth, enabled, etc.).
 */
export function updateFilter(
  scene: Scene,
  patch: Partial<Omit<Filter, 'conditions'>>
): Scene {
  const updatedFilter: Filter = {
    ...scene.filter,
    ...patch,
  };
  return {
    ...scene,
    filter: updatedFilter,
    filters: syncUserFilterInList(scene.filters, updatedFilter),
  };
}

/**
 * Appends a condition to the scene filter (enforcing MAX_CONDITIONS).
 */
export function addCondition(scene: Scene, cond: FilterCondition): Scene {
  if (scene.filter.conditions.length >= MAX_CONDITIONS) {
    return scene;
  }
  const nextConditions = [...scene.filter.conditions, cond];
  const nextFocus = scene.filter.focus || (cond.kind === 'range' ? { conditionId: cond.id, spanIndex: 0 } : null);

  const updatedFilter: Filter = {
    ...scene.filter,
    conditions: nextConditions,
    focus: nextFocus,
  };

  return {
    ...scene,
    filter: updatedFilter,
    filters: syncUserFilterInList(scene.filters, updatedFilter),
  };
}

/**
 * Updates an existing condition in the scene filter.
 */
export function updateCondition(
  scene: Scene,
  conditionId: string,
  updated: FilterCondition
): Scene {
  const nextConditions = scene.filter.conditions.map((c: FilterCondition) =>
    c.id === conditionId ? updated : c
  );
  let nextTrackingMode = scene.filter.trackingMode;
  if (updated.kind === 'range' && (scene.filter.focus?.conditionId === conditionId || !scene.filter.focus)) {
    nextTrackingMode = updated.reference === 'absolute' ? 'fixed' : 'relative';
  }

  const updatedFilter: Filter = {
    ...scene.filter,
    conditions: nextConditions,
    ...(nextTrackingMode !== undefined ? { trackingMode: nextTrackingMode } : {}),
  };

  return {
    ...scene,
    filter: updatedFilter,
    filters: syncUserFilterInList(scene.filters, updatedFilter),
  };
}

/**
 * Removes a condition by ID and updates canvas focus if necessary.
 */
export function removeCondition(scene: Scene, conditionId: string): Scene {
  const nextConditions = scene.filter.conditions.filter((c: FilterCondition) => c.id !== conditionId);
  let nextFocus = scene.filter.focus;
  if (nextFocus && nextFocus.conditionId === conditionId) {
    const firstRange = nextConditions.find((c: FilterCondition): c is RangeCondition => c.kind === 'range');
    nextFocus = firstRange ? { conditionId: firstRange.id, spanIndex: 0 } : null;
  }

  const updatedFilter: Filter = {
    ...scene.filter,
    conditions: nextConditions,
    focus: nextFocus,
  };

  return {
    ...scene,
    filter: updatedFilter,
    filters: syncUserFilterInList(scene.filters, updatedFilter),
  };
}

/**
 * Reorders a condition within the filter condition stack.
 */
export function moveCondition(
  scene: Scene,
  conditionId: string,
  direction: 'up' | 'down'
): Scene {
  const conds = [...scene.filter.conditions];
  const idx = conds.findIndex((c: FilterCondition) => c.id === conditionId);
  if (idx === -1) return scene;

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= conds.length) return scene;

  const [moved] = conds.splice(idx, 1);
  conds.splice(targetIdx, 0, moved);

  return {
    ...scene,
    filter: {
      ...scene.filter,
      conditions: conds,
    },
  };
}

/**
 * Applies a starter preset replacing the current filter while retaining enabled state.
 */
export function applyStarterPreset(scene: Scene, starter: Filter): Scene {
  return {
    ...scene,
    filter: {
      ...starter,
      enabled: scene.filter.enabled || starter.enabled,
    },
  };
}

/**
 * Extracts a legacy-compatible SpanView for HUD and canvas gesture scrubbing.
 */
export function getFocusedSpanView(filter: Filter): SpanView | null {
  const focus = filter.focus;
  let rangeCond: RangeCondition | undefined;
  let spanIdx = 0;

  if (focus) {
    const found = filter.conditions.find((c: FilterCondition) => c.id === focus.conditionId);
    if (found && found.kind === 'range') {
      rangeCond = found;
      spanIdx = Math.max(0, Math.min(rangeCond.spans.length - 1, focus.spanIndex));
    }
  }

  if (!rangeCond) {
    rangeCond = filter.conditions.find((c: FilterCondition): c is RangeCondition => c.kind === 'range');
    spanIdx = 0;
  }

  if (!rangeCond || rangeCond.spans.length === 0) {
    return {
      centreD: filter.centreD ?? 0.0,
      widthD: filter.widthD ?? 4.0,
      softnessD: filter.softnessD ?? 1.0,
      mode: filter.mode ?? 'band-pass',
      trackingMode: filter.trackingMode ?? 'fixed',
    };
  }

  const span = rangeCond.spans[spanIdx];
  const isRelative = rangeCond.reference === 'scene' || rangeCond.reference === 'anchor';
  const softnessD = rangeCond.softness.unit === 'cents'
    ? rangeCond.softness.value / 1200.0
    : rangeCond.softness.value;

  const loX = span.lo ? resolveEndpoint(span.lo) : null;
  const hiX = span.hi ? resolveEndpoint(span.hi) : null;

  let mode: 'band-pass' | 'low-pass' | 'high-pass' = 'band-pass';
  let centreX = 0;
  let widthOctaves = 4.0;

  if (loX !== null && hiX !== null) {
    mode = 'band-pass';
    centreX = (loX + hiX) / 2.0;
    widthOctaves = Math.abs(hiX - loX);
  } else if (loX === null && hiX !== null) {
    mode = 'low-pass';
    centreX = hiX;
    widthOctaves = 4.0;
  } else if (loX !== null && hiX === null) {
    mode = 'high-pass';
    centreX = loX;
    widthOctaves = 4.0;
  }

  // In DuPeriod coords, higher frequency (larger x) corresponds to smaller / negative d.
  // Thus centreD = -centreX.
  const centreD = -centreX;

  return {
    centreD,
    widthD: widthOctaves,
    softnessD,
    mode,
    trackingMode: isRelative ? 'relative' : 'fixed',
  };
}

/**
 * Patches the focused range span using canvas gesture parameters (centreD, widthD, softnessD).
 */
export function patchFocusedSpan(filter: Filter, params: Partial<SpanView>): Filter {
  const currentView = getFocusedSpanView(filter) || {
    centreD: 0,
    widthD: 4,
    softnessD: 1,
    mode: 'band-pass',
    trackingMode: 'fixed',
  };

  const targetCentreD = params.centreD !== undefined ? params.centreD : currentView.centreD;
  const targetWidthD = params.widthD !== undefined ? params.widthD : currentView.widthD;
  const targetSoftnessD = params.softnessD !== undefined ? params.softnessD : currentView.softnessD;
  const targetMode = params.mode !== undefined ? params.mode : (currentView.mode || 'band-pass');
  const targetTracking = params.trackingMode !== undefined ? params.trackingMode : (currentView.trackingMode || 'fixed');

  const halfW = targetWidthD / 2.0;
  const isRelative = targetTracking === 'relative';

  const nextConds = [...filter.conditions];
  let targetCondIdx = -1;
  let targetSpanIdx = 0;

  if (filter.focus) {
    targetCondIdx = nextConds.findIndex((c: FilterCondition) => c.id === filter.focus?.conditionId);
    targetSpanIdx = filter.focus.spanIndex;
  }
  if (targetCondIdx === -1) {
    targetCondIdx = nextConds.findIndex((c: FilterCondition) => c.kind === 'range');
    targetSpanIdx = 0;
  }

  const existingRef = targetCondIdx !== -1 && nextConds[targetCondIdx].kind === 'range'
    ? (nextConds[targetCondIdx] as RangeCondition).reference
    : 'scene';
  const reference = isRelative ? (existingRef === 'anchor' ? 'anchor' : 'scene') : 'absolute';

  // Construct new span
  let newSpan;
  if (isRelative) {
    const centreX = -targetCentreD;
    if (targetMode === 'low-pass') {
      newSpan = { lo: null, hi: { unit: 'cents' as const, value: centreX * 1200.0 } };
    } else if (targetMode === 'high-pass') {
      newSpan = { lo: { unit: 'cents' as const, value: centreX * 1200.0 }, hi: null };
    } else {
      newSpan = {
        lo: { unit: 'cents' as const, value: (centreX - halfW) * 1200.0 },
        hi: { unit: 'cents' as const, value: (centreX + halfW) * 1200.0 },
      };
    }
  } else {
    if (targetMode === 'low-pass') {
      newSpan = { lo: null, hi: { unit: 'd' as const, value: targetCentreD } };
    } else if (targetMode === 'high-pass') {
      newSpan = { lo: { unit: 'd' as const, value: targetCentreD }, hi: null };
    } else {
      newSpan = {
        lo: { unit: 'd' as const, value: targetCentreD + halfW },
        hi: { unit: 'd' as const, value: targetCentreD - halfW },
      };
    }
  }

  const condId = targetCondIdx !== -1 ? nextConds[targetCondIdx].id : 'cond-focused-formant';
  const updatedCond: RangeCondition = {
    kind: 'range',
    id: condId,
    reference,
    reductionPeriod: null,
    spans: [newSpan],
    softness: isRelative
      ? { value: targetSoftnessD * 1200.0, unit: 'cents' }
      : { value: targetSoftnessD, unit: 'd' },
  };

  if (targetCondIdx !== -1) {
    nextConds[targetCondIdx] = updatedCond;
  } else {
    nextConds.push(updatedCond);
  }

  return {
    ...filter,
    conditions: nextConds,
    focus: { conditionId: condId, spanIndex: targetSpanIdx },
    centreD: targetCentreD,
    widthD: targetWidthD,
    softnessD: targetSoftnessD,
    mode: targetMode,
    trackingMode: targetTracking,
  };
}

/**
 * Snaps cents-based endpoints in the focused range condition to nearby rational ratios.
 */
export function snapFocusedSpanToRatios(filter: Filter, maxDenominator: number = 32): Filter {
  const focus = filter.focus;
  if (!focus) return filter;

  return {
    ...filter,
    conditions: filter.conditions.map((cond: FilterCondition) => {
      if (cond.id !== focus.conditionId || cond.kind !== 'range') return cond;
      const nextSpans = cond.spans.map((span, sIdx) => {
        if (sIdx !== focus.spanIndex) return span;
        const snapEndpoint = (ep: typeof span.lo) => {
          if (!ep) return null;
          if (ep.unit === 'cents') {
            const ratioVal = Math.pow(2, ep.value / 1200.0);
            const red = rationalise(ratioVal, 0.003, maxDenominator);
            return { unit: 'ratio' as const, ratio: { kind: 'rational' as const, num: red.num, den: red.den } };
          }
          return ep;
        };
        return {
          lo: snapEndpoint(span.lo),
          hi: snapEndpoint(span.hi),
        };
      });
      return { ...cond, spans: nextSpans };
    }),
  };
}

/**
 * Cycles the spectral preset through the sequence:
 * band-pass -> low-pass -> high-pass -> off (bypassed) -> band-pass.
 */
export function cycleSpectralPreset(scene: Scene): Scene {
  const f = scene.filter;
  if (!f.enabled) {
    const next = patchFocusedSpan({ ...f, enabled: true }, { mode: 'band-pass' });
    return { ...scene, filter: next };
  }

  const currentView = getFocusedSpanView(f);
  const curMode = currentView?.mode || 'band-pass';

  if (curMode === 'band-pass') {
    return { ...scene, filter: patchFocusedSpan(f, { mode: 'low-pass' }) };
  }
  if (curMode === 'low-pass') {
    return { ...scene, filter: patchFocusedSpan(f, { mode: 'high-pass' }) };
  }

  // Bypass / disable
  return { ...scene, filter: { ...f, enabled: false } };
}

/**
 * Enables the filter and optionally patches its centre, width, or softness coordinates.
 * Retained for backwards-compatibility with legacy gesture handlers.
 */
export function enableFilter(
  scene: Scene,
  params?: Partial<Pick<BandFilter, 'centreD' | 'widthD' | 'softnessD'>>
): Scene {
  let nextFilter: Filter = { ...scene.filter, enabled: true };
  if (params) {
    nextFilter = patchFocusedSpan(nextFilter, params);
  }
  return {
    ...scene,
    filter: nextFilter,
  };
}

/**
 * Cycles the filter mode through the sequence.
 * Retained for backwards-compatibility.
 */
export function cycleFilterMode(scene: Scene): Scene {
  return cycleSpectralPreset(scene);
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

/**
 * Sets the active filter by ID from scene.filters or PRESET_FILTERS.
 */
export function setPrimaryFilter(scene: Scene, filterId: string): Scene {
  const allFilters = scene.filters && scene.filters.length > 0 ? scene.filters : PRESET_FILTERS;
  const target = allFilters.find((f) => f.id === filterId || f.presetId === filterId);
  if (!target) return scene;

  // Deep clone to decouple active state
  const cloned: Filter = {
    ...target,
    conditions: target.conditions.map((c) => ({
      ...c,
      ...(c.kind === 'range' ? { spans: c.spans.map((s) => ({ ...s })) } : {}),
      ...(c.kind === 'cycle' ? { slotWeights: [...c.slotWeights] } : {}),
    })),
  };

  return {
    ...scene,
    filter: cloned,
  };
}

/**
 * Creates a user copy of a preset or active filter.
 */
export function forkFilter(
  scene: Scene,
  sourceFilter: Filter = scene.filter,
  createId: (prefix: string) => string = (prefix) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`
): Scene {
  const allFilters = scene.filters && scene.filters.length > 0 ? [...scene.filters] : [...PRESET_FILTERS];
  const newId = createId('user-filter');
  const forked: Filter = {
    ...sourceFilter,
    id: newId,
    name: sourceFilter.origin === 'user' ? `${sourceFilter.name} (Copy)` : `${sourceFilter.name} (User)`,
    origin: 'user',
    category: 'user',
    conditions: sourceFilter.conditions.map((c) => ({
      ...c,
      id: createId('c'),
      ...(c.kind === 'range' ? { spans: c.spans.map((s) => ({ ...s })) } : {}),
      ...(c.kind === 'cycle' ? { slotWeights: [...c.slotWeights] } : {}),
    })),
  };

  return {
    ...scene,
    filters: [...allFilters, forked],
    filter: forked,
  };
}

/**
 * Duplicates a filter with fresh ID into the user library.
 */
export function duplicateFilter(
  scene: Scene,
  sourceFilter: Filter = scene.filter,
  createId: (prefix: string) => string = (prefix) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`
): Scene {
  return forkFilter(scene, sourceFilter, createId);
}

/**
 * Deletes a user filter from the library.
 */
export function deleteUserFilter(scene: Scene, filterId: string): Scene {
  const currentFilters = scene.filters && scene.filters.length > 0 ? scene.filters : PRESET_FILTERS;
  const remainingFilters = currentFilters.filter(
    (f) => f.id !== filterId || f.origin === 'preset'
  );
  const fallback = remainingFilters[0] || PRESET_FILTERS[0];

  const nextActive = (scene.filter.id === filterId)
    ? {
        ...fallback,
        conditions: fallback.conditions.map((c) => ({
          ...c,
          ...(c.kind === 'range' ? { spans: c.spans.map((s) => ({ ...s })) } : {}),
          ...(c.kind === 'cycle' ? { slotWeights: [...c.slotWeights] } : {}),
        })),
      }
    : scene.filter;

  return {
    ...scene,
    filters: remainingFilters,
    filter: nextActive,
  };
}

/**
 * Creates a brand new custom filter with a default aperture.
 */
export function createUserFilter(
  scene: Scene,
  name?: string,
  createId: (prefix: string) => string = (prefix) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`
): Scene {
  const allFilters = scene.filters && scene.filters.length > 0 ? [...scene.filters] : [...PRESET_FILTERS];
  const newId = createId('user-filter');
  const userCount = allFilters.filter((f) => f.origin === 'user').length + 1;
  const filterName = name || `Custom Filter ${userCount}`;

  const newFilter: Filter = {
    id: newId,
    name: filterName,
    origin: 'user',
    category: 'user',
    enabled: true,
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [
      {
        kind: 'range',
        id: createId('cond-band'),
        reference: 'scene',
        reductionPeriod: null,
        spans: [
          {
            lo: { unit: 'cents', value: -1200 },
            hi: { unit: 'cents', value: 1200 },
          },
        ],
        softness: { value: 600, unit: 'cents' },
      },
    ],
    focus: null,
    centreD: 0.0,
    widthD: 2.0,
    softnessD: 0.5,
    mode: 'band-pass',
    trackingMode: 'relative',
  };

  return {
    ...scene,
    filters: [...allFilters, newFilter],
    filter: newFilter,
  };
}

/**
 * Renames the active filter, updating both scene.filter and its entry in scene.filters if user-created.
 */
export function renameActiveFilter(scene: Scene, name: string): Scene {
  const updatedFilter: Filter = {
    ...scene.filter,
    name,
  };
  const currentFilters = scene.filters && scene.filters.length > 0 ? scene.filters : PRESET_FILTERS;
  const updatedFilters = currentFilters.map((f) => (f.id === scene.filter.id ? { ...f, name } : f));

  return {
    ...scene,
    filter: updatedFilter,
    filters: updatedFilters,
  };
}

// ============================================================================
// Envelope Library & Operations
// ============================================================================

const defaultCreateId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function getActiveEnvelopeOrDefault(scene: Scene): Envelope {
  return scene.envelope || PRESET_ENVELOPES[0];
}

function syncUserEnvelopeInList(
  envelopes: Envelope[] | undefined,
  updated: Envelope
): Envelope[] | undefined {
  if (!envelopes || updated.origin !== 'user') return envelopes;
  return envelopes.map((e) => (e.id === updated.id ? updated : e));
}

export function setPrimaryEnvelope(scene: Scene, envelopeId: string): Scene {
  const allEnvelopes = scene.envelopes && scene.envelopes.length > 0 ? scene.envelopes : PRESET_ENVELOPES;
  const target = allEnvelopes.find((e) => e.id === envelopeId);
  if (!target) return scene;
  return {
    ...scene,
    envelope: { ...target, adsr: { ...target.adsr } },
  };
}

export function toggleEnvelopeEnabled(scene: Scene, enabled?: boolean): Scene {
  const cur = getActiveEnvelopeOrDefault(scene);
  const nextEnabled = enabled !== undefined ? enabled : !cur.enabled;
  const updated: Envelope = { ...cur, enabled: nextEnabled };
  return {
    ...scene,
    envelope: updated,
    envelopes: syncUserEnvelopeInList(scene.envelopes, updated),
  };
}

export function updateActiveEnvelope(
  scene: Scene,
  patch: Partial<Omit<Envelope, 'adsr'>> & { adsr?: Partial<Envelope['adsr']> }
): Scene {
  const cur = getActiveEnvelopeOrDefault(scene);
  const updated: Envelope = {
    ...cur,
    ...patch,
    adsr: patch.adsr ? { ...cur.adsr, ...patch.adsr } : cur.adsr,
  };
  return {
    ...scene,
    envelope: updated,
    envelopes: syncUserEnvelopeInList(scene.envelopes, updated),
  };
}

export function forkEnvelope(
  scene: Scene,
  source: Envelope,
  createId: (prefix: string) => string = defaultCreateId
): Scene {
  const allEnvelopes = scene.envelopes && scene.envelopes.length > 0 ? scene.envelopes : PRESET_ENVELOPES;
  const forked: Envelope = {
    ...source,
    id: createId('user-env'),
    name: `${source.name} (Custom)`,
    origin: 'user',
    category: 'user',
    adsr: { ...source.adsr },
  };
  return {
    ...scene,
    envelopes: [...allEnvelopes, forked],
    envelope: forked,
  };
}

export function duplicateEnvelope(
  scene: Scene,
  source: Envelope,
  createId: (prefix: string) => string = defaultCreateId
): Scene {
  const allEnvelopes = scene.envelopes && scene.envelopes.length > 0 ? scene.envelopes : PRESET_ENVELOPES;
  const dup: Envelope = {
    ...source,
    id: createId('user-env'),
    name: `${source.name} Copy`,
    origin: 'user',
    category: 'user',
    adsr: { ...source.adsr },
  };
  return {
    ...scene,
    envelopes: [...allEnvelopes, dup],
    envelope: dup,
  };
}

export function createUserEnvelope(
  scene: Scene,
  name: string = 'New Custom Envelope',
  createId: (prefix: string) => string = defaultCreateId
): Scene {
  const allEnvelopes = scene.envelopes && scene.envelopes.length > 0 ? scene.envelopes : PRESET_ENVELOPES;
  const created: Envelope = {
    id: createId('user-env'),
    name,
    origin: 'user',
    category: 'user',
    enabled: true,
    adsr: { attack: 0.02, decay: 0.8, sustain: 0.6, release: 0.3, damping: 0.2 },
    rhythmMode: 'supercycle',
    supercycleLength: 1,
  };
  return {
    ...scene,
    envelopes: [...allEnvelopes, created],
    envelope: created,
  };
}

export function renameActiveEnvelope(scene: Scene, name: string): Scene {
  const cur = getActiveEnvelopeOrDefault(scene);
  const updated: Envelope = { ...cur, name };
  const allEnvelopes = scene.envelopes && scene.envelopes.length > 0 ? scene.envelopes : PRESET_ENVELOPES;
  return {
    ...scene,
    envelope: updated,
    envelopes: allEnvelopes.map((e) => (e.id === cur.id ? { ...e, name } : e)),
  };
}

export function deleteUserEnvelope(scene: Scene, envelopeId: string): Scene {
  const allEnvelopes = scene.envelopes && scene.envelopes.length > 0 ? scene.envelopes : PRESET_ENVELOPES;
  const target = allEnvelopes.find((e) => e.id === envelopeId);
  if (!target || target.origin !== 'user') return scene;
  const remaining = allEnvelopes.filter((e) => e.id !== envelopeId);
  const nextActive =
    scene.envelope?.id === envelopeId
      ? remaining[0] || PRESET_ENVELOPES[0]
      : scene.envelope || PRESET_ENVELOPES[0];
  return {
    ...scene,
    envelopes: remaining,
    envelope: nextActive,
  };
}
