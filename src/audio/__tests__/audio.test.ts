import { describe, it, expect } from 'vitest';
import { SPECTRUM_WORKLET_CODE } from '../worklets/spectrum-synth.worklet';

describe('Audio Synthesiser Worklet Source', () => {
  it('contains valid AudioWorklet processor registration', () => {
    expect(SPECTRUM_WORKLET_CODE).toContain('class SpectrumSynthProcessor extends AudioWorkletProcessor');
    expect(SPECTRUM_WORKLET_CODE).toContain("registerProcessor('spectrum-synth-processor', SpectrumSynthProcessor);");
  });

  it('implements master-phase integration and 10-40 Hz perceptual regime crossing', () => {
    expect(SPECTRUM_WORKLET_CODE).toContain('masterPhaseIncrement = f0 * sampleDt;');
    expect(SPECTRUM_WORKLET_CODE).toContain('partialFreq >= 40.0');
    expect(SPECTRUM_WORKLET_CODE).toContain('Math.sin(2.0 * Math.PI * partialPhase)');
  });
});
