import { primeFactors, reduceRational } from './rational';
import { VoiceAnchor, VoiceId } from './types';
import { resolveDuMetricOffsetToken } from './shape';

export type RhythmSimplificationMode = 'raw' | 'minimal' | 'grid' | 'polyrhythm';

export interface SimplifiedRhythmResult {
  cyclePeriodSec: number;
  bpm: number;
  anchors: VoiceAnchor[];
  summary: string;
}

function circularPhaseDist(a: number, b: number): number {
  const d = Math.abs((((a - b) % 1) + 1) % 1);
  return Math.min(d, 1 - d);
}

/**
 * Simplifies captured rhythm onsets into minimal PPT VoiceAnchors:
 * - `'minimal'`: factors out complete integer pulse grids (`8x..2x`) and leaves residuals as `1x` offsets.
 * - `'grid'`: extrapolates the smallest integer harmonic grid (`1x` + `kx`) covering all onsets.
 * - `'polyrhythm'`: detects two coprime pulse layers (e.g. `3x + 4x`) and normalises to `1/1 + b/a` with scaled `cyclePeriodSec`.
 */
export function simplifyRhythmOnsets(
  onsets: CapturedOnsetEvent[],
  cyclePeriodSec: number,
  mode: RhythmSimplificationMode,
  options: DecomposeOnsetsOptions = {}
): SimplifiedRhythmResult {
  if (onsets.length === 0 || mode === 'raw') {
    const raw = decomposeMultiVoiceOnsets(onsets, {
      ...options,
      cyclePeriodOverrideSec: cyclePeriodSec,
      foldCycles: false,
    });
    return {
      ...raw,
      summary: `${raw.anchors.length} voice anchor${raw.anchors.length === 1 ? '' : 's'}`,
    };
  }

  const t0 = onsets[0].timestampSec;
  const phases = onsets.map((ev, idx) => ({
    phase:
      ev.quantisedPhase !== undefined
        ? (((ev.quantisedPhase % 1) + 1) % 1)
        : idx === 0
          ? 0
          : (((ev.timestampSec - t0) / cyclePeriodSec) % 1 + 1) % 1,
    velocity: ev.velocity,
    voice: ev.voice,
  }));

  const tolerance = 0.055;

  if (mode === 'grid') {
    let bestK = 4;
    for (let k = 2; k <= 12; k++) {
      const allFit = phases.every((p) => {
        const nearestSlot = Math.round(p.phase * k) / k;
        return circularPhaseDist(p.phase, nearestSlot) <= tolerance;
      });
      if (allFit) {
        bestK = k;
        break;
      }
    }
    const anchors: VoiceAnchor[] = [
      {
        id: 'grid_root',
        name: 'Fundamental (1x)',
        ratio: { kind: 'rational', num: 1, den: 1 },
        phaseOffset: 0,
        offsetToken: 'Do',
        gain: 1.0,
        voice: 'kick',
        mute: false,
        partials: [
          {
            id: 'p_grid_1',
            ratio: { kind: 'rational', num: 1, den: 1 },
            amp: 1.0,
            previousAmp: 1.0,
            phase: 0,
            voice: 'kick',
            label: '1x',
          },
        ],
      },
      {
        id: `grid_p${bestK}`,
        name: `Extrapolated Grid (${bestK}x)`,
        ratio: { kind: 'rational', num: bestK, den: 1 },
        phaseOffset: 0,
        offsetToken: 'Do',
        gain: 0.85,
        voice: 'clave',
        mute: false,
        partials: [
          {
            id: `p_grid_${bestK}`,
            ratio: { kind: 'rational', num: 1, den: 1 },
            amp: 1.0,
            previousAmp: 1.0,
            phase: 0,
            voice: 'clave',
            label: `${bestK}x`,
          },
        ],
      },
    ];
    return {
      cyclePeriodSec,
      bpm: Math.round((60 * 4) / cyclePeriodSec),
      anchors,
      summary: `Extrapolated 1x + ${bestK}x grid`,
    };
  }

  if (mode === 'polyrhythm') {
    const pairs: [number, number][] = [
      [2, 3],
      [3, 4],
      [3, 5],
      [4, 5],
      [4, 7],
      [5, 6],
    ];
    let bestPair: [number, number] | null = null;
    let bestScore = -1;

    for (const [a, b] of pairs) {
      const slotsA = Array.from({ length: a }, (_, i) => i / a);
      const slotsB = Array.from({ length: b }, (_, i) => i / b);
      const hitsA = slotsA.filter((s) => phases.some((p) => circularPhaseDist(p.phase, s) <= tolerance)).length;
      const hitsB = slotsB.filter((s) => phases.some((p) => circularPhaseDist(p.phase, s) <= tolerance)).length;
      const covered = phases.filter(
        (p) =>
          slotsA.some((s) => circularPhaseDist(p.phase, s) <= tolerance) ||
          slotsB.some((s) => circularPhaseDist(p.phase, s) <= tolerance)
      ).length;

      const coverageRatio = covered / phases.length;
      if (hitsA >= Math.ceil(a * 0.65) && hitsB >= Math.ceil(b * 0.65) && coverageRatio >= 0.75) {
        const score = coverageRatio * 10 - (a + b) * 0.1;
        if (score > bestScore) {
          bestScore = score;
          bestPair = [a, b];
        }
      }
    }

    if (bestPair) {
      const [a, b] = bestPair;
      const ratio = reduceRational(b, a);
      const normPeriod = Number((cyclePeriodSec / a).toFixed(4));
      const anchors: VoiceAnchor[] = [
        {
          id: 'poly_root',
          name: `Root Pulse (1/1 • ${a}-Pulse)`,
          ratio: { kind: 'rational', num: 1, den: 1 },
          phaseOffset: 0,
          offsetToken: 'Do',
          gain: 1.0,
          voice: 'kick',
          mute: false,
          partials: [
            {
              id: 'p_poly_1',
              ratio: { kind: 'rational', num: 1, den: 1 },
              amp: 1.0,
              previousAmp: 1.0,
              phase: 0,
              voice: 'kick',
              label: '1/1',
            },
          ],
        },
        {
          id: 'poly_ratio',
          name: `Cross Pulse (${ratio.num}/${ratio.den} • ${b}-Pulse)`,
          ratio: { kind: 'rational', num: ratio.num, den: ratio.den },
          phaseOffset: 0,
          offsetToken: 'Do',
          gain: 0.85,
          voice: 'snare',
          mute: false,
          partials: [
            {
              id: 'p_poly_2',
              ratio: { kind: 'rational', num: 1, den: 1 },
              amp: 1.0,
              previousAmp: 1.0,
              phase: 0,
              voice: 'snare',
              label: `${ratio.num}/${ratio.den}`,
            },
          ],
        },
      ];
      return {
        cyclePeriodSec: normPeriod,
        bpm: Math.round((60 * 4) / normPeriod),
        anchors,
        summary: `Normalised ${b}:${a} polyrhythm (1/1 + ${ratio.num}/${ratio.den})`,
      };
    }
  }

  // 'minimal' mode: greedily factor out complete kx periodic pulses (8x down to 2x), then residual 1x offsets
  const remaining = phases.map((p, idx) => ({ ...p, idx, covered: false }));
  const anchors: VoiceAnchor[] = [];
  const candidateKs = [8, 6, 5, 4, 3, 2];

  for (const k of candidateKs) {
    const candidateOffsets = [0, 0.5 / k];
    for (const offset of candidateOffsets) {
      const matchedIndices: number[] = [];
      for (let slot = 0; slot < k; slot++) {
        const target = (offset + slot / k) % 1;
        const match = remaining.find((r) => !r.covered && circularPhaseDist(r.phase, target) <= tolerance);
        if (match) matchedIndices.push(match.idx);
      }
      if (matchedIndices.length === k) {
        matchedIndices.forEach((mIdx) => {
          const item = remaining.find((r) => r.idx === mIdx);
          if (item) item.covered = true;
        });
        const duMetric = resolveDuMetricOffsetToken(offset);
        anchors.push({
          id: `min_pulse_${k}_${anchors.length + 1}`,
          name: `${k}x Pulse @ ${duMetric.token}`,
          ratio: { kind: 'rational', num: k, den: 1 },
          phaseOffset: offset,
          offsetToken: duMetric.token,
          gain: 0.9,
          voice: offset === 0 ? 'kick' : 'clave',
          mute: false,
          partials: [
            {
              id: `p_min_${k}_${anchors.length + 1}`,
              ratio: { kind: 'rational', num: 1, den: 1 },
              amp: 1.0,
              previousAmp: 1.0,
              phase: 0,
              voice: offset === 0 ? 'kick' : 'clave',
              label: `${k}x`,
            },
          ],
        });
      }
    }
  }

  // Add residual uncovered hits as 1x offset anchors
  for (const r of remaining) {
    if (r.covered) continue;
    const duMetric = resolveDuMetricOffsetToken(r.phase);
    const finalPhase = r.phase;
    const voiceLabel = r.voice.charAt(0).toUpperCase() + r.voice.slice(1);
    anchors.push({
      id: `min_res_${r.idx + 1}`,
      name: `${voiceLabel} @ ${duMetric.token} (${duMetric.fraction})`,
      ratio: { kind: 'rational', num: 1, den: 1 },
      phaseOffset: Number(finalPhase.toFixed(4)),
      offsetToken: duMetric.token,
      gain: Number(Math.max(0.25, Math.min(1.0, r.velocity)).toFixed(2)),
      voice: r.voice,
      mute: false,
      partials: [
        {
          id: `p_res_${r.idx + 1}`,
          ratio: { kind: 'rational', num: 1, den: 1 },
          amp: 1.0,
          previousAmp: 1.0,
          phase: 0,
          voice: r.voice,
          label: `${voiceLabel} @${duMetric.token}`,
        },
      ],
    });
  }

  return {
    cyclePeriodSec,
    bpm: Math.round((60 * 4) / cyclePeriodSec),
    anchors,
    summary: `Simplified to ${anchors.length} anchor${anchors.length === 1 ? '' : 's'}`,
  };
}

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
  /** Optional measured spectral centroid (Hz) for grouping similar-sounding beats. */
  centroidHz?: number;
  /** Optional per-onset quantisation override; when true, snaps to DuMetric/chosen phase. */
  quantise?: boolean;
  /** Optional explicit phase [0, 1) chosen via selective quantisation / autocomplete pill. */
  quantisedPhase?: number;
}

export interface DecomposeOnsetsOptions {
  /** Global quantise default (false = preserve raw micro-timing unless per-onset quantise is true). */
  quantise?: boolean;
  /** Optional explicit cycle period in seconds (overrides automatic IOI estimation). */
  cyclePeriodOverrideSec?: number;
  /** Number of root cycles represented by the captured rhythmic phrase (default 1). */
  rootCycles?: number;
  /** When true, groups all hits of the same voice under a single VoiceAnchor root. */
  groupByVoice?: boolean;
  /** When true and rootCycles > 1, folds cycles together to extract recurring consensus pattern. */
  foldCycles?: boolean;
}

/**
 * Clusters onsets with similar spectral centroids so repeated hits on the same sound source
 * receive a consistent voice label.
 * When `targetVoices` (1..4) is provided, partitions hits into up to `targetVoices` spectral groups
 * via 1D k-means on log2(centroidHz); otherwise groups within `toleranceOctaves`.
 */
export function clusterSimilarOnsetVoices(
  onsets: CapturedOnsetEvent[],
  toleranceOctaves: number = 0.55,
  targetVoices?: number
): CapturedOnsetEvent[] {
  const indexed = onsets
    .map((ev, idx) => ({ idx, hz: ev.centroidHz ?? 0 }))
    .filter((item) => item.hz > 0);
  if (indexed.length === 0) return onsets;

  const voicePalette: VoiceId[] = ['kick', 'snare', 'clave', 'hihat'];
  const assignedVoices = new Map<number, VoiceId>();

  if (targetVoices && targetVoices >= 1) {
    const k = Math.min(4, Math.max(1, Math.round(targetVoices)), indexed.length);
    if (k === 1) {
      const meanLog = indexed.reduce((s, item) => s + Math.log2(item.hz), 0) / indexed.length;
      const meanHz = Math.pow(2, meanLog);
      const singleVoice: VoiceId =
        meanHz < 380 ? 'kick' : meanHz < 1500 ? 'snare' : meanHz < 3000 ? 'clave' : 'hihat';
      indexed.forEach((item) => assignedVoices.set(item.idx, singleVoice));
    } else {
      const sorted = [...indexed].sort((a, b) => a.hz - b.hz);
      // Initialise k centroids at quantiles of log2(hz)
      const centroids = Array.from({ length: k }, (_, c) => {
        const pos = Math.floor(((c + 0.5) / k) * sorted.length);
        return Math.log2(sorted[Math.min(sorted.length - 1, pos)].hz);
      });
      const assignments = new Array<number>(indexed.length).fill(0);

      for (let iter = 0; iter < 12; iter++) {
        let changed = false;
        for (let i = 0; i < indexed.length; i++) {
          const logHz = Math.log2(indexed[i].hz);
          let bestC = 0;
          let bestDist = Infinity;
          for (let c = 0; c < k; c++) {
            const d = Math.abs(logHz - centroids[c]);
            if (d < bestDist) {
              bestDist = d;
              bestC = c;
            }
          }
          if (assignments[i] !== bestC) {
            assignments[i] = bestC;
            changed = true;
          }
        }
        for (let c = 0; c < k; c++) {
          let sum = 0;
          let count = 0;
          for (let i = 0; i < indexed.length; i++) {
            if (assignments[i] === c) {
              sum += Math.log2(indexed[i].hz);
              count++;
            }
          }
          if (count > 0) centroids[c] = sum / count;
        }
        if (!changed) break;
      }

      const order = Array.from({ length: k }, (_, c) => c).sort((a, b) => centroids[a] - centroids[b]);
      const clusterToVoice = new Map<number, VoiceId>();
      order.forEach((c, rank) => clusterToVoice.set(c, voicePalette[rank]));
      for (let i = 0; i < indexed.length; i++) {
        assignedVoices.set(indexed[i].idx, clusterToVoice.get(assignments[i]) ?? 'snare');
      }
    }

    return onsets.map((ev, idx) => {
      const v = assignedVoices.get(idx);
      return v ? { ...ev, voice: v } : ev;
    });
  }

  if (indexed.length < 2) return onsets;

  interface Cluster {
    meanHz: number;
    count: number;
    indices: number[];
  }
  const clusters: Cluster[] = [];

  for (const item of indexed) {
    let bestCluster: Cluster | null = null;
    let bestDist = Infinity;
    for (const c of clusters) {
      const distOct = Math.abs(Math.log2(item.hz / c.meanHz));
      if (distOct <= toleranceOctaves && distOct < bestDist) {
        bestDist = distOct;
        bestCluster = c;
      }
    }

    if (bestCluster) {
      bestCluster.meanHz = (bestCluster.meanHz * bestCluster.count + item.hz) / (bestCluster.count + 1);
      bestCluster.count += 1;
      bestCluster.indices.push(item.idx);
    } else {
      clusters.push({ meanHz: item.hz, count: 1, indices: [item.idx] });
    }
  }

  if (clusters.length === 0) return onsets;

  clusters.sort((a, b) => a.meanHz - b.meanHz);

  if (clusters.length === 1) {
    const hz = clusters[0].meanHz;
    const singleVoice: VoiceId =
      hz < 380 ? 'kick' : hz < 1500 ? 'snare' : hz < 3000 ? 'clave' : 'hihat';
    clusters[0].indices.forEach((idx) => assignedVoices.set(idx, singleVoice));
  } else {
    clusters.forEach((c, cIdx) => {
      const voice = voicePalette[Math.min(voicePalette.length - 1, cIdx)];
      c.indices.forEach((idx) => assignedVoices.set(idx, voice));
    });
  }

  return onsets.map((ev, idx) => {
    const clusteredVoice = assignedVoices.get(idx);
    return clusteredVoice ? { ...ev, voice: clusteredVoice } : ev;
  });
}

/**
 * Estimates a musical bar/cycle period in seconds from a sequence of onset timestamps.
 * Trims leading and trailing silence by working strictly from the active onset span,
 * and adds one inferred beat tail after the final hit so the loop wraps cleanly.
 */
/**
 * Refines an initial cycle period estimate by folding `rootCycles` repetitions onto [0, 1)
 * and maximising circular phase coincidence between hits from different cycles.
 */
export function refineCyclePeriodByFolding(
  onsets: CapturedOnsetEvent[],
  initialPeriodSec: number,
  rootCycles: number
): number {
  if (rootCycles <= 1 || onsets.length < rootCycles * 2) return initialPeriodSec;

  const t0 = onsets[0].timestampSec;
  const minT = Math.max(0.35, initialPeriodSec * 0.78);
  const maxT = Math.min(8.0, initialPeriodSec * 1.22);

  let bestT = initialPeriodSec;
  let bestScore = -1;
  const steps = 60;
  const sigma = 0.032; // ~3.2% of a cycle tolerance

  for (let s = 0; s <= steps; s++) {
    const T = minT + ((maxT - minT) * s) / steps;
    let score = 0;

    for (let i = 0; i < onsets.length; i++) {
      const ti = onsets[i].timestampSec - t0;
      const cycleI = Math.floor(ti / T);
      const phaseI = ((ti / T) % 1 + 1) % 1;

      for (let j = i + 1; j < onsets.length; j++) {
        const tj = onsets[j].timestampSec - t0;
        const cycleJ = Math.floor(tj / T);
        if (cycleI === cycleJ) continue;
        const phaseJ = ((tj / T) % 1 + 1) % 1;
        const rawDiff = Math.abs(phaseI - phaseJ);
        const circDiff = Math.min(rawDiff, 1 - rawDiff);
        const voiceWeight = onsets[i].voice === onsets[j].voice ? 1.5 : 0.35;
        score += voiceWeight * Math.exp(-(circDiff * circDiff) / (2 * sigma * sigma));
      }
    }

    // Gentle prior favouring candidates close to initialPeriodSec when scores tie
    const relDev = (T - initialPeriodSec) / initialPeriodSec;
    score *= Math.exp(-(relDev * relDev) / 0.12);

    if (score > bestScore) {
      bestScore = score;
      bestT = T;
    }
  }

  return Number(bestT.toFixed(4));
}

/**
 * Folds multi-cycle onsets into a single consensus cycle by clustering hits across cycles
 * that land within `phaseWindow` of each other, averaging their phase & velocity,
 * and voting on the dominant voice. Filters out single-occurrence stray hits when `rootCycles >= 3`.
 */
export function foldCyclesToConsensus(
  onsets: CapturedOnsetEvent[],
  cyclePeriodSec: number,
  rootCycles: number,
  phaseWindow: number = 0.055
): CapturedOnsetEvent[] {
  if (rootCycles <= 1 || onsets.length < 2) return onsets;

  const t0 = onsets[0].timestampSec;
  interface PhaseBin {
    sumSin: number;
    sumCos: number;
    velSum: number;
    voices: VoiceId[];
    cycles: Set<number>;
    count: number;
    quantiseAny: boolean;
    explicitPhase?: number;
  }

  const bins: PhaseBin[] = [];

  for (let i = 0; i < onsets.length; i++) {
    const ev = onsets[i];
    const rel = Math.max(0, ev.timestampSec - t0);
    const cycleIdx = Math.floor(rel / cyclePeriodSec);
    const phase = i === 0 ? 0 : ((rel / cyclePeriodSec) % 1 + 1) % 1;
    const angle = phase * 2 * Math.PI;

    let bestBin: PhaseBin | null = null;
    let bestDist = Infinity;

    for (const b of bins) {
      const meanAngle = Math.atan2(b.sumSin, b.sumCos);
      const meanPhase = ((meanAngle / (2 * Math.PI)) % 1 + 1) % 1;
      const diff = Math.min(Math.abs(phase - meanPhase), 1 - Math.abs(phase - meanPhase));
      if (diff <= phaseWindow && diff < bestDist) {
        bestDist = diff;
        bestBin = b;
      }
    }

    if (bestBin) {
      bestBin.sumSin += Math.sin(angle);
      bestBin.sumCos += Math.cos(angle);
      bestBin.velSum += ev.velocity;
      bestBin.voices.push(ev.voice);
      bestBin.cycles.add(cycleIdx);
      bestBin.count += 1;
      if (ev.quantise) bestBin.quantiseAny = true;
      if (ev.quantisedPhase !== undefined) bestBin.explicitPhase = ev.quantisedPhase;
    } else {
      bins.push({
        sumSin: Math.sin(angle),
        sumCos: Math.cos(angle),
        velSum: ev.velocity,
        voices: [ev.voice],
        cycles: new Set([cycleIdx]),
        count: 1,
        quantiseAny: Boolean(ev.quantise),
        explicitPhase: ev.quantisedPhase,
      });
    }
  }

  const minCyclesRequired = rootCycles >= 3 ? 2 : 1;
  const consensusBins = bins.filter((b) => b.cycles.size >= minCyclesRequired);
  const activeBins = consensusBins.length > 0 ? consensusBins : bins;

  const result: CapturedOnsetEvent[] = activeBins.map((b) => {
    const meanAngle = Math.atan2(b.sumSin, b.sumCos);
    let meanPhase = ((meanAngle / (2 * Math.PI)) % 1 + 1) % 1;
    // Keep downbeat cluster anchored at 0 rather than wrapping to ~0.999
    if (meanPhase > 1 - phaseWindow * 0.6) {
      meanPhase = 0;
    }

    // Majority vote for voice
    const counts = new Map<VoiceId, number>();
    for (const v of b.voices) counts.set(v, (counts.get(v) ?? 0) + 1);
    let topVoice: VoiceId = b.voices[0];
    let topCount = 0;
    counts.forEach((c, v) => {
      if (c > topCount) {
        topCount = c;
        topVoice = v;
      }
    });

    return {
      timestampSec: t0 + meanPhase * cyclePeriodSec,
      voice: topVoice,
      velocity: b.velSum / b.count,
      quantise: b.quantiseAny,
      quantisedPhase: b.explicitPhase,
    };
  });

  result.sort((a, b) => a.timestampSec - b.timestampSec);
  return result;
}

export function estimateCyclePeriodSec(onsets: CapturedOnsetEvent[], rootCycles: number = 1): number {
  if (onsets.length < 2) return 2.0;

  const t0 = onsets[0].timestampSec;
  const tLast = onsets[onsets.length - 1].timestampSec;
  const span = Math.max(0.25, tLast - t0);
  const cycles = Math.max(1, Math.round(rootCycles));

  const iois: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    const dt = onsets[i].timestampSec - onsets[i - 1].timestampSec;
    if (dt >= 0.04) iois.push(dt);
  }
  if (iois.length === 0) return Math.max(0.5, Math.min(6.0, span / cycles));

  const sorted = [...iois].sort((a, b) => a - b);
  const medianIoi = sorted[Math.floor(sorted.length / 2)];
  const p75Ioi = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75))];
  // Polyrhythms (e.g. 4:3) have uneven IOIs where the closing tail is closer to the primary beat (p75)
  const isUneven = sorted[sorted.length - 1] > sorted[0] * 1.45;
  const tailIoi = isUneven ? p75Ioi : medianIoi;
  const rawBeats = (span + tailIoi) / Math.max(0.12, tailIoi);
  const roundedBeats = Math.max(2, Math.min(64, Math.round(rawBeats)));
  const initialEstimated = Math.max(0.4, Math.min(8.0, (roundedBeats * tailIoi) / cycles));

  return cycles > 1
    ? refineCyclePeriodByFolding(onsets, initialEstimated, cycles)
    : Number(initialEstimated.toFixed(4));
}

/**
 * Decomposes a stream of multi-voice rhythm onset events into PPT VoiceAnchors.
 * Anchors t = 0 to the first onset (trimming leading silence) and ignores trailing silence.
 * Preserves raw micro-timing by default unless global or per-onset quantisation is requested.
 */
export function decomposeMultiVoiceOnsets(
  onsets: CapturedOnsetEvent[],
  options: DecomposeOnsetsOptions = {}
): { cyclePeriodSec: number; bpm: number; anchors: VoiceAnchor[] } {
  if (onsets.length === 0) {
    return { cyclePeriodSec: 2.0, bpm: 120, anchors: [] };
  }

  const t0 = onsets[0].timestampSec;
  const rootCycles = Math.max(1, Math.round(options.rootCycles ?? 1));
  const cyclePeriodSec = options.cyclePeriodOverrideSec
    ? Math.max(0.25, Math.min(12.0, options.cyclePeriodOverrideSec))
    : estimateCyclePeriodSec(onsets, rootCycles);

  const foldedOnsets =
    rootCycles > 1 && (options.foldCycles ?? true)
      ? foldCyclesToConsensus(onsets, cyclePeriodSec, rootCycles)
      : onsets;

  const bpm = Math.round((60 * 4) / cyclePeriodSec);
  const anchors: VoiceAnchor[] = [];

  for (let i = 0; i < foldedOnsets.length; i++) {
    const ev = foldedOnsets[i];
    const relTime = Math.max(0, ev.timestampSec - t0);
    const rawPhase = i === 0 ? 0 : (((relTime / cyclePeriodSec) % 1) + 1) % 1;
    const shouldQuantise = ev.quantise ?? options.quantise ?? false;

    const targetPhase =
      ev.quantisedPhase !== undefined
        ? (((ev.quantisedPhase % 1) + 1) % 1)
        : rawPhase;

    const duMetric = i === 0 ? resolveDuMetricOffsetToken(0) : resolveDuMetricOffsetToken(targetPhase);
    const finalPhase =
      ev.quantisedPhase !== undefined
        ? targetPhase
        : shouldQuantise
          ? duMetric.phase
          : Number(rawPhase.toFixed(4));

    // Only merge if landing on virtually the same phase (< 0.01) with the same voice
    const existing = anchors.find(
      (a) =>
        a.voice === ev.voice &&
        Math.min(Math.abs(a.phaseOffset - finalPhase), 1 - Math.abs(a.phaseOffset - finalPhase)) < 0.01
    );
    if (existing) {
      existing.gain = Math.max(existing.gain, ev.velocity);
      continue;
    }

    const voiceLabel = ev.voice.charAt(0).toUpperCase() + ev.voice.slice(1);
    const timingTag = shouldQuantise || ev.quantisedPhase !== undefined ? duMetric.fraction : `${Math.round(finalPhase * 100)}%`;

    if (options.groupByVoice) {
      let voiceAnchor = anchors.find((a) => a.voice === ev.voice);
      if (!voiceAnchor) {
        voiceAnchor = {
          id: `cap_voice_${ev.voice}`,
          name: `${voiceLabel} Groove`,
          ratio: { kind: 'rational', num: 1, den: 1 },
          phaseOffset: 0,
          offsetToken: 'Do',
          gain: 1.0,
          voice: ev.voice,
          mute: false,
          partials: [],
        };
        anchors.push(voiceAnchor);
      }

      const duplicate = voiceAnchor.partials.find(
        (p) => Math.min(Math.abs(p.phase - finalPhase), 1 - Math.abs(p.phase - finalPhase)) < 0.01
      );
      if (duplicate) {
        duplicate.amp = Math.max(duplicate.amp, ev.velocity);
      } else {
        voiceAnchor.partials.push({
          id: `p_${ev.voice}_${voiceAnchor.partials.length + 1}`,
          ratio: { kind: 'rational', num: 1, den: 1 },
          amp: Number(Math.max(0.25, Math.min(1.0, ev.velocity)).toFixed(2)),
          previousAmp: Number(Math.max(0.25, Math.min(1.0, ev.velocity)).toFixed(2)),
          phase: finalPhase,
          voice: ev.voice,
          label: `${voiceLabel} @${duMetric.token} (${timingTag})`,
        });
      }
      continue;
    }

    anchors.push({
      id: `cap_anchor_${i + 1}`,
      name: `${voiceLabel} @ ${duMetric.token} (${timingTag})`,
      ratio: { kind: 'rational', num: 1, den: 1 },
      phaseOffset: finalPhase,
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
