/**
 * Shape Editor preset data and options.
 * Defines interval presets, percussion/synth voice options, and acoustic ADSR instrument envelopes.
 */

import { VoiceId, ADSREnvelope } from '../../core/types';

export const ANCHOR_INTERVAL_PRESETS: { label: string; num: number; den: number }[] = [
  { label: '1/1 — Root (Do)', num: 1, den: 1 },
  { label: '16/15 — Minor 2nd (Ra)', num: 16, den: 15 },
  { label: '9/8 — Major 2nd (Re)', num: 9, den: 8 },
  { label: '6/5 — Minor 3rd (Me)', num: 6, den: 5 },
  { label: '5/4 — Major 3rd (Mi)', num: 5, den: 4 },
  { label: '4/3 — Perfect 4th (Fa)', num: 4, den: 3 },
  { label: '7/5 — Tritone (Fi)', num: 7, den: 5 },
  { label: '3/2 — Perfect 5th (So)', num: 3, den: 2 },
  { label: '8/5 — Minor 6th (Le)', num: 8, den: 5 },
  { label: '5/3 — Major 6th (La)', num: 5, den: 3 },
  { label: '7/4 — Harmonic 7th (Te)', num: 7, den: 4 },
  { label: '9/5 — Just Minor 7th (Te)', num: 9, den: 5 },
  { label: '15/8 — Major 7th (Ti)', num: 15, den: 8 },
  { label: '2/1 — Octave (Do’)', num: 2, den: 1 },
  { label: '3/1 — Twelfth (So’)', num: 3, den: 1 },
  { label: '4/1 — Double Octave (4x)', num: 4, den: 1 },
];

export const VOICE_OPTIONS: { id: VoiceId; label: string }[] = [
  { id: 'kick', label: 'Kick' },
  { id: 'snare', label: 'Snare' },
  { id: 'clave', label: 'Clave' },
  { id: 'woodblock', label: 'Woodblock' },
  { id: 'hihat', label: 'Hi-Hat' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'click', label: 'Click' },
];

export interface AdsrPreset {
  label: string;
  adsr: ADSREnvelope;
}

export const ADSR_INSTRUMENT_PRESETS: AdsrPreset[] = [
  {
    label: 'Piano Hammer',
    adsr: { attack: 0.006, decay: 1.8, sustain: 0.22, release: 0.5, damping: 0.6 },
  },
  {
    label: 'Plucked String',
    adsr: { attack: 0.003, decay: 1.2, sustain: 0.06, release: 0.35, damping: 0.8 },
  },
  {
    label: 'Bowed Strings',
    adsr: { attack: 0.08, decay: 0.4, sustain: 0.85, release: 0.3, damping: 0.1 },
  },
  {
    label: 'Church Bell',
    adsr: { attack: 0.002, decay: 2.8, sustain: 0.12, release: 0.8, damping: 0.4 },
  },
  {
    label: 'Vibraphone',
    adsr: { attack: 0.004, decay: 2.2, sustain: 0.18, release: 0.6, damping: 0.35 },
  },
  {
    label: 'Clarinet / Reed',
    adsr: { attack: 0.04, decay: 0.25, sustain: 0.9, release: 0.15, damping: 0.05 },
  },
  {
    label: 'Ambient Pad',
    adsr: { attack: 0.25, decay: 0.8, sustain: 0.9, release: 0.6, damping: 0.0 },
  },
  {
    label: 'Flat Drone (Organ)',
    adsr: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1, damping: 0.0 },
  },
];
