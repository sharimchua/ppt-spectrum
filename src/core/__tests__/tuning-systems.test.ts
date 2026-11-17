import { describe, it, expect } from 'vitest';
import { createDefaultMidiTuningConfig, midiToDWithTuning } from '../midi-tuning';
import {
  pythagoreanFifthStep,
  buildPythagoreanChainDegrees,
  build31EdoDegrees,
  resolveTuningDegrees,
  tuningDegreeToMapping,
  tuningDegreeToRelativeMapping,
} from '../tuning-systems';
import { buildSequenceIndices, evaluateSequenceStep } from '../scale-sequencer';

describe('Alternate Tuning Systems & Scale Sequencer', () => {
  it('computes exact octave-reduced 3:2 fifth chain ratios', () => {
    expect(pythagoreanFifthStep(0)).toEqual({ num: 1, den: 1, chainStep: 0 });
    expect(pythagoreanFifthStep(1)).toEqual({ num: 3, den: 2, chainStep: 1 });
    expect(pythagoreanFifthStep(2)).toEqual({ num: 9, den: 8, chainStep: 2 });
    expect(pythagoreanFifthStep(4)).toEqual({ num: 81, den: 64, chainStep: 4 });
    expect(pythagoreanFifthStep(6)).toEqual({ num: 729, den: 512, chainStep: 6 });
  });

  it('activates 5 steps for Pentatonic and 7 steps for Heptatonic in Pythagorean 3:2 chain', () => {
    const pent = buildPythagoreanChainDegrees(5);
    expect(pent.length).toBe(12);
    expect(pent.filter((d) => d.active).length).toBe(5);
    expect(pent.some((d) => d.active && d.highlightRole === 'tritone')).toBe(false);

    const hept = buildPythagoreanChainDegrees(7);
    expect(hept.filter((d) => d.active).length).toBe(7);
    expect(hept.some((d) => d.active && d.highlightRole === 'tritone')).toBe(true);
    expect(hept.some((d) => d.active && d.highlightRole === 'semitone')).toBe(true);
  });

  it('builds 31-EDO subsets with accurate step ratios', () => {
    const meantone = build31EdoDegrees('meantone-7');
    expect(meantone.length).toBe(31);
    expect(meantone.filter((d) => d.active).length).toBe(7);
    // 10\31 is approx 387.1 cents (close to 5/4 = 386.3c)
    expect(meantone[10].cents).toBeCloseTo(387.1, 1);

    const septimal = build31EdoDegrees('septimal');
    expect(septimal.filter((d) => d.active).length).toBe(5);
    expect(septimal[25].active).toBe(true); // ~7/4
  });

  it('resolves TuningDegrees and preserves TPL polarity in tuningDegreeToMapping', () => {
    const cfg = createDefaultMidiTuningConfig('pythagorean-pentatonic');
    const degrees = resolveTuningDegrees(cfg);
    const active = degrees.filter((d) => d.active);
    expect(active.length).toBe(5);

    const pitchMap = tuningDegreeToMapping(active[3], 0, 100, cfg, -3.0);
    expect(pitchMap.polarity).toBe('pitch');
    expect(pitchMap.d).toBeLessThan(0);

    const rhythmMap = tuningDegreeToMapping(active[3], 0, 100, cfg, 3.0);
    expect(rhythmMap.polarity).toBe('rhythm');
    expect(rhythmMap.d).toBeGreaterThan(0);
  });

  it('supports 31-EDO step-per-key hardware MIDI mapping', () => {
    const cfg = { ...createDefaultMidiTuningConfig('31edo-chromatic'), midiStepMap: '31edo' as const };
    const root = midiToDWithTuning(68, cfg, -3.0);
    const octaveUp = midiToDWithTuning(68 + 31, cfg, -3.0);
    expect(root.d - octaveUp.d).toBeCloseTo(1.0, 5);
  });

  it('supports relative tonic mapping and quartal sequencing', () => {
    const pent = buildPythagoreanChainDegrees(5).filter((d) => d.active);
    const rel = tuningDegreeToRelativeMapping(pent[1], 0, 100, -2.5);
    expect(rel.d).toBeCloseTo(-2.5 - Math.log2(pent[1].ratioValue), 5);

    expect(buildSequenceIndices(7, 'quartal').slice(0, 3)).toEqual([0, 3, 6]);
    expect(buildSequenceIndices(5, 'ascend')).toEqual([0, 1, 2, 3, 4]);
    expect(buildSequenceIndices(5, 'descend')).toEqual([4, 3, 2, 1, 0]);
    expect(buildSequenceIndices(5, 'fifths-chain')).toEqual([0, 3, 1, 4, 2]);
    expect(evaluateSequenceStep(500, 250, [0, 1, 2, 3, 4])).toEqual({ stepPosition: 2, degreeIndex: 2 });
  });
});
