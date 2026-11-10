/**
 * Pure voice anchor, partial, ADSR envelope, and shape manipulation operations.
 * Powers the Shape Editor partial inspector and macro transformations.
 */

import {
  Shape,
  VoiceAnchor,
  PartialComponent,
  ADSREnvelope,
  VoiceId,
  Ratio,
} from './types';
import { flattenAnchorsToPartials, getShapeAnchors } from './shape';

export const DEFAULT_ADSR: ADSREnvelope = {
  attack: 0.01,
  decay: 1.0,
  sustain: 0.8,
  release: 0.3,
  damping: 0.2,
};

const defaultCreateId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

/**
 * Returns an editable copy of a shape.
 * If the shape is a preset, it forks it into a user shape with origin: 'user' and '(Custom)' name suffix.
 */
export function forkShapeForEdit(
  shape: Shape,
  createId: (prefix: string) => string = defaultCreateId
): Shape {
  const currentAnchors = getShapeAnchors(shape).map((a) => ({
    ...a,
    partials: a.partials.map((p) => ({ ...p })),
  }));
  if (shape.origin === 'preset') {
    return {
      ...shape,
      id: createId('user-shape'),
      name: `${shape.name} (Custom)`,
      origin: 'user',
      anchors: currentAnchors,
      partials: flattenAnchorsToPartials(currentAnchors),
      adsr: shape.adsr ? { ...shape.adsr } : undefined,
    };
  }
  return {
    ...shape,
    anchors: currentAnchors,
    partials: flattenAnchorsToPartials(currentAnchors),
  };
}

/**
 * Applies a new set of anchors to a shape and synchronises its flattened partials.
 */
export function withAnchors(shape: Shape, anchors: VoiceAnchor[]): Shape {
  return {
    ...shape,
    anchors,
    partials: flattenAnchorsToPartials(anchors),
  };
}

/**
 * Toggles mute on a voice anchor, stashing previous gain for restoration.
 */
export function toggleAnchorMute(anchors: VoiceAnchor[], anchorIdx: number): VoiceAnchor[] {
  const a = anchors[anchorIdx];
  if (!a) return anchors;
  const isMuted = Boolean(a.mute || a.gain <= 0.0001);
  const patch: Partial<VoiceAnchor> = isMuted
    ? { mute: false, gain: a.previousGain && a.previousGain > 0.01 ? a.previousGain : 0.85 }
    : { mute: true, previousGain: a.gain, gain: 0 };
  return anchors.map((item, idx) => (idx === anchorIdx ? { ...item, ...patch } : item));
}

/**
 * Creates a new voice anchor preset of either interval (harmonic) or rhythm (metric offset) kind.
 */
export function createAnchor(
  kind: 'interval' | 'rhythm' = 'interval',
  index: number,
  createId: (prefix: string) => string = defaultCreateId
): VoiceAnchor {
  return kind === 'rhythm'
    ? {
        id: createId('anchor'),
        name: `Rhythm Anchor ${index} (Fi Offbeat)`,
        ratio: { kind: 'rational', num: 1, den: 1 },
        phaseOffset: 0.5,
        offsetToken: 'Fi',
        gain: 0.85,
        voice: 'clave',
        mute: false,
        partials: [
          {
            id: createId('p1'),
            ratio: { kind: 'rational', num: 1, den: 1 },
            amp: 1.0,
            previousAmp: 1.0,
            phase: 0,
            voice: 'clave',
            label: '1x Hit',
          },
        ],
      }
    : {
        id: createId('anchor'),
        name: `Voice Anchor ${index} (So 3/2)`,
        ratio: { kind: 'rational', num: 3, den: 2 },
        phaseOffset: 0,
        offsetToken: 'Do',
        gain: 0.85,
        voice: 'woodblock',
        mute: false,
        partials: [
          {
            id: createId('p1'),
            ratio: { kind: 'rational', num: 1, den: 1 },
            amp: 1.0,
            previousAmp: 1.0,
            phase: 0,
            voice: 'woodblock',
            label: '1x Fund',
          },
          {
            id: createId('p2'),
            ratio: { kind: 'rational', num: 2, den: 1 },
            amp: 0.48,
            previousAmp: 0.48,
            phase: 0,
            voice: 'clave',
            label: '2x Oct',
          },
          {
            id: createId('p3'),
            ratio: { kind: 'rational', num: 3, den: 1 },
            amp: 0.28,
            previousAmp: 0.28,
            phase: 0,
            voice: 'triangle',
            label: '3x P5',
          },
        ],
      };
}

/**
 * Removes a voice anchor at the specified index, guarding to keep at least 1 anchor.
 */
export function removeAnchor(anchors: VoiceAnchor[], anchorIdx: number): VoiceAnchor[] {
  if (anchors.length <= 1) return anchors;
  return anchors.filter((_, idx) => idx !== anchorIdx);
}

/**
 * Patches a partial within a specific voice anchor.
 */
export function updateAnchorPartial(
  anchors: VoiceAnchor[],
  anchorIdx: number,
  partialIdx: number,
  patch: Partial<PartialComponent>
): VoiceAnchor[] {
  return anchors.map((a, aIdx) => {
    if (aIdx !== anchorIdx) return a;
    return {
      ...a,
      partials: a.partials.map((p, pIdx) => (pIdx === partialIdx ? { ...p, ...patch } : p)),
    };
  });
}

/**
 * Toggles mute on a specific partial within an anchor, restoring previous amplitude.
 */
export function toggleAnchorPartialMute(
  anchors: VoiceAnchor[],
  anchorIdx: number,
  partialIdx: number
): VoiceAnchor[] {
  const p = anchors[anchorIdx]?.partials[partialIdx];
  if (!p) return anchors;
  const isMuted = p.amp <= 0.0001;
  const restored = p.previousAmp && p.previousAmp > 0.001 ? p.previousAmp : 0.75;
  const patch: Partial<PartialComponent> = isMuted
    ? { amp: restored }
    : { amp: 0, previousAmp: p.amp };
  return updateAnchorPartial(anchors, anchorIdx, partialIdx, patch);
}

/**
 * Appends a harmonic partial (next harmonic ratio) to the specified anchor.
 */
export function addAnchorPartial(
  anchors: VoiceAnchor[],
  anchorIdx: number,
  createId: (prefix: string) => string = defaultCreateId
): VoiceAnchor[] {
  const anchor = anchors[anchorIdx];
  if (!anchor) return anchors;
  const nextHarmonic = anchor.partials.length + 1;
  const newPartial: PartialComponent = {
    id: createId('partial'),
    ratio: { kind: 'rational', num: nextHarmonic, den: 1 },
    amp: Math.max(0.05, Math.round((1.0 / nextHarmonic) * 100) / 100),
    previousAmp: Math.max(0.05, Math.round((1.0 / nextHarmonic) * 100) / 100),
    phase: 0,
    voice: anchor.voice || 'click',
    label: `${nextHarmonic}x`,
  };
  return anchors.map((a, idx) =>
    idx === anchorIdx ? { ...a, partials: [...a.partials, newPartial] } : a
  );
}

/**
 * Removes a partial from an anchor, guarding to keep at least 1 partial.
 */
export function removeAnchorPartial(
  anchors: VoiceAnchor[],
  anchorIdx: number,
  partialIdx: number
): VoiceAnchor[] {
  const anchor = anchors[anchorIdx];
  if (!anchor || anchor.partials.length <= 1) return anchors;
  return anchors.map((a, idx) =>
    idx === anchorIdx
      ? { ...a, partials: a.partials.filter((_, pIdx) => pIdx !== partialIdx) }
      : a
  );
}

/**
 * Generates canonical overtone partial configurations for an anchor.
 */
export function overtonePresetPartials(
  mode: 'pure' | 'to-p5' | 'saw4',
  baseVoice: VoiceId = 'woodblock',
  createId: (prefix: string) => string = (prefix) => `${prefix}-${Date.now().toString(36)}`
): PartialComponent[] {
  if (mode === 'pure') {
    return [
      {
        id: createId('p1'),
        ratio: { kind: 'rational', num: 1, den: 1 },
        amp: 1.0,
        previousAmp: 1.0,
        phase: 0,
        voice: baseVoice,
        label: '1x Fund',
      },
    ];
  } else if (mode === 'to-p5') {
    return [
      {
        id: createId('p1'),
        ratio: { kind: 'rational', num: 1, den: 1 },
        amp: 1.0,
        previousAmp: 1.0,
        phase: 0,
        voice: baseVoice,
        label: '1x Fund',
      },
      {
        id: createId('p2'),
        ratio: { kind: 'rational', num: 2, den: 1 },
        amp: 0.5,
        previousAmp: 0.5,
        phase: 0,
        voice: 'clave',
        label: '2x Oct',
      },
      {
        id: createId('p3'),
        ratio: { kind: 'rational', num: 3, den: 1 },
        amp: 0.3,
        previousAmp: 0.3,
        phase: 0,
        voice: 'triangle',
        label: '3x P5',
      },
    ];
  } else {
    return [1, 2, 3, 4].map((k) => ({
      id: createId(`p${k}`),
      ratio: { kind: 'rational' as const, num: k, den: 1 },
      amp: Math.round((1.0 / k) * 100) / 100,
      previousAmp: Math.round((1.0 / k) * 100) / 100,
      phase: 0,
      voice: baseVoice,
      label: `${k}x`,
    }));
  }
}

/**
 * Macro: Applies piano inharmonicity coefficient B across each anchor's overtone series.
 */
export function applyInharmonicity(anchors: VoiceAnchor[], bCoeff: number): VoiceAnchor[] {
  return anchors.map((a) => ({
    ...a,
    partials: a.partials.map((p, idx) => {
      const n = idx + 1;
      const stretchFactor = Math.sqrt(1 + bCoeff * n * n);
      return {
        ...p,
        ratio:
          bCoeff === 0
            ? ({ kind: 'rational' as const, num: n, den: 1 } as Ratio)
            : ({ kind: 'real' as const, value: n * stretchFactor } as Ratio),
      };
    }),
  }));
}

/**
 * Macro: Applies exponential spectral damping across each anchor's overtone series.
 */
export function applyDamping(anchors: VoiceAnchor[], dampingSlope: number): VoiceAnchor[] {
  return anchors.map((a) => ({
    ...a,
    partials: a.partials.map((p, idx) => {
      const n = idx + 1;
      const newAmp = Math.max(0.01, Math.round(Math.exp(-dampingSlope * (n - 1)) * 100) / 100);
      return { ...p, amp: newAmp, previousAmp: newAmp };
    }),
  }));
}

/**
 * Creates a blank custom shape with a single Root (Do 1/1) anchor.
 */
export function createBlankShape(
  createId: (prefix: string) => string = defaultCreateId
): Shape {
  const initialAnchors: VoiceAnchor[] = [
    {
      id: createId('anchor-root'),
      name: 'Root Anchor (Do 1/1)',
      ratio: { kind: 'rational', num: 1, den: 1 },
      phaseOffset: 0,
      offsetToken: 'Do',
      gain: 1.0,
      voice: 'woodblock',
      mute: false,
      partials: [
        {
          id: createId('p1'),
          ratio: { kind: 'rational', num: 1, den: 1 },
          amp: 1.0,
          previousAmp: 1.0,
          phase: 0,
          voice: 'woodblock',
          label: '1 (Fund)',
        },
      ],
    },
  ];
  return {
    id: createId('user-shape'),
    name: 'Custom Shape',
    origin: 'user',
    anchors: initialAnchors,
    partials: flattenAnchorsToPartials(initialAnchors),
  };
}
