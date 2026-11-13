/**
 * Pure evaluation maths for generic filters.
 * Computes range matches, cycle slot matches, fuzzy logic combinations,
 * duty-weighted static gains, and worklet compilation contracts.
 */

import {
  Filter,
  RangeEndpoint,
  RangeSpan,
  RangeCondition,
  CycleCondition,
  FilterReference,
} from './filter-types';
import { Ratio } from './types';
import { ratioToValue } from './rational';
import { TPL_FREQUENCY_HZ } from './ppt-constants';

export interface PartialContext {
  partialD: number;
  ratio?: Ratio;
  phase?: number;
  anchorRatio?: Ratio;
  placementD?: number;
  sceneD: number;
  tplHz?: number;
  ratioToScene?: number;
}

/**
 * Resolves a RangeEndpoint into a log2 pitch-height coordinate x (in octaves).
 * Higher pitch / frequency yields a larger, more positive x.
 */
export function resolveEndpoint(endpoint: RangeEndpoint, tplHz: number = TPL_FREQUENCY_HZ): number {
  switch (endpoint.unit) {
    case 'd':
      // DuPeriod coordinate: higher d is lower frequency, so x = -d
      return -endpoint.value;
    case 'hz':
      return Math.log2(Math.max(1e-6, endpoint.value) / tplHz);
    case 'bpm': {
      const freqHz = Math.max(1e-6, endpoint.value) / 60.0;
      return Math.log2(freqHz / tplHz);
    }
    case 'ratio': {
      const rVal = Math.max(1e-6, ratioToValue(endpoint.ratio));
      return Math.log2(rVal);
    }
    case 'cents':
      return endpoint.value / 1200.0;
    case 'edo': {
      const periodRatio = endpoint.period ? Math.max(1e-6, ratioToValue(endpoint.period)) : 2.0;
      return (endpoint.steps / Math.max(1, endpoint.divisions)) * Math.log2(periodRatio);
    }
    default:
      return 0.0;
  }
}

/**
 * Resolves the relative pitch-height coordinate x for a partial given a reference anchor.
 */
export function rangeCoordinate(
  partialD: number,
  reference: FilterReference,
  sceneD: number,
  anchorD: number
): number {
  switch (reference) {
    case 'absolute':
      return -partialD;
    case 'scene':
      return sceneD - partialD;
    case 'anchor':
      return anchorD - partialD;
    default:
      return -partialD;
  }
}

/**
 * Evaluates the match of a coordinate x against a single RangeSpan with raised-cosine softness.
 * Returns a match factor in [0, 1].
 */
export function evaluateSpanMatch(
  x: number,
  span: RangeSpan,
  softnessInOctaves: number,
  reductionPeriod: Ratio | null,
  tplHz: number = TPL_FREQUENCY_HZ
): number {
  const s = Math.max(0.0005, softnessInOctaves);

  if (reductionPeriod) {
    const periodVal = Math.max(1.0001, ratioToValue(reductionPeriod));
    const P = Math.log2(periodVal);

    const loX = span.lo ? resolveEndpoint(span.lo, tplHz) : 0;
    const hiX = span.hi ? resolveEndpoint(span.hi, tplHz) : P;

    // Full period span
    if (Math.abs(hiX - loX) >= P - 1e-6) {
      return 1.0;
    }

    // Normalise bounds to [0, P)
    const loNorm = ((loX % P) + P) % P;
    const hiNorm = ((hiX % P) + P) % P;
    const xNorm = ((x % P) + P) % P;

    if (loNorm <= hiNorm) {
      // Non-wrapping interval [loNorm, hiNorm]
      if (xNorm >= loNorm && xNorm <= hiNorm) return 1.0;
      const distDirect = xNorm < loNorm ? loNorm - xNorm : xNorm - hiNorm;
      // Circular distance across 0/P boundary
      const distWrap = xNorm < loNorm ? xNorm + (P - hiNorm) : (P - xNorm) + loNorm;
      const dist = Math.min(distDirect, distWrap);
      if (dist >= s) return 0.0;
      return 0.5 * (1.0 + Math.cos((Math.PI * dist) / s));
    } else {
      // Wrapping interval [loNorm, P) U [0, hiNorm]
      if (xNorm >= loNorm || xNorm <= hiNorm) return 1.0;
      const dist = Math.min(xNorm - hiNorm, loNorm - xNorm);
      if (dist >= s) return 0.0;
      return 0.5 * (1.0 + Math.cos((Math.PI * dist) / s));
    }
  }

  // Linear (non-reduced) span
  const loX = span.lo ? resolveEndpoint(span.lo, tplHz) : -Infinity;
  const hiX = span.hi ? resolveEndpoint(span.hi, tplHz) : Infinity;
  const minX = Math.min(loX, hiX);
  const maxX = Math.max(loX, hiX);

  if (x >= minX && x <= maxX) {
    return 1.0;
  }

  const dist = x < minX ? minX - x : x - maxX;
  if (dist >= s) return 0.0;
  return 0.5 * (1.0 + Math.cos((Math.PI * dist) / s));
}

/**
 * Evaluates the match of coordinate x across all spans of a RangeCondition.
 * Spans are combined as a union (maximum match).
 */
export function evaluateRangeMatch(
  x: number,
  condition: RangeCondition,
  tplHz: number = TPL_FREQUENCY_HZ
): number {
  if (condition.spans.length === 0) return 0.0;

  const softnessOct =
    condition.softness.unit === 'cents'
      ? condition.softness.value / 1200.0
      : condition.softness.value;

  let maxMatch = 0.0;
  for (const span of condition.spans) {
    const m = evaluateSpanMatch(x, span, softnessOct, condition.reductionPeriod, tplHz);
    if (m > maxMatch) {
      maxMatch = m;
      if (maxMatch >= 0.9999) return 1.0;
    }
  }
  return maxMatch;
}

/**
 * Evaluates an onset occurrence at continuous scene fundamental turns against a CycleCondition.
 */
export function evaluateCycleMatch(
  onsetSceneTurns: number,
  condition: CycleCondition
): number {
  const N = Math.max(1, condition.divisions);
  const R = condition.rotation;

  let c = Math.floor(onsetSceneTurns);
  const u = onsetSceneTurns - c;

  // Discrete slot rounding
  const rawSlot = Math.round(u * N);
  let slotIndex = rawSlot;
  if (slotIndex >= N) {
    slotIndex = 0;
    c += 1;
  }

  const off = Math.abs(u * N - rawSlot);
  const isSlotOnGrid = off <= condition.tolerance;

  // Apply slot rotation modulo N
  const rotatedSlot = ((slotIndex - R) % N + N) % N;
  const slotWeight = isSlotOnGrid
    ? condition.slotWeights[rotatedSlot] ?? 0.0
    : condition.offGridMatch;

  let superMatch = 1.0;
  if (condition.supercycle && condition.supercycle.length > 0) {
    const L = condition.supercycle.length;
    const superIdx = ((c % L) + L) % L;
    superMatch = condition.supercycle.cycleWeights[superIdx] ?? 1.0;
  }

  return Math.max(0.0, Math.min(1.0, slotWeight * superMatch));
}

/**
 * Combines an array of match factors in [0, 1] using Zadeh fuzzy logic.
 */
export function combineMatches(
  matches: number[],
  combine: 'all' | 'any',
  action: 'keep' | 'remove'
): number {
  if (matches.length === 0) {
    return action === 'keep' ? 1.0 : 0.0;
  }
  if (combine === 'all') {
    return Math.min(...matches);
  }
  return Math.max(...matches);
}

/**
 * Maps a combined match factor into final filter gain using action and depth.
 */
export function applyFilterAction(
  combinedMatch: number,
  action: 'keep' | 'remove',
  depth: number
): number {
  const clampedDepth = Math.max(0.0, Math.min(1.0, depth));
  const m = Math.max(0.0, Math.min(1.0, combinedMatch));
  if (action === 'keep') {
    return 1.0 - clampedDepth * (1.0 - m);
  }
  return 1.0 - clampedDepth * m;
}

/**
 * Evaluates the static component (all Range conditions) of a Filter for a given partial.
 */
export function evaluateStaticMatch(filter: Filter, ctx: PartialContext): number {
  if (!filter.enabled) return 1.0;

  const rangeConds = filter.conditions.filter(
    (c): c is RangeCondition => c.kind === 'range' && c.enabled !== false
  );
  if (rangeConds.length === 0) {
    return filter.action === 'keep' ? 1.0 : 0.0;
  }

  const anchorRatioVal = ctx.anchorRatio ? ratioToValue(ctx.anchorRatio) : 1.0;
  const placementD = ctx.placementD ?? ctx.sceneD;
  const anchorD = placementD - Math.log2(anchorRatioVal);

  const matches = rangeConds.map((cond) => {
    const x = rangeCoordinate(ctx.partialD, cond.reference, ctx.sceneD, anchorD);
    return evaluateRangeMatch(x, cond, ctx.tplHz);
  });

  return combineMatches(matches, filter.combine, filter.action);
}

/**
 * Calculates the average cycle match over a full supercycle for static / duty display.
 */
export function meanCycleMatch(
  condition: CycleCondition,
  ratioVal: number,
  phaseOffset: number,
  ratioToScene: number = 1.0
): number {
  const L = condition.supercycle ? Math.max(1, condition.supercycle.length) : 1;
  const totalTurns = L;
  const onsetsCount = Math.max(1, Math.min(512, Math.round(totalTurns * ratioVal * ratioToScene)));

  let sum = 0.0;
  for (let n = 0; n < onsetsCount; n++) {
    const onsetMaster = n / ratioVal + phaseOffset;
    const sceneTurns = onsetMaster * ratioToScene;
    sum += evaluateCycleMatch(sceneTurns, condition);
  }
  return sum / onsetsCount;
}

/**
 * Evaluates the complete time-averaged (duty) gain of a Filter for a partial.
 * Used for spectral roughness, ruler display, and photosensitive-safe steady-state glow.
 */
export function evaluateDutyGain(filter: Filter, ctx: PartialContext): number {
  if (!filter.enabled) return 1.0;

  const activeConds = filter.conditions.filter((c) => c.enabled !== false);
  if (activeConds.length === 0) return 1.0;

  const anchorRatioVal = ctx.anchorRatio ? ratioToValue(ctx.anchorRatio) : 1.0;
  const placementD = ctx.placementD ?? ctx.sceneD;
  const anchorD = placementD - Math.log2(anchorRatioVal);
  const ratioVal = ctx.ratio ? ratioToValue(ctx.ratio) : 1.0;
  const phase = ctx.phase ?? 0;
  const ratioToScene = ctx.ratioToScene ?? 1.0;

  const matches = activeConds.map((cond) => {
    if (cond.kind === 'range') {
      const x = rangeCoordinate(ctx.partialD, cond.reference, ctx.sceneD, anchorD);
      let match = evaluateRangeMatch(x, cond, ctx.tplHz);
      if (cond.supercycle && cond.supercycle.length > 0) {
        const avg = cond.supercycle.cycleWeights.reduce((a, b) => a + b, 0) / cond.supercycle.length;
        match *= avg;
      }
      return match;
    }
    return meanCycleMatch(cond, ratioVal, phase, ratioToScene);
  });

  const combined = combineMatches(matches, filter.combine, filter.action);
  return applyFilterAction(combined, filter.action, filter.depth);
}

/**
 * Evaluates the instantaneous filter gain for an onset occurring at a specific scene phase.
 */
export function evaluateOnsetGain(
  filter: Filter,
  ctx: PartialContext,
  onsetSceneTurns: number
): number {
  if (!filter.enabled) return 1.0;

  const activeConds = filter.conditions.filter((c) => c.enabled !== false);
  if (activeConds.length === 0) return 1.0;

  const anchorRatioVal = ctx.anchorRatio ? ratioToValue(ctx.anchorRatio) : 1.0;
  const placementD = ctx.placementD ?? ctx.sceneD;
  const anchorD = placementD - Math.log2(anchorRatioVal);

  const matches = activeConds.map((cond) => {
    if (cond.kind === 'range') {
      const x = rangeCoordinate(ctx.partialD, cond.reference, ctx.sceneD, anchorD);
      let match = evaluateRangeMatch(x, cond, ctx.tplHz);
      if (cond.supercycle && cond.supercycle.length > 0) {
        const L = cond.supercycle.length;
        const c = Math.floor(onsetSceneTurns);
        const superIdx = ((c % L) + L) % L;
        const superMatch = cond.supercycle.cycleWeights[superIdx] ?? 1.0;
        match *= superMatch;
      }
      return match;
    }
    return evaluateCycleMatch(onsetSceneTurns, cond);
  });

  const combined = combineMatches(matches, filter.combine, filter.action);
  return applyFilterAction(combined, filter.action, filter.depth);
}

export interface CompiledWorkletFilter {
  enabled: boolean;
  action: number; // 0 = keep, 1 = remove
  combine: number; // 0 = all, 1 = any
  depth: number;
  hasCycle: boolean;
  hasRangeSuper: boolean;
  ranges: Array<{
    superLength: number;
    superWeights: number[];
  }>;
  cycles: Array<{
    divisions: number;
    slotWeights: number[];
    rotation: number;
    tolerance: number;
    offGridMatch: number;
    superLength: number;
    superWeights: number[];
  }>;
}

/**
 * Compiles a Filter into lightweight, GC-free data structures for the AudioWorklet.
 */
export function compileFilterForWorklet(filter: Filter | undefined): CompiledWorkletFilter {
  if (!filter || !filter.enabled) {
    return {
      enabled: false,
      action: 0,
      combine: 0,
      depth: 1.0,
      hasCycle: false,
      hasRangeSuper: false,
      ranges: [],
      cycles: [],
    };
  }

  const activeConds = filter.conditions.filter((c) => c.enabled !== false);
  if (activeConds.length === 0) {
    return {
      enabled: false,
      action: 0,
      combine: 0,
      depth: 1.0,
      hasCycle: false,
      hasRangeSuper: false,
      ranges: [],
      cycles: [],
    };
  }

  const rangeConds = activeConds.filter(
    (c): c is RangeCondition => c.kind === 'range'
  );
  const cycleConds = activeConds.filter(
    (c): c is CycleCondition => c.kind === 'cycle'
  );
  const hasRangeSuper = rangeConds.some(
    (c) => !!c.supercycle && c.supercycle.length > 0
  );

  return {
    enabled: true,
    action: filter.action === 'remove' ? 1 : 0,
    combine: filter.combine === 'any' ? 1 : 0,
    depth: Math.max(0.0, Math.min(1.0, filter.depth)),
    hasCycle: cycleConds.length > 0,
    hasRangeSuper,
    ranges: rangeConds.map((c) => ({
      superLength: c.supercycle ? c.supercycle.length : 0,
      superWeights: c.supercycle ? [...c.supercycle.cycleWeights] : [],
    })),
    cycles: cycleConds.map((c) => ({
      divisions: c.divisions,
      slotWeights: [...c.slotWeights],
      rotation: c.rotation,
      tolerance: c.tolerance,
      offGridMatch: c.offGridMatch,
      superLength: c.supercycle ? c.supercycle.length : 0,
      superWeights: c.supercycle ? [...c.supercycle.cycleWeights] : [],
    })),
  };
}

/**
 * Computes onset gates for a sequence of turns into a caller-supplied Float32Array buffer.
 * High-performance, zero-allocation helper for lens renderers.
 */
export function computeOnsetGates(
  filter: Filter,
  ctx: PartialContext,
  fromTurns: number,
  toTurns: number,
  out: Float32Array
): number {
  if (!filter.enabled) {
    out.fill(1.0);
    return out.length;
  }
  const ratioVal = ctx.ratio ? ratioToValue(ctx.ratio) : 1.0;
  const phase = ctx.phase ?? 0;
  const ratioToScene = ctx.ratioToScene ?? 1.0;
  const spanTurns = Math.max(1e-6, toTurns - fromTurns);
  const count = out.length;

  for (let i = 0; i < count; i++) {
    const t = fromTurns + (i / count) * spanTurns;
    const n = Math.floor((t - phase) * ratioVal);
    const onsetMaster = n / ratioVal + phase;
    const sceneTurns = onsetMaster * ratioToScene;
    out[i] = evaluateOnsetGain(filter, ctx, sceneTurns);
  }
  return count;
}
