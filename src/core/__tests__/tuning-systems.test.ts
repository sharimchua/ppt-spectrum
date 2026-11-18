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
import { buildSequenceTargets, evaluateSequenceStep } from '../scale-sequencer';

describe('Alternate Tuning Systems & Scale Sequencer', () => {
  it('computes exact octave-reduced 3:2 fifth chain ratios', () => {
    expect(pythagoreanFifthStep(0)).toMatchObject({ num: 1, den: 1, chainStep: 0 });
    expect(pythagoreanFifthStep(1)).toMatchObject({ num: 3, den: 2, chainStep: 1 });
    expect(pythagoreanFifthStep(2)).toMatchObject({ num: 9, den: 8, chainStep: 2 });
    expect(pythagoreanFifthStep(4)).toMatchObject({ num: 81, den: 64, chainStep: 4 });
    expect(pythagoreanFifthStep(6)).toMatchObject({ num: 729, den: 512, chainStep: 6 });
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
    const cfg = { ...createDefaultMidiTuningConfig('pythagorean'), subsetId: 'pentatonic' as const };
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

  it('supports 31-EDO step-per-key hardware MIDI mapping and 12-tone rich subsets (Blues, Nonatonic)', () => {
    const cfg = { ...createDefaultMidiTuningConfig('31edo'), projectionMode: 'step-system' as const };
    const root = midiToDWithTuning(68, cfg, -3.0);
    const octaveUp = midiToDWithTuning(68 + 31, cfg, -3.0);
    expect(root.d - octaveUp.d).toBeCloseTo(1.0, 5);

    const blues = resolveTuningDegrees({ ...createDefaultMidiTuningConfig('12tet'), subsetId: 'blues' });
    expect(blues.filter((d) => d.active).length).toBe(6);

    const nonatonic = resolveTuningDegrees({ ...createDefaultMidiTuningConfig('12tet'), subsetId: 'nonatonic' });
    expect(nonatonic.filter((d) => d.active).length).toBe(9);
  });

  it('supports world tunings (24-EDO Maqam, Pelog all-7 + Pathet subset, Slendro, Bohlen-Pierce Tritave) and Nearest-12 projection', () => {
    const rast = resolveTuningDegrees({ ...createDefaultMidiTuningConfig('24edo'), subsetId: 'rast' });
    expect(rast.length).toBe(24);
    expect(rast.filter((d) => d.active).length).toBe(7);

    const pelogAll = resolveTuningDegrees(createDefaultMidiTuningConfig('gamelan-pelog'));
    expect(pelogAll.length).toBe(7);
    expect(pelogAll.filter((d) => d.active).length).toBe(7);

    const pelogNem = resolveTuningDegrees({ ...createDefaultMidiTuningConfig('gamelan-pelog'), subsetId: 'pathet-nem' });
    expect(pelogNem.filter((d) => d.active).length).toBe(5);

    const slendro = resolveTuningDegrees(createDefaultMidiTuningConfig('gamelan-slendro'));
    expect(slendro.length).toBe(5);

    const bpCfg = createDefaultMidiTuningConfig('bohlen-pierce');
    const bp = resolveTuningDegrees(bpCfg);
    expect(bp.length).toBe(13);
    const bpRoot = midiToDWithTuning(68, { ...bpCfg, projectionMode: 'step-system' }, -3.0);
    const bpTritave = midiToDWithTuning(68 + 13, { ...bpCfg, projectionMode: 'step-system' }, -3.0);
    expect(bpRoot.d - bpTritave.d).toBeCloseTo(Math.log2(3), 4);

    // Nearest-12 projection maps 12-key M3 (4 semitones) onto 10\31 in 31-EDO
    const edo31Nearest = midiToDWithTuning(72, createDefaultMidiTuningConfig('31edo'), -3.0);
    expect(edo31Nearest.ratioValue).toBeCloseTo(Math.pow(2, 10 / 31), 5);
  });

  it('supports relative tonic mapping and dual-coordinate algorithmic sequencing', () => {
    const pent = buildPythagoreanChainDegrees(5).filter((d) => d.active);
    const rel = tuningDegreeToRelativeMapping(pent[1], 0, 100, -2.5);
    expect(rel.d).toBeCloseTo(-2.5 - Math.log2(pent[1].ratioValue), 5);

    const pentIndices = [0, 1, 2, 3, 4];
    expect(
      buildSequenceTargets({
        activeDegreeIndices: pentIndices,
        systemSize: 5,
        patternId: 'step-up',
        boundaryRule: 'wrap',
      }).map((t) => t.systemDegreeIndex)
    ).toEqual([0, 1, 2, 3, 4]);

    // Bounce (Up/Down) reaches the octave tonic and returns cleanly
    expect(
      buildSequenceTargets({
        activeDegreeIndices: pentIndices,
        systemSize: 5,
        patternId: 'step-up',
        boundaryRule: 'bounce',
      }).map((t) => [t.systemDegreeIndex, t.periodOffset])
    ).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [0, 1],
      [4, 0],
      [3, 0],
      [2, 0],
      [1, 0],
    ]);

    // Chromatic/Lattice approach steps 1 Layer-1 unit below each Layer-2 subset degree
    const diatonic12 = [0, 2, 4, 5, 7, 9, 11];
    const approach = buildSequenceTargets({
      activeDegreeIndices: diatonic12,
      systemSize: 12,
      patternId: 'chromatic-approach',
      boundaryRule: 'wrap',
    });
    expect(approach.slice(0, 4)).toEqual([
      { activeIndex: 6, systemDegreeIndex: 11, periodOffset: -1 },
      { activeIndex: 0, systemDegreeIndex: 0, periodOffset: 0 },
      { activeIndex: -1, systemDegreeIndex: 1, periodOffset: 0 },
      { activeIndex: 1, systemDegreeIndex: 2, periodOffset: 0 },
    ]);

    expect(evaluateSequenceStep(500, 250, [0, 1, 2, 3, 4], 'wrap')).toEqual({
      stepPosition: 2,
      target: 2,
      done: false,
    });
    expect(evaluateSequenceStep(1500, 250, [0, 1, 2], 'once')).toEqual({
      stepPosition: 2,
      target: 2,
      done: true,
    });
  });
});
