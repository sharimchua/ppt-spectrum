import { describe, it, expect, beforeEach } from 'vitest';
import { SPECTRUM_WORKLET_CODE } from '../worklets/spectrum-synth.worklet';
import { buildAudioPayloadShapes, AudioEngine } from '../audio-engine';
import { DEFAULT_SCENE } from '../../core/config';
import { Scene } from '../../core/types';
import { bandFilterToFilter } from '../../core/filter-migration';

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

  it('implements acoustic ADSR envelope and harmonic damping in pitch space', () => {
    expect(SPECTRUM_WORKLET_CODE).toContain('const adsr = shape.adsr;');
    expect(SPECTRUM_WORKLET_CODE).toContain('const damp = adsr.damping !== undefined ? Math.max(0.0, adsr.damping) : 0.0;');
    expect(SPECTRUM_WORKLET_CODE).toContain('TRIGGER_NOTE');
  });

  it('implements STOP_ALL handler and immediately silences notes when playback ceases', () => {
    expect(SPECTRUM_WORKLET_CODE).toContain("type === 'STOP_ALL'");
    expect(SPECTRUM_WORKLET_CODE).toContain('wasPlaying && !this.isPlaying');
  });
});

describe('AudioEngine Singleton Lifecycle', () => {
  beforeEach(() => {
    AudioEngine.resetInstanceForTesting();
  });

  it('enforces single instance across multiple constructors and accessors', () => {
    const engine1 = AudioEngine.getInstance(DEFAULT_SCENE);
    const engine2 = new AudioEngine(DEFAULT_SCENE);
    const engine3 = AudioEngine.getInstance();

    expect(engine1).toBe(engine2);
    expect(engine2).toBe(engine3);
  });

  it('resets instance when destroyed or reset for testing', () => {
    const engine1 = AudioEngine.getInstance(DEFAULT_SCENE);
    AudioEngine.resetInstanceForTesting();
    const engine2 = AudioEngine.getInstance(DEFAULT_SCENE);

    expect(engine1).not.toBe(engine2);
  });
});

describe('AudioEngine Payload Generation & Band Filter Attenuation', () => {
  it('passes unfiltered partial amplitudes when band filter is disabled', () => {
    const scene: Scene = {
      ...DEFAULT_SCENE,
      filter: bandFilterToFilter({
        enabled: false,
        centreD: 0.0,
        widthD: 2.0,
        softnessD: 0.5,
        mode: 'band-pass',
      }),
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
      filter: bandFilterToFilter({
        enabled: true,
        centreD: -5.0,
        widthD: 1.0,
        softnessD: 0.2,
        mode: 'band-pass',
      }),
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
      filter: bandFilterToFilter({
        enabled: true,
        centreD: 1.0,
        widthD: 4.0,
        softnessD: 0.5,
        mode: 'band-pass',
      }),
    };

    const payload = buildAudioPayloadShapes(scene);
    const shape = scene.shapes.find((s) => s.id === scene.placements[0].shapeId)!;
    expect(payload[0].partials[0].amp).toBeCloseTo(shape.partials[0].amp, 3);
  });

  it('propagates shape ADSR acoustic profile into worklet payload', () => {
    const scene: Scene = {
      ...DEFAULT_SCENE,
      shapes: DEFAULT_SCENE.shapes.map((s) =>
        s.id === 'piano'
          ? { ...s, adsr: { attack: 0.006, decay: 1.8, sustain: 0.22, release: 0.5, damping: 0.6 } }
          : s
      ),
      placements: [{ ...DEFAULT_SCENE.placements[0], shapeId: 'piano' }],
    };

    const payload = buildAudioPayloadShapes(scene);
    expect(payload).toHaveLength(1);
    expect(payload[0].adsr).toBeDefined();
    expect(payload[0].adsr?.attack).toBe(0.006);
    expect(payload[0].adsr?.decay).toBe(1.8);
    expect(payload[0].adsr?.sustain).toBe(0.22);
    expect(payload[0].adsr?.damping).toBe(0.6);
  });
});
