import { describe, it, expect } from 'vitest';
import { buildPolyphonicMidiScene } from '../midi-polyphony-utils';
import { DEFAULT_SCENE } from '../../core/config';
import { calculateCoincidenceCycle } from '../../core/alignment';
import { HeldMidiNote } from '../render-coordinator';

describe('midi-polyphony-utils', () => {
  const sineScene = {
    ...DEFAULT_SCENE,
    placements: [{ ...DEFAULT_SCENE.placements[0], shapeId: 'pure-tone', d: 4.0 }],
  };

  it('returns null when fewer than 2 MIDI notes are held', () => {
    const single: HeldMidiNote[] = [{ midi: 68, d: 4.0, velocity: 0.8, isPrimary: true, livePhase: 0.25 }];
    expect(buildPolyphonicMidiScene(sineScene, single)).toBeNull();
    expect(buildPolyphonicMidiScene(sineScene, [])).toBeNull();
  });

  it('synthesises a compact rational Super-Cycle for Just Intonation chords (3:2 & 5:4)', () => {
    // Hold Do+4 (1:1) and Mi+4 (5:4) on Sine Wave -> 4-turn Super-Cycle
    const maj3D = 4.0 - Math.log2(1.25);
    const held: HeldMidiNote[] = [
      { midi: 72, d: maj3D, velocity: 0.9, isPrimary: true, livePhase: 1.25 },
      { midi: 68, d: 4.0, velocity: 0.8, isPrimary: false, livePhase: 1.0 },
    ];

    const poly = buildPolyphonicMidiScene(sineScene, held);
    expect(poly).not.toBeNull();
    const virtualShape = poly!.scene.shapes[0];
    expect(virtualShape.partials).toHaveLength(2);
    expect(virtualShape.partials[1].ratio).toEqual({ kind: 'rational', num: 5, den: 4 });
    expect(virtualShape.partials[1].phase).toBeCloseTo(0, 6);

    const coincidence = calculateCoincidenceCycle(virtualShape, poly!.anchorFreqHz);
    expect(coincidence.isAperiodic).toBe(false);
    expect(coincidence.isCompactSuperCycle).toBe(true);
    expect(coincidence.rootTurnsToAlign).toBe(4);
  });

  it('treats 12-TET tempered intervals as aperiodic rather than snapping to Just ratios', () => {
    // Hold Do+4 and 12-TET Major 3rd (+4 semitones)
    const temperedMaj3D = 4.0 - 4 / 12;
    const held: HeldMidiNote[] = [
      { midi: 72, d: temperedMaj3D, velocity: 0.9, isPrimary: true, livePhase: 0 },
      { midi: 68, d: 4.0, velocity: 0.8, isPrimary: false, livePhase: 0 },
    ];

    const poly = buildPolyphonicMidiScene(sineScene, held);
    expect(poly).not.toBeNull();
    const virtualShape = poly!.scene.shapes[0];
    expect(virtualShape.partials[1].ratio.kind).toBe('real');

    const coincidence = calculateCoincidenceCycle(virtualShape, poly!.anchorFreqHz);
    expect(coincidence.isAperiodic).toBe(true);
  });

  it('caps very dense chords on rich shapes to 1 fundamental stream per held MIDI note', () => {
    const pianoScene = {
      ...DEFAULT_SCENE,
      placements: [{ ...DEFAULT_SCENE.placements[0], shapeId: 'piano', d: -3.5 }],
    };
    const held: HeldMidiNote[] = [
      { midi: 60, d: -3.5, velocity: 0.8, isPrimary: false },
      { midi: 64, d: -3.8, velocity: 0.8, isPrimary: false },
      { midi: 67, d: -4.1, velocity: 0.8, isPrimary: false },
      { midi: 71, d: -4.4, velocity: 0.8, isPrimary: false },
      { midi: 74, d: -4.7, velocity: 0.8, isPrimary: true },
    ];
    const poly = buildPolyphonicMidiScene(pianoScene, held);
    expect(poly).not.toBeNull();
    expect(poly!.scene.shapes[0].partials).toHaveLength(5);
  });
});
