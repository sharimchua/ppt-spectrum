import { describe, it, expect } from 'vitest';
import { SPECTRUM_WORKLET_CODE } from '../worklets/spectrum-synth.worklet';
import { buildAudioPayloadShapes } from '../audio-engine';
import { DEFAULT_SCENE } from '../../core/config';
import { Scene } from '../../core/types';

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

describe('AudioEngine Payload Generation & Band Filter Attenuation', () => {
  it('passes unfiltered partial amplitudes when band filter is disabled', () => {
    const scene: Scene = {
      ...DEFAULT_SCENE,
      filter: {
        enabled: false,
        centreD: 0.0,
        widthD: 2.0,
        softnessD: 0.5,
        mode: 'band-pass',
      },
    };

    const payload = buildAudioPayloadShapes(scene);
    expect(payload).toHaveLength(1);
    const shape = scene.shapes.find((s) => s.id === scene.placements[0].shapeId)!;
    expect(payload[0].partials[0].amp).toBeCloseTo(shape.partials[0].amp, 4);
    expect(payload[0].partials[1].amp).toBeCloseTo(shape.partials[1].amp, 4);
  });

  it('audibly attenuates partial amplitudes when band filter is active', () => {
    // Shape is placed at d = 2.0.
    // Partials for hemiola-3-2 are 2/1 (d = 2 - 1 = 1.0) and 3/1 (d = 2 - log2(3) = 0.415).
    // Set band-pass filter centered far away at d = -5.0 with width 1.0.
    const scene: Scene = {
      ...DEFAULT_SCENE,
      filter: {
        enabled: true,
        centreD: -5.0,
        widthD: 1.0,
        softnessD: 0.2,
        mode: 'band-pass',
      },
    };

    const payload = buildAudioPayloadShapes(scene);
    expect(payload).toHaveLength(1);
    // Partials should be completely attenuated (gain = 0)
    expect(payload[0].partials[0].amp).toBe(0);
    expect(payload[0].partials[1].amp).toBe(0);
  });

  it('passes partials centered inside the filter passband', () => {
    // Partials around d ≈ 1.0. Set filter centered at d = 1.0 with width 4.0.
    const scene: Scene = {
      ...DEFAULT_SCENE,
      filter: {
        enabled: true,
        centreD: 1.0,
        widthD: 4.0,
        softnessD: 0.5,
        mode: 'band-pass',
      },
    };

    const payload = buildAudioPayloadShapes(scene);
    const shape = scene.shapes.find((s) => s.id === scene.placements[0].shapeId)!;
    expect(payload[0].partials[0].amp).toBeCloseTo(shape.partials[0].amp, 3);
  });
});
