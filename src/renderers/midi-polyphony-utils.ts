/**
 * Pure rendering utilities for polyphonic held MIDI streams across Rhythm Space and Pitch Space.
 * Allows EventLanes and CycleWheel to display all held MIDI keys equally, anchored to the
 * lowest (Sam / root) held voice, with automatic partial-expansion capping for complex shapes.
 */

import { Shape } from '../core/types';
import { dToFreq, resolveDuPeriodAddress } from '../core/axis';
import { ratioToValue } from '../core/rational';
import { HeldMidiNote } from './render-coordinator';

export interface PolyphonicMidiStream {
  midi: number;
  d: number;
  freqHz: number;
  ratioToRef: number;
  effectivePhase: number;
  amp: number;
  velocity: number;
  label: string;
}

export interface PolyphonicMidiBundle {
  anchorNote: HeldMidiNote;
  anchorFreqHz: number;
  anchorLivePhase: number;
  isExpandedPartials: boolean;
  streams: PolyphonicMidiStream[];
}

const MAX_EXPANDED_STREAMS = 32;

/**
 * Builds equal-footing onset streams for 2+ held MIDI notes.
 * Returns null when fewer than 2 MIDI notes are held so lenses use their standard single-shape path.
 */
export function buildPolyphonicMidiBundle(
  heldNotes: HeldMidiNote[] | undefined,
  shape: Shape,
  tplHz: number
): PolyphonicMidiBundle | null {
  if (!heldNotes || heldNotes.length < 2) {
    return null;
  }

  // Sort lowest frequency first (largest d = slowest / lowest pitch = Sam anchor)
  const sorted = [...heldNotes].sort((a, b) => b.d - a.d);
  const anchorNote = sorted[0];
  const anchorFreqHz = dToFreq(anchorNote.d, tplHz);
  const anchorLivePhase = anchorNote.livePhase ?? 0;

  const activePartials = shape.partials.filter((p) => p.amp > 0.001);
  const expandPartials =
    activePartials.length > 0 && sorted.length * activePartials.length <= MAX_EXPANDED_STREAMS;

  const streams: PolyphonicMidiStream[] = [];

  for (const gn of sorted) {
    const voiceFreq = dToFreq(gn.d, tplHz);
    const voiceRatioToRef = voiceFreq / Math.max(1e-6, anchorFreqHz);
    const voiceLivePhase = gn.livePhase ?? 0;
    const keyStrikeOffsetTurns =
      anchorNote.livePhase !== undefined && gn.livePhase !== undefined
        ? (anchorLivePhase * voiceRatioToRef - voiceLivePhase) / Math.max(1e-6, voiceRatioToRef)
        : 0;

    if (expandPartials) {
      for (const p of activePartials) {
        const pRatio = ratioToValue(p.ratio);
        const partialD = gn.d - Math.log2(Math.max(1e-6, pRatio));
        const addr = resolveDuPeriodAddress(partialD);
        streams.push({
          midi: gn.midi,
          d: partialD,
          freqHz: voiceFreq * pRatio,
          ratioToRef: voiceRatioToRef * pRatio,
          effectivePhase: p.phase + keyStrikeOffsetTurns,
          amp: p.amp,
          velocity: gn.velocity,
          label: activePartials.length === 1 ? addr.formatted : `${addr.formatted} (${pRatio.toFixed(2)}x)`,
        });
      }
    } else {
      const addr = resolveDuPeriodAddress(gn.d);
      streams.push({
        midi: gn.midi,
        d: gn.d,
        freqHz: voiceFreq,
        ratioToRef: voiceRatioToRef,
        effectivePhase: keyStrikeOffsetTurns,
        amp: 1.0,
        velocity: gn.velocity,
        label: `${addr.formatted} (${voiceRatioToRef.toFixed(2)}x)`,
      });
    }
  }

  return {
    anchorNote,
    anchorFreqHz,
    anchorLivePhase,
    isExpandedPartials: expandPartials,
    streams,
  };
}
