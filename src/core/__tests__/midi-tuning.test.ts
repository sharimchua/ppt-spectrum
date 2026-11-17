import { describe, it, expect } from 'vitest';
import {
  createDefaultMidiTuningConfig,
  midiToDWithTuning,
  resolveSemitoneInterval,
} from '../midi-tuning';
import { midiToD } from '../axis';

describe('midi-tuning', () => {
  it('resolves exact 5-limit Just Intonation ratios and cents offsets', () => {
    const cfg = createDefaultMidiTuningConfig('5-limit');

    const p5 = resolveSemitoneInterval(7, cfg.intervals);
    expect(p5.ratioValue).toBeCloseTo(1.5, 10);
    expect(p5.rational).toEqual({ num: 3, den: 2 });
    expect(p5.primeFamily).toBe('Tri');
    expect(p5.centsFromEdo).toBe(2);

    const m3 = resolveSemitoneInterval(4, cfg.intervals);
    expect(m3.ratioValue).toBeCloseTo(1.25, 10);
    expect(m3.rational).toEqual({ num: 5, den: 4 });
    expect(m3.primeFamily).toBe('Qui');
    expect(m3.centsFromEdo).toBe(-14);
  });

  it('resolves 7-limit and 11-limit intervals accurately', () => {
    const cfg11 = createDefaultMidiTuningConfig('11-limit');

    const tt = resolveSemitoneInterval(6, cfg11.intervals);
    expect(tt.rational).toEqual({ num: 11, den: 8 });
    expect(tt.primeFamily).toBe('Undec');

    const m7 = resolveSemitoneInterval(10, cfg11.intervals);
    expect(m7.rational).toEqual({ num: 7, den: 4 });
    expect(m7.primeFamily).toBe('Sep');
  });

  it('maintains Rhythm Space polarity and maps G#4 (MIDI 68) to Do+4', () => {
    const cfg = createDefaultMidiTuningConfig('5-limit');
    // Fundamental in Rhythm Space (e.g. 120 BPM at d = +3.69)
    const rootRes = midiToDWithTuning(68, cfg, 3.69);

    expect(rootRes.polarity).toBe('rhythm');
    expect(rootRes.d).toBeCloseTo(4.0, 10);
    expect(rootRes.address.formatted).toBe('Do+4');
    expect(rootRes.bpm).toBeCloseTo(96.75, 2);

    // Playing a 3:2 fifth above (D#5, MIDI 75) scales BPM by exactly 1.5
    const fifthRes = midiToDWithTuning(75, cfg, 3.69);
    expect(fifthRes.polarity).toBe('rhythm');
    expect(fifthRes.bpm / rootRes.bpm).toBeCloseTo(1.5, 10);
    expect(fifthRes.rational).toEqual({ num: 3, den: 2 });

    // Playing a 4:3 fourth above (C#5, MIDI 73) scales BPM by exactly 4/3
    const fourthRes = midiToDWithTuning(73, cfg, 3.69);
    expect(fourthRes.bpm / rootRes.bpm).toBeCloseTo(4 / 3, 10);
  });

  it('clamps extreme high MIDI notes to remain on the Rhythm side of the TPL', () => {
    const cfg = createDefaultMidiTuningConfig('5-limit');
    const extreme = midiToDWithTuning(127, cfg, 2.0);
    expect(extreme.polarity).toBe('rhythm');
    expect(extreme.d).toBeGreaterThan(0);
    expect(extreme.clampedToPolarity).toBe(true);
  });

  it('matches standard 12-TET midiToD in Pitch Space when preset is 12tet', () => {
    const cfg = createDefaultMidiTuningConfig('12tet');
    const pitchRes = midiToDWithTuning(69, cfg, -4.09, 440, 25.8);
    expect(pitchRes.polarity).toBe('pitch');
    expect(pitchRes.d).toBeCloseTo(midiToD(69, 440, 25.8), 10);
    expect(pitchRes.freqHz).toBeCloseTo(440, 6);
  });
});
