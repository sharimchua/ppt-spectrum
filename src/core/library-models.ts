/**
 * Flexible Library Bundles and non-destructive, idempotent Export/Import (Slug & JSON).
 * Combines Shape, Filter, and Envelope into shareable configurations.
 */

import { Shape, Filter, Envelope, PresetCategory, Scene } from './types';
import { PRESET_SHAPES } from './presets';
import { PRESET_FILTERS } from './filter-presets';
import { PRESET_ENVELOPES } from './envelope-presets';

export interface LibraryBundle {
  id: string;
  name: string;
  description?: string;
  category?: PresetCategory | 'custom';
  origin: 'preset' | 'user';
  shape: Shape;
  filter?: Filter;
  envelope?: Envelope;
  placementD?: number;
}

export interface LibraryExportPayload {
  version: 1;
  kind: 'bundle' | 'set';
  bundles: LibraryBundle[];
  shapes?: Shape[];
  filters?: Filter[];
  envelopes?: Envelope[];
}

export interface LibraryImportStats {
  addedShapes: number;
  addedFilters: number;
  addedEnvelopes: number;
  addedBundles: number;
  skippedDuplicates: number;
  renamedCollisions: number;
}

export const PRESET_LIBRARY_BUNDLES: LibraryBundle[] = [
  {
    id: 'bundle-hemiola-tresillo',
    name: 'Octuple 1:8 + Tresillo Sieve',
    description: 'Dense 1:2:4:8 8th-note pulse stack gated by an 8-slot Tresillo cycle filter.',
    category: 'rhythm',
    origin: 'preset',
    shape: PRESET_SHAPES.find((s) => s.id === 'duple-1-8') || PRESET_SHAPES[0],
    filter: PRESET_FILTERS.find((f) => f.id === 'filter-tresillo'),
    envelope: PRESET_ENVELOPES.find((e) => e.id === 'env-rhythm-gate-2'),
    placementD: 5.2,
  },
  {
    id: 'bundle-piano-harmonic-comb',
    name: 'Piano Hammer + Harmonic Comb',
    description: 'Stretched piano partials with a natural hammer ADSR and harmonic comb.',
    category: 'timbre',
    origin: 'preset',
    shape: PRESET_SHAPES.find((s) => s.id === 'piano') || PRESET_SHAPES[0],
    filter: PRESET_FILTERS.find((f) => f.id === 'filter-harmonic-comb'),
    envelope: PRESET_ENVELOPES.find((e) => e.id === 'env-piano-hammer'),
    placementD: -3.5,
  },
  {
    id: 'bundle-bowl-swell',
    name: 'Singing Bowl + 4-Bar Swell',
    description: 'Inharmonic Tibetan bowl with slow ambient pad and 4-bar crescendo.',
    category: 'timbre',
    origin: 'preset',
    shape: PRESET_SHAPES.find((s) => s.id === 'tibetan-singing-bowl') || PRESET_SHAPES[0],
    envelope: PRESET_ENVELOPES.find((e) => e.id === 'env-rhythm-swell-4'),
    placementD: -2.0,
  },
  {
    id: 'bundle-triad-just',
    name: 'Major Triad + Just Aperture',
    description: '4:5:6 just major triad framed by a relative octave aperture.',
    category: 'harmony',
    origin: 'preset',
    shape: PRESET_SHAPES.find((s) => s.id === 'major-triad-4-5-6') || PRESET_SHAPES[0],
    filter: PRESET_FILTERS[0],
    envelope: PRESET_ENVELOPES.find((e) => e.id === 'env-bowed-strings'),
    placementD: -3.0,
  },
];

/**
 * Builds a single-item LibraryExportPayload from the active scene configuration.
 */
export function buildSingleBundleExport(
  scene: Scene,
  customName?: string,
  createId: (prefix: string) => string = (p) => `${p}-${Date.now().toString(36)}`
): LibraryExportPayload {
  const primary = scene.placements[0];
  const activeShape =
    scene.shapes.find((s) => s.id === primary?.shapeId) || scene.shapes[0] || PRESET_SHAPES[0];

  const bundle: LibraryBundle = {
    id: createId('user-bundle'),
    name: customName || `${activeShape.name} Setup`,
    description: 'Custom Shape, Filter, and Envelope configuration',
    category: 'custom',
    origin: 'user',
    shape: activeShape,
    filter: scene.filter,
    envelope: scene.envelope,
    placementD: primary?.d,
  };

  return {
    version: 1,
    kind: 'bundle',
    bundles: [bundle],
  };
}

/**
 * Builds a full or subset LibraryExportPayload containing user-created items.
 */
export function buildLibrarySetExport(scene: Scene): LibraryExportPayload {
  const userShapes = scene.shapes.filter((s) => s.origin !== 'preset');
  const userFilters = (scene.filters || []).filter((f) => f.origin === 'user');
  const userEnvelopes = (scene.envelopes || []).filter((e) => e.origin === 'user');
  const userBundles = (scene.libraryBundles || []).filter((b) => b.origin === 'user');

  return {
    version: 1,
    kind: 'set',
    bundles: userBundles,
    shapes: userShapes,
    filters: userFilters,
    envelopes: userEnvelopes,
  };
}

/**
 * Encodes a LibraryExportPayload into a compact, URL-safe base64 slug.
 */
export function encodeLibraryToSlug(payload: LibraryExportPayload): string {
  try {
    const json = JSON.stringify(payload);
    const base64 =
      typeof btoa === 'function'
        ? btoa(unescape(encodeURIComponent(json)))
        : Buffer.from(json, 'utf-8').toString('base64');

    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (err) {
    console.warn('[Library] Failed to encode library slug:', err);
    return '';
  }
}

/**
 * Decodes a URL-safe base64 slug into a LibraryExportPayload.
 * Returns null if invalid or malformed.
 */
export function decodeLibraryFromSlug(slug: string): LibraryExportPayload | null {
  if (!slug || typeof slug !== 'string') return null;
  try {
    let base64 = slug.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const json =
      typeof atob === 'function'
        ? decodeURIComponent(escape(atob(base64)))
        : Buffer.from(base64, 'base64').toString('utf-8');

    const parsed = JSON.parse(json) as Partial<LibraryExportPayload>;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1 || !Array.isArray(parsed.bundles)) {
      return null;
    }

    return {
      version: 1,
      kind: parsed.kind === 'set' ? 'set' : 'bundle',
      bundles: parsed.bundles,
      shapes: Array.isArray(parsed.shapes) ? parsed.shapes : undefined,
      filters: Array.isArray(parsed.filters) ? parsed.filters : undefined,
      envelopes: Array.isArray(parsed.envelopes) ? parsed.envelopes : undefined,
    };
  } catch {
    return null;
  }
}

function stableEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function mergeNamedItem<T extends { id?: string; name: string; origin?: string }>(
  existing: T[],
  incoming: T[],
  stats: LibraryImportStats,
  statKey: 'addedShapes' | 'addedFilters' | 'addedEnvelopes' | 'addedBundles',
  idPrefix: string
): T[] {
  const next = [...existing];
  const usedIds = new Set(existing.map((item) => item.id).filter(Boolean) as string[]);

  for (const item of incoming) {
    if (!item || typeof item !== 'object') continue;
    const itemId = item.id;
    const match = itemId ? next.find((e) => e.id === itemId) : undefined;

    if (match) {
      if (stableEqual(match, item)) {
        stats.skippedDuplicates++;
        continue;
      }
      // Collision with different content: preserve local item and mint a unique imported ID
      let newId = `${idPrefix}-imp-${usedIds.size + 1}`;
      let counter = 1;
      while (usedIds.has(newId)) {
        counter++;
        newId = `${idPrefix}-imp-${usedIds.size + counter}`;
      }
      usedIds.add(newId);
      const renamedName = item.name.endsWith('(Imported)') ? item.name : `${item.name} (Imported)`;
      next.push({ ...item, id: newId, name: renamedName, origin: 'user' });
      stats.renamedCollisions++;
      stats[statKey]++;
    } else {
      const assignedId = itemId || `${idPrefix}-imp-${usedIds.size + 1}`;
      usedIds.add(assignedId);
      next.push({ ...item, id: assignedId });
      stats[statKey]++;
    }
  }

  return next;
}

/**
 * Non-destructively and idempotently merges an exported LibraryExportPayload into the Scene.
 * Never overwrites or deletes existing local library items.
 */
export function importLibraryPayload(
  scene: Scene,
  payload: LibraryExportPayload
): { scene: Scene; stats: LibraryImportStats; primaryBundle?: LibraryBundle } {
  const stats: LibraryImportStats = {
    addedShapes: 0,
    addedFilters: 0,
    addedEnvelopes: 0,
    addedBundles: 0,
    skippedDuplicates: 0,
    renamedCollisions: 0,
  };

  let nextShapes = [...scene.shapes];
  let nextFilters = [...(scene.filters && scene.filters.length > 0 ? scene.filters : PRESET_FILTERS)];
  let nextEnvelopes = [...(scene.envelopes && scene.envelopes.length > 0 ? scene.envelopes : PRESET_ENVELOPES)];
  let nextBundles = [...(scene.libraryBundles && scene.libraryBundles.length > 0 ? scene.libraryBundles : PRESET_LIBRARY_BUNDLES)];

  if (payload.shapes && payload.shapes.length > 0) {
    nextShapes = mergeNamedItem(nextShapes, payload.shapes, stats, 'addedShapes', 'user-shape');
  }
  if (payload.filters && payload.filters.length > 0) {
    nextFilters = mergeNamedItem(nextFilters, payload.filters, stats, 'addedFilters', 'user-filter');
  }
  if (payload.envelopes && payload.envelopes.length > 0) {
    nextEnvelopes = mergeNamedItem(nextEnvelopes, payload.envelopes, stats, 'addedEnvelopes', 'user-env');
  }

  // Also ensure any embedded shape/filter/envelope inside bundles are merged
  const bundleShapes = payload.bundles.map((b) => b.shape).filter(Boolean);
  const bundleFilters = payload.bundles.map((b) => b.filter).filter((f): f is Filter => Boolean(f));
  const bundleEnvelopes = payload.bundles.map((b) => b.envelope).filter((e): e is Envelope => Boolean(e));

  if (bundleShapes.length > 0) {
    nextShapes = mergeNamedItem(nextShapes, bundleShapes, stats, 'addedShapes', 'user-shape');
  }
  if (bundleFilters.length > 0) {
    nextFilters = mergeNamedItem(nextFilters, bundleFilters, stats, 'addedFilters', 'user-filter');
  }
  if (bundleEnvelopes.length > 0) {
    nextEnvelopes = mergeNamedItem(nextEnvelopes, bundleEnvelopes, stats, 'addedEnvelopes', 'user-env');
  }

  if (payload.bundles.length > 0) {
    nextBundles = mergeNamedItem(nextBundles, payload.bundles, stats, 'addedBundles', 'user-bundle');
  }

  return {
    scene: {
      ...scene,
      shapes: nextShapes,
      filters: nextFilters,
      envelopes: nextEnvelopes,
      libraryBundles: nextBundles,
    },
    stats,
    primaryBundle: payload.bundles[0],
  };
}

/**
 * Applies a LibraryBundle's Shape, Filter, and Envelope to the active Scene.
 */
export function applyLibraryBundleToScene(scene: Scene, bundle: LibraryBundle): Scene {
  const hasShape = scene.shapes.some((s) => s.id === bundle.shape.id);
  const nextShapes = hasShape ? scene.shapes : [...scene.shapes, bundle.shape];

  const nextPlacements = scene.placements.map((p, idx) =>
    idx === 0
      ? {
          ...p,
          shapeId: bundle.shape.id,
          d: bundle.placementD !== undefined ? bundle.placementD : p.d,
        }
      : p
  );

  return {
    ...scene,
    shapes: nextShapes,
    placements: nextPlacements,
    filter: bundle.filter ? bundle.filter : scene.filter,
    envelope: bundle.envelope ? bundle.envelope : scene.envelope,
  };
}
