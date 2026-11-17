import { describe, it, expect } from 'vitest';
import {
  buildIntervalBands,
  buildVirtualKeys,
  formatIntervalRatioLabel,
} from '../keyboard/keyboard-layout';
import { createDefaultMidiTuningConfig } from '../../core/midi-tuning';

describe('keyboard-layout', () => {
  it('marks Do keys as tonic and resolves Solfege relative to rhythmRootMidi', () => {
    const tuning = createDefaultMidiTuningConfig('5-limit');
    // F3..F5 (white-key bounded) around G#4 (MIDI 68)
    const keys = buildVirtualKeys(53, 77, tuning, 4.0, 440, 25.8);
    expect(keys[0].isBlack).toBe(false);
    expect(keys[keys.length - 1].isBlack).toBe(false);

    const gSharp = keys.find((k) => k.midi === 68)!;
    expect(gSharp.isTonic).toBe(true);
    expect(gSharp.syllable).toBe('Do');
    expect(gSharp.mapping.polarity).toBe('rhythm');

    const cSharp = keys.find((k) => k.midi === 61)!;
    expect(cSharp.syllable).toBe('Fa');
  });

  it('formats exact rational ratios for Just intervals and decimal multipliers for 12-TET', () => {
    expect(formatIntervalRatioLabel(1.5)).toBe('3:2');
    expect(formatIntervalRatioLabel(1.25)).toBe('5:4');
    expect(formatIntervalRatioLabel(1.2)).toBe('6:5');
    expect(formatIntervalRatioLabel(Math.pow(2, 4 / 12))).toBe('1.260×');
  });

  it('builds pairwise stacked interval bands for chords and step bands when idle', () => {
    const tuning = createDefaultMidiTuningConfig('dutri');
    const keys = buildVirtualKeys(68, 80, tuning, -4.0, 440, 25.8);

    // Idle: 12 adjacent semitone steps showing alternating ~102c / ~96c DuTri pattern
    const stepRes = buildIntervalBands(keys, new Set(), false);
    expect(stepRes.rowCount).toBe(1);
    expect(stepRes.bands).toHaveLength(12);
    expect(stepRes.bands[0].isSubtleStep).toBe(true);
    expect(stepRes.bands[0].centsLabel).toBe('102¢');
    expect(stepRes.bands[1].centsLabel).toBe('96¢');

    // 3-note triad (Do + Mi + So in 5-limit): 3 pairwise relationships (5:4, 6:5, 3:2)
    const just5 = createDefaultMidiTuningConfig('5-limit');
    const justKeys = buildVirtualKeys(68, 80, just5, -4.0, 440, 25.8);
    const chordRes = buildIntervalBands(justKeys, new Set([68, 72, 75]), false);
    expect(chordRes.bands).toHaveLength(3);
    expect(chordRes.rowCount).toBe(2); // 68-72 & 72-75 on row 0; 68-75 packed on row 1
    expect(chordRes.bands.map((b) => b.ratioLabel)).toEqual(['6:5', '5:4', '3:2']);
  });
});
