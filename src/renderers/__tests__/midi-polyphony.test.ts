import { describe, it, expect } from 'vitest';
import { buildPolyphonicMidiBundle } from '../midi-polyphony-utils';
import { PRESET_SHAPES } from '../../core/presets';
import { HeldMidiNote } from '../render-coordinator';

describe('midi-polyphony-utils', () => {
  const sineShape = PRESET_SHAPES.find((s) => s.id === 'pure-tone') ?? PRESET_SHAPES[0];
  const pianoShape = PRESET_SHAPES.find((s) => s.id === 'piano') ?? PRESET_SHAPES[PRESET_SHAPES.length - 1];

  it('returns null when fewer than 2 MIDI notes are held', () => {
    const single: HeldMidiNote[] = [{ midi: 68, d: 4.0, velocity: 0.8, isPrimary: true, livePhase: 0.25 }];
    expect(buildPolyphonicMidiBundle(single, sineShape, 25.8)).toBeNull();
    expect(buildPolyphonicMidiBundle([], sineShape, 25.8)).toBeNull();
  });

  it('anchors to the lowest held note and computes exact Sam-Aligned ratios', () => {
    // Hold Do+4 (d = 4.0) and So+4 (3:2 => d = 4 - log2(1.5))
    const fifthD = 4.0 - Math.log2(1.5);
    const held: HeldMidiNote[] = [
      { midi: 75, d: fifthD, velocity: 0.9, isPrimary: true, livePhase: 1.5 },
      { midi: 68, d: 4.0, velocity: 0.8, isPrimary: false, livePhase: 1.0 },
    ];

    const bundle = buildPolyphonicMidiBundle(held, sineShape, 25.8);
    expect(bundle).not.toBeNull();
    expect(bundle!.anchorNote.midi).toBe(68);
    expect(bundle!.streams).toHaveLength(2);
    expect(bundle!.streams[0].ratioToRef).toBeCloseTo(1.0, 6);
    expect(bundle!.streams[1].ratioToRef).toBeCloseTo(1.5, 6);
    // Sam-Aligned: voiceLivePhase (1.5) == anchorLivePhase (1.0) * 1.5 => effectivePhase == 0
    expect(bundle!.streams[1].effectivePhase).toBeCloseTo(0.0, 6);
  });

  it('caps very dense chords on rich shapes to 1 fundamental stream per held MIDI note', () => {
    // 5 held notes on a 16-partial shape (80 > 32) falls back to 1 stream per held note
    const held: HeldMidiNote[] = [
      { midi: 60, d: -3.5, velocity: 0.8, isPrimary: false },
      { midi: 64, d: -3.8, velocity: 0.8, isPrimary: false },
      { midi: 67, d: -4.1, velocity: 0.8, isPrimary: false },
      { midi: 71, d: -4.4, velocity: 0.8, isPrimary: false },
      { midi: 74, d: -4.7, velocity: 0.8, isPrimary: true },
    ];
    const bundle = buildPolyphonicMidiBundle(held, pianoShape, 25.8);
    expect(bundle).not.toBeNull();
    expect(bundle!.isExpandedPartials).toBe(false);
    expect(bundle!.streams).toHaveLength(5);
  });
});
