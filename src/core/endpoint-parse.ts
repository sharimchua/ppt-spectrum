/**
 * Pure parsing and formatting routines for filter range endpoints.
 * Supports rational ratios (e.g. "5/4"), cents ("386.31c"), EDO steps ("4\\12"),
 * frequencies ("440Hz"), tempo ("120BPM"), and DuPeriod coordinates ("d:1.5").
 */

import { RangeEndpoint } from './filter-types';
import { Ratio } from './types';
import { reduceRational } from './rational';

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
