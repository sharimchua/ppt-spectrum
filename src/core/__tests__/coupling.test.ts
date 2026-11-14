import { describe, it, expect } from 'vitest';
import { DEFAULT_SCENE } from '../config';
import { PRESET_SHAPES } from '../presets';
import {
  isShapeRhythmEligible,
  resolvePitchCarrier,
  resolveRhythmContainer,
  computeContainerCyclePeriodSec,
  buildCarrierPartialsForOnset,
} from '../coupling';
import { Scene } from '../types';

describe('Cross-Limen Coupling (Pitch Carrier & Rhythm Container)', () => {
  it('identifies compact rational harmony and rhythm shapes as rhythm-eligible in Pitch Space', () => {
    const hemiola = PRESET_SHAPES.find((s) => s.id === 'hemiola-3-2')!;
    const poly43 = PRESET_SHAPES.find((s) => s.id === 'polyrhythm-4-3')!;
    const majorTriad = PRESET_SHAPES.find((s) => s.id === 'major-triad-4-5-6')!;

    expect(isShapeRhythmEligible(hemiola)).toBe(true);
    expect(isShapeRhythmEligible(poly43)).toBe(true);
    expect(isShapeRhythmEligible(majorTriad)).toBe(true);
  });

  it('excludes single-partial sines and complex/inharmonic timbres from automatic pitch rhythm pulsing', () => {
    const pureTone = PRESET_SHAPES.find((s) => s.id === 'pure-tone')!;
    const saw = PRESET_SHAPES.find((s) => s.id === 'saw-like')!;
    const clarinet = PRESET_SHAPES.find((s) => s.id === 'clarinet-like')!;
    const piano = PRESET_SHAPES.find((s) => s.id === 'piano')!;
    const bell = PRESET_SHAPES.find((s) => s.id === 'bell')!;

    expect(isShapeRhythmEligible(pureTone)).toBe(false);
    expect(isShapeRhythmEligible(saw)).toBe(false);
    expect(isShapeRhythmEligible(clarinet)).toBe(false);
    expect(isShapeRhythmEligible(piano)).toBe(false);
    expect(isShapeRhythmEligible(bell)).toBe(false);
  });

  it('resolves Pitch Carrier in Auto mode to Self for rhythm/harmony and Kit for timbres', () => {
    const hemiola = PRESET_SHAPES.find((s) => s.id === 'hemiola-3-2')!;
    const bell = PRESET_SHAPES.find((s) => s.id === 'bell')!;

    const resHemiola = resolvePitchCarrier(DEFAULT_SCENE, hemiola);
    expect(resHemiola.mode).toBe('self');
    expect(resHemiola.isAuto).toBe(true);
    expect(resHemiola.shortLabel).toBe('Auto (Self)');

    const resBell = resolvePitchCarrier(DEFAULT_SCENE, bell);
    expect(resBell.mode).toBe('kit');
    expect(resBell.isAuto).toBe(true);
    expect(resBell.shortLabel).toBe('Auto (Kit)');
  });

  it('resolves Rhythm Container in Auto mode to Self for eligible shapes and Static for timbres', () => {
    const majorTriad = PRESET_SHAPES.find((s) => s.id === 'major-triad-4-5-6')!;
    const piano = PRESET_SHAPES.find((s) => s.id === 'piano')!;

    const resTriad = resolveRhythmContainer(DEFAULT_SCENE, majorTriad);
    expect(resTriad.mode).toBe('self');
    expect(resTriad.shortLabel).toBe('Auto (Self)');

    const resPiano = resolveRhythmContainer(DEFAULT_SCENE, piano);
    expect(resPiano.mode).toBe('static');
    expect(resPiano.shortLabel).toBe('Auto (Static)');
  });

  it('supports explicit scene overrides for Self, Kit, Static, and Library Shape coupling', () => {
    const hemiola = PRESET_SHAPES.find((s) => s.id === 'hemiola-3-2')!;
    const customScene: Scene = {
      ...DEFAULT_SCENE,
      audio: {
        ...DEFAULT_SCENE.audio,
        pitchCarrier: 'shape:piano',
        rhythmContainer: 'static',
      },
    };

    const carrier = resolvePitchCarrier(customScene, hemiola);
    expect(carrier.mode).toBe('shape');
    expect(carrier.carrierShape?.id).toBe('piano');

    const container = resolveRhythmContainer(customScene, hemiola);
    expect(container.mode).toBe('static');
    expect(container.isAuto).toBe(false);
  });

  it('normalises carrier partials for a 3:2 hemiola into a [1, 1.5] fifth dyad', () => {
    const hemiola = PRESET_SHAPES.find((s) => s.id === 'hemiola-3-2')!;
    const carrierPartials = buildCarrierPartialsForOnset(hemiola, 0, 6);
    const ratios = carrierPartials.map((p) => p.ratio).sort((a, b) => a - b);
    expect(ratios).toContain(1);
    expect(ratios).toContain(1.5);
  });

  it('paces container cycle period according to ADSR decay and max subdivision ratio', () => {
    const shortCycle = computeContainerCyclePeriodSec([1, 1.5], {
      attack: 0.005,
      decay: 0.3,
      sustain: 0.1,
      release: 0.2,
    });
    const longCycle = computeContainerCyclePeriodSec([1, 2, 3, 4], {
      attack: 0.05,
      decay: 2.2,
      sustain: 0.2,
      release: 0.6,
    });
    expect(shortCycle).toBeGreaterThanOrEqual(1.4);
    expect(longCycle).toBeGreaterThan(shortCycle);
  });
});
