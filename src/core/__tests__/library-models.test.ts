import { describe, it, expect } from 'vitest';
import { DEFAULT_SCENE } from '../config';
import {
  PRESET_LIBRARY_BUNDLES,
  buildSingleBundleExport,
  buildLibrarySetExport,
  encodeLibraryToSlug,
  decodeLibraryFromSlug,
  importLibraryPayload,
  applyLibraryBundleToScene,
} from '../library-models';

describe('Library Bundles & Non-Destructive Import/Export', () => {
  it('round-trips a single bundle through slug encoding and decoding', () => {
    const exported = buildSingleBundleExport(DEFAULT_SCENE, 'My Shared Setup', (p) => `${p}-test`);
    const slug = encodeLibraryToSlug(exported);
    expect(slug.length).toBeGreaterThan(10);

    const decoded = decodeLibraryFromSlug(slug);
    expect(decoded).not.toBeNull();
    expect(decoded?.kind).toBe('bundle');
    expect(decoded?.bundles[0].name).toBe('My Shared Setup');
    expect(decoded?.bundles[0].shape.id).toBe(DEFAULT_SCENE.placements[0].shapeId);
  });

  it('is idempotent on repeated imports of the same payload', () => {
    const customShape = { ...DEFAULT_SCENE.shapes[0], id: 'user-shape-rt', name: 'RT Shape', origin: 'user' as const };
    const sourceScene = { ...DEFAULT_SCENE, shapes: [...DEFAULT_SCENE.shapes, customShape] };
    const setPayload = buildLibrarySetExport(sourceScene);

    // First import into a clean scene
    const first = importLibraryPayload(DEFAULT_SCENE, setPayload);
    expect(first.stats.addedShapes).toBe(1);
    expect(first.scene.shapes.some((s) => s.id === 'user-shape-rt')).toBe(true);

    // Second import of exact same payload should skip duplicate without adding
    const second = importLibraryPayload(first.scene, setPayload);
    expect(second.stats.addedShapes).toBe(0);
    expect(second.stats.skippedDuplicates).toBeGreaterThanOrEqual(1);
    expect(second.scene.shapes.length).toBe(first.scene.shapes.length);
  });

  it('preserves local items on ID collision with different content', () => {
    const localShape = { ...DEFAULT_SCENE.shapes[0], id: 'user-shared-id', name: 'Local Version', origin: 'user' as const };
    const remoteShape = { ...DEFAULT_SCENE.shapes[0], id: 'user-shared-id', name: 'Remote Version', origin: 'user' as const };

    const localScene = { ...DEFAULT_SCENE, shapes: [...DEFAULT_SCENE.shapes, localShape] };
    const remotePayload = {
      version: 1 as const,
      kind: 'set' as const,
      bundles: [],
      shapes: [remoteShape],
    };

    const result = importLibraryPayload(localScene, remotePayload);
    expect(result.stats.renamedCollisions).toBe(1);
    expect(result.stats.addedShapes).toBe(1);
    expect(result.scene.shapes.some((s) => s.id === 'user-shared-id' && s.name === 'Local Version')).toBe(true);
    expect(result.scene.shapes.some((s) => s.name === 'Remote Version (Imported)')).toBe(true);
  });

  it('applies a preset bundle to the active scene', () => {
    const bundle = PRESET_LIBRARY_BUNDLES[0];
    const next = applyLibraryBundleToScene(DEFAULT_SCENE, bundle);
    expect(next.placements[0].shapeId).toBe(bundle.shape.id);
    if (bundle.filter) expect(next.filter.id).toBe(bundle.filter.id);
    if (bundle.envelope) expect(next.envelope?.id).toBe(bundle.envelope.id);
  });
});
