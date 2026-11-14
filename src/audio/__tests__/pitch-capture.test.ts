import { describe, it, expect } from 'vitest';
import {
  detectPitchAutocorrelation,
  detectSpectralPartials,
  classifyMicOnsetVoice,
} from '../pitch-capture';

describe('Pitch & Spectral Capture DSP', () => {
  const sampleRate = 48000;
  const fftSize = 4096;

  it('detects pitch with sub-sample parabolic precision', () => {
    const targetHz = 223.4;
    const buf = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      buf[i] = Math.sin((2 * Math.PI * targetHz * i) / sampleRate);
    }

    const res = detectPitchAutocorrelation(buf, sampleRate);
    expect(res.confidence).toBeGreaterThan(0.95);
    expect(Math.abs(res.freqHz - targetHz)).toBeLessThan(0.6);
  });

  it('extracts up to 24 harmonic partials and inharmonic spectral peaks', () => {
    const f0 = 200;
    const timeBuf = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      timeBuf[i] =
        0.85 * Math.sin((2 * Math.PI * f0 * i) / sampleRate) +
        0.2 * Math.sin((2 * Math.PI * (f0 * 2) * i) / sampleRate);
    }

    const binHz = sampleRate / fftSize;
    const freqDb = new Float32Array(fftSize / 2).fill(-100);
    // Populate harmonic peaks 1..24 and an inharmonic 2.75x peak
    freqDb[Math.round(f0 / binHz)] = -6;
    freqDb[Math.round((f0 * 2.75) / binHz)] = -10;
    for (let k = 2; k <= 24; k++) {
      freqDb[Math.round((f0 * k) / binHz)] = -12 - k * 0.5;
    }

    const harmonic = detectSpectralPartials(timeBuf, freqDb, sampleRate, fftSize, 24, 'harmonic');
    expect(harmonic.partials.length).toBe(24);
    expect(harmonic.partials[0].ratio).toBe(1);

    const inharmonic = detectSpectralPartials(timeBuf, freqDb, sampleRate, fftSize, 24, 'inharmonic');
    expect(inharmonic.partials.some((p) => !p.isHarmonic && Math.abs(p.ratio - 2.75) < 0.08)).toBe(true);
  });

  it('classifies low kick vs high hihat and computes spectral flux', () => {
    const timeBuf = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      timeBuf[i] = 0.5 * Math.sin((2 * Math.PI * 90 * i) / sampleRate);
    }
    const freqDb = new Float32Array(512).fill(-95);
    const binHz = sampleRate / 1024;
    freqDb[Math.round(90 / binHz)] = -6;

    const prevMag = new Float32Array(512);
    const kickRes = classifyMicOnsetVoice(timeBuf, freqDb, sampleRate, 1024, prevMag);
    expect(kickRes.voice).toBe('kick');
    expect(kickRes.flux).toBeGreaterThan(0);

    // Now test high-frequency hihat transient
    const hiFreqDb = new Float32Array(512).fill(-95);
    for (let b = Math.round(5000 / binHz); b < Math.round(9000 / binHz); b++) {
      hiFreqDb[b] = -12;
    }
    for (let i = 0; i < 1024; i++) {
      timeBuf[i] = 0.3 * (i % 2 === 0 ? 1 : -1);
    }
    const hiRes = classifyMicOnsetVoice(timeBuf, hiFreqDb, sampleRate, 1024);
    expect(hiRes.voice).toBe('hihat');
  });
});
