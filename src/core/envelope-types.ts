/**
 * Envelope data contracts.
 * Separates acoustic/rhythmic ADSR envelopes from Shape geometry.
 */

import { ADSREnvelope } from './types';

export type EnvelopeCategory = 'pitch' | 'rhythm' | 'user';
export type EnvelopeRhythmMode = 'off' | 'supercycle';

export interface Envelope {
  id: string;
  name: string;
  origin: 'preset' | 'user';
  category?: EnvelopeCategory;
  description?: string;
  enabled: boolean;
  adsr: ADSREnvelope;
  /** Whether this envelope also modulates amplitude across a Rhythm-space Supercycle. */
  rhythmMode: EnvelopeRhythmMode;
  /** Supercycle length in scene cycles (1..16) when rhythmMode === 'supercycle'. */
  supercycleLength: number;
}

export const MAX_ENVELOPE_SUPERCYCLE = 16;
