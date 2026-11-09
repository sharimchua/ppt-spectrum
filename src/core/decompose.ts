import { primeFactors } from './rational';
import { VoiceAnchor, VoiceId } from './types';
import { resolveDuMetricOffsetToken } from './shape';

export interface RhythmDecompositionCandidate {
  name: string;
  ratios: number[];
  cyclePeriodSec: number;
  complexityScore: number;
}

export interface CapturedOnsetEvent {
  timestampSec: number;
  voice: VoiceId;
  velocity: number;
}

/**
 * Quantises a stream of multi-voice rhythm onset events into PPT DuMetric VoiceAnchors.
 * Estimates the fundamental bar cycle duration T from the onset span, maps each hit's
 * phase onto the 16 canonical DuMetric Solfège offsets (Do, Me, Mi, DoLa, Fi, La, etc.),
 * and builds a VoiceAnchor hierarchy.
 */
export function decomposeMultiVoiceOnsets(
  onsets: CapturedOnsetEvent[]
): { cyclePeriodSec: number; bpm: number; anchors: VoiceAnchor[] } {
  if (onsets.length === 0) {
    return { cyclePeriodSec: 2.0, bpm: 120, anchors: [] };
  }

  const t0 = onsets[0].timestampSec;
  const tLast = onsets[onsets.length - 1].timestampSec;
  const span = Math.max(0.25, tLast - t0);

  // Estimate cycle period (1 bar of 4 beats):
  // If user tapped >= 2 events, estimate average IOI and round span to a sensible 4-beat bar period
  let cyclePeriodSec = 2.0;
  if (onsets.length >= 2) {
    const avgIoi = span / (onsets.length - 1);
    const rawBar = avgIoi * Math.max(2, Math.min(8, Math.round(onsets.length)));
    cyclePeriodSec = Math.max(0.5, Math.min(6.0, rawBar));
  }

  const bpm = Math.round((60 * 4) / cyclePeriodSec);
  const anchors: VoiceAnchor[] = [];

  for (let i = 0; i < onsets.length; i++) {
    const ev = onsets[i];
    const relTime = Math.max(0, ev.timestampSec - t0);
    const rawPhase = ((relTime / cyclePeriodSec) % 1 + 1) % 1;
    const duMetric = i === 0 ? resolveDuMetricOffsetToken(0) : resolveDuMetricOffsetToken(rawPhase);

    // Avoid duplicating an anchor that already landed on the exact same DuMetric token & voice
    const existing = anchors.find((a) => a.offsetToken === duMetric.token && a.voice === ev.voice);
    if (existing) {
      existing.gain = Math.max(existing.gain, ev.velocity);
      continue;
    }

    const voiceLabel = ev.voice.charAt(0).toUpperCase() + ev.voice.slice(1);
    anchors.push({
      id: `cap_anchor_${i + 1}`,
      name: `${voiceLabel} @ ${duMetric.token} (${duMetric.fraction})`,
      ratio: { kind: 'rational', num: 1, den: 1 },
      phaseOffset: duMetric.phase,
      offsetToken: duMetric.token,
      gain: Number(Math.max(0.25, Math.min(1.0, ev.velocity)).toFixed(2)),
      voice: ev.voice,
      mute: false,
      partials: [
        {
          id: `p_${i + 1}`,
          ratio: { kind: 'rational', num: 1, den: 1 },
          amp: 1.0,
          previousAmp: 1.0,
          phase: 0,
          voice: ev.voice,
          label: `${voiceLabel} @${duMetric.token}`,
        },
      ],
    });
  }

  return { cyclePeriodSec, bpm, anchors };
}

/**
 * Quantises an onset phase t/T into an 11-limit smooth fraction p/q.
 * Denominators q must only have prime factors in {2, 3, 5, 7, 11}.
 */
export function quantisePhaseTo11Limit(phaseFraction: number, maxDenominator: number = 16): { p: number; q: number; error: number } {
  let bestP = 0;
  let bestQ = 1;
  let minError = 999;

  for (let q = 1; q <= maxDenominator; q++) {
    const factors = primeFactors(q);
    const is11Limit = factors.every((f) => [2, 3, 5, 7, 11].includes(f));
    if (!is11Limit) continue;

    const p = Math.round(phaseFraction * q);
    const approx = p / q;
    const err = Math.abs(phaseFraction - approx);

    if (err < minError) {
      minError = err;
      bestP = p;
      bestQ = q;
    }
  }

  return { p: bestP, q: bestQ, error: minError };
}

/**
 * Infers possible polyrhythmic layer decompositions from a series of tap timestamps.
 */
export function decomposeTapIntervals(
  timestampsSec: number[]
): RhythmDecompositionCandidate[] {
  if (timestampsSec.length < 3) return [];

  // Compute inter-onset intervals (IOIs)
  const iois = [];
  for (let i = 1; i < timestampsSec.length; i++) {
    iois.push(timestampsSec[i] - timestampsSec[i - 1]);
  }

  const avgIoi = iois.reduce((a, b) => a + b, 0) / iois.length;
  const totalDuration = timestampsSec[timestampsSec.length - 1] - timestampsSec[0];

  const candidates: RhythmDecompositionCandidate[] = [
    {
      name: 'Steady Pulse (1:1)',
      ratios: [1],
      cyclePeriodSec: avgIoi,
      complexityScore: 1,
    },
    {
      name: 'Duple Subdivision (1:2)',
      ratios: [1, 2],
      cyclePeriodSec: avgIoi * 2,
      complexityScore: 2,
    },
    {
      name: '3 against 2 (Hemiola)',
      ratios: [2, 3],
      cyclePeriodSec: totalDuration > 1.2 ? totalDuration / 2 : avgIoi * 3,
      complexityScore: 3,
    },
    {
      name: '4 against 3',
      ratios: [3, 4],
      cyclePeriodSec: totalDuration > 1.5 ? totalDuration : avgIoi * 4,
      complexityScore: 4,
    },
  ];

  return candidates;
}
