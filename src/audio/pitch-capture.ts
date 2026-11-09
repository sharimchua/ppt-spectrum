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
  const maxPeriod = Math.floor(sampleRate / minFreq);
  const size = buffer.length;

  let bestPeriod = 0;
  let maxCorr = -1;

  // Normalized autocorrelation
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

  // Parabolic interpolation for sub-sample accuracy
  const freqHz = sampleRate / bestPeriod;
  return { freqHz, confidence: maxCorr };
}
