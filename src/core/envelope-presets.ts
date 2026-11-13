/**
 * Canonical Envelope presets and pure Rhythm-space Supercycle envelope evaluation.
 */

import { Envelope, MAX_ENVELOPE_SUPERCYCLE } from './envelope-types';

export const PRESET_ENVELOPES: Envelope[] = [
  {
    id: 'env-piano-hammer',
    name: 'Piano Hammer',
    origin: 'preset',
    category: 'pitch',
    description: 'Fast hammer strike with natural decay and high-partial damping.',
    enabled: true,
    adsr: { attack: 0.006, decay: 1.8, sustain: 0.22, release: 0.5, damping: 0.6 },
    rhythmMode: 'off',
    supercycleLength: 4,
  },
  {
    id: 'env-plucked-string',
    name: 'Plucked String',
    origin: 'preset',
    category: 'pitch',
    description: 'Sharp pluck transient with rapid high-overtone damping.',
    enabled: true,
    adsr: { attack: 0.003, decay: 1.2, sustain: 0.06, release: 0.35, damping: 0.8 },
    rhythmMode: 'off',
    supercycleLength: 4,
  },
  {
    id: 'env-bowed-strings',
    name: 'Bowed Strings',
    origin: 'preset',
    category: 'pitch',
    description: 'Smooth bowed onset with sustained harmonic body.',
    enabled: true,
    adsr: { attack: 0.08, decay: 0.4, sustain: 0.85, release: 0.3, damping: 0.1 },
    rhythmMode: 'off',
    supercycleLength: 4,
  },
  {
    id: 'env-church-bell',
    name: 'Church Bell',
    origin: 'preset',
    category: 'pitch',
    description: 'Instant metallic strike with long resonant ring.',
    enabled: true,
    adsr: { attack: 0.002, decay: 2.8, sustain: 0.12, release: 0.8, damping: 0.4 },
    rhythmMode: 'off',
    supercycleLength: 4,
  },
  {
    id: 'env-vibraphone',
    name: 'Vibraphone',
    origin: 'preset',
    category: 'pitch',
    description: 'Warm mallet attack with balanced sustain.',
    enabled: true,
    adsr: { attack: 0.004, decay: 2.2, sustain: 0.18, release: 0.6, damping: 0.35 },
    rhythmMode: 'off',
    supercycleLength: 4,
  },
  {
    id: 'env-clarinet-reed',
    name: 'Clarinet / Reed',
    origin: 'preset',
    category: 'pitch',
    description: 'Articulated reed onset with steady breath sustain.',
    enabled: true,
    adsr: { attack: 0.04, decay: 0.25, sustain: 0.9, release: 0.15, damping: 0.05 },
    rhythmMode: 'off',
    supercycleLength: 4,
  },
  {
    id: 'env-ambient-pad',
    name: 'Ambient Pad',
    origin: 'preset',
    category: 'pitch',
    description: 'Slow bloom and soft release tail.',
    enabled: true,
    adsr: { attack: 0.25, decay: 0.8, sustain: 0.9, release: 0.6, damping: 0.0 },
    rhythmMode: 'off',
    supercycleLength: 4,
  },
  {
    id: 'env-flat-drone',
    name: 'Flat Drone (Organ)',
    origin: 'preset',
    category: 'pitch',
    description: 'Full steady-state organ contour.',
    enabled: true,
    adsr: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1, damping: 0.0 },
    rhythmMode: 'off',
    supercycleLength: 4,
  },
  {
    id: 'env-rhythm-swell-4',
    name: '4-Bar Crescendo Swell',
    origin: 'preset',
    category: 'rhythm',
    description: 'Gradual dynamic swell across a 4-cycle supercycle phrase.',
    enabled: true,
    adsr: { attack: 0.45, decay: 0.15, sustain: 0.85, release: 0.25, damping: 0.2 },
    rhythmMode: 'supercycle',
    supercycleLength: 4,
  },
  {
    id: 'env-rhythm-decay-4',
    name: '4-Bar Phrase Decay',
    origin: 'preset',
    category: 'rhythm',
    description: 'Strong bar-1 downbeat impact decaying across 4 cycles.',
    enabled: true,
    adsr: { attack: 0.02, decay: 0.65, sustain: 0.2, release: 0.2, damping: 0.4 },
    rhythmMode: 'supercycle',
    supercycleLength: 4,
  },
  {
    id: 'env-rhythm-gate-2',
    name: '2-Bar Breath Pulse',
    origin: 'preset',
    category: 'rhythm',
    description: 'Two-cycle tension and release contour.',
    enabled: true,
    adsr: { attack: 0.15, decay: 0.35, sustain: 0.5, release: 0.35, damping: 0.15 },
    rhythmMode: 'supercycle',
    supercycleLength: 2,
  },
];

/**
 * Evaluates the Rhythm-space Supercycle ADSR gain in [0, 1] at a given unwrapped scene turn.
 * Maps Attack -> Decay -> Sustain -> Release proportionally across `supercycleLength` cycles.
 */
export function evaluateRhythmEnvelopeGain(
  envelope: Envelope | undefined,
  sceneTurns: number,
  ratioVal: number = 1.0
): number {
  if (!envelope || !envelope.enabled || envelope.rhythmMode !== 'supercycle') {
    return 1.0;
  }

  const L = Math.max(1, Math.min(MAX_ENVELOPE_SUPERCYCLE, Math.round(envelope.supercycleLength || 4)));
  const u = (((sceneTurns % L) + L) % L) / L; // [0, 1)

  const { attack, decay, sustain, release, damping = 0 } = envelope.adsr;
  const rawA = Math.max(0.005, attack);
  const rawD = Math.max(0.01, decay);
  const rawR = Math.max(0.01, release);
  const sus = Math.max(0, Math.min(1, sustain));

  const total = rawA + rawD + rawR;
  const scale = total > 1.0 ? 1.0 / total : 1.0;
  const attFrac = rawA * scale;
  const decFrac = rawD * scale;
  const relFrac = rawR * scale;
  const susEnd = 1.0 - relFrac;

  let env = 1.0;
  if (u < attFrac) {
    const aRatio = u / Math.max(1e-4, attFrac);
    env = aRatio * aRatio * (3.0 - 2.0 * aRatio);
  } else if (u < attFrac + decFrac) {
    const dProgress = (u - attFrac) / Math.max(1e-4, decFrac);
    const dampMult = 1.0 + Math.max(0, damping) * Math.max(0, ratioVal - 1.0);
    const expDecay = Math.exp(-3.0 * dProgress * dampMult);
    env = sus + (1.0 - sus) * expDecay;
  } else if (u < susEnd) {
    env = sus;
  } else {
    const rProgress = (u - susEnd) / Math.max(1e-4, relFrac);
    env = sus * Math.max(0, 1.0 - rProgress);
  }

  return Math.max(0, Math.min(1, env));
}
