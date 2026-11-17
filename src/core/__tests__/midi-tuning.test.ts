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

  it('resolves 7-limit, PPT Native, and Qui/Tri minor 2nd intervals accurately', () => {
    const cfg5 = createDefaultMidiTuningConfig('5-limit');
    const m2Qui = resolveSemitoneInterval(1, cfg5.intervals);
    expect(m2Qui.rational).toEqual({ num: 16, den: 15 });
    expect(m2Qui.primeFamily).toBe('Qui');

    const cfgPyth = createDefaultMidiTuningConfig('pythagorean');
    const m2Tri = resolveSemitoneInterval(1, cfgPyth.intervals);
    expect(m2Tri.rational).toEqual({ num: 256, den: 243 });
    expect(m2Tri.primeFamily).toBe('Tri');

    const cfg7 = createDefaultMidiTuningConfig('7-limit');
    expect(resolveSemitoneInterval(3, cfg7.intervals).rational).toEqual({ num: 7, den: 6 });
    expect(resolveSemitoneInterval(6, cfg7.intervals).rational).toEqual({ num: 7, den: 5 });
    expect(resolveSemitoneInterval(10, cfg7.intervals).rational).toEqual({ num: 7, den: 4 });

    const cfgPpt = createDefaultMidiTuningConfig('ppt-native');
    const tt = resolveSemitoneInterval(6, cfgPpt.intervals);
    expect(tt.rational).toBeNull();
    expect(tt.primeFamily).toBe('Du');

    const m7 = resolveSemitoneInterval(10, cfgPpt.intervals);
    expect(m7.rational).toEqual({ num: 7, den: 4 });
    expect(m7.primeFamily).toBe('Sep');
  });

  it('resolves Du-Fractal DuTri Closure intervals with ~102¢ / ~96¢ alternating steps', () => {
    const cfgDuTri = createDefaultMidiTuningConfig('dutri');
    // Dim7 Du anchors: Me (300c), Fi (600c), La (900c)
    expect(resolveSemitoneInterval(3, cfgDuTri.intervals).primeFamily).toBe('Du');
    expect(resolveSemitoneInterval(6, cfgDuTri.intervals).primeFamily).toBe('Du');
    expect(resolveSemitoneInterval(9, cfgDuTri.intervals).primeFamily).toBe('Du');
    // Tri base anchors: Fa (4/3), So (3/2)
    expect(resolveSemitoneInterval(5, cfgDuTri.intervals).rational).toEqual({ num: 4, den: 3 });
    expect(resolveSemitoneInterval(7, cfgDuTri.intervals).rational).toEqual({ num: 3, den: 2 });
    // DuTri dressed nodes: Ra (101.955c => +2c from 12-TET), Re (198.045c => -2c), Ti (1098.045c => -2c)
    const ra = resolveSemitoneInterval(1, cfgDuTri.intervals);
    expect(ra.primeFamily).toBe('DuTri');
    expect(ra.rational).toBeNull();
    expect(ra.centsFromEdo).toBe(2);

    const re = resolveSemitoneInterval(2, cfgDuTri.intervals);
    expect(re.primeFamily).toBe('DuTri');
    expect(re.centsFromEdo).toBe(-2);
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

  it('never produces NaN or Infinity for synthetic or out-of-range MIDI numbers', () => {
    const cfg = createDefaultMidiTuningConfig('5-limit');
    const synthetic = midiToDWithTuning(4000, cfg, -3.0);
    expect(Number.isFinite(synthetic.d)).toBe(true);
    expect(Number.isFinite(synthetic.freqHz)).toBe(true);
    expect(Number.isFinite(synthetic.bpm)).toBe(true);
  });

  it('matches standard 12-TET midiToD in Pitch Space when preset is 12tet', () => {
    const cfg = createDefaultMidiTuningConfig('12tet');
    const pitchRes = midiToDWithTuning(69, cfg, -4.09, 440, 25.8);
    expect(pitchRes.polarity).toBe('pitch');
    expect(pitchRes.d).toBeCloseTo(midiToD(69, 440, 25.8), 10);
    expect(pitchRes.freqHz).toBeCloseTo(440, 6);
  });
});
