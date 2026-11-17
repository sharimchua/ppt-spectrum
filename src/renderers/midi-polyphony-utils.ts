/**
 * Pure rendering utility that synthesises an effective virtual Shape + Placement
 * when 2+ MIDI keys are held simultaneously.
 *
 * By passing this unified virtual Scene through RenderCoordinator to all lenses
 * (CycleWheel, EventLanes, Phasor, WaveformPhasor, PrimeProfile, AlignmentMeter,
 * RingClock, Ruler), held MIDI chords/polyrhythms render identically to authored
 * shapes—forming true Super-Cycles for rational Just ratios and Aperiodic Orbits
 * for tempered 12-TET intervals.
 */

import { PartialComponent, Placement, Ratio, Scene, Shape } from '../core/types';
import { dToFreq } from '../core/axis';
import { rationalise, ratioToValue, reduceRational } from '../core/rational';
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
    return { kind: 'rational', num: cand.num, den: cand.den };
  }
  return { kind: 'real', value: val };
}

function multiplyRatios(a: Ratio, b: Ratio): Ratio {
  if (a.kind === 'rational' && b.kind === 'rational') {
    const reduced = reduceRational(a.num * b.num, a.den * b.den);
    return { kind: 'rational', num: reduced.num, den: reduced.den };
  }
  return { kind: 'real', value: ratioToValue(a) * ratioToValue(b) };
}

/**
 * Builds an effective virtual Scene whose primary shape/placement combines all
 * held MIDI notes equally, anchored to the lowest held note (largest d).
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

  const activePartials = primaryShape.partials.filter((p) => p.amp > 0.001);
  const expandPartials =
    activePartials.length > 0 && sorted.length * activePartials.length <= MAX_EXPANDED_STREAMS;

  const combinedPartials: PartialComponent[] = [];

  for (let nIdx = 0; nIdx < sorted.length; nIdx++) {
    const gn = sorted[nIdx];
    const voiceFreq = dToFreq(gn.d, tplHz);
    const voiceRatioVal = voiceFreq / Math.max(1e-6, anchorFreqHz);
    const voiceRatio = nIdx === 0 ? ({ kind: 'rational', num: 1, den: 1 } as const) : toExactOrRealRatio(voiceRatioVal);

    const voiceLivePhase = gn.livePhase ?? 0;
    const keyStrikeOffsetTurns =
      anchorNote.livePhase !== undefined && gn.livePhase !== undefined
        ? (anchorLivePhase * voiceRatioVal - voiceLivePhase) / Math.max(1e-6, voiceRatioVal)
        : 0;

    if (expandPartials) {
      for (let pIdx = 0; pIdx < activePartials.length; pIdx++) {
        const p = activePartials[pIdx];
        const wrappedPhase = wrapPhase(p.phase + keyStrikeOffsetTurns);
        combinedPartials.push({
          ...p,
          id: `${p.id}__midi_${gn.midi}_${pIdx}`,
          ratio: multiplyRatios(voiceRatio, p.ratio),
          amp: p.amp * Math.max(0.25, gn.velocity),
          phase: wrappedPhase,
        });
      }
    } else {
      const wrappedPhase = wrapPhase(keyStrikeOffsetTurns);
      combinedPartials.push({
        id: `midi_${gn.midi}_fund`,
        ratio: voiceRatio,
        amp: Math.max(0.25, gn.velocity),
        phase: wrappedPhase,
      });
    }
  }

  const virtualShapeId = `${primaryShape.id}__midi_poly`;
  const virtualShape: Shape = {
    ...primaryShape,
    id: virtualShapeId,
    partials: combinedPartials,
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
