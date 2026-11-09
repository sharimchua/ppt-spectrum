import { VoiceId } from '../core/types';

/**
 * Simple, robust monophonic pitch detector using autocorrelation (YIN/Autocorrelation principle).
 */
export function detectPitchAutocorrelation(
  buffer: Float32Array,
  sampleRate: number,
  minFreq: number = 40,
  maxFreq: number = 2000
): { freqHz: number; confidence: number } {
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.min(buffer.length - 2, Math.floor(sampleRate / minFreq));
  const size = buffer.length;

  let bestPeriod = 0;
  let maxCorr = -1;

  // Normalised autocorrelation
  for (let lag = minPeriod; lag <= maxPeriod; lag++) {
    let sum = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < size - lag; i++) {
      const v1 = buffer[i];
      const v2 = buffer[i + lag];
      sum += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }

    const norm = Math.sqrt(norm1 * norm2);
    const corr = norm > 0.0001 ? sum / norm : 0;

    if (corr > maxCorr) {
      maxCorr = corr;
      bestPeriod = lag;
    }
  }

  if (maxCorr < 0.65 || bestPeriod === 0) {
    return { freqHz: 0, confidence: 0 };
  }

  const freqHz = sampleRate / bestPeriod;
  return { freqHz, confidence: maxCorr };
}

/**
 * Extracts both the fundamental frequency f0 and the relative amplitudes of the first
 * `maxHarmonics` overtone partials (k = 1..maxHarmonics) from the FFT dB magnitude spectrum.
 */
export function detectHarmonicSpectrum(
  timeBuffer: Float32Array,
  freqDbBuffer: Float32Array,
  sampleRate: number,
  fftSize: number,
  maxHarmonics: number = 8
): { freqHz: number; confidence: number; harmonicAmps: number[] } {
  const { freqHz, confidence } = detectPitchAutocorrelation(timeBuffer, sampleRate);
  if (freqHz <= 0 || confidence < 0.65) {
    return { freqHz: 0, confidence: 0, harmonicAmps: [] };
  }

  const binHz = sampleRate / fftSize;
  const numBins = freqDbBuffer.length;
  const rawMags: number[] = [];

  for (let k = 1; k <= maxHarmonics; k++) {
    const targetFreq = freqHz * k;
    const centerBin = Math.round(targetFreq / binHz);
    if (centerBin <= 0 || centerBin >= numBins - 1) {
      rawMags.push(0);
      continue;
    }
    // Search ±2 bins around k * f0 for local peak magnitude
    let peakDb = -120;
    for (let b = Math.max(1, centerBin - 2); b <= Math.min(numBins - 1, centerBin + 2); b++) {
      if (freqDbBuffer[b] > peakDb) {
        peakDb = freqDbBuffer[b];
      }
    }
    // Convert dB (-100..0) to linear amplitude
    const clampedDb = Math.max(-100, Math.min(0, peakDb));
    const linMag = clampedDb <= -95 ? 0 : Math.pow(10, clampedDb / 20);
    rawMags.push(linMag);
  }

  const maxMag = Math.max(...rawMags, 1e-6);
  const harmonicAmps = rawMags.map((m, idx) => {
    const norm = m / maxMag;
    // Ensure fundamental has a solid anchor if detected
    return idx === 0 ? Math.max(0.5, norm) : Number(Math.max(0.02, Math.min(1.0, norm)).toFixed(3));
  });

  return { freqHz, confidence, harmonicAmps };
}

/**
 * Computes RMS amplitude and spectral centroid to classify a percussive microphone onset
 * into one of four drum voices: 'kick', 'snare', 'clave', or 'hihat'.
 */
export function classifyMicOnsetVoice(
  timeBuffer: Float32Array,
  freqDbBuffer: Float32Array,
  sampleRate: number,
  fftSize: number
): { rms: number; voice: VoiceId; centroidHz: number } {
  let sumSq = 0;
  for (let i = 0; i < timeBuffer.length; i++) {
    sumSq += timeBuffer[i] * timeBuffer[i];
  }
  const rms = Math.sqrt(sumSq / Math.max(1, timeBuffer.length));

  const binHz = sampleRate / fftSize;
  let weightedFreqSum = 0;
  let magSum = 0;

  for (let b = 1; b < freqDbBuffer.length; b++) {
    const db = Math.max(-100, freqDbBuffer[b]);
    const mag = db <= -90 ? 0 : Math.pow(10, db / 20);
    const freq = b * binHz;
    weightedFreqSum += freq * mag;
    magSum += mag;
  }

  const centroidHz = magSum > 1e-6 ? weightedFreqSum / magSum : 500;
  let voice: VoiceId = 'snare';
  if (centroidHz < 380) {
    voice = 'kick';
  } else if (centroidHz < 1450) {
    voice = 'snare';
  } else if (centroidHz < 3000) {
    voice = 'clave';
  } else {
    voice = 'hihat';
  }

  return { rms, voice, centroidHz };
}
