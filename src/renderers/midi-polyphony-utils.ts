/**
 * Pure rendering utility that synthesises an effective virtual Shape + Placement
 * when 2+ MIDI keys are held simultaneously.
 *
 * Each held MIDI key becomes a first-class VoiceAnchor on the virtual Shape,
 * so PhasorLens renders one radiating anchor arm per held key (with its overtone
 * tree branching from its tip) and every other lens (CycleWheel, EventLanes,
 * WaveformPhasor, PrimeProfile, AlignmentMeter, RingClock, Ruler) evaluates the
 * flattened anchors identically to authored multi-anchor shapes.
 */

import { PartialComponent, Placement, Ratio, Scene, Shape, VoiceAnchor } from '../core/types';
import { dToFreq, resolveDuPeriodAddress } from '../core/axis';
import { rationalise, reduceRational } from '../core/rational';
import { flattenAnchorsToPartials, getEffectivePartials } from '../core/shape';
import { HeldMidiNote } from './render-coordinator';

export interface PolyphonicMidiSceneResult {
  scene: Scene;
  anchorPhase: number;
  anchorFreqHz: number;
}

const MAX_EXPANDED_STREAMS = 32;
const RATIONAL_SNAP_TOLERANCE = 1e-7;
const RATIONAL_MAX_DENOMINATOR = 512;

function wrapPhase(rawPhase: number): number {
  const w = ((rawPhase % 1.0) + 1.0) % 1.0;
  return w < 1e-6 || w > 1.0 - 1e-6 ? 0.0 : w;
}

function toExactOrRealRatio(val: number): Ratio {
  const cand = rationalise(val, RATIONAL_SNAP_TOLERANCE, RATIONAL_MAX_DENOMINATOR);
  if (cand.den > 0 && Math.abs(val - cand.num / cand.den) < RATIONAL_SNAP_TOLERANCE) {
    const reduced = reduceRational(cand.num, cand.den);
    return { kind: 'rational', num: reduced.num, den: reduced.den };
  }
  return { kind: 'real', value: val };
}

/**
 * Builds an effective virtual Scene whose primary shape maps each held MIDI key
 * to a VoiceAnchor, anchored to the lowest held note (largest d).
 * Returns null when fewer than 2 MIDI notes are held.
 */
export function buildPolyphonicMidiScene(
  scene: Scene,
  heldNotes: HeldMidiNote[] | undefined
): PolyphonicMidiSceneResult | null {
  if (!heldNotes || heldNotes.length < 2) {
    return null;
  }

  const primaryPlacement = scene.placements[0];
  if (!primaryPlacement) return null;
  const primaryShape = scene.shapes.find((s) => s.id === primaryPlacement.shapeId);
  if (!primaryShape) return null;

  const tplHz = scene.anchors.tplFrequencyHz;
  // Sort lowest frequency first (largest d = Sam / root anchor)
  const sorted = [...heldNotes].sort((a, b) => b.d - a.d);
  const anchorNote = sorted[0];
  const anchorFreqHz = dToFreq(anchorNote.d, tplHz);
  const anchorLivePhase = anchorNote.livePhase ?? 0;

  const basePartials = getEffectivePartials(primaryShape).filter((p) => p.amp > 0.001);
  const expandPartials =
    basePartials.length > 0 && sorted.length * basePartials.length <= MAX_EXPANDED_STREAMS;

  const virtualAnchors: VoiceAnchor[] = [];

  for (let nIdx = 0; nIdx < sorted.length; nIdx++) {
    const gn = sorted[nIdx];
    const voiceFreq = dToFreq(gn.d, tplHz);
    const voiceRatioVal = voiceFreq / Math.max(1e-6, anchorFreqHz);
    const voiceRatio: Ratio =
      nIdx === 0 ? { kind: 'rational', num: 1, den: 1 } : toExactOrRealRatio(voiceRatioVal);

    const voiceLivePhase = gn.livePhase ?? 0;
    const keyStrikeOffsetTurns =
      anchorNote.livePhase !== undefined && gn.livePhase !== undefined
        ? (anchorLivePhase * voiceRatioVal - voiceLivePhase) / Math.max(1e-6, voiceRatioVal)
        : 0;
    const phaseOffset = wrapPhase(keyStrikeOffsetTurns);
    const addr = resolveDuPeriodAddress(gn.d);

    const anchorPartials: PartialComponent[] = expandPartials
      ? basePartials.map((p, pIdx) => ({
          ...p,
          id: `${p.id}__midi_${gn.midi}_${pIdx}`,
        }))
      : [
          {
            id: `midi_${gn.midi}_fund`,
            ratio: { kind: 'rational', num: 1, den: 1 },
            amp: 1.0,
            phase: 0,
            voice: basePartials[0]?.voice ?? 'woodblock',
          },
        ];

    virtualAnchors.push({
      id: `midi-anchor-${gn.midi}`,
      name: addr.formatted,
      ratio: voiceRatio,
      phaseOffset,
      offsetToken: addr.syllable,
      gain: Math.max(0.25, gn.velocity),
      voice: anchorPartials[0]?.voice ?? 'woodblock',
      mute: false,
      partials: anchorPartials,
    });
  }

  const virtualShapeId = `${primaryShape.id}__midi_poly`;
  const virtualShape: Shape = {
    ...primaryShape,
    id: virtualShapeId,
    anchors: virtualAnchors,
    partials: flattenAnchorsToPartials(virtualAnchors),
  };
  const virtualPlacement: Placement = {
    ...primaryPlacement,
    shapeId: virtualShapeId,
    d: anchorNote.d,
  };

  return {
    scene: {
      ...scene,
      shapes: [virtualShape, ...scene.shapes],
      placements: [virtualPlacement, ...scene.placements.slice(1)],
    },
    anchorPhase: anchorLivePhase,
    anchorFreqHz,
  };
}
