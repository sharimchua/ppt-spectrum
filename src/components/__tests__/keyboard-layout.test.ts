import { describe, it, expect } from 'vitest';
import { buildIntervalBands, buildVirtualKeys } from '../keyboard/keyboard-layout';
import { createDefaultMidiTuningConfig } from '../../core/midi-tuning';

describe('keyboard-layout', () => {
  it('marks Do keys as tonic and resolves Solfege relative to rhythmRootMidi', () => {
    const tuning = createDefaultMidiTuningConfig('5-limit');
    // G#4 (MIDI 68) is default rhythmRootMidi
    const keys = buildVirtualKeys(60, 72, tuning, 4.0, 440, 25.8);
    expect(keys).toHaveLength(13);

    const gSharp = keys.find((k) => k.midi === 68)!;
    expect(gSharp.isTonic).toBe(true);
    expect(gSharp.syllable).toBe('Do');
    expect(gSharp.mapping.polarity).toBe('rhythm');

    const cSharp = keys.find((k) => k.midi === 61)!; // 5 semitones above 56 = Fa
    expect(cSharp.syllable).toBe('Fa');
  });

  it('builds active interval bands when 2+ keys are latched and step bands when idle', () => {
    const tuning = createDefaultMidiTuningConfig('dutri');
    const keys = buildVirtualKeys(68, 80, tuning, -4.0, 440, 25.8);

    // Idle: 12 adjacent semitone steps showing alternating ~102c / ~96c DuTri pattern
    const stepBands = buildIntervalBands(keys, new Set(), false);
    expect(stepBands).toHaveLength(12);
    expect(stepBands[0].isSubtleStep).toBe(true);
    expect(stepBands[0].centsLabel).toBe('102¢');
    expect(stepBands[1].centsLabel).toBe('96¢');

    // Latched 2 keys (Do + So)
    const activeBands = buildIntervalBands(keys, new Set([68, 75]), false);
    expect(activeBands).toHaveLength(1);
    expect(activeBands[0].isSubtleStep).toBe(false);
    expect(activeBands[0].ratioLabel).toBe('1.500×');
    expect(activeBands[0].centsLabel).toBe('702¢');
  });
});
