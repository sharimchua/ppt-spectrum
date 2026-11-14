import { VoiceId } from '../core/types';

export interface CapturedPartialPeak {
  ratio: number;
  amp: number;
  isHarmonic: boolean;
}

export interface SpectralCaptureResult {
  freqHz: number;
  confidence: number;
  rms: number;
  partials: CapturedPartialPeak[];
}

export function computeBufferRms(buffer: Float32Array): number {
  let sumSq = 0;
  for (let i = 0; i < buffer.length; i++) {
    sumSq += buffer[i] * buffer[i];
  }
  return Math.sqrt(sumSq / Math.max(1, buffer.length));
}

function normalisedAutocorrAtLag(buffer: Float32Array, lag: number): number {
  const size = buffer.length;
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
  return norm > 0.0001 ? sum / norm : 0;
}

/**
 * Monophonic pitch detector using normalised autocorrelation with parabolic sub-sample interpolation.
 */
export function detectPitchAutocorrelation(
  buffer: Float32Array,
  sampleRate: number,
  minFreq: number = 40,
  maxFreq: number = 2000
): { freqHz: number; confidence: number } {
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.min(buffer.length - 2, Math.floor(sampleRate / minFreq));

  let bestPeriod = 0;
  let maxCorr = -1;

  for (let lag = minPeriod; lag <= maxPeriod; lag++) {
    const corr = normalisedAutocorrAtLag(buffer, lag);
    if (corr > maxCorr) {
      maxCorr = corr;
      bestPeriod = lag;
    }
  }

  if (maxCorr < 0.55 || bestPeriod === 0) {
    return { freqHz: 0, confidence: 0 };
  }

  // Parabolic interpolation around bestPeriod for sub-sample precision
  let refinedPeriod = bestPeriod;
  if (bestPeriod > minPeriod && bestPeriod < maxPeriod) {
    const prev = normalisedAutocorrAtLag(buffer, bestPeriod - 1);
    const next = normalisedAutocorrAtLag(buffer, bestPeriod + 1);
    const denom = 2 * (prev - 2 * maxCorr + next);
    if (Math.abs(denom) > 1e-6) {
      const delta = Math.max(-0.5, Math.min(0.5, (prev - next) / denom));
      refinedPeriod = bestPeriod + delta;
    }
  }

  const freqHz = sampleRate / refinedPeriod;
  return { freqHz, confidence: maxCorr };
}

/**
 * Extracts up to `maxPartials` partials relative to detected fundamental `f0`.
 * - `'harmonic'` mode samples integer multiples `1x..maxPartials` around `k * f0`.
 * - `'inharmonic'` mode picks prominent spectral peaks across the FFT and expresses them as `peakFreq / f0`.
 */
export function detectSpectralPartials(
  timeBuffer: Float32Array,
  freqDbBuffer: Float32Array,
  sampleRate: number,
  fftSize: number,
  maxPartials: number = 24,
  mode: 'harmonic' | 'inharmonic' = 'harmonic'
): SpectralCaptureResult {
  const rms = computeBufferRms(timeBuffer);
  const { freqHz, confidence } = detectPitchAutocorrelation(timeBuffer, sampleRate);
  if (freqHz <= 0 || confidence < 0.55) {
    return { freqHz: 0, confidence: 0, rms, partials: [] };
  }

  const binHz = sampleRate / fftSize;
  const numBins = freqDbBuffer.length;
  const maxMeasurableHz = Math.min(16000, sampleRate * 0.45);

  if (mode === 'harmonic') {
    const searchRadius = binHz < 12 ? 1 : 2;
    const rawMags: number[] = [];

    for (let k = 1; k <= maxPartials; k++) {
      const targetFreq = freqHz * k;
      if (targetFreq > maxMeasurableHz) break;
      const centerBin = Math.round(targetFreq / binHz);
      if (centerBin <= 0 || centerBin >= numBins - 1) {
        rawMags.push(0);
        continue;
      }
      let peakDb = -120;
      for (
        let b = Math.max(1, centerBin - searchRadius);
        b <= Math.min(numBins - 1, centerBin + searchRadius);
        b++
      ) {
        if (freqDbBuffer[b] > peakDb) {
          peakDb = freqDbBuffer[b];
        }
      }
      const clampedDb = Math.max(-100, Math.min(0, peakDb));
      const linMag = clampedDb <= -85 ? 0 : Math.pow(10, clampedDb / 20);
      rawMags.push(linMag);
    }

    const maxMag = Math.max(...rawMags, 1e-6);
    const partials: CapturedPartialPeak[] = rawMags.map((m, idx) => {
      const norm = m / maxMag;
      const amp =
        idx === 0
          ? Math.max(0.5, norm)
          : Number(Math.max(0.02, Math.min(1.0, norm)).toFixed(3));
      return { ratio: idx + 1, amp, isHarmonic: true };
    });

    return { freqHz, confidence, rms, partials };
  }

  // Inharmonic / Free Spectral Peak mode
  const minBin = Math.max(2, Math.floor((freqHz * 0.65) / binHz));
  const maxBin = Math.min(numBins - 2, Math.floor(maxMeasurableHz / binHz));
  const candidates: { bin: number; peakFreq: number; mag: number }[] = [];

  for (let b = minBin; b <= maxBin; b++) {
    const db = freqDbBuffer[b];
    if (db <= -78) continue;
    if (db > freqDbBuffer[b - 1] && db >= freqDbBuffer[b + 1]) {
      // Parabolic bin interpolation for exact peak frequency
      const prev = freqDbBuffer[b - 1];
      const next = freqDbBuffer[b + 1];
      const denom = prev - 2 * db + next;
      const delta = Math.abs(denom) > 1e-6 ? Math.max(-0.5, Math.min(0.5, (0.5 * (prev - next)) / denom)) : 0;
      const peakFreq = (b + delta) * binHz;
      const mag = Math.pow(10, Math.max(-100, Math.min(0, db)) / 20);
      candidates.push({ bin: b, peakFreq, mag });
    }
  }

  // Sort by magnitude descending, filter out peaks too close (< 2 bins)
  candidates.sort((a, b) => b.mag - a.mag);
  const selected: { ratio: number; mag: number; isHarmonic: boolean }[] = [];
  const selectedBins: number[] = [];

  for (const c of candidates) {
    if (selected.length >= maxPartials) break;
    if (selectedBins.some((sb) => Math.abs(sb - c.bin) < 2)) continue;
    const rawRatio = c.peakFreq / freqHz;
    if (rawRatio < 0.5 || rawRatio > 32) continue;

    const nearestInt = Math.round(rawRatio);
    const centsFromInt = Math.abs(1200 * Math.log2(rawRatio / Math.max(1, nearestInt)));
    const isHarmonic = nearestInt >= 1 && centsFromInt < 12;
    selected.push({
      ratio: isHarmonic ? nearestInt : Number(rawRatio.toFixed(4)),
      mag: c.mag,
      isHarmonic,
    });
    selectedBins.push(c.bin);
  }

  // Ensure fundamental (1x) is present
  if (!selected.some((s) => Math.abs(s.ratio - 1) < 0.04)) {
    selected.unshift({ ratio: 1, mag: candidates[0]?.mag ?? 0.5, isHarmonic: true });
    if (selected.length > maxPartials) selected.pop();
  }

  selected.sort((a, b) => a.ratio - b.ratio);
  const maxMag = Math.max(...selected.map((s) => s.mag), 1e-6);
  const partials: CapturedPartialPeak[] = selected.map((s) => {
    const norm = s.mag / maxMag;
    const amp =
      Math.abs(s.ratio - 1) < 0.02
        ? Math.max(0.5, norm)
        : Number(Math.max(0.02, Math.min(1.0, norm)).toFixed(3));
    return { ratio: s.ratio, amp, isHarmonic: s.isHarmonic };
  });

  return { freqHz, confidence, rms, partials };
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
  maxHarmonics: number = 24
): { freqHz: number; confidence: number; harmonicAmps: number[] } {
  const res = detectSpectralPartials(timeBuffer, freqDbBuffer, sampleRate, fftSize, maxHarmonics, 'harmonic');
  return {
    freqHz: res.freqHz,
    confidence: res.confidence,
    harmonicAmps: res.partials.map((p) => p.amp),
  };
}

/**
 * Computes RMS, log-compressed dual-band spectral flux, and multi-band voice classification.
 * `prevMagBuffer` (length = freqDbBuffer.length) stores previous log-compressed magnitudes in-place.
 */
export function classifyMicOnsetVoice(
  timeBuffer: Float32Array,
  freqDbBuffer: Float32Array,
  sampleRate: number,
  fftSize: number,
  prevMagBuffer?: Float32Array
): {
  rms: number;
  flux: number;
  lowFlux: number;
  highFlux: number;
  voice: VoiceId;
  centroidHz: number;
} {
  const rms = computeBufferRms(timeBuffer);

  let zcrCount = 0;
  for (let i = 1; i < timeBuffer.length; i++) {
    if ((timeBuffer[i] >= 0 && timeBuffer[i - 1] < 0) || (timeBuffer[i] < 0 && timeBuffer[i - 1] >= 0)) {
      zcrCount++;
    }
  }
  const zcr = zcrCount / Math.max(1, timeBuffer.length);

  const binHz = sampleRate / fftSize;
  let weightedFreqSum = 0;
  let magSum = 0;
  let lowEnergy = 0;
  let midEnergy = 0;
  let highEnergy = 0;
  let lowFlux = 0;
  let highFlux = 0;

  for (let b = 1; b < freqDbBuffer.length; b++) {
    const db = Math.max(-100, freqDbBuffer[b]);
    const mag = db <= -90 ? 0 : Math.pow(10, db / 20);
    const freq = b * binHz;
    weightedFreqSum += freq * mag;
    magSum += mag;

    if (freq < 350) lowEnergy += mag;
    else if (freq < 2200) midEnergy += mag;
    else highEnergy += mag;

    if (prevMagBuffer) {
      const logMag = Math.log1p(mag * 100);
      const diff = logMag - prevMagBuffer[b];
      if (diff > 0) {
        if (freq < 450) lowFlux += diff;
        else if (freq >= 600) highFlux += diff;
      }
      prevMagBuffer[b] = logMag;
    }
  }

  const flux = lowFlux + highFlux;
  const rawCentroidHz = magSum > 1e-6 ? weightedFreqSum / magSum : 500;
  const lowRatio = magSum > 1e-6 ? lowEnergy / magSum : 0;
  const highRatio = magSum > 1e-6 ? highEnergy / magSum : 0;

  // Blend centroid with low/high band dominance so low-string fundamentals separate from high strings
  const centroidHz = rawCentroidHz * (1 - lowRatio * 0.55 + highRatio * 0.35);

  let voice: VoiceId = 'snare';
  if (lowRatio > 0.42 || centroidHz < 360) {
    voice = 'kick';
  } else if (highRatio > 0.55 || (centroidHz > 3200 && zcr > 0.18)) {
    voice = 'hihat';
  } else if (centroidHz >= 1150 && zcr < 0.16 && midEnergy > highEnergy) {
    voice = 'clave';
  } else {
    voice = 'snare';
  }

  return { rms, flux, lowFlux, highFlux, voice, centroidHz };
}
