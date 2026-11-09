import { Shape, VoiceAnchor, VoiceId, Ratio } from './types';
import { flattenAnchorsToPartials } from './shape';

/**
 * Builds a chord-tone VoiceAnchor with its own fundamental and overtone series up to P5 (1x, 2x, 3x).
 */
export function createChordVoiceAnchor(
  id: string,
  name: string,
  ratio: Ratio,
  gain: number,
  voice: VoiceId = 'woodblock'
): VoiceAnchor {
  return {
    id,
    name,
    ratio,
    phaseOffset: 0,
    offsetToken: 'Do',
    gain,
    voice,
    mute: false,
    partials: [
      {
        id: `${id}_h1`,
        ratio: { kind: 'rational', num: 1, den: 1 },
        amp: 1.0,
        previousAmp: 1.0,
        phase: 0,
        voice,
        label: `${name} (1x Fund)`,
      },
      {
        id: `${id}_h2`,
        ratio: { kind: 'rational', num: 2, den: 1 },
        amp: 0.48,
        previousAmp: 0.48,
        phase: 0,
        voice: 'clave',
        label: `${name} (2x Oct)`,
      },
      {
        id: `${id}_h3`,
        ratio: { kind: 'rational', num: 3, den: 1 },
        amp: 0.28,
        previousAmp: 0.28,
        phase: 0,
        voice: 'triangle',
        label: `${name} (3x P5)`,
      },
    ],
  };
}

/**
 * Generates an acoustic piano-like partial structure with inharmonic string stiffness stretch:
 * f_k = k * f0 * sqrt(1 + B * k^2)
 * B is inharmonicity coefficient (typically ~0.0004 for middle register acoustic piano).
 */
export function createPianoPartials(count: number = 12, B: number = 0.0004) {
  const partials = [];
  const voiceList = ['kick', 'snare', 'woodblock', 'clave', 'hihat', 'triangle', 'click'] as const;

  for (let k = 1; k <= count; k++) {
    // Inharmonic frequency ratio
    const stretch = Math.sqrt(1 + B * k * k);
    const ratioVal = k * stretch;

    // Amplitude envelope of struck acoustic piano string: steep initial roll-off
    // with prominent 2nd & 3rd partials, then ~1/k^1.8 decay
    let amp: number;
    if (k === 1) amp = 1.0;
    else if (k === 2) amp = 0.85;
    else if (k === 3) amp = 0.65;
    else amp = 1.4 / Math.pow(k, 1.7);

    partials.push({
      id: `p_piano_${k}`,
      ratio: { kind: 'real' as const, value: ratioVal },
      amp: Math.round(amp * 1000) / 1000,
      phase: (k * 0.13) % 1.0,
      voice: voiceList[(k - 1) % voiceList.length],
      label: k === 1 ? '1 (Fund)' : `${k}`,
    });
  }
  return partials;
}

export const PRESET_SHAPES: Shape[] = [
  // ─────────────────────────────────────────────────────────────
  // 1. RHYTHMIC PATTERNS (Polyrhythms, Metres, Drum Grooves)
  // Arranged in ascending rhythmic & metric complexity:
  // Binary metre -> Foundational polyrhythms -> Syncopation -> Full drum groove
  // ─────────────────────────────────────────────────────────────
  {
    id: 'duple-1-2',
    name: 'Duple (1:2 Octave / 2-Layer)',
    origin: 'preset',
    category: 'rhythm',
    description: 'Fundamental and 2nd harmonic (octave in pitch, 2-layer pulse in rhythm). 2-prime power.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '1 (Downbeat)' },
      { id: 'p2', ratio: { kind: 'rational', num: 2, den: 1 }, amp: 0.75, phase: 0, voice: 'snare', label: '2 (Backbeat)' },
    ]
  },
  {
    id: 'duple-1-4',
    name: 'Quadruple (1:4 Double Octave / 4-Layer)',
    origin: 'preset',
    category: 'rhythm',
    description: '1 : 2 : 4 power-of-two octave stack. In rhythm, standard 4/4 meter subdivision with hierarchical accents.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '1 (Bar)' },
      { id: 'p2', ratio: { kind: 'rational', num: 2, den: 1 }, amp: 0.75, phase: 0, voice: 'snare', label: '2 (Half)' },
      { id: 'p3', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 0.55, phase: 0, voice: 'hihat', label: '4 (Quarter)' },
    ]
  },
  {
    id: 'hemiola-3-2',
    name: '3 against 2 (Do to So / Fifth)',
    origin: 'preset',
    category: 'rhythm',
    description: 'The prototypical PPT 3:2 relation: a perfect fifth in pitch, a hemiola polyrhythm in rhythm.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 2, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '2 (Do)' },
      { id: 'p2', ratio: { kind: 'rational', num: 3, den: 1 }, amp: 0.85, phase: 0, voice: 'woodblock', label: '3 (So)' },
    ]
  },
  {
    id: 'polyrhythm-4-3',
    name: '4 against 3 (Fourth / Polyrhythm)',
    origin: 'preset',
    category: 'rhythm',
    description: '4:3 polyrhythm in rhythm space, perfect fourth interval in pitch space.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 3, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '3 (Pulse)' },
      { id: 'p2', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 0.85, phase: 0, voice: 'snare', label: '4 (Cross)' },
    ]
  },
  {
    id: 'polyrhythm-5-4',
    name: '5 against 4 (Major Third)',
    origin: 'preset',
    category: 'rhythm',
    description: '5:4 ratio: 5-prime quintuplet polyrhythm in rhythm, pure Just major third in pitch.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '4 (Do)' },
      { id: 'p2', ratio: { kind: 'rational', num: 5, den: 1 }, amp: 0.85, phase: 0, voice: 'clave', label: '5 (Mi)' },
    ]
  },
  {
    id: 'polyrhythm-7-4',
    name: '7 against 4 (Harmonic 7th)',
    origin: 'preset',
    category: 'rhythm',
    description: '7:4 ratio: septuplet cross-rhythm in tempo space, blue harmonic minor seventh in pitch space.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '4 (Root)' },
      { id: 'p2', ratio: { kind: 'rational', num: 7, den: 1 }, amp: 0.8, phase: 0, voice: 'triangle', label: '7 (Harmonic 7th)' },
    ]
  },
  {
    id: 'tresillo-3-3-2',
    name: 'Tresillo Syncopation (3+3+2)',
    origin: 'preset',
    category: 'rhythm',
    description: 'Afro-Cuban 3+3+2 tresillo built from three DuMetric Voice Anchors at Do (0/8), DoLa (3/8), and La (6/8) over an 8-pulse hi-hat grid.',
    anchors: [
      {
        id: 'tres_a1',
        name: 'Hit 1 — Downbeat (Do 0/8)',
        ratio: { kind: 'rational', num: 1, den: 1 },
        phaseOffset: 0.0,
        offsetToken: 'Do',
        gain: 1.0,
        voice: 'kick',
        partials: [
          { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '1 (Do 0/8)' },
        ],
      },
      {
        id: 'tres_a2',
        name: 'Hit 2 — Tresillo Accent (DoLa 3/8)',
        ratio: { kind: 'rational', num: 1, den: 1 },
        phaseOffset: 0.375,
        offsetToken: 'DoLa',
        gain: 0.92,
        voice: 'clave',
        partials: [
          { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'clave', label: '2 (DoLa 3/8)' },
        ],
      },
      {
        id: 'tres_a3',
        name: 'Hit 3 — Tresillo Pickup (La 6/8)',
        ratio: { kind: 'rational', num: 1, den: 1 },
        phaseOffset: 0.75,
        offsetToken: 'La',
        gain: 0.88,
        voice: 'snare',
        partials: [
          { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'snare', label: '3 (La 6/8)' },
        ],
      },
      {
        id: 'tres_grid',
        name: 'Subdivision Grid (8th Pulse)',
        ratio: { kind: 'rational', num: 1, den: 1 },
        phaseOffset: 0.0,
        offsetToken: 'Do',
        gain: 0.45,
        voice: 'hihat',
        partials: [
          { id: 'p_grid8', ratio: { kind: 'rational', num: 8, den: 1 }, amp: 1.0, phase: 0, voice: 'hihat', label: '8x Grid' },
        ],
      },
    ],
    partials: [
      { id: 'tres_a1_p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0.0, voice: 'kick', label: '1 (Do 0/8)' },
      { id: 'tres_a2_p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 0.92, phase: 0.375, voice: 'clave', label: '2 (DoLa 3/8)' },
      { id: 'tres_a3_p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 0.88, phase: 0.75, voice: 'snare', label: '3 (La 6/8)' },
      { id: 'tres_grid_p_grid8', ratio: { kind: 'rational', num: 8, den: 1 }, amp: 0.45, phase: 0.0, voice: 'hihat', label: '8x Grid' },
    ],
  },
  {
    id: 'four-on-the-floor',
    name: '4 on the Floor (Club Groove)',
    origin: 'preset',
    category: 'rhythm',
    description: 'Classic 4/4 electronic drum groove: kick on all 4 quarter beats (Do), snare on beats 2 & 4 (Me offset), and offbeat 8th-note open hi-hats (DoFi offset).',
    anchors: [
      {
        id: 'club_kick',
        name: 'Kick (4/Floor Downbeats)',
        ratio: { kind: 'rational', num: 1, den: 1 },
        phaseOffset: 0.0,
        offsetToken: 'Do',
        gain: 1.0,
        voice: 'kick',
        partials: [
          { id: 'p1', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: 'Kick (4/Floor)' },
        ],
      },
      {
        id: 'club_snare',
        name: 'Snare (Backbeats 2 & 4 @ Me)',
        ratio: { kind: 'rational', num: 1, den: 1 },
        phaseOffset: 0.25,
        offsetToken: 'Me',
        gain: 0.85,
        voice: 'snare',
        partials: [
          { id: 'p1', ratio: { kind: 'rational', num: 2, den: 1 }, amp: 1.0, phase: 0, voice: 'snare', label: 'Snare (2 & 4)' },
        ],
      },
      {
        id: 'club_hat',
        name: 'Hi-Hat (Offbeat 8ths @ DoFi)',
        ratio: { kind: 'rational', num: 1, den: 1 },
        phaseOffset: 0.125,
        offsetToken: 'DoFi',
        gain: 0.65,
        voice: 'hihat',
        partials: [
          { id: 'p1', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 1.0, phase: 0, voice: 'hihat', label: 'Hi-Hat (Offbeat)' },
        ],
      },
    ],
    partials: [
      { id: 'club_kick_p1', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: 'Kick (4/Floor)' },
      { id: 'club_snare_p1', ratio: { kind: 'rational', num: 2, den: 1 }, amp: 0.85, phase: 0.25, voice: 'snare', label: 'Snare (2 & 4)' },
      { id: 'club_hat_p1', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 0.65, phase: 0.125, voice: 'hihat', label: 'Hi-Hat (Offbeat)' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 2. HARMONIES & CHORDS (Multi-Anchor Fundamentals & Overtones to P5)
  // Arranged in ascending harmonic complexity:
  // 3-note triads (Major -> Minor -> Sus4) -> 4-note 7th chords (Dom7 -> Min7 -> Maj7)
  // Each chord tone is a Voice Anchor carrying its own 1x, 2x, 3x overtone series!
  // ─────────────────────────────────────────────────────────────
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('maj_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('maj_mi', 'Major 3rd (Mi 5/4)', { kind: 'rational', num: 5, den: 4 }, 0.88, 'clave'),
      createChordVoiceAnchor('maj_so', 'Perfect 5th (So 3/2)', { kind: 'rational', num: 3, den: 2 }, 0.78, 'woodblock'),
    ];
    return {
      id: 'major-triad-4-5-6',
      name: 'Major Triad (4 : 5 : 6 Root Position)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Pure Just Major Triad (1 : 5/4 : 3/2) with 3 Voice Anchors (Do, Mi, So), each carrying its own fundamental, octave (2x), and fifth (3x) overtone partials.',
      adsr: { attack: 0.04, decay: 1.2, sustain: 0.75, release: 0.35, damping: 0.2 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('min_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('min_me', 'Minor 3rd (Me 6/5)', { kind: 'rational', num: 6, den: 5 }, 0.88, 'clave'),
      createChordVoiceAnchor('min_so', 'Perfect 5th (So 3/2)', { kind: 'rational', num: 3, den: 2 }, 0.78, 'woodblock'),
    ];
    return {
      id: 'minor-triad-10-12-15',
      name: 'Minor Triad (10 : 12 : 15)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Pure Just Minor Triad (1 : 6/5 : 3/2) with 3 Voice Anchors (Do, Me, So), each carrying its own fundamental and overtone partials up to P5.',
      adsr: { attack: 0.04, decay: 1.2, sustain: 0.75, release: 0.35, damping: 0.2 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('sus_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('sus_fa', 'Perfect 4th (Fa 4/3)', { kind: 'rational', num: 4, den: 3 }, 0.85, 'snare'),
      createChordVoiceAnchor('sus_so', 'Perfect 5th (So 3/2)', { kind: 'rational', num: 3, den: 2 }, 0.78, 'woodblock'),
    ];
    return {
      id: 'sus4-6-8-9',
      name: 'Suspended 4th (6 : 8 : 9 Sus4)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Suspended 4th triad (1 : 4/3 : 3/2) with 3 Voice Anchors (Do, Fa, So) and nested overtone partials up to P5.',
      adsr: { attack: 0.04, decay: 1.1, sustain: 0.75, release: 0.35, damping: 0.2 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('dom_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('dom_mi', 'Major 3rd (Mi 5/4)', { kind: 'rational', num: 5, den: 4 }, 0.85, 'clave'),
      createChordVoiceAnchor('dom_so', 'Perfect 5th (So 3/2)', { kind: 'rational', num: 3, den: 2 }, 0.75, 'woodblock'),
      createChordVoiceAnchor('dom_te', 'Harmonic 7th (Te 7/4)', { kind: 'rational', num: 7, den: 4 }, 0.68, 'triangle'),
    ];
    return {
      id: 'dominant-7th-4-5-6-7',
      name: 'Dominant 7th (4 : 5 : 6 : 7 Harmonic 7th)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Harmonic Dominant 7th chord (1 : 5/4 : 3/2 : 7/4) with 4 Voice Anchors (Do, Mi, So, Te) and nested overtone partials up to P5.',
      adsr: { attack: 0.04, decay: 1.1, sustain: 0.75, release: 0.35, damping: 0.25 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('m7_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('m7_me', 'Minor 3rd (Me 6/5)', { kind: 'rational', num: 6, den: 5 }, 0.85, 'clave'),
      createChordVoiceAnchor('m7_so', 'Perfect 5th (So 3/2)', { kind: 'rational', num: 3, den: 2 }, 0.75, 'woodblock'),
      createChordVoiceAnchor('m7_te', 'Minor 7th (Te 9/5)', { kind: 'rational', num: 9, den: 5 }, 0.68, 'triangle'),
    ];
    return {
      id: 'minor-7th-10-12-15-18',
      name: 'Minor 7th (10 : 12 : 15 : 18)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Mellow Just Minor 7th chord (1 : 6/5 : 3/2 : 9/5) with 4 Voice Anchors (Do, Me, So, Te) and nested overtone partials up to P5.',
      adsr: { attack: 0.04, decay: 1.1, sustain: 0.75, release: 0.35, damping: 0.25 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('maj7_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('maj7_mi', 'Major 3rd (Mi 5/4)', { kind: 'rational', num: 5, den: 4 }, 0.85, 'clave'),
      createChordVoiceAnchor('maj7_so', 'Perfect 5th (So 3/2)', { kind: 'rational', num: 3, den: 2 }, 0.75, 'woodblock'),
      createChordVoiceAnchor('maj7_ti', 'Major 7th (Ti 15/8)', { kind: 'rational', num: 15, den: 8 }, 0.68, 'triangle'),
    ];
    return {
      id: 'major-7th-8-10-12-15',
      name: 'Major 7th (8 : 10 : 12 : 15)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Lush Just Major 7th chord (1 : 5/4 : 3/2 : 15/8) with 4 Voice Anchors (Do, Mi, So, Ti) and nested overtone partials up to P5.',
      adsr: { attack: 0.04, decay: 1.1, sustain: 0.75, release: 0.35, damping: 0.25 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),

  // ─────────────────────────────────────────────────────────────
  // 3. TIMBRAL PROFILES (Acoustic Instruments & Synthetic Waves)
  // Arranged in ascending timbral & inharmonic complexity:
  // Elementary synthetic waves (Sine -> Triangle -> Square -> Saw)
  // -> Acoustic harmonic instruments (Clarinet -> Plucked String -> Piano)
  // -> Inharmonic idiophones (Vibraphone Bar -> Church Bell)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'pure-tone',
    name: 'Sine Wave (Pure Tone / Single Beat)',
    origin: 'preset',
    category: 'timbre',
    description: 'Fundamental only (single periodic component). Pure sine wave in pitch, steady metronome click in rhythm.',
    adsr: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1, damping: 0.0 },
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'woodblock', label: '1 (Fund)' }
    ]
  },
  {
    id: 'triangle-like',
    name: 'Triangle Wave (Warm / Flute)',
    origin: 'preset',
    category: 'timbre',
    description: 'Odd integer harmonics with steep 1/k² roll-off (1, 1/9, 1/25, 1/49). Warm, mellow, fluty timbre.',
    adsr: { attack: 0.02, decay: 0.3, sustain: 0.9, release: 0.15, damping: 0.0 },
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'woodblock', label: '1' },
      { id: 'p3', ratio: { kind: 'rational', num: 3, den: 1 }, amp: 1 / 9, phase: 0.5, voice: 'triangle', label: '3' },
      { id: 'p5', ratio: { kind: 'rational', num: 5, den: 1 }, amp: 1 / 25, phase: 0, voice: 'clave', label: '5' },
      { id: 'p7', ratio: { kind: 'rational', num: 7, den: 1 }, amp: 1 / 49, phase: 0.5, voice: 'click', label: '7' },
    ]
  },
  {
    id: 'square-like',
    name: 'Square Wave (Hollow Reed)',
    origin: 'preset',
    category: 'timbre',
    description: 'Odd integer harmonics only (1, 3, 5, 7) with amp = 1/k. Hollow, woody resonance.',
    adsr: { attack: 0.02, decay: 0.3, sustain: 0.85, release: 0.2, damping: 0.0 },
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '1' },
      { id: 'p3', ratio: { kind: 'rational', num: 3, den: 1 }, amp: 1 / 3, phase: 0, voice: 'woodblock', label: '3' },
      { id: 'p5', ratio: { kind: 'rational', num: 5, den: 1 }, amp: 1 / 5, phase: 0, voice: 'clave', label: '5' },
      { id: 'p7', ratio: { kind: 'rational', num: 7, den: 1 }, amp: 1 / 7, phase: 0, voice: 'hihat', label: '7' },
    ]
  },
  {
    id: 'saw-like',
    name: 'Sawtooth (Rich Brass / Strings)',
    origin: 'preset',
    category: 'timbre',
    description: 'All integer harmonics with amp = 1/k. Bright, rich spectrum with even & odd prime presence.',
    adsr: { attack: 0.05, decay: 0.4, sustain: 0.85, release: 0.25, damping: 0.1 },
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
    id: 'clarinet-like',
    name: 'Clarinet (Cylindrical Bore)',
    origin: 'preset',
    category: 'timbre',
    description: 'Odd partials strongly dominant, even partials present but soft, capturing the cylindrical bore acoustics of a clarinet.',
    adsr: { attack: 0.04, decay: 0.25, sustain: 0.9, release: 0.15, damping: 0.05 },
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
    name: 'Plucked String (Guitar / Harpsichord)',
    origin: 'preset',
    category: 'timbre',
    description: 'Ideal acoustic string pluck at 1/3 node position with rapid high-frequency dissipation and acoustic soundboard ring.',
    adsr: { attack: 0.003, decay: 1.2, sustain: 0.06, release: 0.35, damping: 0.8 },
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '1' },
      { id: 'p2', ratio: { kind: 'rational', num: 2, den: 1 }, amp: 0.25, phase: 0, voice: 'snare', label: '2' },
      { id: 'p4', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 0.062, phase: 0, voice: 'clave', label: '4' },
      { id: 'p5', ratio: { kind: 'rational', num: 5, den: 1 }, amp: 0.04, phase: 0, voice: 'hihat', label: '5' },
      { id: 'p7', ratio: { kind: 'rational', num: 7, den: 1 }, amp: 0.02, phase: 0, voice: 'triangle', label: '7' },
    ]
  },
  {
    id: 'piano',
    name: 'Acoustic Piano (Stretched String)',
    origin: 'preset',
    category: 'timbre',
    description: 'Struck steel string with inharmonic string-stiffness stretch (B = 0.0004), percussive hammer attack, and acoustic damping decay.',
    adsr: { attack: 0.006, decay: 1.8, sustain: 0.22, release: 0.5, damping: 0.6 },
    partials: createPianoPartials(10, 0.0004),
  },
  {
    id: 'floating-bars',
    name: 'Vibraphone / Free-Free Bar',
    origin: 'preset',
    category: 'timbre',
    description: 'Acoustic free-free vibrating chime bar modes (1 : 2.756 : 5.404 : 8.933), classic chime/glockenspiel with singing decay.',
    adsr: { attack: 0.004, decay: 2.2, sustain: 0.18, release: 0.6, damping: 0.35 },
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: 'Mode 1' },
      { id: 'p2', ratio: { kind: 'real', value: 2.756 }, amp: 0.65, phase: 0, voice: 'woodblock', label: 'Mode 2' },
      { id: 'p3', ratio: { kind: 'real', value: 5.404 }, amp: 0.45, phase: 0, voice: 'clave', label: 'Mode 3' },
      { id: 'p4', ratio: { kind: 'real', value: 8.933 }, amp: 0.28, phase: 0, voice: 'triangle', label: 'Mode 4' },
    ]
  },
  {
    id: 'bell',
    name: 'Church Bell (Inharmonic Idiophone)',
    origin: 'preset',
    category: 'timbre',
    description: 'Acoustic bell with sub-octave hum, minor-third tierce, quint, and nominal octave with long metallic resonance.',
    adsr: { attack: 0.002, decay: 2.8, sustain: 0.12, release: 0.8, damping: 0.4 },
    partials: [
      { id: 'p1', ratio: { kind: 'real', value: 0.5 }, amp: 0.8, phase: 0, voice: 'kick', label: 'Hum' },
      { id: 'p2', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'snare', label: 'Prime' },
      { id: 'p3', ratio: { kind: 'real', value: 1.2 }, amp: 0.7, phase: 0, voice: 'woodblock', label: 'Tierce' },
      { id: 'p4', ratio: { kind: 'real', value: 1.5 }, amp: 0.6, phase: 0, voice: 'clave', label: 'Quint' },
      { id: 'p5', ratio: { kind: 'rational', num: 2, den: 1 }, amp: 0.85, phase: 0, voice: 'triangle', label: 'Nominal' },
    ]
  }
];
