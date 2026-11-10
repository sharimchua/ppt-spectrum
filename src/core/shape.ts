import { Shape, Placement, BandFilter, Filter, ADSREnvelope, VoiceAnchor, PartialComponent, Ratio } from './types';
import { ratioToValue, primeFactors, reduceRational } from './rational';
import { dToFreq } from './axis';
import { evaluateDutyGain } from './filter-eval';
import { legacyBandFilterGain } from './filter-migration';

export interface DuMetricOffsetItem {
  token: string;
  fraction: string;
  phase: number;
  description: string;
  glyph: string;
}

/**
 * Canonical PPT DuMetric Solfège Phase Offsets (aligned with ppt-engraver).
 * Subdivides the single period [0, 1) using the 12 Chromatic Solfège degrees
 * plus recursive compound subdivisions (e.g., DoLa = 3/8, MeFi = 5/8, LaFi = 7/8).
 */
export const DU_METRIC_OFFSETS: DuMetricOffsetItem[] = [
  { token: 'Do', fraction: '0', phase: 0.0, description: 'Downbeat / Root Anchor (12 o’clock)', glyph: '○' },
  { token: 'Ra', fraction: '1/12', phase: 1 / 12, description: 'Phrygian 12th-beat offset', glyph: '◇' },
  { token: 'DoFi', fraction: '1/8', phase: 0.125, description: 'First 16th/8th subdivision (1/8)', glyph: '○×' },
  { token: 'Re', fraction: '1/6', phase: 1 / 6, description: 'Sextuplet second pulse (2/12)', glyph: '□' },
  { token: 'Me', fraction: '1/4', phase: 0.25, description: 'Second quarter beat (3 o’clock)', glyph: '▽' },
  { token: 'Mi', fraction: '1/3', phase: 1 / 3, description: 'Second triplet beat (4/12)', glyph: '△' },
  { token: 'DoLa', fraction: '3/8', phase: 0.375, description: 'Tresillo 2nd accent (3/8 midpoint)', glyph: '○△' },
  { token: 'Fa', fraction: '5/12', phase: 5 / 12, description: 'Five-twelfths pre-antipode', glyph: '⊂' },
  { token: 'Fi', fraction: '1/2', phase: 0.5, description: 'The Offbeat / Antipode (6 o’clock)', glyph: '×' },
  { token: 'So', fraction: '7/12', phase: 7 / 12, description: 'Seven-twelfths post-antipode', glyph: '⊃' },
  { token: 'MeFi', fraction: '5/8', phase: 0.625, description: 'Recursive Me + Fi midpoint (5/8)', glyph: '▽×' },
  { token: 'Le', fraction: '2/3', phase: 2 / 3, description: 'Third triplet beat (8/12)', glyph: '▽' },
  { token: 'La', fraction: '3/4', phase: 0.75, description: 'Fourth quarter / Tresillo 3rd accent (6/8)', glyph: '△' },
  { token: 'Te', fraction: '5/6', phase: 5 / 6, description: 'Sixth sextuplet pickup (10/12)', glyph: '◇' },
  { token: 'LaFi', fraction: '7/8', phase: 0.875, description: 'Recursive La + Fi 8th-note pickup (7/8)', glyph: '△×' },
  { token: 'Ti', fraction: '11/12', phase: 11 / 12, description: 'Leading-tone 12th pickup', glyph: '□' },
];

/**
 * Resolves any phase in [0, 1) to the nearest PPT DuMetric Solfège offset descriptor.
 */
export function resolveDuMetricOffsetToken(phase: number): DuMetricOffsetItem {
  const norm = ((phase % 1) + 1) % 1;
  let best = DU_METRIC_OFFSETS[0];
  let minDiff = 999;
  for (const item of DU_METRIC_OFFSETS) {
    const diff = Math.min(Math.abs(norm - item.phase), Math.abs(norm - 1 - item.phase));
    if (diff < minDiff) {
      minDiff = diff;
      best = item;
    }
  }
  return best;
}

/**
 * Multiplies two Ratio values, preserving exact reduced rational representation when both are rational.
 */
export function multiplyRatios(a: Ratio, b: Ratio): Ratio {
  if (a.kind === 'rational' && b.kind === 'rational') {
    const reduced = reduceRational(a.num * b.num, a.den * b.den);
    return { kind: 'rational', num: reduced.num, den: reduced.den };
  }
  return { kind: 'real', value: ratioToValue(a) * ratioToValue(b) };
}

export type ProvenancedPartial = PartialComponent & { anchorRatio: Ratio };

/**
 * Flattens voice anchors without merging, preserving anchor ratio provenance.
 * Required for anchor-referenced filter conditions.
 */
export function flattenAnchorsWithProvenance(anchors: VoiceAnchor[]): ProvenancedPartial[] {
  const list: ProvenancedPartial[] = [];
  for (const anchor of anchors) {
    const anchorGain = anchor.mute ? 0 : anchor.gain;
    for (const p of anchor.partials) {
      const combinedRatio = multiplyRatios(anchor.ratio, p.ratio);
      const combinedPhase = (((anchor.phaseOffset || 0) + (p.phase || 0)) % 1 + 1) % 1;
      const combinedAmp = Math.max(0, Math.min(1, anchorGain * p.amp));
      const offsetInfo = anchor.phaseOffset > 0.001
        ? ` @${anchor.offsetToken || resolveDuMetricOffsetToken(anchor.phaseOffset).token}`
        : '';

      list.push({
        ...p,
        id: `${anchor.id}_${p.id}`,
        ratio: combinedRatio,
        amp: combinedAmp,
        previousAmp: p.previousAmp !== undefined ? anchor.gain * p.previousAmp : combinedAmp,
        phase: combinedPhase,
        voice: p.voice || anchor.voice || 'woodblock',
        label: p.label || `${anchor.name}${offsetInfo}`,
        anchorRatio: anchor.ratio,
      });
    }
  }
  return list;
}

/**
 * Merges coincident harmonic partials across anchors and combines their amplitudes.
 * Optionally applies per-partial filter attenuation gains before merging.
 */
export function mergeCoincidentPartials(
  partials: ProvenancedPartial[],
  gains?: number[]
): (PartialComponent & { filteredAmpMultiplier?: number; anchorRatio?: Ratio })[] {
  const raw: (PartialComponent & { filteredAmpMultiplier?: number; anchorRatio?: Ratio })[] = [];

  for (let i = 0; i < partials.length; i++) {
    const p = partials[i];
    const g = gains ? gains[i] ?? 1.0 : 1.0;
    const effectiveAmp = p.amp;
    const effectiveFiltered = p.amp * g;

    const existing = raw.find(
      (item) =>
        Math.abs(ratioToValue(item.ratio) - ratioToValue(p.ratio)) < 0.0005 &&
        Math.abs(item.phase - p.phase) < 0.001
    );

    if (existing) {
      const combinedRaw = Math.max(0, Math.min(1, Math.hypot(existing.amp, effectiveAmp)));
      const existingFiltered = existing.amp * (existing.filteredAmpMultiplier ?? 1.0);
      const combinedFiltered = Math.max(0, Math.min(1, Math.hypot(existingFiltered, effectiveFiltered)));
      existing.amp = combinedRaw;
      existing.previousAmp = existing.amp;
      existing.filteredAmpMultiplier = combinedRaw > 0 ? combinedFiltered / combinedRaw : 1.0;
    } else {
      raw.push({
        ...p,
        amp: effectiveAmp,
        filteredAmpMultiplier: g,
      });
    }
  }

  return raw;
}

/**
 * Returns an unmerged list of all partials for a shape with anchor provenance.
 */
export function getFilterablePartials(shape: Shape): ProvenancedPartial[] {
  if (shape.anchors && shape.anchors.length > 0) {
    return flattenAnchorsWithProvenance(shape.anchors);
  }
  return shape.partials.map((p) => ({
    ...p,
    anchorRatio: { kind: 'rational' as const, num: 1, den: 1 },
  }));
}

/**
 * Flattens a hierarchy of VoiceAnchors into a flat array of PartialComponents
 * so all 60 FPS lenses and AudioWorklet synthesis evaluate them directly.
 * Merges partials that land on the exact same ratio and phase (e.g. shared chord harmonics)
 * and orders multi-partial overtone trees in ascending ratio order so P1 is always the Root (1/1).
 */
export function flattenAnchorsToPartials(anchors: VoiceAnchor[]): PartialComponent[] {
  const provenanced = flattenAnchorsWithProvenance(anchors);
  const raw = mergeCoincidentPartials(provenanced);
  const hasOvertoneTrees = anchors.some((a) => a.partials.length > 1);

  if (hasOvertoneTrees) {
    raw.sort((a, b) => {
      const rDiff = ratioToValue(a.ratio) - ratioToValue(b.ratio);
      if (Math.abs(rDiff) > 0.0005) return rDiff;
      return a.phase - b.phase;
    });
  }

  return raw;
}

/**
 * Returns the hierarchical VoiceAnchors for a shape.
 * If the shape only has legacy flat partials, wraps them in a single Root (Do 1/1) VoiceAnchor.
 */
export function getShapeAnchors(shape: Shape): VoiceAnchor[] {
  if (shape.anchors && shape.anchors.length > 0) {
    return shape.anchors;
  }
  return [
    {
      id: `${shape.id}-root-anchor`,
      name: 'Root Anchor (Do)',
      ratio: { kind: 'rational', num: 1, den: 1 },
      phaseOffset: 0,
      offsetToken: 'Do',
      gain: 1.0,
      voice: shape.partials[0]?.voice || 'kick',
      mute: false,
      partials: shape.partials.map((p) => ({ ...p })),
    },
  ];
}

/**
 * Returns the effective flat partials of a Shape (synchronised from anchors if present).
 */
export function getEffectivePartials(shape: Shape): PartialComponent[] {
  if (shape.anchors && shape.anchors.length > 0) {
    return flattenAnchorsToPartials(shape.anchors);
  }
  return shape.partials;
}

/**
 * Evaluates the dynamic amplitude multiplier (0.0 to 1.0) for a harmonic partial at a given note age.
 * Takes into account the physical harmonic damping factor which causes higher overtones
 * to dissipate exponentially faster than the fundamental.
 */
export function evaluatePartialAdsr(
  adsr: ADSREnvelope | undefined,
  ratioVal: number,
  noteAge: number
): number {
  if (!adsr) return 1.0;
  const att = Math.max(0.001, adsr.attack);
  const dec = Math.max(0.01, adsr.decay);
  const sus = Math.max(0.0, Math.min(1.0, adsr.sustain));
  const damp = adsr.damping !== undefined ? Math.max(0.0, adsr.damping) : 0.0;

  if (noteAge < att) {
    const aRatio = Math.max(0, noteAge) / att;
    return aRatio * aRatio * (3.0 - 2.0 * aRatio); // smooth Hermite attack ramp
  } else {
    const decayElapsed = noteAge - att;
    // Higher partials decay faster via harmonic damping: tau_k = dec / (1 + damp * (ratio - 1))
    const tau = dec / (1.0 + damp * Math.max(0.0, ratioVal - 1.0));
    const expDecay = Math.exp(-decayElapsed / Math.max(0.005, tau));
    return sus + (1.0 - sus) * expDecay;
  }
}

export interface EvaluatedPartial {
  id: string;
  originalIndex: number;
  d: number;
  freqHz: number;
  ratioValue: number;
  ratio?: Ratio;
  anchorRatio?: Ratio;
  amp: number;
  filteredAmp: number;
  phase: number;
  primeFamily: '2' | '3' | '5' | '7' | '11' | 'higher';
  voice?: string;
  label?: string;
  derived?: boolean;
}

export function classifyPrimeFamily(ratioVal: number): '2' | '3' | '5' | '7' | '11' | 'higher' {
  // If close to an integer multiple, inspect prime factors
  const nearestInt = Math.round(ratioVal);
  if (Math.abs(ratioVal - nearestInt) < 0.05 && nearestInt > 1) {
    const factors = primeFactors(nearestInt);
    const maxP = Math.max(...factors);
    if (maxP === 2) return '2';
    if (maxP === 3) return '3';
    if (maxP === 5) return '5';
    if (maxP === 7) return '7';
    if (maxP === 11) return '11';
    return 'higher';
  }
  return 'higher';
}

/**
 * Calculates the raised-cosine attenuation factor g(d) for a Filter or BandFilter.
 * Supports fixed continuum formant mode, relative fundamental tracking, and compound conditions.
 * Returns value in [0, 1].
 */
export function calculateFilterGain(
  d: number,
  filter: BandFilter | Filter,
  fundamentalD?: number
): number {
  if (!filter.enabled) return 1.0;
  if ('conditions' in filter && filter.conditions.length > 0) {
    return evaluateDutyGain(filter, {
      partialD: d,
      ratio: { kind: 'real', value: 1.0 },
      phase: 0,
      placementD: fundamentalD ?? 0,
      sceneD: fundamentalD ?? 0,
    });
  }

  const legacy: BandFilter = {
    enabled: filter.enabled,
    centreD: filter.centreD ?? 0.0,
    widthD: filter.widthD ?? 4.0,
    softnessD: filter.softnessD ?? 1.0,
    mode: filter.mode ?? 'band-pass',
    trackingMode: filter.trackingMode ?? 'fixed',
  };
  return legacyBandFilterGain(d, legacy, fundamentalD);
}

/**
 * Evaluates the absolute coordinates, frequencies, and filtered amplitudes of all partials in a placed shape.
 * Evaluates static and duty filter gains prior to merging coincident anchor partials.
 */
export function evaluatePlacedShape(
  shape: Shape,
  placement: Placement,
  filter?: Filter | BandFilter,
  sceneD?: number,
  tplHz?: number
): EvaluatedPartial[] {
  let effectiveSceneD = placement.d;
  let effectiveTplHz: number | undefined = tplHz;
  if (typeof sceneD === 'number') {
    if (sceneD >= 10 && tplHz === undefined) {
      // Legacy argument invocation where 4th argument was tplHz
      effectiveTplHz = sceneD;
      effectiveSceneD = placement.d;
    } else {
      effectiveSceneD = sceneD;
    }
  }

  const unmerged = getFilterablePartials(shape);
  const gains = unmerged.map((p) => {
    if (!filter || !filter.enabled) return 1.0;
    const ratioVal = ratioToValue(p.ratio);
    const partialD = placement.d - Math.log2(ratioVal);

    if ('conditions' in filter) {
      return evaluateDutyGain(filter, {
        partialD,
        ratio: p.ratio,
        phase: p.phase,
        anchorRatio: p.anchorRatio,
        placementD: placement.d,
        sceneD: effectiveSceneD,
        tplHz: effectiveTplHz,
      });
    }

    return calculateFilterGain(partialD, filter, placement.d);
  });

  const merged = mergeCoincidentPartials(unmerged, gains);

  return merged.map((p, idx) => {
    const ratioVal = ratioToValue(p.ratio);
    const partialD = placement.d - Math.log2(ratioVal);
    const freqHz = dToFreq(partialD, effectiveTplHz);
    const effectiveAmp = p.amp * placement.gain * (placement.mute ? 0 : 1);
    const filterGain = p.filteredAmpMultiplier ?? 1.0;

    return {
      id: p.id,
      originalIndex: idx,
      d: partialD,
      freqHz,
      ratioValue: ratioVal,
      ratio: p.ratio,
      anchorRatio: p.anchorRatio,
      amp: effectiveAmp,
      filteredAmp: effectiveAmp * filterGain,
      phase: p.phase,
      primeFamily: classifyPrimeFamily(ratioVal),
      voice: p.voice,
      label: p.label,
      derived: p.derived,
    };
  });
}

export interface PrimeProfile {
  familyWeights: Record<'2' | '3' | '5' | '7' | '11' | 'higher', number>;
  totalWeight: number;
}

/**
 * Calculates the amplitude-weighted Prime Spectral Profile of a shape.
 */
export function calculatePrimeProfile(shape: Shape): PrimeProfile {
  const familyWeights = {
    '2': 0,
    '3': 0,
    '5': 0,
    '7': 0,
    '11': 0,
    'higher': 0,
  };
  let totalWeight = 0;

  for (const p of getEffectivePartials(shape)) {
    const rVal = ratioToValue(p.ratio);
    const fam = classifyPrimeFamily(rVal);
    familyWeights[fam] += p.amp;
    totalWeight += p.amp;
  }

  return { familyWeights, totalWeight };
}
