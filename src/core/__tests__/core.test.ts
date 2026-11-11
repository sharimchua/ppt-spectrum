import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { freqToD, dToFreq, bpmToD, resolveDuPeriodAddress, freqToPitchRegister } from '../axis';
import { gcd, lcm, reduceRational, rationalise, primeFactors, primeLimit, ratioToValue } from '../rational';
import {
  calculateGhostFundamental,
  calculateCoincidenceCycle,
  calculatePlompLevelt,
  calculateSetharesCurve,
  calculateSupercycleTimeline,
  calculateRealignmentAnalysis,
  CANONICAL_INTERVAL_MARKERS,
} from '../alignment';
import { calculateFilterGain, evaluatePartialAdsr } from '../shape';
import { PRESET_SHAPES, createPianoPartials } from '../presets';
import { TPL_FREQUENCY_HZ } from '../ppt-constants';
import { loadSavedScene, saveScene, STORAGE_KEY_GRAPHICS_PROFILE, DEFAULT_SCENE, DEFAULT_COSMETICS } from '../config';

describe('Axis Mathematics', () => {
  it('round-trips frequency and DuPeriod d accurately', () => {
    const freqs = [1.0, 10.0, 25.8, 40.0, 100.0, 440.0, 1000.0, 15000.0];
    for (const f of freqs) {
      const d = freqToD(f);
      const recovered = dToFreq(d);
      expect(recovered).toBeCloseTo(f, 4);
    }
  });

  it('verifies TPL landmarks', () => {
    expect(freqToD(TPL_FREQUENCY_HZ)).toBeCloseTo(0.0, 6);
    expect(dToFreq(0.0)).toBeCloseTo(TPL_FREQUENCY_HZ, 6);
    // 120 BPM = 2 Hz => d ≈ +3.69
    expect(bpmToD(120)).toBeCloseTo(3.689, 2);
    // A4 = 440 Hz => d ≈ -4.09
    expect(freqToD(440)).toBeCloseTo(-4.092, 2);
  });

  it('resolves DuPeriod addresses correctly', () => {
    const addrTpl = resolveDuPeriodAddress(0.0);
    expect(addrTpl.syllable).toBe('Do');
    expect(addrTpl.formatted).toBe('Do');
    expect(addrTpl.band).toBe(0);

    // Symmetric integer octaves around the TPM anchor
    const addrDMinus1 = resolveDuPeriodAddress(-1.0);
    expect(addrDMinus1.syllable).toBe('Do');
    expect(addrDMinus1.formatted).toBe('Do-1');
    expect(addrDMinus1.band).toBe(-1);

    const addrDPlus1 = resolveDuPeriodAddress(1.0);
    expect(addrDPlus1.syllable).toBe('Do');
    expect(addrDPlus1.formatted).toBe('Do+1');
    expect(addrDPlus1.band).toBe(1);

    const addrDMinus2 = resolveDuPeriodAddress(-2.0);
    expect(addrDMinus2.formatted).toBe('Do-2');
    expect(addrDMinus2.band).toBe(-2);

    const addrDPlus2 = resolveDuPeriodAddress(2.0);
    expect(addrDPlus2.formatted).toBe('Do+2');
    expect(addrDPlus2.band).toBe(2);

    // 440 Hz is d ≈ -4.09 => Band -5, Ra
    const addrA440 = resolveDuPeriodAddress(freqToD(440));
    expect(addrA440.band).toBe(-5);
    expect(addrA440.syllable).toBe('Ra');
  });

  it('converts frequencies to pitch register and cent deviation', () => {
    // 440 Hz -> A4 ±0¢
    const a4 = freqToPitchRegister(440, 440);
    expect(a4.note).toBe('A');
    expect(a4.octave).toBe(4);
    expect(a4.cents).toBe(0);
    expect(a4.formatted).toBe('A4 ±0¢');

    // Middle C (261.63 Hz) -> C4 ±0¢
    const c4 = freqToPitchRegister(261.63, 440);
    expect(c4.note).toBe('C');
    expect(c4.octave).toBe(4);
    expect(Math.abs(c4.cents)).toBeLessThanOrEqual(1);

    // Microtonal pitch (445 Hz) -> A4 +20¢
    const micro = freqToPitchRegister(445, 440);
    expect(micro.note).toBe('A');
    expect(micro.octave).toBe(4);
    expect(micro.cents).toBeGreaterThan(15);
  });
});

describe('Rational Algebra & Prime Limits', () => {
  it('computes exact GCD and LCM', () => {
    expect(gcd(12, 18)).toBe(6);
    expect(lcm(4, 6)).toBe(12);
    expect(reduceRational(15, 20)).toEqual({ num: 3, den: 4 });
  });

  it('rationalises real values via continued fractions', () => {
    const r1 = rationalise(1.5);
    expect(r1).toEqual({ num: 3, den: 2 });
    const r2 = rationalise(1.25);
    expect(r2).toEqual({ num: 5, den: 4 });
  });

  it('computes prime factors and limits', () => {
    expect(primeFactors(12)).toEqual([2, 2, 3]);
    expect(primeLimit(12)).toBe(3);
    expect(primeFactors(35)).toEqual([5, 7]);
    expect(primeLimit(35)).toBe(7);
  });
});

describe('Alignment & Ghost Fundamental', () => {
  it('computes coincidence super-cycle and fundamental for a 3:2 hemiola / fifth anchored at scene root', () => {
    const hemiola = PRESET_SHAPES.find((s) => s.id === 'hemiola-3-2')!;
    const f0 = 100;
    const ghost = calculateGhostFundamental(hemiola, f0);
    expect(ghost.ghostFreqHz).toBe(100);
    expect(ghost.cycleDurationSec).toBe(0.01);

    const coincidence = calculateCoincidenceCycle(hemiola, f0);
    // Lower frequency is at 1/1, upper is 3/2 => D = lcm(1, 2) = 2 turns
    expect(coincidence.rootTurnsToAlign).toBe(2);
    expect(coincidence.isCompactSuperCycle).toBe(true);
    expect(coincidence.superCycleDurationSec).toBeCloseTo(0.02, 4);

    const poly43 = PRESET_SHAPES.find((s) => s.id === 'polyrhythm-4-3')!;
    const coinc43 = calculateCoincidenceCycle(poly43, f0);
    expect(coinc43.rootTurnsToAlign).toBe(3);

    const poly54 = PRESET_SHAPES.find((s) => s.id === 'polyrhythm-5-4')!;
    const coinc54 = calculateCoincidenceCycle(poly54, f0);
    expect(coinc54.rootTurnsToAlign).toBe(4);
  });

  it('evaluates Plomp-Levelt roughness', () => {
    // Unison has zero roughness
    expect(calculatePlompLevelt(440, 1.0, 440, 1.0)).toBe(0);
    // Dissonance peaking near critical bandwidth fraction
    const roughnessCents50 = calculatePlompLevelt(440, 1.0, 452, 1.0);
    expect(roughnessCents50).toBeGreaterThan(0);
  });

  it('calculates Sethares dissonance landscape with consonance dips for harmonic timbres', () => {
    const activePartials = [
      { freqHz: 220, filteredAmp: 1.0, ratioValue: 1.0 },
      { freqHz: 330, filteredAmp: 0.8, ratioValue: 1.5 },
    ];
    const sethares = calculateSetharesCurve(activePartials, 220, 64);
    expect(sethares.points.length).toBe(65);
    expect(sethares.maxRoughness).toBeGreaterThan(0);
    // Unison probe (1.0) should have lowest or near-zero roughness
    const ptUnison = sethares.points[0];
    expect(ptUnison.ratio).toBe(1.0);
    expect(CANONICAL_INTERVAL_MARKERS.length).toBe(7);
  });

  it('faithfully calculates dissonance landscape for inharmonic partials without warping across sweeps', () => {
    // Inharmonic bell partials (1.0, 2.76, 5.40)
    const inharmonicPartials = [
      { freqHz: 100, filteredAmp: 1.0, ratioValue: 1.0 },
      { freqHz: 276, filteredAmp: 0.7, ratioValue: 2.76 },
      { freqHz: 540, filteredAmp: 0.5, ratioValue: 5.40 },
    ];
    const curveRhythm = calculateSetharesCurve(inharmonicPartials, 2);
    const curvePitch = calculateSetharesCurve(inharmonicPartials, 440);
    // Scale-invariant landscape: roughness curves evaluate identically regardless of scene f0
    expect(curveRhythm.maxRoughness).toBeCloseTo(curvePitch.maxRoughness, 4);
    expect(curveRhythm.points[10].roughness).toBeCloseTo(curvePitch.points[10].roughness, 4);
  });

  it('calculates Supercycle timeline events across polyrhythmic root turns', () => {
    const hemiola = PRESET_SHAPES.find((s) => s.id === 'hemiola-3-2')!;
    const timelines = calculateSupercycleTimeline(hemiola, 2);
    expect(timelines).toHaveLength(2);
    // Root partial (1/1) completes 2 events in 2 turns
    expect(timelines[0].events).toHaveLength(2);
    // Upper partial (3/2) completes 3 events in 2 turns
    expect(timelines[1].events).toHaveLength(3);
    // Both voices coincide at Sam (0.0)
    expect(timelines[0].events[0]).toBe(0);
    expect(timelines[1].events[0]).toBe(0);
  });

  it('unifies chords and inharmonic timbres under collective periodic realignment', () => {
    // 1. Pure tone (1/1)
    const pureTone = PRESET_SHAPES.find((s) => s.id === 'pure-tone')!;
    const analysisPure = calculateRealignmentAnalysis(pureTone);
    expect(analysisPure.coherenceScore).toBeGreaterThanOrEqual(0.95);
    expect(analysisPure.isAperiodic).toBe(false);
    expect(analysisPure.coincidenceStride).toBe(1.0);

    // 2. Harmonic Hemiola 3:2
    const hemiola = PRESET_SHAPES.find((s) => s.id === 'hemiola-3-2')!;
    const analysisHemiola = calculateRealignmentAnalysis(hemiola);
    expect(analysisHemiola.coherenceScore).toBeGreaterThan(0.7);
    expect(analysisHemiola.isAperiodic).toBe(false);
    expect(analysisHemiola.coincidenceStride).toBe(2.0);

    // 3. Multi-voice chord (Major Triad with P1 through P5 overtones)
    const majorTriad = PRESET_SHAPES.find((s) => s.id === 'major-triad-4-5-6')!;
    const analysisTriad = calculateRealignmentAnalysis(majorTriad);
    expect(analysisTriad.coherenceScore).toBeGreaterThan(0.60);
    expect(analysisTriad.activeVoicesCount).toBe(3);
    // Cadence stride matches exact supercycle (lcm of 1, 4, 2 = 4)
    expect(analysisTriad.coincidenceStride).toBe(4.0);
    expect(majorTriad.anchors![0].partials).toHaveLength(5);

    // 4. Inharmonic timbre (Tibetan Singing Bowl)
    const bowl = PRESET_SHAPES.find((s) => s.id === 'tibetan-singing-bowl');
    if (bowl) {
      const analysisBowl = calculateRealignmentAnalysis(bowl);
      // Inharmonic spectrum lacks periodic phase coincidence
      expect(analysisBowl.isAperiodic).toBe(true);
      expect(analysisBowl.coincidenceStride).toBe(Infinity);
      expect(analysisBowl.coherenceScore).toBeLessThan(0.4);
    }
  });
});

describe('BandFilter', () => {
  it('applies raised-cosine window smoothly', () => {
    const filter = {
      enabled: true,
      centreD: 0.0,
      widthD: 2.0,
      softnessD: 1.0,
      mode: 'band-pass' as const,
    };
    // Centre has gain 1.0
    expect(calculateFilterGain(0.0, filter)).toBe(1.0);
    // Edge of flat top has gain 1.0
    expect(calculateFilterGain(1.0, filter)).toBe(1.0);
    // Halfway through softness (d = 1.5) has gain 0.5
    expect(calculateFilterGain(1.5, filter)).toBeCloseTo(0.5, 3);
    // Outside filter has gain 0.0
    expect(calculateFilterGain(2.2, filter)).toBe(0.0);
  });

  it('supports relative fundamental tracking mode', () => {
    const filter = {
      enabled: true,
      centreD: 0.0, // exactly at fundamental
      widthD: 2.0,
      softnessD: 1.0,
      mode: 'band-pass' as const,
      trackingMode: 'relative' as const,
    };

    // When fundamental is placed at d = 3.5:
    // Effective center is 3.5 + 0.0 = 3.5.
    // At d = 3.5, gain is 1.0.
    expect(calculateFilterGain(3.5, filter, 3.5)).toBe(1.0);
    // At d = 0.0 (far from fundamental), gain is 0.0.
    expect(calculateFilterGain(0.0, filter, 3.5)).toBe(0.0);

    // If fundamental moves to d = -2.0:
    // Effective center is -2.0.
    expect(calculateFilterGain(-2.0, filter, -2.0)).toBe(1.0);
    expect(calculateFilterGain(3.5, filter, -2.0)).toBe(0.0);
  });
});

describe('Presets & Piano Inharmonicity', () => {
  it('organises presets into rhythmic, harmonic, and timbral categories', () => {
    const rhythmPresets = PRESET_SHAPES.filter((s) => s.category === 'rhythm');
    const harmonyPresets = PRESET_SHAPES.filter((s) => s.category === 'harmony');
    const timbrePresets = PRESET_SHAPES.filter((s) => s.category === 'timbre');

    expect(rhythmPresets.length).toBeGreaterThanOrEqual(5);
    expect(harmonyPresets.length).toBeGreaterThanOrEqual(4);
    expect(timbrePresets.length).toBeGreaterThanOrEqual(5);

    // 4-on-the-floor exists in rhythmic
    expect(rhythmPresets.some((s) => s.id === 'four-on-the-floor')).toBe(true);
    // Major triad and Dominant 7th exist in harmonies
    expect(harmonyPresets.some((s) => s.id === 'major-triad-4-5-6')).toBe(true);
    expect(harmonyPresets.some((s) => s.id === 'dominant-7th-4-5-6-7')).toBe(true);
    // Piano exists in timbral
    expect(timbrePresets.some((s) => s.id === 'piano')).toBe(true);

    // Harmony presets have Root on fundamental frequency (ratio 1/1), equal anchor gains (1.0), and do NOT create a displaced Ghost Sam
    for (const h of harmonyPresets) {
      const rootPartial = h.partials[0];
      const rVal = ratioToValue(rootPartial.ratio);
      expect(rVal).toBeCloseTo(1.0, 5);
      expect(h.anchors).toBeDefined();
      expect(h.anchors!.every((a) => a.gain === 1.0)).toBe(true);
      const ghost = calculateGhostFundamental(h, 220.0);
      expect(ghost.ghostFreqHz).toBeCloseTo(220.0, 5);
      expect(ghost.ghostD).toBeCloseTo(freqToD(220.0), 5);
    }

    // Timbre presets: elementary waveforms (sine, triangle, square, saw) precede acoustic and inharmonic instruments
    const timbreIds = timbrePresets.map((s) => s.id);
    expect(timbreIds[0]).toBe('pure-tone');
    expect(timbreIds[1]).toBe('triangle-like');
    expect(timbreIds[2]).toBe('square-like');
    expect(timbreIds[3]).toBe('saw-like');
    expect(timbreIds.indexOf('piano')).toBeGreaterThan(timbreIds.indexOf('saw-like'));

    // Rhythmic presets: simple binary metre precedes polyrhythms and full grooves
    const rhythmIds = rhythmPresets.map((s) => s.id);
    expect(rhythmIds[0]).toBe('duple-1-2');
    expect(rhythmIds[1]).toBe('duple-1-4');
    expect(rhythmIds[rhythmIds.length - 1]).toBe('four-on-the-floor');

    // Tresillo syncopation has distinct (ratio, phase) DuMetric anchor combinations (Do, DoLa, La, 8th grid)
    const tresillo = rhythmPresets.find((s) => s.id === 'tresillo-3-3-2');
    expect(tresillo).toBeDefined();
    expect(tresillo!.anchors?.length).toBe(4);
    const tresilloKeys = tresillo!.partials.map((p) => `${ratioToValue(p.ratio)}@${p.phase.toFixed(4)}`);
    const uniqueKeys = new Set(tresilloKeys);
    expect(uniqueKeys.size).toBe(tresilloKeys.length);
  });
  it('includes duple presets (1:2 and 1:4)', () => {
    const duple12 = PRESET_SHAPES.find((s) => s.id === 'duple-1-2');
    const duple14 = PRESET_SHAPES.find((s) => s.id === 'duple-1-4');
    expect(duple12).toBeDefined();
    expect(duple14).toBeDefined();
    expect(duple12?.partials.length).toBe(2);
    expect(duple14?.partials.length).toBe(3);
  });

  it('generates acoustic piano inharmonic partials with stretch coefficient B', () => {
    const piano = PRESET_SHAPES.find((s) => s.id === 'piano');
    expect(piano).toBeDefined();
    expect(piano?.partials.length).toBeGreaterThanOrEqual(10);

    const partials = createPianoPartials(8, 0.0004);
    // 1st partial is fundamental ratio 1 * sqrt(1 + 0.0004) ≈ 1.0002
    expect(partials[0].ratio.kind).toBe('real');
    if (partials[0].ratio.kind === 'real') {
      expect(partials[0].ratio.value).toBeCloseTo(1.0, 3);
    }
    // 8th partial has noticeable stretch > 8
    if (partials[7].ratio.kind === 'real') {
      expect(partials[7].ratio.value).toBeGreaterThan(8.0);
    }
  });

  it('calculates ghost fundamental of inharmonic piano string close to f0 rather than 7 octaves below', () => {
    const piano = PRESET_SHAPES.find((s) => s.id === 'piano')!;
    const f0 = 100.0;
    const ghost = calculateGhostFundamental(piano, f0);
    // Ghost fundamental must match f0 (100 Hz), NOT drop to f0 / 100 (1 Hz)
    expect(ghost.ghostFreqHz).toBeCloseTo(f0, 1);
    expect(ghost.ghostD).toBeCloseTo(freqToD(f0), 2);
  });

  it('computes Super-Cycle coincidence turns (D = lcm) for rational chords and marks inharmonic shapes aperiodic', () => {
    const saw = PRESET_SHAPES.find((s) => s.id === 'saw-like')!;
    const majTriad = PRESET_SHAPES.find((s) => s.id === 'major-triad-4-5-6')!;
    const sus4 = PRESET_SHAPES.find((s) => s.id === 'sus4-6-8-9')!;
    const maj7 = PRESET_SHAPES.find((s) => s.id === 'major-7th-8-10-12-15')!;
    const minTriad = PRESET_SHAPES.find((s) => s.id === 'minor-triad-10-12-15')!;
    const bell = PRESET_SHAPES.find((s) => s.id === 'bell')!;

    expect(calculateCoincidenceCycle(saw, 100).rootTurnsToAlign).toBe(1);
    expect(calculateCoincidenceCycle(majTriad, 100).rootTurnsToAlign).toBe(4);
    expect(calculateCoincidenceCycle(majTriad, 100).isCompactSuperCycle).toBe(true);
    expect(calculateCoincidenceCycle(sus4, 100).rootTurnsToAlign).toBe(6);
    expect(calculateCoincidenceCycle(maj7, 100).rootTurnsToAlign).toBe(8);
    expect(calculateCoincidenceCycle(minTriad, 100).rootTurnsToAlign).toBe(10);
    expect(calculateCoincidenceCycle(minTriad, 100).isCompactSuperCycle).toBe(true);

    const bellCycle = calculateCoincidenceCycle(bell, 100);
    expect(bellCycle.isAperiodic).toBe(true);
    expect(bellCycle.rootTurnsToAlign).toBe(Infinity);
    expect(bellCycle.isCompactSuperCycle).toBe(false);
  });
});

describe('Graphics Profile Persistence & Restoration', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, val: string) => {
          mockStorage[key] = val;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          mockStorage = {};
        },
      },
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('persists and restores performance profile across saves', () => {
    const scene = {
      ...DEFAULT_SCENE,
      cosmetics: {
        ...DEFAULT_SCENE.cosmetics,
        performanceProfile: 'max' as const,
      },
    };

    saveScene(scene);
    expect(mockStorage[STORAGE_KEY_GRAPHICS_PROFILE]).toBe('max');

    const restored = loadSavedScene();
    expect(restored.cosmetics.performanceProfile).toBe('max');
  });

  it('preserves none profile and prioritises dedicated profile storage', () => {
    const scene = {
      ...DEFAULT_SCENE,
      cosmetics: {
        ...DEFAULT_SCENE.cosmetics,
        performanceProfile: 'none' as const,
      },
    };

    saveScene(scene);
    expect(mockStorage[STORAGE_KEY_GRAPHICS_PROFILE]).toBe('none');

    const restored = loadSavedScene();
    expect(restored.cosmetics.performanceProfile).toBe('none');
  });

  it('initialises default cosmetics with tuned optical grain, bloom, and anamorphic flare', () => {
    expect(DEFAULT_COSMETICS.filmGrainIntensity).toBe(0.20);
    expect(DEFAULT_COSMETICS.glowBloom).toBe(0.20);
    expect(DEFAULT_COSMETICS.lensFlareIntensity).toBe(0.15);
    expect(DEFAULT_COSMETICS.lensFlareStyle).toBe('anamorphic');
  });

  it('evaluates dynamic partial ADSR envelopes with harmonic damping', () => {
    const adsr = {
      attack: 0.01,
      decay: 1.0,
      sustain: 0.2,
      release: 0.3,
      damping: 0.5,
    };

    // At t = 0, envelope is 0
    expect(evaluatePartialAdsr(adsr, 1.0, 0.0)).toBeCloseTo(0.0, 4);

    // At t = attack (0.01s), envelope reaches peak (1.0)
    expect(evaluatePartialAdsr(adsr, 1.0, 0.01)).toBeCloseTo(1.0, 3);
    expect(evaluatePartialAdsr(adsr, 4.0, 0.01)).toBeCloseTo(1.0, 3);

    // After attack, harmonic damping causes higher partial (r=4) to decay faster than fundamental (r=1)
    const fundAt05s = evaluatePartialAdsr(adsr, 1.0, 0.5);
    const harmonicAt05s = evaluatePartialAdsr(adsr, 4.0, 0.5);
    expect(fundAt05s).toBeGreaterThan(harmonicAt05s);

    // Undamped envelope with sustain 1.0 remains at 1.0
    const organAdsr = { attack: 0.01, decay: 0.5, sustain: 1.0, release: 0.1, damping: 0.0 };
    expect(evaluatePartialAdsr(organAdsr, 1.0, 2.0)).toBeCloseTo(1.0, 3);
  });
});
