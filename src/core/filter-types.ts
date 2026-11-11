/**
 * Filter data contracts and schema definitions.
 * Defines compound conditions (range and cycle), endpoint representations,
 * fuzzy combine logic, and focused span views.
 */

import { Ratio } from './types';

export type FilterReference = 'absolute' | 'scene' | 'anchor';

export type FilterTrackingMode = 'fixed' | 'relative';

/**
 * Coordinate endpoint stored in the unit the user entered.
 * Preserves the exact theoretical representation (e.g. 5/4 vs 386.31 cents).
 */
export type RangeEndpoint =
  | { unit: 'd'; value: number }
  | { unit: 'hz'; value: number }
  | { unit: 'bpm'; value: number }
  | { unit: 'ratio'; ratio: Ratio }
  | { unit: 'cents'; value: number }
  | { unit: 'edo'; steps: number; divisions: number; period?: Ratio };

export interface RangeSpan {
  /** Lower bound in pitch-height (higher d / lower frequency). Null = unbounded below. */
  lo: RangeEndpoint | null;
  /** Upper bound in pitch-height (lower d / higher frequency). Null = unbounded above. */
  hi: RangeEndpoint | null;
}

export interface RangeCondition {
  kind: 'range';
  id: string;
  enabled?: boolean;
  reference: FilterReference;
  /** Period reduction modulo P before matching. Null = no reduction. Default 2/1 for octave reduction. */
  reductionPeriod: Ratio | null;
  /** Union of spans. Maximum MAX_SPANS. */
  spans: RangeSpan[];
  /** Raised-cosine transition skirt width outside every span boundary. */
  softness: { value: number; unit: 'd' | 'cents' };
  /** Optional supercycle modulation across repeated scene cycles. */
  supercycle?: { length: number; cycleWeights: number[] } | null;
}

export interface CycleCondition {
  kind: 'cycle';
  id: string;
  enabled?: boolean;
  /** Grid divisions per scene fundamental cycle (1..64). */
  divisions: number;
  /** Per-slot match weight in [0, 1]. Length must match divisions. */
  slotWeights: number[];
  /** Integer rotation offset in slots. Positive = later in time. */
  rotation: number;
  /** On-grid snap tolerance as a fraction of a slot (0 < tolerance <= 0.5). */
  tolerance: number;
  /** Match value for onsets that do not land on any grid slot. */
  offGridMatch: number;
  /** Supercycle pattern across multiple consecutive scene fundamental cycles. */
  supercycle: { length: number; cycleWeights: number[] } | null;
}

export type FilterCondition = RangeCondition | CycleCondition;

export interface FilterFocus {
  /** Identifier of the focused condition targeted by HUD and canvas gesture editing. */
  conditionId: string;
  /** Index of the focused span within the range condition. */
  spanIndex: number;
}

/**
 * Legacy-compatible view of a focused range span for canvas gesture scrubbing.
 */
export interface SpanView {
  centreD: number;
  widthD: number;
  softnessD: number;
  mode?: 'band-pass' | 'low-pass' | 'high-pass';
  trackingMode?: FilterTrackingMode;
  edge?: 'both' | 'lo' | 'hi';
}

export type FilterCategory = 'aperture' | 'rhythm' | 'interval' | 'harmonic' | 'user';

export interface Filter {
  id?: string;
  enabled: boolean;
  name: string;
  origin?: 'preset' | 'user';
  category?: FilterCategory;
  description?: string;
  action: 'keep' | 'remove';
  combine: 'all' | 'any';
  /** Depth of attenuation (0.0 to 1.0). 1.0 = total suppression, < 1.0 = accent shaping. */
  depth: number;
  /** List of compound filter conditions. Maximum MAX_CONDITIONS. */
  conditions: FilterCondition[];
  /** Current canvas gesture edit focus. Null if no range condition is targeted. */
  focus: FilterFocus | null;
  /** Provenance tag recording the preset used to initialise this filter, if any. */
  presetId?: string;

  // Backwards-compatibility convenience properties for unmigrated UI views
  centreD: number;
  widthD: number;
  softnessD: number;
  mode: 'band-pass' | 'low-pass' | 'high-pass';
  trackingMode?: FilterTrackingMode;
}

export const MAX_SPANS = 64;
export const MAX_CONDITIONS = 8;
export const MAX_DIVISIONS = 64;
export const MAX_SUPERCYCLE = 16;

/**
 * Least Common Multiple of integers 1..16 (720,720).
 * Master-phase wrapping in audio synthesis must align with this multiple
 * so supercycle indices never experience discontinuous phase jumps.
 */
export const SUPERCYCLE_LCM = 720720;
