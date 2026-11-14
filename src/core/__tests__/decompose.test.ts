import { describe, it, expect } from 'vitest';
import {
  quantisePhaseTo11Limit,
  decomposeTapIntervals,
  decomposeMultiVoiceOnsets,
  estimateCyclePeriodSec,
  clusterSimilarOnsetVoices,
  foldCyclesToConsensus,
  simplifyRhythmOnsets,
} from '../decompose';
import { resolveDuMetricOffsetToken } from '../shape';

describe('Rhythm Decomposer & 11-Limit Quantiser', () => {
  it('quantises typical rhythmic phase fractions to 11-limit denominators', () => {
    // 0.5 => 1/2
    const half = quantisePhaseTo11Limit(0.5);
    expect(half.p).toBe(1);
    expect(half.q).toBe(2);

    // 0.333... => 1/3
    const third = quantisePhaseTo11Limit(0.3333);
    expect(third.p).toBe(1);
    expect(third.q).toBe(3);

    // 0.25 => 1/4
    const quarter = quantisePhaseTo11Limit(0.25);
    expect(quarter.p).toBe(1);
    expect(quarter.q).toBe(4);

    // 0.2 => 1/5
    const fifth = quantisePhaseTo11Limit(0.2);
    expect(fifth.p).toBe(1);
    expect(fifth.q).toBe(5);
  });

  it('infers polyrhythm candidates from tap intervals', () => {
    // Steady taps every 500ms (120 BPM)
    const timestamps = [1.0, 1.5, 2.0, 2.5, 3.0];
    const candidates = decomposeTapIntervals(timestamps);
    expect(candidates.length).toBeGreaterThan(0);

    const pulse = candidates.find((c) => c.name.includes('Steady Pulse'));
    expect(pulse).toBeDefined();
    expect(pulse?.cyclePeriodSec).toBeCloseTo(0.5, 2);
  });

  it('resolves DuMetric Solfège phase offsets and decomposes multi-voice onsets into VoiceAnchors', () => {
    expect(resolveDuMetricOffsetToken(0.0).token).toBe('Do');
    expect(resolveDuMetricOffsetToken(0.375).token).toBe('DoLa');
    expect(resolveDuMetricOffsetToken(0.5).token).toBe('Fi');
    expect(resolveDuMetricOffsetToken(0.75).token).toBe('La');

    const onsets = [
      { timestampSec: 1.0, voice: 'kick' as const, velocity: 1.0 },
      { timestampSec: 1.5, voice: 'snare' as const, velocity: 0.85 },
      { timestampSec: 2.0, voice: 'clave' as const, velocity: 0.8 },
      { timestampSec: 2.5, voice: 'hihat' as const, velocity: 0.7 },
    ];
    const decomp = decomposeMultiVoiceOnsets(onsets);
    expect(decomp.anchors.length).toBe(4);
    expect(decomp.anchors[0].offsetToken).toBe('Do');
    expect(decomp.anchors[0].voice).toBe('kick');
  });

  it('preserves raw micro-timing by default and supports selective per-onset quantisation', () => {
    const onsets = [
      { timestampSec: 5.0, voice: 'kick' as const, velocity: 1.0 },
      { timestampSec: 5.53, voice: 'snare' as const, velocity: 0.85 }, // slightly late (~0.265)
      { timestampSec: 6.0, voice: 'clave' as const, velocity: 0.8, quantise: true }, // exact 0.5
      { timestampSec: 6.5, voice: 'hihat' as const, velocity: 0.7 },
    ];
    expect(estimateCyclePeriodSec(onsets)).toBeCloseTo(2.0, 1);

    const rawDecomp = decomposeMultiVoiceOnsets(onsets, { cyclePeriodOverrideSec: 2.0 });
    expect(rawDecomp.anchors[0].phaseOffset).toBe(0);
    // Unquantised snare keeps raw 0.53 / 2.0 = 0.265 rather than snapping to 0.25
    expect(rawDecomp.anchors[1].phaseOffset).toBeCloseTo(0.265, 3);
    // Selectively quantised clave snaps to Fi (0.5)
    expect(rawDecomp.anchors[2].phaseOffset).toBe(0.5);

    const quantisedDecomp = decomposeMultiVoiceOnsets(onsets, {
      quantise: true,
      cyclePeriodOverrideSec: 2.0,
    });
    expect(quantisedDecomp.anchors[1].phaseOffset).toBe(0.25);
  });

  it('clusters similar-sounding beats and groups them under shared VoiceAnchor roots', () => {
    const rawOnsets = [
      { timestampSec: 1.0, voice: 'snare' as const, velocity: 0.9, centroidHz: 220 },
      { timestampSec: 1.5, voice: 'clave' as const, velocity: 0.8, centroidHz: 1850 },
      { timestampSec: 2.0, voice: 'kick' as const, velocity: 0.95, centroidHz: 245 },
      { timestampSec: 2.5, voice: 'hihat' as const, velocity: 0.75, centroidHz: 2050 },
    ];
    const clustered = clusterSimilarOnsetVoices(rawOnsets);
    expect(clustered[0].voice).toBe(clustered[2].voice);
    expect(clustered[1].voice).toBe(clustered[3].voice);
    expect(clustered[0].voice).not.toBe(clustered[1].voice);

    const grouped = decomposeMultiVoiceOnsets(clustered, {
      cyclePeriodOverrideSec: 2.0,
      groupByVoice: true,
    });
    expect(grouped.anchors.length).toBe(2);
    expect(grouped.anchors[0].partials.length).toBe(2);
    expect(grouped.anchors[1].partials.length).toBe(2);
  });

  it('scales cycle period by rootCycles when capturing multi-bar phrases', () => {
    // 8 quarter-note hits at 120 BPM (0.5s apart) spanning 2 bars (rootCycles = 2)
    const twoBarOnsets = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5].map((t, idx) => ({
      timestampSec: 1.0 + t,
      voice: (idx % 2 === 0 ? 'kick' : 'snare') as 'kick' | 'snare',
      velocity: 0.9,
    }));
    expect(estimateCyclePeriodSec(twoBarOnsets, 2)).toBeCloseTo(2.0, 2);
  });

  it('folds 4-cycle phrases into a consensus pattern and rejects single-occurrence stray hits', () => {
    // 4 repetitions of a 3-hit pattern (0.0, 0.5, 1.25 within a 2.0s cycle) + 1 stray bump in cycle 2
    const fourCycleOnsets = [
      // Cycle 0
      { timestampSec: 1.0, voice: 'kick' as const, velocity: 0.9 },
      { timestampSec: 1.52, voice: 'snare' as const, velocity: 0.8 },
      { timestampSec: 2.24, voice: 'clave' as const, velocity: 0.85 },
      // Cycle 1 (+1 stray hihat)
      { timestampSec: 3.01, voice: 'kick' as const, velocity: 0.95 },
      { timestampSec: 3.49, voice: 'snare' as const, velocity: 0.8 },
      { timestampSec: 3.85, voice: 'hihat' as const, velocity: 0.4 }, // stray single hit
      { timestampSec: 4.26, voice: 'clave' as const, velocity: 0.85 },
      // Cycle 2
      { timestampSec: 4.99, voice: 'kick' as const, velocity: 0.9 },
      { timestampSec: 5.5, voice: 'snare' as const, velocity: 0.85 },
      { timestampSec: 6.25, voice: 'clave' as const, velocity: 0.8 },
      // Cycle 3
      { timestampSec: 7.0, voice: 'kick' as const, velocity: 0.9 },
      { timestampSec: 7.51, voice: 'snare' as const, velocity: 0.8 },
      { timestampSec: 8.25, voice: 'clave' as const, velocity: 0.85 },
    ];

    const period = estimateCyclePeriodSec(fourCycleOnsets, 4);
    expect(period).toBeCloseTo(2.0, 1);

    const consensus = foldCyclesToConsensus(fourCycleOnsets, period, 4);
    expect(consensus.length).toBe(3); // stray hit filtered out!
    expect(consensus[0].voice).toBe('kick');
    expect(consensus[1].voice).toBe('snare');
    expect(consensus[2].voice).toBe('clave');
  });

  it('partitions onsets into exact targetVoices via k-means when hint is provided', () => {
    const hits = [
      { timestampSec: 1.0, voice: 'snare' as const, velocity: 0.9, centroidHz: 210 },
      { timestampSec: 1.5, voice: 'snare' as const, velocity: 0.85, centroidHz: 600 },
      { timestampSec: 2.0, voice: 'clave' as const, velocity: 0.8, centroidHz: 1900 },
      { timestampSec: 2.5, voice: 'hihat' as const, velocity: 0.75, centroidHz: 2400 },
    ];
    const twoVoices = clusterSimilarOnsetVoices(hits, 0.55, 2);
    expect(twoVoices[0].voice).toBe(twoVoices[1].voice);
    expect(twoVoices[2].voice).toBe(twoVoices[3].voice);
    expect(twoVoices[0].voice).not.toBe(twoVoices[2].voice);

    const oneVoice = clusterSimilarOnsetVoices(hits, 0.55, 1);
    expect(new Set(oneVoice.map((h) => h.voice)).size).toBe(1);
  });

  it('simplifies 2 quarters + 4 eighths into minimal partials and extrapolated grid, and normalises 4:3 polyrhythm', () => {
    // [0, 1/4, 1/2, 5/8, 3/4, 7/8] in a 2.0s cycle
    const twoQFourE = [0, 0.25, 0.5, 0.625, 0.75, 0.875].map((p) => ({
      timestampSec: 1.0 + p * 2.0,
      voice: 'clave' as const,
      velocity: 0.9,
    }));

    const minimal = simplifyRhythmOnsets(twoQFourE, 2.0, 'minimal');
    expect(minimal.anchors.length).toBe(3); // 4x pulse + MeFi (5/8) + LaFi (7/8)
    expect(minimal.anchors[0].ratio).toEqual({ kind: 'rational', num: 4, den: 1 });
    expect(minimal.anchors[1].phaseOffset).toBeCloseTo(0.625, 3);
    expect(minimal.anchors[2].phaseOffset).toBeCloseTo(0.875, 3);

    const grid = simplifyRhythmOnsets(twoQFourE, 2.0, 'grid');
    expect(grid.anchors.length).toBe(2); // 1x fundamental + 8x extrapolated grid
    expect(grid.anchors[1].ratio).toEqual({ kind: 'rational', num: 8, den: 1 });

    // Single-voice 4:3 composite: [0, 1/4, 1/3, 1/2, 2/3, 3/4] in a 3.0s bar
    const fourThree = [0, 0.25, 1 / 3, 0.5, 2 / 3, 0.75].map((p) => ({
      timestampSec: 1.0 + p * 3.0,
      voice: 'kick' as const,
      velocity: 0.9,
    }));
    const poly = simplifyRhythmOnsets(fourThree, 3.0, 'polyrhythm');
    expect(poly.anchors.length).toBe(2);
    expect(poly.anchors[0].ratio).toEqual({ kind: 'rational', num: 1, den: 1 });
    expect(poly.anchors[1].ratio).toEqual({ kind: 'rational', num: 4, den: 3 });
    expect(poly.cyclePeriodSec).toBeCloseTo(1.0, 2); // normalised 3.0 / 3
  });
});
