/**
 * Migration and backwards-compatibility helpers for filter configurations.
 * Converts legacy BandFilter representations into compound Filter models,
 * sanitises persisted localStorage entries, and provides golden test baselines.
 */

import { BandFilter, Ratio } from './types';
import {
  Filter,
  FilterCondition,
  FilterReference,
  RangeCondition,
  RangeSpan,
  MAX_CONDITIONS,
  MAX_SPANS,
  MAX_DIVISIONS,
} from './filter-types';

/**
 * Legacy raised-cosine attenuation evaluation for golden migration testing.
 * Retained for parity tests to ensure mathematical equivalence with the new evaluator.
 */
export function legacyBandFilterGain(d: number, filter: BandFilter, fundamentalD?: number): number {
  if (!filter.enabled) return 1.0;
  const effectiveCentreD = filter.trackingMode === 'relative' && fundamentalD !== undefined
    ? fundamentalD + filter.centreD
    : filter.centreD;
  const halfW = filter.widthD / 2.0;
  const dist = Math.abs(d - effectiveCentreD);
  const soft = Math.max(0.001, filter.softnessD);

  switch (filter.mode) {
    case 'band-pass': {
      if (dist <= halfW) return 1.0;
      if (dist >= halfW + soft) return 0.0;
      const x = (dist - halfW) / soft;
      return 0.5 * (1.0 + Math.cos(Math.PI * x));
    }
    case 'low-pass': {
      // In DuPeriod coordinates, low frequency is higher d (rhythm).
      // Acoustic low-pass keeps lower frequencies (larger d >= cutoff)
      const cutoff = effectiveCentreD;
      if (d >= cutoff) return 1.0;
      if (d <= cutoff - soft) return 0.0;
      const x = (cutoff - d) / soft;
      return 0.5 * (1.0 + Math.cos(Math.PI * x));
    }
    case 'high-pass': {
      // Acoustic high-pass keeps higher frequencies (smaller / more negative d <= cutoff)
      const cutoff = effectiveCentreD;
      if (d <= cutoff) return 1.0;
      if (d >= cutoff + soft) return 0.0;
      const x = (d - cutoff) / soft;
      return 0.5 * (1.0 + Math.cos(Math.PI * x));
    }
    default:
      return 1.0;
  }
}

/**
 * Converts a legacy BandFilter into a modern Filter model with a RangeCondition.
 */
export function bandFilterToFilter(b: BandFilter): Filter {
  const isRelative = b.trackingMode === 'relative';
  const reference = isRelative ? 'scene' : 'absolute';
  const c = b.centreD;
  const halfW = b.widthD / 2.0;
  const soft = b.softnessD;

  let span: RangeSpan;

  if (isRelative) {
    // In relative scene tracking, x = sceneD - partialD.
    // Legacy effective centre is fundamentalD + c, so x_centre = -c.
    const centreX = -c;
    switch (b.mode) {
      case 'band-pass':
        span = {
          lo: { unit: 'cents', value: (centreX - halfW) * 1200.0 },
          hi: { unit: 'cents', value: (centreX + halfW) * 1200.0 },
        };
        break;
      case 'low-pass':
        // Low-pass keeps d >= cutoff => x <= centreX
        span = {
          lo: null,
          hi: { unit: 'cents', value: centreX * 1200.0 },
        };
        break;
      case 'high-pass':
        // High-pass keeps d <= cutoff => x >= centreX
        span = {
          lo: { unit: 'cents', value: centreX * 1200.0 },
          hi: null,
        };
        break;
      default:
        span = {
          lo: { unit: 'cents', value: (centreX - halfW) * 1200.0 },
          hi: { unit: 'cents', value: (centreX + halfW) * 1200.0 },
        };
    }
  } else {
    // In absolute tracking, x = -partialD.
    // Higher d is lower pitch, so lo is c + halfW and hi is c - halfW.
    switch (b.mode) {
      case 'band-pass':
        span = {
          lo: { unit: 'd', value: c + halfW },
          hi: { unit: 'd', value: c - halfW },
        };
        break;
      case 'low-pass':
        // Low-pass keeps d >= c => x <= -c
        span = {
          lo: null,
          hi: { unit: 'd', value: c },
        };
        break;
      case 'high-pass':
        // High-pass keeps d <= c => x >= -c
        span = {
          lo: { unit: 'd', value: c },
          hi: null,
        };
        break;
      default:
        span = {
          lo: { unit: 'd', value: c + halfW },
          hi: { unit: 'd', value: c - halfW },
        };
    }
  }

  const condId = 'cond-legacy-formant';
  const rangeCond: RangeCondition = {
    kind: 'range',
    id: condId,
    reference,
    reductionPeriod: null,
    spans: [span],
    softness: isRelative
      ? { value: soft * 1200.0, unit: 'cents' }
      : { value: soft, unit: 'd' },
  };

  return {
    enabled: Boolean(b.enabled),
    name: isRelative ? 'Relative Formant Filter' : 'Fixed Formant Filter',
    action: 'keep',
    combine: 'all',
    depth: 1.0,
    conditions: [rangeCond],
    focus: { conditionId: condId, spanIndex: 0 },
    presetId: 'legacy-band',

    // Backwards-compatibility fields for unmigrated components
    centreD: b.centreD,
    widthD: b.widthD,
    softnessD: b.softnessD,
    mode: b.mode,
    trackingMode: b.trackingMode || 'fixed',
  };
}

/**
 * Canonical default filter instance replacing DEFAULT_SCENE.filter.
 */
export const DEFAULT_FILTER: Filter = bandFilterToFilter({
  enabled: false,
  centreD: 0.0,
  widthD: 4.0,
  softnessD: 1.0,
  mode: 'band-pass',
  trackingMode: 'fixed',
});

/**
 * Sanitises and migrates a raw filter object loaded from persistence or external state.
 */
export function sanitiseFilter(raw: unknown): Filter {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_FILTER;
  }

  const obj = raw as Record<string, unknown>;

  if (!('conditions' in obj) && !('mode' in obj)) {
    return DEFAULT_FILTER;
  }

  // Detect and migrate legacy BandFilter format
  if (typeof obj.mode === 'string' && !Array.isArray(obj.conditions)) {
    const legacy: BandFilter = {
      enabled: Boolean(obj.enabled),
      centreD: typeof obj.centreD === 'number' ? obj.centreD : 0.0,
      widthD: typeof obj.widthD === 'number' ? obj.widthD : 4.0,
      softnessD: typeof obj.softnessD === 'number' ? obj.softnessD : 1.0,
      mode: (obj.mode === 'low-pass' || obj.mode === 'high-pass') ? obj.mode : 'band-pass',
      trackingMode: obj.trackingMode === 'relative' ? 'relative' : 'fixed',
    };
    return bandFilterToFilter(legacy);
  }

  // Validate modern Filter format
  const enabled = Boolean(obj.enabled);
  const name = typeof obj.name === 'string' && obj.name.trim() ? obj.name : 'Filter';
  const action = obj.action === 'remove' ? 'remove' : 'keep';
  const combine = obj.combine === 'any' ? 'any' : 'all';
  const depth = typeof obj.depth === 'number' && !isNaN(obj.depth)
    ? Math.max(0.0, Math.min(1.0, obj.depth))
    : 1.0;

  const rawConditions = Array.isArray(obj.conditions) ? obj.conditions : [];
  const validConditions: FilterCondition[] = [];

  for (const c of rawConditions) {
    if (!c || typeof c !== 'object') continue;
    const condObj = c as Record<string, unknown>;
    const condId: string = typeof condObj.id === 'string' && condObj.id ? condObj.id : `cond-${validConditions.length}`;

    if (condObj.kind === 'range') {
      const ref: FilterReference = condObj.reference === 'scene' || condObj.reference === 'anchor'
        ? condObj.reference
        : 'absolute';
      const spans: RangeSpan[] = Array.isArray(condObj.spans)
        ? (condObj.spans as RangeSpan[]).slice(0, MAX_SPANS)
        : [];
      const softnessObj = condObj.softness as { value?: number; unit?: string } | undefined;
      const softnessVal = typeof softnessObj?.value === 'number' && !isNaN(softnessObj.value)
        ? Math.max(0.001, softnessObj.value)
        : (ref === 'absolute' ? 1.0 : 12.0);
      const softnessUnit: 'cents' | 'd' = softnessObj?.unit === 'cents' ? 'cents' : 'd';

      validConditions.push({
        kind: 'range' as const,
        id: condId,
        reference: ref,
        reductionPeriod: (condObj.reductionPeriod as Ratio) || null,
        spans,
        softness: { value: softnessVal, unit: softnessUnit },
      });
    } else if (condObj.kind === 'cycle') {
      const divisions = typeof condObj.divisions === 'number' && !isNaN(condObj.divisions)
        ? Math.max(1, Math.min(MAX_DIVISIONS, Math.floor(condObj.divisions)))
        : 4;
      const rawWeights = Array.isArray(condObj.slotWeights) ? condObj.slotWeights : [];
      const slotWeights = new Array(divisions).fill(1.0);
      for (let i = 0; i < divisions; i++) {
        if (typeof rawWeights[i] === 'number' && !isNaN(rawWeights[i])) {
          slotWeights[i] = Math.max(0.0, Math.min(1.0, rawWeights[i]));
        }
      }
      const rotation = typeof condObj.rotation === 'number' && !isNaN(condObj.rotation)
        ? Math.floor(condObj.rotation)
        : 0;
      const tolerance = typeof condObj.tolerance === 'number' && !isNaN(condObj.tolerance)
        ? Math.max(0.01, Math.min(0.5, condObj.tolerance))
        : 0.25;
      const offGridMatch = typeof condObj.offGridMatch === 'number' && !isNaN(condObj.offGridMatch)
        ? Math.max(0.0, Math.min(1.0, condObj.offGridMatch))
        : 0.0;

      validConditions.push({
        kind: 'cycle' as const,
        id: condId,
        divisions,
        slotWeights,
        rotation,
        tolerance,
        offGridMatch,
        supercycle: (condObj.supercycle as { length: number; cycleWeights: number[] }) || null,
      });
    }

    if (validConditions.length >= MAX_CONDITIONS) break;
  }

  let focus = null;
  if (obj.focus && typeof obj.focus === 'object') {
    const focusObj = obj.focus as { conditionId?: string; spanIndex?: number };
    if (typeof focusObj.conditionId === 'string' && typeof focusObj.spanIndex === 'number') {
      focus = { conditionId: focusObj.conditionId, spanIndex: Math.max(0, focusObj.spanIndex) };
    }
  }

  return {
    enabled,
    name,
    action,
    combine,
    depth,
    conditions: validConditions,
    focus,
    presetId: typeof obj.presetId === 'string' ? obj.presetId : undefined,
    centreD: typeof obj.centreD === 'number' ? obj.centreD : 0.0,
    widthD: typeof obj.widthD === 'number' ? obj.widthD : 4.0,
    softnessD: typeof obj.softnessD === 'number' ? obj.softnessD : 1.0,
    mode: (obj.mode === 'low-pass' || obj.mode === 'high-pass') ? obj.mode : 'band-pass',
    trackingMode: (obj.trackingMode === 'relative' || obj.trackingMode === 'fixed') ? obj.trackingMode : 'fixed',
  };
}
