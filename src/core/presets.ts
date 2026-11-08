import { Shape } from './types';

export const PRESET_SHAPES: Shape[] = [
  {
    id: 'pure-tone',
    name: 'Pure Tone / Single Beat',
    origin: 'preset',
    description: 'Fundamental only (single periodic component). Sine wave in pitch, steady metronome in rhythm.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'woodblock', label: '1' }
    ]
  },
  {
    id: 'saw-like',
    name: 'Sawtooth (All Harmonics)',
    origin: 'preset',
    description: 'All integer harmonics with amp = 1/k. Bright, rich spectrum with even & odd prime presence.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '1' },
      { id: 'p2', ratio: { kind: 'rational', num: 2, den: 1 }, amp: 1 / 2, phase: 0, voice: 'snare', label: '2' },
      { id: 'p3', ratio: { kind: 'rational', num: 3, den: 1 }, amp: 1 / 3, phase: 0, voice: 'woodblock', label: '3' },
      { id: 'p4', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 1 / 4, phase: 0, voice: 'clave', label: '4' },
      { id: 'p5', ratio: { kind: 'rational', num: 5, den: 1 }, amp: 1 / 5, phase: 0, voice: 'hihat', label: '5' },
      { id: 'p6', ratio: { kind: 'rational', num: 6, den: 1 }, amp: 1 / 6, phase: 0, voice: 'triangle', label: '6' },
      { id: 'p7', ratio: { kind: 'rational', num: 7, den: 1 }, amp: 1 / 7, phase: 0, voice: 'click', label: '7' },
      { id: 'p8', ratio: { kind: 'rational', num: 8, den: 1 }, amp: 1 / 8, phase: 0, voice: 'click', label: '8' },
    ]
  },
  {
    id: 'square-like',
    name: 'Square Wave (Odd Harmonics)',
    origin: 'preset',
    description: 'Odd integer harmonics only (1, 3, 5, 7) with amp = 1/k. Hollow, woody resonance.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '1' },
      { id: 'p3', ratio: { kind: 'rational', num: 3, den: 1 }, amp: 1 / 3, phase: 0, voice: 'woodblock', label: '3' },
      { id: 'p5', ratio: { kind: 'rational', num: 5, den: 1 }, amp: 1 / 5, phase: 0, voice: 'clave', label: '5' },
      { id: 'p7', ratio: { kind: 'rational', num: 7, den: 1 }, amp: 1 / 7, phase: 0, voice: 'hihat', label: '7' },
    ]
  },
  {
    id: 'clarinet-like',
    name: 'Clarinet-like',
    origin: 'preset',
    description: 'Odd partials strongly dominant, even partials present but soft (not zero), reflecting cylindrical bore.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '1' },
      { id: 'p2', ratio: { kind: 'rational', num: 2, den: 1 }, amp: 0.12, phase: 0, voice: 'snare', label: '2' },
      { id: 'p3', ratio: { kind: 'rational', num: 3, den: 1 }, amp: 0.65, phase: 0, voice: 'woodblock', label: '3' },
      { id: 'p4', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 0.08, phase: 0, voice: 'clave', label: '4' },
      { id: 'p5', ratio: { kind: 'rational', num: 5, den: 1 }, amp: 0.38, phase: 0, voice: 'hihat', label: '5' },
      { id: 'p6', ratio: { kind: 'rational', num: 6, den: 1 }, amp: 0.05, phase: 0, voice: 'triangle', label: '6' },
      { id: 'p7', ratio: { kind: 'rational', num: 7, den: 1 }, amp: 0.22, phase: 0, voice: 'click', label: '7' },
    ]
  },
  {
    id: 'plucked-string',
    name: 'Plucked String',
    origin: 'preset',
    description: 'Ideal string pluck at 1/3 string position, removing partial 3 and scaling amp by 1/k^2.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '1' },
      { id: 'p2', ratio: { kind: 'rational', num: 2, den: 1 }, amp: 0.25, phase: 0, voice: 'snare', label: '2' },
      { id: 'p4', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 0.062, phase: 0, voice: 'clave', label: '4' },
      { id: 'p5', ratio: { kind: 'rational', num: 5, den: 1 }, amp: 0.04, phase: 0, voice: 'hihat', label: '5' },
      { id: 'p7', ratio: { kind: 'rational', num: 7, den: 1 }, amp: 0.02, phase: 0, voice: 'triangle', label: '7' },
    ]
  },
  {
    id: 'bell',
    name: 'Church Bell',
    origin: 'preset',
    description: 'Inharmonic idiophone with sub-octave hum, minor-third tierce, fifth, and octave nominal.',
    partials: [
      { id: 'p1', ratio: { kind: 'real', value: 0.5 }, amp: 0.8, phase: 0, voice: 'kick', label: 'Hum' },
      { id: 'p2', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'snare', label: 'Prime' },
      { id: 'p3', ratio: { kind: 'real', value: 1.2 }, amp: 0.7, phase: 0, voice: 'woodblock', label: 'Tierce' },
      { id: 'p4', ratio: { kind: 'real', value: 1.5 }, amp: 0.6, phase: 0, voice: 'clave', label: 'Quint' },
      { id: 'p5', ratio: { kind: 'rational', num: 2, den: 1 }, amp: 0.85, phase: 0, voice: 'triangle', label: 'Nominal' },
    ]
  },
  {
    id: 'floating-bars',
    name: 'Floating Free-Free Bar',
    origin: 'preset',
    description: 'Acoustic free-free vibrating bar modes (1 : 2.756 : 5.404 : 8.933), classic chime/glockenspiel.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: 'Mode 1' },
      { id: 'p2', ratio: { kind: 'real', value: 2.756 }, amp: 0.65, phase: 0, voice: 'woodblock', label: 'Mode 2' },
      { id: 'p3', ratio: { kind: 'real', value: 5.404 }, amp: 0.45, phase: 0, voice: 'clave', label: 'Mode 3' },
      { id: 'p4', ratio: { kind: 'real', value: 8.933 }, amp: 0.28, phase: 0, voice: 'triangle', label: 'Mode 4' },
    ]
  },
  {
    id: 'hemiola-3-2',
    name: '3 against 2 (Do to So)',
    origin: 'preset',
    description: 'The prototypical PPT 3:2 relation: a perfect fifth in pitch, a hemiola polyrhythm in rhythm.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 2, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '2 (Do)' },
      { id: 'p2', ratio: { kind: 'rational', num: 3, den: 1 }, amp: 0.9, phase: 0, voice: 'woodblock', label: '3 (So)' },
    ]
  },
  {
    id: 'polyrhythm-4-3',
    name: '4 against 3 (Fourth)',
    origin: 'preset',
    description: '4:3 polyrhythm in rhythm, perfect fourth in pitch.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 3, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '3' },
      { id: 'p2', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 0.9, phase: 0, voice: 'snare', label: '4' },
    ]
  }
];
