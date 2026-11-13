import { describe, it, expect } from 'vitest';
import { SPECTRUM_WORKLET_CODE } from '../worklets/spectrum-synth.worklet';
import { compileFilterForWorklet, evaluateOnsetGain } from '../../core/filter-eval';
import { Filter } from '../../core/filter-types';
import { createEuclideanCycleCondition, createGridCycleCondition } from '../../core/filter-presets';

// Shim AudioWorkletProcessor in Node for parity verification
class MockAudioWorkletProcessor {
  port: {
    onmessage: ((e: { data: unknown }) => void) | null;
    postMessage: (data: unknown) => void;
  };
  constructor() {
    this.port = {
      onmessage: null,
      postMessage: () => {},
    };
  }
}

function instantiateWorklet(): any {
  const registerProcessor = () => {};

  const fn = new Function(
    'AudioWorkletProcessor',
    'registerProcessor',
    'sampleRate',
    'currentTime',
    SPECTRUM_WORKLET_CODE + '\nreturn SpectrumSynthProcessor;'
  );

  const ProcessorClass = fn(MockAudioWorkletProcessor, registerProcessor, 44100, 0);
  return new ProcessorClass();
}

describe('worklet-filter-parity', () => {
  it('instantiates processor in Node sandbox', () => {
    const proc = instantiateWorklet();
    expect(proc).toBeDefined();
    expect(typeof proc.evalOnsetGain).toBe('function');
  });

  it('matches evaluateOnsetGain on Euclid (3,8) pattern', () => {
    const filter: Filter = {
      name: 'Euclid Test',
      enabled: true,
      action: 'keep',
      combine: 'all',
      depth: 1.0,
      conditions: [createEuclideanCycleCondition(3, 8, 0, 'c1')],
      focus: null,
      centreD: 0,
      widthD: 4,
      softnessD: 1,
      mode: 'band-pass',
      trackingMode: 'fixed',
    };

    const compiled = compileFilterForWorklet(filter);
    const proc = instantiateWorklet();
    proc.filter = compiled;

    // Test across turns [0.0, 1.0] in 8th-turn steps
    for (let slot = 0; slot < 8; slot++) {
      const sceneTurns = slot / 8.0;
      const coreGain = evaluateOnsetGain(
        filter,
        { partialD: 0, sceneD: 0, ratio: { kind: 'rational', num: 8, den: 1 } },
        sceneTurns
      );
      const workletGain = proc.evalOnsetGain(1.0, sceneTurns);
      expect(workletGain).toBeCloseTo(coreGain, 4);
    }
  });

  it('matches evaluateOnsetGain on 3-of-4 supercycle', () => {
    const filter: Filter = {
      name: 'Supercycle Test',
      enabled: true,
      action: 'keep',
      combine: 'all',
      depth: 1.0,
      conditions: [
        {
          kind: 'cycle',
          id: 'super-3-4',
          divisions: 1,
          slotWeights: [1.0],
          rotation: 0,
          tolerance: 0.25,
          offGridMatch: 0.0,
          supercycle: { length: 4, cycleWeights: [1.0, 1.0, 1.0, 0.0] },
        },
      ],
      focus: null,
      centreD: 0,
      widthD: 4,
      softnessD: 1,
      mode: 'band-pass',
      trackingMode: 'fixed',
    };

    const compiled = compileFilterForWorklet(filter);
    const proc = instantiateWorklet();
    proc.filter = compiled;

    for (let bar = 0; bar < 8; bar++) {
      const sceneTurns = bar + 0.05;
      const coreGain = evaluateOnsetGain(
        filter,
        { partialD: 0, sceneD: 0 },
        sceneTurns
      );
      const workletGain = proc.evalOnsetGain(1.0, sceneTurns);
      expect(workletGain).toBeCloseTo(coreGain, 4);
    }
  });

  it('matches evaluateOnsetGain on Range condition with supercycle', () => {
    const filter: Filter = {
      name: 'Range Supercycle Test',
      enabled: true,
      action: 'keep',
      combine: 'all',
      depth: 1.0,
      conditions: [
        {
          kind: 'range',
          id: 'cond-range-super',
          reference: 'scene',
          reductionPeriod: null,
          spans: [{ lo: { unit: 'd', value: 1.0 }, hi: { unit: 'd', value: -1.0 } }],
          softness: { value: 0.1, unit: 'd' },
          supercycle: { length: 2, cycleWeights: [1.0, 0.0] },
        },
      ],
      focus: null,
      centreD: 0,
      widthD: 2,
      softnessD: 0.1,
      mode: 'band-pass',
      trackingMode: 'fixed',
    };

    const compiled = compileFilterForWorklet(filter);
    const proc = instantiateWorklet();
    proc.filter = compiled;

    for (let bar = 0; bar < 6; bar++) {
      const sceneTurns = bar + 0.25;
      const coreGain = evaluateOnsetGain(
        filter,
        { partialD: 0, sceneD: 0 },
        sceneTurns
      );
      const workletGain = proc.evalOnsetGain(1.0, sceneTurns);
      expect(workletGain).toBeCloseTo(coreGain, 4);
      expect(coreGain).toBe(bar % 2 === 0 ? 1.0 : 0.0);
    }
  });

  it('matches evaluateOnsetGain on triple-grid subtractive sieve', () => {
    const filter: Filter = {
      name: 'Triple Grid Test',
      enabled: true,
      action: 'keep',
      combine: 'all',
      depth: 1.0,
      conditions: [createGridCycleCondition(3, 0.0, 'grid-3')],
      focus: null,
      centreD: 0,
      widthD: 4,
      softnessD: 1,
      mode: 'band-pass',
      trackingMode: 'fixed',
    };

    const compiled = compileFilterForWorklet(filter);
    const proc = instantiateWorklet();
    proc.filter = compiled;

    // A 4:3 shape onsets at 0, 0.25, 0.5, 0.75
    const onsets = [0.0, 0.25, 0.5, 0.75];
    for (const t of onsets) {
      const coreGain = evaluateOnsetGain(
        filter,
        { partialD: 0, sceneD: 0 },
        t
      );
      const workletGain = proc.evalOnsetGain(1.0, t);
      expect(workletGain).toBeCloseTo(coreGain, 4);
    }
  });

  it('matches evaluateOnsetGain on remove action with depth 0.5', () => {
    const filter: Filter = {
      name: 'Remove Test',
      enabled: true,
      action: 'remove',
      combine: 'all',
      depth: 0.5,
      conditions: [createEuclideanCycleCondition(3, 8, 0, 'c1')],
      focus: null,
      centreD: 0,
      widthD: 4,
      softnessD: 1,
      mode: 'band-pass',
      trackingMode: 'fixed',
    };

    const compiled = compileFilterForWorklet(filter);
    const proc = instantiateWorklet();
    proc.filter = compiled;

    for (let slot = 0; slot < 8; slot++) {
      const sceneTurns = slot / 8.0;
      const coreGain = evaluateOnsetGain(
        filter,
        { partialD: 0, sceneD: 0 },
        sceneTurns
      );
      const workletGain = proc.evalOnsetGain(1.0, sceneTurns);
      expect(workletGain).toBeCloseTo(coreGain, 4);
    }
  });

  it('correctly inverts pattern on action: remove without downbeat (staticMatch undefined)', () => {
    // 4 subdivisions, slot 0 selected, slots 1, 2, 3 unselected.
    // Action remove should MUTE slot 0 and PASS slots 1, 2, 3.
    const filter: Filter = {
      name: 'Remove Downbeat Test',
      enabled: true,
      action: 'remove',
      combine: 'all',
      depth: 1.0,
      conditions: [
        {
          kind: 'cycle',
          id: 'c-downbeat',
          divisions: 4,
          slotWeights: [1.0, 0.0, 0.0, 0.0],
          rotation: 0,
          tolerance: 0.25,
          offGridMatch: 0.0,
          supercycle: null,
        },
      ],
      focus: null,
      centreD: 0,
      widthD: 4,
      softnessD: 1,
      mode: 'band-pass',
      trackingMode: 'fixed',
    };

    const compiled = compileFilterForWorklet(filter);
    const proc = instantiateWorklet();
    proc.filter = compiled;

    // Slot 0 (t = 0.0): should be MUTED (0.0)
    const g0Core = evaluateOnsetGain(filter, { partialD: 0, sceneD: 0 }, 0.0);
    const g0Worklet = proc.evalOnsetGain(undefined, 0.0);
    expect(g0Core).toBe(0.0);
    expect(g0Worklet).toBe(0.0);

    // Slots 1, 2, 3: should be ACTIVE (1.0)
    for (const t of [0.25, 0.5, 0.75]) {
      const gCore = evaluateOnsetGain(filter, { partialD: 0, sceneD: 0 }, t);
      const gWorklet = proc.evalOnsetGain(undefined, t);
      expect(gCore).toBe(1.0);
      expect(gWorklet).toBe(1.0);
    }
  });

  it('matches evaluateOnsetGain when combining Range + Cycle with remove and all/any', () => {
    const makeFilter = (combine: 'all' | 'any', action: 'keep' | 'remove'): Filter => ({
      name: `Combo ${combine} ${action}`,
      enabled: true,
      action,
      combine,
      depth: 1.0,
      conditions: [
        {
          kind: 'range',
          id: 'r1',
          reference: 'scene',
          reductionPeriod: null,
          spans: [{ lo: { unit: 'd', value: 0.5 }, hi: { unit: 'd', value: -0.5 } }],
          softness: { value: 0.01, unit: 'd' },
          supercycle: { length: 2, cycleWeights: [1.0, 0.0] },
        },
        createGridCycleCondition(2, 0.0, 'c1'),
      ],
      focus: null,
      centreD: 0,
      widthD: 1,
      softnessD: 0.01,
      mode: 'band-pass',
      trackingMode: 'fixed',
    });

    for (const combine of ['all', 'any'] as const) {
      for (const action of ['keep', 'remove'] as const) {
        const filter = makeFilter(combine, action);
        const compiled = compileFilterForWorklet(filter);
        expect(compiled.hasRangeSuper).toBe(true);
        const proc = instantiateWorklet();
        proc.filter = compiled;

        for (const bar of [0, 1]) {
          for (const slotTurn of [0.0, 0.5]) {
            const sceneTurns = bar + slotTurn;
            // In-range partial (partialD = 0, sceneD = 0 => rangeMatch = 1.0)
            const coreIn = evaluateOnsetGain(filter, { partialD: 0, sceneD: 0 }, sceneTurns);
            const workletIn = proc.evalOnsetGain([1.0], sceneTurns);
            expect(workletIn).toBeCloseTo(coreIn, 4);

            // Out-of-range partial (partialD = 4, sceneD = 0 => rangeMatch = 0.0)
            const coreOut = evaluateOnsetGain(filter, { partialD: 4, sceneD: 0 }, sceneTurns);
            const workletOut = proc.evalOnsetGain([0.0], sceneTurns);
            expect(workletOut).toBeCloseTo(coreOut, 4);
          }
        }
      }
    }
  });
});
