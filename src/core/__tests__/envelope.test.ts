import { describe, it, expect } from 'vitest';
import { PRESET_ENVELOPES, evaluateRhythmEnvelopeGain } from '../envelope-presets';
import { DEFAULT_SCENE } from '../config';
import {
  setPrimaryEnvelope,
  toggleEnvelopeEnabled,
  updateActiveEnvelope,
  forkEnvelope,
  createUserEnvelope,
  renameActiveEnvelope,
  deleteUserEnvelope,
} from '../scene-ops';

describe('Envelope Presets & Rhythm Supercycle Evaluation', () => {
  it('returns 1.0 when envelope is disabled or rhythmMode is off', () => {
    const pitchEnv = PRESET_ENVELOPES.find((e) => e.id === 'env-piano-hammer')!;
    expect(evaluateRhythmEnvelopeGain(pitchEnv, 0.5)).toBe(1.0);
    expect(evaluateRhythmEnvelopeGain({ ...pitchEnv, rhythmMode: 'supercycle', enabled: false }, 0.5)).toBe(1.0);
  });

  it('modulates amplitude across the supercycle in rhythmMode: supercycle', () => {
    const swell = PRESET_ENVELOPES.find((e) => e.id === 'env-rhythm-swell-4')!;
    const atStart = evaluateRhythmEnvelopeGain(swell, 0.01);
    const atMid = evaluateRhythmEnvelopeGain(swell, 2.0);
    const atEnd = evaluateRhythmEnvelopeGain(swell, 3.99);

    expect(atStart).toBeLessThan(0.1);
    expect(atMid).toBeGreaterThan(0.7);
    expect(atEnd).toBeLessThan(atMid);
    // Periodic wrap across supercycleLength = 4
    expect(evaluateRhythmEnvelopeGain(swell, 4.01)).toBeCloseTo(atStart, 4);
  });
});

describe('Envelope Library Scene Operations', () => {
  it('selects, toggles, updates, forks, creates, renames, and deletes user envelopes', () => {
    const s1 = setPrimaryEnvelope(DEFAULT_SCENE, 'env-rhythm-swell-4');
    expect(s1.envelope?.id).toBe('env-rhythm-swell-4');

    const s2 = toggleEnvelopeEnabled(s1, false);
    expect(s2.envelope?.enabled).toBe(false);

    const s3 = updateActiveEnvelope(s2, { supercycleLength: 8, adsr: { sustain: 0.5 } });
    expect(s3.envelope?.supercycleLength).toBe(8);
    expect(s3.envelope?.adsr.sustain).toBe(0.5);

    const s4 = forkEnvelope(s3, s3.envelope!, (p) => `${p}-1`);
    expect(s4.envelope?.origin).toBe('user');
    expect(s4.envelopes?.some((e) => e.id === 'user-env-1')).toBe(true);

    const s5 = createUserEnvelope(s4, 'Custom Rhythm', (p) => `${p}-2`);
    expect(s5.envelope?.name).toBe('Custom Rhythm');

    const s6 = renameActiveEnvelope(s5, 'Renamed Env');
    expect(s6.envelope?.name).toBe('Renamed Env');

    const s7 = deleteUserEnvelope(s6, 'user-env-2');
    expect(s7.envelopes?.some((e) => e.id === 'user-env-2')).toBe(false);
  });
});
