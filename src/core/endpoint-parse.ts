/**
 * Pure parsing and formatting routines for filter range endpoints.
 * Supports rational ratios (e.g. "5/4"), cents ("386.31c"), EDO steps ("4\\12"),
 * frequencies ("440Hz"), tempo ("120BPM"), and DuPeriod coordinates ("d:1.5").
 */

import { FilterReference, RangeEndpoint } from './filter-types';
import { Ratio } from './types';
import { reduceRational, ratioToValue } from './rational';
import { TPL_FREQUENCY_HZ } from './ppt-constants';

/**
 * Parses a string input into a strongly-typed RangeEndpoint.
 * Returns null if the input string cannot be recognised as a valid endpoint.
 */
export function parseEndpoint(input: string): RangeEndpoint | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // 1. DuPeriod coordinate: "d:1.5", "d=-2.0", "1.5d", "-1.5 d"
  const dMatch = trimmed.match(/^d\s*[:=]?\s*([+-]?\d+(?:\.\d+)?)$/) ||
                 trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*d$/);
  if (dMatch) {
    const val = parseFloat(dMatch[1]);
    if (!isNaN(val)) {
      return { unit: 'd', value: val };
    }
  }

  // 2. Frequency: "440hz", "440.0 hz", "25.8 hz"
  const hzMatch = trimmed.match(/^([+]?\d+(?:\.\d+)?)\s*hz$/);
  if (hzMatch) {
    const val = parseFloat(hzMatch[1]);
    if (!isNaN(val) && val > 0) {
      return { unit: 'hz', value: val };
    }
  }

  // 3. Tempo: "120bpm", "60.5 bpm"
  const bpmMatch = trimmed.match(/^([+]?\d+(?:\.\d+)?)\s*bpm$/);
  if (bpmMatch) {
    const val = parseFloat(bpmMatch[1]);
    if (!isNaN(val) && val > 0) {
      return { unit: 'bpm', value: val };
    }
  }

  // 4. Cents: "386.31c", "386.31¢", "400 cents"
  const centsMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:c|¢|cents)$/);
  if (centsMatch) {
    const val = parseFloat(centsMatch[1]);
    if (!isNaN(val)) {
      return { unit: 'cents', value: val };
    }
  }

  // 5. EDO steps notation: "4\12", "7\12", "4\12@2/1", "4\19@3/1"
  const edoMatch = trimmed.match(/^([+-]?\d+)\s*\\\s*(\d+)(?:\s*@\s*(\d+)\/(\d+))?$/);
  if (edoMatch) {
    const steps = parseInt(edoMatch[1], 10);
    const divisions = parseInt(edoMatch[2], 10);
    let period: Ratio | undefined = undefined;
    if (edoMatch[3] && edoMatch[4]) {
      const pNum = parseInt(edoMatch[3], 10);
      const pDen = parseInt(edoMatch[4], 10);
      if (pNum > 0 && pDen > 0) {
        const red = reduceRational(pNum, pDen);
        period = { kind: 'rational', num: red.num, den: red.den };
      }
    }
    if (!isNaN(steps) && !isNaN(divisions) && divisions > 0) {
      return {
        unit: 'edo',
        steps,
        divisions,
        ...(period ? { period } : {}),
      };
    }
  }

  // 6. Rational ratio: "5/4", "3/2", "16/9"
  const ratioMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (ratioMatch) {
    const num = parseInt(ratioMatch[1], 10);
    const den = parseInt(ratioMatch[2], 10);
    if (num > 0 && den > 0) {
      const red = reduceRational(num, den);
      return {
        unit: 'ratio',
        ratio: { kind: 'rational', num: red.num, den: red.den },
      };
    }
  }

  // 7. Plain real number: "1.25", "1.5" (assumed to be a decimal ratio if > 0)
  const realMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (realMatch) {
    const val = parseFloat(realMatch[1]);
    if (!isNaN(val) && val > 0) {
      return {
        unit: 'ratio',
        ratio: { kind: 'real', value: val },
      };
    }
  }

  return null;
}

/**
 * Formats a RangeEndpoint into an Australian English display string.
 */
export function formatEndpoint(endpoint: RangeEndpoint): string {
  switch (endpoint.unit) {
    case 'd':
      return `d: ${endpoint.value >= 0 ? '+' : ''}${endpoint.value.toFixed(2)}`;
    case 'hz':
      return `${endpoint.value.toFixed(1)} Hz`;
    case 'bpm':
      return `${endpoint.value.toFixed(1)} BPM`;
    case 'cents':
      return `${endpoint.value >= 0 ? '+' : ''}${endpoint.value.toFixed(1)}¢`;
    case 'edo': {
      const periodStr = endpoint.period
        ? endpoint.period.kind === 'rational'
          ? `@${endpoint.period.num}/${endpoint.period.den}`
          : `@${endpoint.period.value.toFixed(2)}`
        : '';
      return `${endpoint.steps}\\${endpoint.divisions}${periodStr}`;
    }
    case 'ratio': {
      if (endpoint.ratio.kind === 'rational') {
        return `${endpoint.ratio.num}/${endpoint.ratio.den}`;
      }
      return endpoint.ratio.value.toFixed(4);
    }
    default:
      return '';
  }
}

/**
 * Converts a RangeEndpoint to a representation suitable for the target coordinate reference.
 * When converting to 'absolute': relative units (cents, ratio, edo) are converted to DuPeriod 'd'.
 * When converting to 'scene' or 'anchor': absolute units (d, hz, bpm) are converted to 'cents'.
 * Switching between 'scene' and 'anchor' preserves existing relative representations.
 */
export function convertEndpointForReference(
  endpoint: RangeEndpoint | null,
  targetRef: FilterReference,
  tplHz: number = TPL_FREQUENCY_HZ
): RangeEndpoint | null {
  if (!endpoint) return null;

  if (targetRef === 'absolute') {
    if (endpoint.unit === 'd' || endpoint.unit === 'hz' || endpoint.unit === 'bpm') {
      return endpoint;
    }
    // Relative units -> DuPeriod d: d = -x, where x is pitch-height in octaves
    if (endpoint.unit === 'cents') {
      const d = -endpoint.value / 1200.0;
      return { unit: 'd', value: Math.round(d * 100) / 100 };
    }
    if (endpoint.unit === 'ratio') {
      const r = ratioToValue(endpoint.ratio);
      const d = -Math.log2(Math.max(1e-6, r));
      return { unit: 'd', value: Math.round(d * 100) / 100 };
    }
    if (endpoint.unit === 'edo') {
      const periodRatio = endpoint.period ? ratioToValue(endpoint.period) : 2.0;
      const d = -((endpoint.steps / Math.max(1, endpoint.divisions)) * Math.log2(periodRatio));
      return { unit: 'd', value: Math.round(d * 100) / 100 };
    }
    return endpoint;
  }

  // targetRef is 'scene' or 'anchor' (relative)
  if (endpoint.unit === 'cents' || endpoint.unit === 'ratio' || endpoint.unit === 'edo') {
    return endpoint;
  }
  // Absolute units -> cents: x is pitch-height in octaves, cents = x * 1200
  if (endpoint.unit === 'd') {
    const cents = Math.round(-endpoint.value * 1200.0);
    return { unit: 'cents', value: cents };
  }
  if (endpoint.unit === 'hz') {
    const x = Math.log2(Math.max(1e-6, endpoint.value) / tplHz);
    const cents = Math.round(x * 1200.0);
    return { unit: 'cents', value: cents };
  }
  if (endpoint.unit === 'bpm') {
    const freqHz = Math.max(1e-6, endpoint.value) / 60.0;
    const x = Math.log2(freqHz / tplHz);
    const cents = Math.round(x * 1200.0);
    return { unit: 'cents', value: cents };
  }

  return endpoint;
}
