/**
 * Cross-Limen Coupling resolution and complexity evaluation.
 * Resolves Pitch Carrier (when placed in Rhythm Space, d > 0) and
 * Rhythm Container (when placed in Pitch Space, d <= 0) modes,
 * including automatic complexity gating and envelope-paced container cycles.
 * Australian English spelling maintained.
 */

import {
  Scene,
  Shape,
  ADSREnvelope,
  PitchCarrierMode,
  RhythmContainerMode,
} from './types';
import { ratioToValue } from './rational';
import { getShapeAnchors, getEffectivePartials } from './shape';
import { calculateCoincidenceCycle } from './alignment';

export interface ResolvedPitchCarrier {
  mode: 'self' | 'kit' | 'shape';
  carrierShape?: Shape;
  label: string;
  shortLabel: string;
  isAuto: boolean;
  rawMode: PitchCarrierMode;
}

export interface ResolvedRhythmContainer {
  mode: 'self' | 'static' | 'shape';
  containerShape?: Shape;
  label: string;
  shortLabel: string;
  isAuto: boolean;
  rawMode: RhythmContainerMode;
}

/**
 * Determines whether a shape's rhythmic structure is compact and distinct enough
 * to automatically articulate its own harmonic voices in Pitch Space ('self' container).
 *
 * Returns true when:
 * 1. The shape is not a single-instrument timbre preset (`category !== 'timbre'`)
 * 2. Its coincidence supercycle is periodic and compact (`!isAperiodic && rootTurnsToAlign <= 12`)
 * 3. Its active rhythmic stream count (anchors if multi-anchor, or partials if single-anchor) is between 2 and 6.
 *    (A 1-partial pure sine wave has no polyrhythmic interplay, and > 6 streams become dense timbre chatter).
 */
export function isShapeRhythmEligible(shape: Shape): boolean {
  if (shape.category === 'timbre') {
    return false;
  }

  const cycleInfo = calculateCoincidenceCycle(shape, 100, 12);
  if (cycleInfo.isAperiodic || cycleInfo.rootTurnsToAlign > 12) {
    return false;
  }

  const anchors = getShapeAnchors(shape).filter((a) => !a.mute && a.gain > 0.0001);
  if (anchors.length > 1) {
    return anchors.length >= 2 && anchors.length <= 6;
  }

  const activePartials = getEffectivePartials(shape).filter((p) => p.amp > 0.0001);
  return activePartials.length >= 2 && activePartials.length <= 6;
}

/**
 * Resolves the effective Pitch Carrier mode for a shape when placed in Rhythm Space (d > 0).
 */
export function resolvePitchCarrier(scene: Scene, shape: Shape): ResolvedPitchCarrier {
  const rawMode: PitchCarrierMode = scene.audio.pitchCarrier || 'auto';
  const isAuto = rawMode === 'auto';

  const targetMode = isAuto
    ? shape.defaultCarrier ?? (shape.category === 'timbre' ? 'kit' : 'self')
    : rawMode;

  if (targetMode.startsWith('shape:')) {
    const shapeId = targetMode.slice('shape:'.length);
    const carrierShape = scene.shapes.find((s) => s.id === shapeId);
    if (carrierShape) {
      const shortName = carrierShape.name.split('(')[0].trim();
      const compactName = shortName.length > 10 ? `${shortName.slice(0, 9)}…` : shortName;
      return {
        mode: 'shape',
        carrierShape,
        label: isAuto ? `Auto (${shortName})` : `Shape: ${shortName}`,
        shortLabel: compactName,
        isAuto,
        rawMode,
      };
    }
  }

  if (targetMode === 'kit') {
    return {
      mode: 'kit',
      label: isAuto ? 'Auto (Drum Kit)' : 'Drum Kit',
      shortLabel: 'Kit',
      isAuto,
      rawMode,
    };
  }

  return {
    mode: 'self',
    carrierShape: shape,
    label: isAuto ? 'Auto (Self)' : 'Self',
    shortLabel: 'Self',
    isAuto,
    rawMode,
  };
}

/**
 * Resolves the effective Rhythm Container mode for a shape when placed in Pitch Space (d <= 0).
 */
export function resolveRhythmContainer(scene: Scene, shape: Shape): ResolvedRhythmContainer {
  const rawMode: RhythmContainerMode = scene.audio.rhythmContainer || 'auto';
  const isAuto = rawMode === 'auto';

  const targetMode = isAuto
    ? shape.defaultContainer ?? (isShapeRhythmEligible(shape) ? 'self' : 'static')
    : rawMode;

  if (targetMode.startsWith('shape:')) {
    const shapeId = targetMode.slice('shape:'.length);
    const containerShape = scene.shapes.find((s) => s.id === shapeId);
    if (containerShape) {
      const shortName = containerShape.name.split('(')[0].trim();
      const compactName = shortName.length > 10 ? `${shortName.slice(0, 9)}…` : shortName;
      return {
        mode: 'shape',
        containerShape,
        label: isAuto ? `Auto (${shortName})` : `Shape: ${shortName}`,
        shortLabel: compactName,
        isAuto,
        rawMode,
      };
    }
  }

  if (targetMode === 'static') {
    return {
      mode: 'static',
      label: isAuto ? 'Auto (Static)' : 'Static',
      shortLabel: 'Static',
      isAuto,
      rawMode,
    };
  }

  return {
    mode: 'self',
    containerShape: shape,
    label: isAuto ? 'Auto (Self)' : 'Self',
    shortLabel: 'Self',
    isAuto,
    rawMode,
  };
}

/**
 * Computes an envelope-aware root cycle period (in seconds) for a Pitch Space Rhythm Container
 * so that even the fastest rhythmic subdivision has enough time for its ADSR attack and decay to breathe.
 */
export function computeContainerCyclePeriodSec(
  rhythmRatios: number[],
  adsr?: ADSREnvelope
): number {
  const maxRatio = rhythmRatios.length > 0 ? Math.max(1, ...rhythmRatios) : 1;
  // Normalise ratios where all partials are multiples (e.g. 4:5:6 has minRatio = 4, effective span = 6/4 = 1.5)
  const minRatio = rhythmRatios.length > 0 ? Math.max(0.25, Math.min(...rhythmRatios)) : 1;
  const effectiveMaxSubdivision = Math.min(6, Math.max(1, maxRatio / minRatio));

  const att = adsr ? Math.max(0.004, adsr.attack) : 0.02;
  const dec = adsr ? Math.max(0.05, adsr.decay) : 0.6;
  const envNoteTime = att + dec * 0.65 + 0.25;

  const rawCycleSec = Math.max(1.6, envNoteTime * effectiveMaxSubdivision * 0.65);
  return Math.max(1.4, Math.min(7.5, rawCycleSec));
}

/**
 * Extracts up to `maxPartials` normalised carrier partials `{ ratio, amp }` for a given VoiceAnchor
 * or whole Shape in Rhythm Space when Pitch Carrier is `'self'` or `'shape'`.
 */
export function buildCarrierPartialsForOnset(
  sourceShape: Shape,
  anchorIndex: number = 0,
  maxPartials: number = 6
): { ratio: number; amp: number }[] {
  const anchors = getShapeAnchors(sourceShape).filter((a) => !a.mute && a.gain > 0.0001);
  const targetAnchor = anchors[anchorIndex % Math.max(1, anchors.length)];

  // If the target anchor has its own multi-partial overtone tree (more than just 1/1),
  // use that anchor's internal partials relative to the anchor's fundamental!
  if (targetAnchor && targetAnchor.partials.length > 1) {
    const active = targetAnchor.partials
      .filter((p) => p.amp > 0.0001)
      .map((p) => ({ ratio: ratioToValue(p.ratio), amp: p.amp }))
      .sort((a, b) => b.amp - a.amp)
      .slice(0, maxPartials);

    if (active.length > 0) {
      const maxAmp = Math.max(...active.map((p) => p.amp), 1e-4);
      return active.map((p) => ({ ratio: p.ratio, amp: Number((p.amp / maxAmp).toFixed(3)) }));
    }
  }

  // Otherwise (e.g., a 3:2 Hemiola or single-partial-per-anchor shape), use the whole shape's
  // ratios normalised so the lowest active ratio is 1.0 (e.g., 2:3 becomes [1.0, 1.5], a 5-chord!).
  const effective = getEffectivePartials(sourceShape)
    .filter((p) => p.amp > 0.0001)
    .map((p) => ({ ratio: ratioToValue(p.ratio), amp: p.amp }));

  if (effective.length === 0) {
    return [{ ratio: 1.0, amp: 1.0 }];
  }

  const minRatio = Math.max(0.01, Math.min(...effective.map((p) => p.ratio)));
  const normalised = effective
    .map((p) => ({
      ratio: Number((p.ratio / minRatio).toFixed(4)),
      amp: p.amp,
    }))
    .sort((a, b) => b.amp - a.amp)
    .slice(0, maxPartials);

  const maxAmp = Math.max(...normalised.map((p) => p.amp), 1e-4);
  return normalised.map((p) => ({
    ratio: p.ratio,
    amp: Number((p.amp / maxAmp).toFixed(3)),
  }));
}
