import { Shape, VoiceAnchor, VoiceId, Ratio } from './types';
import { flattenAnchorsToPartials } from './shape';

/**
 * Builds a chord-tone VoiceAnchor with its own fundamental and harmonic overtone series up to P5 (1x, 2x, 3x, 4x, 5x).
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
        amp: 0.35,
        previousAmp: 0.35,
        phase: 0,
        voice: 'clave',
        label: `${name} (2x Oct)`,
      },
      {
        id: `${id}_h3`,
        ratio: { kind: 'rational', num: 3, den: 1 },
        amp: 0.20,
        previousAmp: 0.20,
        phase: 0,
        voice: 'triangle',
        label: `${name} (3x P5)`,
      },
      {
        id: `${id}_h4`,
        ratio: { kind: 'rational', num: 4, den: 1 },
        amp: 0.12,
        previousAmp: 0.12,
        phase: 0,
        voice: 'hihat',
        label: `${name} (4x 2Oct)`,
      },
      {
        id: `${id}_h5`,
        ratio: { kind: 'rational', num: 5, den: 1 },
        amp: 0.08,
        previousAmp: 0.08,
        phase: 0,
        voice: 'woodblock',
        label: `${name} (5x M3)`,
      },
    ],
  };
}

/**
 * Creates a two-voice dyad preset with rich overtone series for tuning and interval exploration.
 * Australian English spelling maintained.
 */
export function createDyadShape(
  id: string,
  name: string,
  description: string,
  secondRatio: Ratio,
  secondLabel: string,
  secondVoice: VoiceId = 'woodblock'
): Shape {
  const anchors: VoiceAnchor[] = [
    createChordVoiceAnchor(`${id}_do`, 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
    createChordVoiceAnchor(`${id}_second`, secondLabel, secondRatio, 1.0, secondVoice),
  ];
  return {
    id,
    name,
    origin: 'preset',
    category: 'harmony',
    description,
    adsr: { attack: 0.04, decay: 1.2, sustain: 0.75, release: 0.35, damping: 0.2 },
    anchors,
    partials: flattenAnchorsToPartials(anchors),
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
      phase: 0,
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
    id: 'duple-1-8',
    name: 'Octuple (1:8 Triple Octave / 8th Notes)',
    origin: 'preset',
    category: 'rhythm',
    description: '1 : 2 : 4 : 8 binary subdivision stack (Triple Octave in pitch space, 8th-note pulse stream in rhythm space). The ideal canvas for subtractive rhythm sieves like Tresillo (3+3+2) and Cinquillo.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '1 (Bar)' },
      { id: 'p2', ratio: { kind: 'rational', num: 2, den: 1 }, amp: 0.8, phase: 0, voice: 'snare', label: '2 (Half)' },
      { id: 'p3', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 0.6, phase: 0, voice: 'hihat', label: '4 (Quarter)' },
      { id: 'p4', ratio: { kind: 'rational', num: 8, den: 1 }, amp: 0.45, phase: 0, voice: 'clave', label: '8 (8th Note)' },
    ]
  },
  {
    id: 'duple-1-16',
    name: 'Hexadecuple (1:16 Quad Octave / 16th Notes)',
    origin: 'preset',
    category: 'rhythm',
    description: '1 : 2 : 4 : 8 : 16 full 16th-note binary subdivision stack (Quadruple Octave in pitch space). The foundational canvas for subtracting onsets into 16-step Son Clave, Bossa Nova, and funk syncopations.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '1 (Bar)' },
      { id: 'p2', ratio: { kind: 'rational', num: 2, den: 1 }, amp: 0.8, phase: 0, voice: 'snare', label: '2 (Half)' },
      { id: 'p3', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 0.65, phase: 0, voice: 'hihat', label: '4 (Quarter)' },
      { id: 'p4', ratio: { kind: 'rational', num: 8, den: 1 }, amp: 0.5, phase: 0, voice: 'clave', label: '8 (8th Note)' },
      { id: 'p5', ratio: { kind: 'rational', num: 16, den: 1 }, amp: 0.35, phase: 0, voice: 'click', label: '16 (16th Note)' },
    ]
  },
  {
    id: 'hemiola-3-2',
    name: '3 against 2 (Do to So / Fifth)',
    origin: 'preset',
    category: 'rhythm',
    description: 'The prototypical PPT 3:2 relation: a perfect fifth in pitch, a hemiola polyrhythm in rhythm.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '1 (Scene Root / 2-Pulse)' },
      { id: 'p2', ratio: { kind: 'rational', num: 3, den: 2 }, amp: 0.85, phase: 0, voice: 'woodblock', label: '3/2 (Fifth / 3-Pulse)' },
    ]
  },
  {
    id: 'polyrhythm-4-3',
    name: '4 against 3 (Fourth / Polyrhythm)',
    origin: 'preset',
    category: 'rhythm',
    description: '4:3 polyrhythm in rhythm space, perfect fourth interval in pitch space.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '1 (Scene Root / 3-Pulse)' },
      { id: 'p2', ratio: { kind: 'rational', num: 4, den: 3 }, amp: 0.85, phase: 0, voice: 'snare', label: '4/3 (Fourth / 4-Pulse)' },
    ]
  },
  {
    id: 'polyrhythm-5-4',
    name: '5 against 4 (Major Third)',
    origin: 'preset',
    category: 'rhythm',
    description: '5:4 ratio: 5-prime quintuplet polyrhythm in rhythm, pure Just major third in pitch.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '1 (Scene Root / 4-Pulse)' },
      { id: 'p2', ratio: { kind: 'rational', num: 5, den: 4 }, amp: 0.85, phase: 0, voice: 'clave', label: '5/4 (Major Third / 5-Pulse)' },
    ]
  },
  {
    id: 'polyrhythm-7-4',
    name: '7 against 4 (Harmonic 7th)',
    origin: 'preset',
    category: 'rhythm',
    description: '7:4 ratio: septuplet cross-rhythm in tempo space, blue harmonic minor seventh in pitch space.',
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'kick', label: '1 (Scene Root / 4-Pulse)' },
      { id: 'p2', ratio: { kind: 'rational', num: 7, den: 4 }, amp: 0.8, phase: 0, voice: 'triangle', label: '7/4 (Harmonic 7th / 7-Pulse)' },
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
  // Each chord tone is a Voice Anchor voiced equally (gain 1.0) carrying its own 1x, 2x, 3x overtone series!
  // ─────────────────────────────────────────────────────────────
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('maj_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('maj_mi', 'Major 3rd (Mi 5/4)', { kind: 'rational', num: 5, den: 4 }, 1.0, 'clave'),
      createChordVoiceAnchor('maj_so', 'Perfect 5th (So 3/2)', { kind: 'rational', num: 3, den: 2 }, 1.0, 'woodblock'),
    ];
    return {
      id: 'major-triad-4-5-6',
      name: 'Major Triad (4 : 5 : 6 Root Position)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Pure Just Major Triad (1 : 5/4 : 3/2) with 3 Voice Anchors (Do, Mi, So) voiced equally, each carrying rich harmonic overtone partials up to P5 (1x, 2x, 3x, 4x, 5x).',
      adsr: { attack: 0.04, decay: 1.2, sustain: 0.75, release: 0.35, damping: 0.2 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('min_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('min_me', 'Minor 3rd (Me 6/5)', { kind: 'rational', num: 6, den: 5 }, 1.0, 'clave'),
      createChordVoiceAnchor('min_so', 'Perfect 5th (So 3/2)', { kind: 'rational', num: 3, den: 2 }, 1.0, 'woodblock'),
    ];
    return {
      id: 'minor-triad-10-12-15',
      name: 'Minor Triad (10 : 12 : 15)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Pure Just Minor Triad (1 : 6/5 : 3/2) with 3 Voice Anchors (Do, Me, So) voiced equally, each carrying its own fundamental and overtone partials up to P5.',
      adsr: { attack: 0.04, decay: 1.2, sustain: 0.75, release: 0.35, damping: 0.2 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('sus_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('sus_fa', 'Perfect 4th (Fa 4/3)', { kind: 'rational', num: 4, den: 3 }, 1.0, 'snare'),
      createChordVoiceAnchor('sus_so', 'Perfect 5th (So 3/2)', { kind: 'rational', num: 3, den: 2 }, 1.0, 'woodblock'),
    ];
    return {
      id: 'sus4-6-8-9',
      name: 'Suspended 4th (6 : 8 : 9 Sus4)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Suspended 4th triad (1 : 4/3 : 3/2) with 3 Voice Anchors (Do, Fa, So) voiced equally and nested overtone partials up to P5.',
      adsr: { attack: 0.04, decay: 1.1, sustain: 0.75, release: 0.35, damping: 0.2 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('dom_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('dom_mi', 'Major 3rd (Mi 5/4)', { kind: 'rational', num: 5, den: 4 }, 1.0, 'clave'),
      createChordVoiceAnchor('dom_so', 'Perfect 5th (So 3/2)', { kind: 'rational', num: 3, den: 2 }, 1.0, 'woodblock'),
      createChordVoiceAnchor('dom_te', 'Harmonic 7th (Te 7/4)', { kind: 'rational', num: 7, den: 4 }, 1.0, 'triangle'),
    ];
    return {
      id: 'dominant-7th-4-5-6-7',
      name: 'Dominant 7th (4 : 5 : 6 : 7 Harmonic 7th)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Harmonic Dominant 7th chord (1 : 5/4 : 3/2 : 7/4) with 4 Voice Anchors (Do, Mi, So, Te) voiced equally and nested overtone partials up to P5.',
      adsr: { attack: 0.04, decay: 1.1, sustain: 0.75, release: 0.35, damping: 0.25 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('m7_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('m7_me', 'Minor 3rd (Me 6/5)', { kind: 'rational', num: 6, den: 5 }, 1.0, 'clave'),
      createChordVoiceAnchor('m7_so', 'Perfect 5th (So 3/2)', { kind: 'rational', num: 3, den: 2 }, 1.0, 'woodblock'),
      createChordVoiceAnchor('m7_te', 'Minor 7th (Te 9/5)', { kind: 'rational', num: 9, den: 5 }, 1.0, 'triangle'),
    ];
    return {
      id: 'minor-7th-10-12-15-18',
      name: 'Minor 7th (10 : 12 : 15 : 18)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Mellow Just Minor 7th chord (1 : 6/5 : 3/2 : 9/5) with 4 Voice Anchors (Do, Me, So, Te) voiced equally and nested overtone partials up to P5.',
      adsr: { attack: 0.04, decay: 1.1, sustain: 0.75, release: 0.35, damping: 0.25 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('maj7_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('maj7_mi', 'Major 3rd (Mi 5/4)', { kind: 'rational', num: 5, den: 4 }, 1.0, 'clave'),
      createChordVoiceAnchor('maj7_so', 'Perfect 5th (So 3/2)', { kind: 'rational', num: 3, den: 2 }, 1.0, 'woodblock'),
      createChordVoiceAnchor('maj7_ti', 'Major 7th (Ti 15/8)', { kind: 'rational', num: 15, den: 8 }, 1.0, 'triangle'),
    ];
    return {
      id: 'major-7th-8-10-12-15',
      name: 'Major 7th (8 : 10 : 12 : 15)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Lush Just Major 7th chord (1 : 5/4 : 3/2 : 15/8) with 4 Voice Anchors (Do, Mi, So, Ti) voiced equally and nested overtone partials up to P5.',
      adsr: { attack: 0.04, decay: 1.1, sustain: 0.75, release: 0.35, damping: 0.25 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),

  // ── Tuning Comparisons & Chromatic Dyads (Two-Voice Intervals) ──
  // 1. Minor 2nd (Ra)
  createDyadShape(
    'dyad-m2-just-16-15',
    'Minor 2nd (Just 16:15 · 111.7¢)',
    'Diatonic semitone (16:15). Intense acoustic dissonance and beating in pitch space; 16-against-15 phasing polyrhythm in rhythm space.',
    { kind: 'rational', num: 16, den: 15 },
    'Minor 2nd (Ra 16/15)',
    'snare'
  ),
  createDyadShape(
    'dyad-m2-12tet',
    'Minor 2nd (12-TET · 100.0¢)',
    'Standard 12-TET equal-tempered semitone (2^(1/12) ≈ 1.05946). Coarse grid reference.',
    { kind: 'real', value: Math.pow(2, 1 / 12) },
    'Minor 2nd (Ra 12-TET)',
    'snare'
  ),
  createDyadShape(
    'dyad-m2-dutri',
    'Minor 2nd (PPT Du-Fractal Ra · 102.1¢)',
    'PPT-native 12-tone closure: 3-limit DuTri operator applied to Fi axis (3√2/4 ≈ 1.06066). Inherited irrationality below JND of 12-TET.',
    { kind: 'real', value: (3 * Math.SQRT2) / 4 },
    'Minor 2nd (Ra DuTri)',
    'snare'
  ),

  // 2. Major 2nd (Re)
  createDyadShape(
    'dyad-M2-just-9-8',
    'Major 2nd (Just 9:8 · 203.9¢)',
    'Major whole tone (9:8). 3-prime power ratio with clear consonant beating.',
    { kind: 'rational', num: 9, den: 8 },
    'Major 2nd (Re 9/8)',
    'woodblock'
  ),
  createDyadShape(
    'dyad-M2-12tet',
    'Major 2nd (12-TET · 200.0¢)',
    'Standard 12-TET whole tone (2^(2/12) ≈ 1.12246).',
    { kind: 'real', value: Math.pow(2, 2 / 12) },
    'Major 2nd (Re 12-TET)',
    'woodblock'
  ),

  // 3. Minor 3rd (Me)
  createDyadShape(
    'dyad-m3-just-6-5',
    'Minor 3rd (Just 6:5 · 315.6¢)',
    'Pure 5-limit Just minor 3rd (6:5). Rich harmonic overlap.',
    { kind: 'rational', num: 6, den: 5 },
    'Minor 3rd (Me 6/5)',
    'clave'
  ),
  createDyadShape(
    'dyad-m3-12tet',
    'Minor 3rd (12-TET · 300.0¢)',
    'Standard 12-TET minor 3rd (2^(3/12) ≈ 1.18921). Noticeably 15.6¢ flat compared to pure 6:5.',
    { kind: 'real', value: Math.pow(2, 3 / 12) },
    'Minor 3rd (Me 12-TET)',
    'clave'
  ),

  // 4. Major 3rd (Mi)
  createDyadShape(
    'dyad-M3-just-5-4',
    'Major 3rd (Just 5:4 · 386.3¢)',
    'Pure 5-limit Just major 3rd (5:4). Sweet, completely beatless consonance.',
    { kind: 'rational', num: 5, den: 4 },
    'Major 3rd (Mi 5/4)',
    'clave'
  ),
  createDyadShape(
    'dyad-M3-12tet',
    'Major 3rd (12-TET · 400.0¢)',
    'Standard 12-TET major 3rd (2^(4/12) ≈ 1.25992). Severely 13.7¢ sharp, producing rapid, audible acoustic beating.',
    { kind: 'real', value: Math.pow(2, 4 / 12) },
    'Major 3rd (Mi 12-TET)',
    'clave'
  ),
  createDyadShape(
    'dyad-M3-meantone',
    'Major 3rd (Quarter-Comma Meantone · 386.3¢)',
    'Quarter-comma meantone temperament preserves the pure 5:4 major 3rd exactly (1.25000).',
    { kind: 'real', value: 1.25 },
    'Major 3rd (Mi Meantone)',
    'clave'
  ),

  // 5. Perfect 4th (Fa)
  createDyadShape(
    'dyad-P4-just-4-3',
    'Perfect 4th (Just 4:3 · 498.0¢)',
    'Pure 3-limit fourth (4:3). PPT DuTri base triangle partner.',
    { kind: 'rational', num: 4, den: 3 },
    'Perfect 4th (Fa 4/3)',
    'snare'
  ),
  createDyadShape(
    'dyad-P4-12tet',
    'Perfect 4th (12-TET · 500.0¢)',
    'Standard 12-TET perfect 4th (2^(5/12) ≈ 1.33484). Only 2.0¢ sharp.',
    { kind: 'real', value: Math.pow(2, 5 / 12) },
    'Perfect 4th (Fa 12-TET)',
    'snare'
  ),

  // 6. Tritone (Fi) — The Central Axis
  createDyadShape(
    'dyad-tritone-dutri',
    'Tritone (PPT Du-Fractal Fi · √2 · 600.0¢)',
    'Prime Period Theory central axis: exact geometric bisection of the octave (√2 ≈ 1.41421). Self-inverse mirror point of the 12-tone system.',
    { kind: 'real', value: Math.SQRT2 },
    'Tritone (Fi √2 Axis)',
    'triangle'
  ),
  createDyadShape(
    'dyad-tritone-euler-7-5',
    'Tritone (Euler Just 7:5 · 582.5¢)',
    'Septimal 7-limit tritone (7:5). Consonant harmonic blues tritone with moderate beating.',
    { kind: 'rational', num: 7, den: 5 },
    'Tritone (Fi 7/5 Septimal)',
    'triangle'
  ),
  createDyadShape(
    'dyad-tritone-diatonic-45-32',
    'Tritone (Diatonic Just 45:32 · 590.2¢)',
    'Pythagorean diatonic augmented 4th (45:32). Classic diabolus in musica with sharp, dissonant friction.',
    { kind: 'rational', num: 45, den: 32 },
    'Tritone (Fi 45/32 Diatonic)',
    'triangle'
  ),

  // 7. Perfect 5th (So)
  createDyadShape(
    'dyad-P5-just-3-2',
    'Perfect 5th (Just 3:2 · 702.0¢)',
    'Pure 3-limit Just fifth (3:2). In rhythm space, the fundamental 3:2 hemiola polyrhythm.',
    { kind: 'rational', num: 3, den: 2 },
    'Perfect 5th (So 3/2)',
    'woodblock'
  ),
  createDyadShape(
    'dyad-P5-12tet',
    'Perfect 5th (12-TET · 700.0¢)',
    'Standard 12-TET perfect 5th (2^(7/12) ≈ 1.49831). Very close to pure (1.95¢ flat).',
    { kind: 'real', value: Math.pow(2, 7 / 12) },
    'Perfect 5th (So 12-TET)',
    'woodblock'
  ),
  createDyadShape(
    'dyad-P5-meantone',
    'Perfect 5th (Quarter-Comma Meantone · 696.6¢)',
    'Quarter-comma meantone fifth (5^(1/4) ≈ 1.49535). Narrowed by 5.4¢ to preserve pure major 3rds.',
    { kind: 'real', value: Math.pow(5, 0.25) },
    'Perfect 5th (So Meantone)',
    'woodblock'
  ),

  // 8. Minor 6th (Le)
  createDyadShape(
    'dyad-m6-just-8-5',
    'Minor 6th (Just 8:5 · 813.7¢)',
    'Pure 5-limit Just minor 6th (8:5). Inversion of 5/4 major 3rd.',
    { kind: 'rational', num: 8, den: 5 },
    'Minor 6th (Le 8/5)',
    'snare'
  ),
  createDyadShape(
    'dyad-m6-12tet',
    'Minor 6th (12-TET · 800.0¢)',
    'Standard 12-TET minor 6th (2^(8/12) ≈ 1.58740). 13.7¢ flat.',
    { kind: 'real', value: Math.pow(2, 8 / 12) },
    'Minor 6th (Le 12-TET)',
    'snare'
  ),

  // 9. Major 6th (La)
  createDyadShape(
    'dyad-M6-just-5-3',
    'Major 6th (Just 5:3 · 884.4¢)',
    'Pure 5-limit Just major 6th (5:3). Sweet pastoral consonance.',
    { kind: 'rational', num: 5, den: 3 },
    'Major 6th (La 5/3)',
    'woodblock'
  ),
  createDyadShape(
    'dyad-M6-12tet',
    'Major 6th (12-TET · 900.0¢)',
    'Standard 12-TET major 6th (2^(9/12) ≈ 1.68179). 15.6¢ sharp.',
    { kind: 'real', value: Math.pow(2, 9 / 12) },
    'Major 6th (La 12-TET)',
    'woodblock'
  ),

  // 10. Minor 7th (Te)
  createDyadShape(
    'dyad-m7-harmonic-7-4',
    'Harmonic 7th (Septimal Just 7:4 · 968.8¢)',
    'Natural 7-limit overtone (7:4). Smooth, warm blues consonance.',
    { kind: 'rational', num: 7, den: 4 },
    'Harmonic 7th (Te 7/4)',
    'triangle'
  ),
  createDyadShape(
    'dyad-m7-just-9-5',
    'Minor 7th (Just 9:5 · 1017.6¢)',
    '5-limit Just minor 7th (9:5). Bright minor 7th.',
    { kind: 'rational', num: 9, den: 5 },
    'Minor 7th (Te 9/5)',
    'triangle'
  ),
  createDyadShape(
    'dyad-m7-12tet',
    'Minor 7th (12-TET · 1000.0¢)',
    'Standard 12-TET minor 7th (2^(10/12) ≈ 1.78180). Compromise between 7/4 and 9/5.',
    { kind: 'real', value: Math.pow(2, 10 / 12) },
    'Minor 7th (Te 12-TET)',
    'triangle'
  ),

  // 11. Major 7th (Ti)
  createDyadShape(
    'dyad-M7-just-15-8',
    'Major 7th (Just 15:8 · 1088.3¢)',
    'Pure 5-limit Just major 7th (15:8). Sharp leading tone yearning toward the octave.',
    { kind: 'rational', num: 15, den: 8 },
    'Major 7th (Ti 15/8)',
    'triangle'
  ),
  createDyadShape(
    'dyad-M7-12tet',
    'Major 7th (12-TET · 1100.0¢)',
    'Standard 12-TET major 7th (2^(11/12) ≈ 1.88775). 11.7¢ sharp.',
    { kind: 'real', value: Math.pow(2, 11 / 12) },
    'Major 7th (Ti 12-TET)',
    'triangle'
  ),
  createDyadShape(
    'dyad-M7-dutri',
    'Major 7th (PPT Du-Fractal Ti · 1098.0¢)',
    'PPT-native 12-tone closure: DuTri operator on Fi (4√2/3 ≈ 1.88562). Sits at 1098.0¢.',
    { kind: 'real', value: (4 * Math.SQRT2) / 3 },
    'Major 7th (Ti DuTri)',
    'triangle'
  ),

  // 12. Octave (Do)
  createDyadShape(
    'dyad-octave-just-2-1',
    'Octave (Just 2:1 · 1200.0¢)',
    'Pure 2-prime power ratio (2:1). In rhythm space, 2-layer binary subdivision.',
    { kind: 'rational', num: 2, den: 1 },
    'Octave (Do 2/1)',
    'kick'
  ),

  // ── Chords Across Tuning Systems & Symmetrical Chords ──
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('maj12_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('maj12_mi', 'Major 3rd (Mi 12-TET)', { kind: 'real', value: Math.pow(2, 4 / 12) }, 1.0, 'clave'),
      createChordVoiceAnchor('maj12_so', 'Perfect 5th (So 12-TET)', { kind: 'real', value: Math.pow(2, 7 / 12) }, 1.0, 'woodblock'),
    ];
    return {
      id: 'major-triad-12tet',
      name: 'Major Triad (12-TET Equal Temperament)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Standard 12-TET Major Triad (1 : 2^(4/12) : 2^(7/12)). Notice the ~14¢ sharp third producing acoustic beating.',
      adsr: { attack: 0.04, decay: 1.2, sustain: 0.75, release: 0.35, damping: 0.2 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('majmean_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('majmean_mi', 'Major 3rd (Mi 5/4 Meantone)', { kind: 'real', value: 1.25 }, 1.0, 'clave'),
      createChordVoiceAnchor('majmean_so', 'Perfect 5th (So Meantone 5^(1/4))', { kind: 'real', value: Math.pow(5, 0.25) }, 1.0, 'woodblock'),
    ];
    return {
      id: 'major-triad-meantone',
      name: 'Major Triad (Quarter-Comma Meantone)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Renaissance quarter-comma meantone Major Triad (1 : 1.25 : 5^(1/4)). Pure, beatless major third with slightly narrowed fifth.',
      adsr: { attack: 0.04, decay: 1.2, sustain: 0.75, release: 0.35, damping: 0.2 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('dim_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('dim_me', 'Minor 3rd (Me 6/5)', { kind: 'rational', num: 6, den: 5 }, 1.0, 'clave'),
      createChordVoiceAnchor('dim_fi', 'Septimal Tritone (Fi 7/5)', { kind: 'rational', num: 7, den: 5 }, 1.0, 'triangle'),
    ];
    return {
      id: 'diminished-triad-5-6-7',
      name: 'Diminished Triad (5 : 6 : 7 Septimal)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Septimal Diminished Triad (1 : 6/5 : 7/5). Symmetrical minor-third tension and flattened fifth.',
      adsr: { attack: 0.04, decay: 1.1, sustain: 0.75, release: 0.35, damping: 0.25 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('aug_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('aug_mi', 'Major 3rd (Mi 5/4)', { kind: 'rational', num: 5, den: 4 }, 1.0, 'clave'),
      createChordVoiceAnchor('aug_si', 'Augmented 5th (Si 25/16)', { kind: 'rational', num: 25, den: 16 }, 1.0, 'triangle'),
    ];
    return {
      id: 'augmented-triad-16-20-25',
      name: 'Augmented Triad (16 : 20 : 25 Symmetrical)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Pure Just Augmented Triad (1 : 5/4 : 25/16). Symmetrical major-third stack suspended in harmonic ambiguity.',
      adsr: { attack: 0.04, decay: 1.2, sustain: 0.75, release: 0.35, damping: 0.2 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('hdim_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('hdim_me', 'Minor 3rd (Me 6/5)', { kind: 'rational', num: 6, den: 5 }, 1.0, 'clave'),
      createChordVoiceAnchor('hdim_fi', 'Diminished 5th (Fi 7/5)', { kind: 'rational', num: 7, den: 5 }, 1.0, 'triangle'),
      createChordVoiceAnchor('hdim_te', 'Minor 7th (Te 9/5)', { kind: 'rational', num: 9, den: 5 }, 1.0, 'woodblock'),
    ];
    return {
      id: 'half-diminished-7th-5-6-7-9',
      name: 'Half-Diminished 7th (5 : 6 : 7 : 9 · m7b5)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Half-Diminished 7th / m7b5 chord (1 : 6/5 : 7/5 : 9/5). The classic jazz iiø / Tristan chord dissonance.',
      adsr: { attack: 0.04, decay: 1.1, sustain: 0.75, release: 0.35, damping: 0.25 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('fdim_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('fdim_me', 'Minor 3rd (Me 6/5)', { kind: 'rational', num: 6, den: 5 }, 1.0, 'clave'),
      createChordVoiceAnchor('fdim_fi', 'Diminished 5th (Fi 7/5)', { kind: 'rational', num: 7, den: 5 }, 1.0, 'triangle'),
      createChordVoiceAnchor('fdim_la', 'Diminished 7th (La 12/7)', { kind: 'rational', num: 12, den: 7 }, 1.0, 'woodblock'),
    ];
    return {
      id: 'fully-diminished-7th',
      name: 'Fully Diminished 7th (Symmetrical dim7)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Fully Diminished 7th chord (1 : 6/5 : 7/5 : 12/7). Symmetrical minor-third stack with deep, dramatic beating.',
      adsr: { attack: 0.04, decay: 1.1, sustain: 0.75, release: 0.35, damping: 0.25 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('mmaj_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('mmaj_me', 'Minor 3rd (Me 6/5)', { kind: 'rational', num: 6, den: 5 }, 1.0, 'clave'),
      createChordVoiceAnchor('mmaj_so', 'Perfect 5th (So 3/2)', { kind: 'rational', num: 3, den: 2 }, 1.0, 'woodblock'),
      createChordVoiceAnchor('mmaj_ti', 'Major 7th (Ti 15/8)', { kind: 'rational', num: 15, den: 8 }, 1.0, 'triangle'),
    ];
    return {
      id: 'minor-major-7th-10-12-15-19',
      name: 'Minor-Major 7th (10 : 12 : 15 : 19 · m(maj7))',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'Minor-Major 7th chord (1 : 6/5 : 3/2 : 15/8). Iconic film noir tension chord combining minor sadness with major 7th sharpness.',
      adsr: { attack: 0.04, decay: 1.1, sustain: 0.75, release: 0.35, damping: 0.25 },
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };
  })(),
  (() => {
    const anchors: VoiceAnchor[] = [
      createChordVoiceAnchor('dutri_do', 'Root (Do 1/1)', { kind: 'rational', num: 1, den: 1 }, 1.0, 'kick'),
      createChordVoiceAnchor('dutri_me', 'Minor 3rd (Me 2^(1/4))', { kind: 'real', value: Math.pow(2, 0.25) }, 1.0, 'clave'),
      createChordVoiceAnchor('dutri_fi', 'Tritone (Fi √2 Axis)', { kind: 'real', value: Math.SQRT2 }, 1.0, 'triangle'),
      createChordVoiceAnchor('dutri_la', 'Major 6th (La 2^(3/4))', { kind: 'real', value: Math.pow(2, 0.75) }, 1.0, 'woodblock'),
    ];
    return {
      id: 'ppt-dutri-closure-chord',
      name: 'PPT Du-Fractal DuTri Chord (Symmetrical Dim7 Skeleton)',
      origin: 'preset' as const,
      category: 'harmony' as const,
      description: 'PPT-native 4-fold symmetrical skeleton (Do - Me - Fi - La: 1 : 2^(1/4) : √2 : 2^(3/4)). All four points are powers of 2^(1/4) spaced at 300¢.',
      adsr: { attack: 0.04, decay: 1.2, sustain: 0.75, release: 0.35, damping: 0.25 },
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
    description: 'Acoustic church bell with authentic inharmonic modes: sub-octave hum, strike prime, minor-third tierce, quint, and nominal with long metallic resonance.',
    adsr: { attack: 0.002, decay: 2.8, sustain: 0.12, release: 0.8, damping: 0.4 },
    partials: [
      { id: 'p1', ratio: { kind: 'real', value: 0.504 }, amp: 0.85, phase: 0, voice: 'kick', label: 'Hum (0.50x)' },
      { id: 'p2', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'snare', label: 'Prime (1.00x)' },
      { id: 'p3', ratio: { kind: 'real', value: 1.183 }, amp: 0.75, phase: 0, voice: 'woodblock', label: 'Tierce (1.18x)' },
      { id: 'p4', ratio: { kind: 'real', value: 1.506 }, amp: 0.60, phase: 0, voice: 'clave', label: 'Quint (1.51x)' },
      { id: 'p5', ratio: { kind: 'real', value: 2.014 }, amp: 0.80, phase: 0, voice: 'triangle', label: 'Nominal (2.01x)' },
      { id: 'p6', ratio: { kind: 'real', value: 2.512 }, amp: 0.45, phase: 0, voice: 'hihat', label: 'Superquint (2.51x)' },
    ],
  },
  {
    id: 'timpani-membrane',
    name: 'Timpani / Drum Membrane (Bessel Modes)',
    origin: 'preset',
    category: 'timbre',
    description: 'Circular acoustic membrane modes derived from Bessel function zeros (1.00 : 1.593 : 2.135 : 2.295 : 2.653 : 2.917). Generates authentic drum resonance in pitch space, and organic non-repeating fills in rhythm space.',
    adsr: { attack: 0.003, decay: 1.6, sustain: 0.08, release: 0.4, damping: 0.65 },
    partials: [
      { id: 'p1', ratio: { kind: 'real', value: 1.000 }, amp: 1.0, phase: 0, voice: 'kick', label: 'Mode 0,1 (1.00x)' },
      { id: 'p2', ratio: { kind: 'real', value: 1.593 }, amp: 0.75, phase: 0, voice: 'snare', label: 'Mode 1,1 (1.59x)' },
      { id: 'p3', ratio: { kind: 'real', value: 2.135 }, amp: 0.55, phase: 0, voice: 'woodblock', label: 'Mode 2,1 (2.14x)' },
      { id: 'p4', ratio: { kind: 'real', value: 2.295 }, amp: 0.40, phase: 0, voice: 'clave', label: 'Mode 0,2 (2.30x)' },
      { id: 'p5', ratio: { kind: 'real', value: 2.653 }, amp: 0.28, phase: 0, voice: 'hihat', label: 'Mode 3,1 (2.65x)' },
      { id: 'p6', ratio: { kind: 'real', value: 2.917 }, amp: 0.18, phase: 0, voice: 'click', label: 'Mode 1,2 (2.92x)' },
    ],
  },
  {
    id: 'tibetan-singing-bowl',
    name: 'Tibetan Singing Bowl (Beating Chimes)',
    origin: 'preset',
    category: 'timbre',
    description: 'Acoustic singing bowl with inharmonic modes (1.00 : 2.71 : 5.09 : 8.12) exhibiting long metallic sustain and slow, hypnotic acoustic beating.',
    adsr: { attack: 0.005, decay: 3.5, sustain: 0.25, release: 1.2, damping: 0.3 },
    partials: [
      { id: 'p1', ratio: { kind: 'real', value: 1.000 }, amp: 1.0, phase: 0, voice: 'kick', label: 'Fund (1.00x)' },
      { id: 'p2', ratio: { kind: 'real', value: 2.710 }, amp: 0.68, phase: 0, voice: 'woodblock', label: 'Mode 2 (2.71x)' },
      { id: 'p3', ratio: { kind: 'real', value: 5.090 }, amp: 0.42, phase: 0, voice: 'triangle', label: 'Mode 3 (5.09x)' },
      { id: 'p4', ratio: { kind: 'real', value: 8.120 }, amp: 0.22, phase: 0, voice: 'clave', label: 'Mode 4 (8.12x)' },
    ],
  },
  {
    id: 'gamelan-gong',
    name: 'Gamelan Gong / Bonang (Metallophone)',
    origin: 'preset',
    category: 'timbre',
    description: 'Authentic Indonesian bronze metallophone tuned with inharmonic plate modes (1.00 : 1.52 : 2.46 : 3.92 : 5.48) producing a deep shimmer.',
    adsr: { attack: 0.002, decay: 2.4, sustain: 0.15, release: 0.8, damping: 0.45 },
    partials: [
      { id: 'p1', ratio: { kind: 'real', value: 1.000 }, amp: 1.0, phase: 0, voice: 'kick', label: 'Prime (1.00x)' },
      { id: 'p2', ratio: { kind: 'real', value: 1.520 }, amp: 0.72, phase: 0, voice: 'woodblock', label: 'Quint (1.52x)' },
      { id: 'p3', ratio: { kind: 'real', value: 2.460 }, amp: 0.48, phase: 0, voice: 'clave', label: 'Tierce (2.46x)' },
      { id: 'p4', ratio: { kind: 'real', value: 3.920 }, amp: 0.30, phase: 0, voice: 'triangle', label: 'Nominal (3.92x)' },
      { id: 'p5', ratio: { kind: 'real', value: 5.480 }, amp: 0.15, phase: 0, voice: 'hihat', label: 'High Mode (5.48x)' },
    ],
  },
  {
    id: 'marimba-bar',
    name: 'Marimba / Tuned Rosewood Bar',
    origin: 'preset',
    category: 'timbre',
    description: 'Acoustic rosewood bar with undercut arch resonator tuning: fundamental, double-octave 4th harmonic, and 10th harmonic (1.00 : 4.00 : 10.00). Warm, woody punch.',
    adsr: { attack: 0.003, decay: 0.8, sustain: 0.04, release: 0.2, damping: 0.7 },
    partials: [
      { id: 'p1', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 1.0, phase: 0, voice: 'woodblock', label: 'Fund (1.0x)' },
      { id: 'p2', ratio: { kind: 'rational', num: 4, den: 1 }, amp: 0.45, phase: 0, voice: 'clave', label: 'Arch (4.0x)' },
      { id: 'p3', ratio: { kind: 'rational', num: 10, den: 1 }, amp: 0.15, phase: 0, voice: 'triangle', label: '10x Mode' },
    ],
  },
  {
    id: 'anvil-chladni-plate',
    name: 'Anvil / Chladni Metal Plate',
    origin: 'preset',
    category: 'timbre',
    description: 'Struck rectangular steel plate with 2D Chladni nodal vibration modes (1.00 : 1.73 : 2.31 : 3.00 : 3.74). Harsh, ringing metallic attack.',
    adsr: { attack: 0.001, decay: 1.9, sustain: 0.10, release: 0.5, damping: 0.5 },
    partials: [
      { id: 'p1', ratio: { kind: 'real', value: 1.000 }, amp: 1.0, phase: 0, voice: 'click', label: 'Plate 1 (1.00x)' },
      { id: 'p2', ratio: { kind: 'real', value: 1.732 }, amp: 0.80, phase: 0, voice: 'triangle', label: 'Plate 2 (1.73x)' },
      { id: 'p3', ratio: { kind: 'real', value: 2.310 }, amp: 0.55, phase: 0, voice: 'hihat', label: 'Plate 3 (2.31x)' },
      { id: 'p4', ratio: { kind: 'real', value: 3.000 }, amp: 0.38, phase: 0, voice: 'clave', label: 'Plate 4 (3.00x)' },
      { id: 'p5', ratio: { kind: 'real', value: 3.740 }, amp: 0.22, phase: 0, voice: 'woodblock', label: 'Plate 5 (3.74x)' },
    ],
  },
];
