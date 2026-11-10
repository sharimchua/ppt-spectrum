/**
 * Pure rendering utilities for filter aperture overlays and onset ghosting.
 * Strictly adheres to WCAG 2.2 Three-Flashes threshold for photosensitivity safety.
 */

import { FilterReference, RangeEndpoint } from '../core/filter-types';
import { resolveEndpoint } from '../core/filter-eval';
import { TPL_FREQUENCY_HZ } from '../core/ppt-constants';

export interface ApertureColours {
  stroke: string;
  fill: string;
  landmark: string;
  text: string;
  border: string;
}

/**
 * Returns colour palette for the acoustic aperture overlay based on filter action.
 * Australian English conventions maintained.
 */
export function getApertureColours(action: 'keep' | 'remove'): ApertureColours {
  if (action === 'remove') {
    return {
      stroke: 'rgba(244, 63, 94, 0.75)',   // Rose tint for rejection/subtraction
      fill: 'rgba(244, 63, 94, 0.08)',
      landmark: 'rgba(244, 63, 94, 0.4)',
      text: '#f43f5e',
      border: 'rgba(244, 63, 94, 0.45)',
    };
  }

  return {
    stroke: 'rgba(56, 189, 248, 0.7)',     // Sky-blue tint for transmission/pass
    fill: 'rgba(56, 189, 248, 0.08)',
    landmark: 'rgba(56, 189, 248, 0.4)',
    text: '#38bdf8',
    border: 'rgba(56, 189, 248, 0.45)',
  };
}

/**
 * Maps a filter range endpoint to ruler axis d coordinate.
 */
export function endpointToRulerD(
  endpoint: RangeEndpoint,
  reference: FilterReference,
  sceneD: number,
  anchorD: number = sceneD,
  tplHz: number = TPL_FREQUENCY_HZ
): number {
  const x = resolveEndpoint(endpoint, tplHz);
  switch (reference) {
    case 'absolute':
      return -x;
    case 'scene':
      return sceneD - x;
    case 'anchor':
      return anchorD - x;
  }
}

/**
 * WCAG 2.2 Three-Flashes Photosensitivity Governor.
 * For frequencies > 3 Hz, renderers must display continuous duty gain to prevent high-frequency strobing.
 * Partials <= 3 Hz are permitted to trigger discrete kinetic pulses.
 */
export function shouldUseDutyGain(frequencyHz: number): boolean {
  return frequencyHz > 3.0;
}

/**
 * Computes rendering opacity for partials or onset dots subject to filter attenuation.
 * Retains reductive pedagogy visibility by ensuring attenuated partials remain visible as ghosts.
 */
export function computeGhostAlpha(dutyGain: number, baseAlpha: number = 0.8): number {
  const clampedGain = Math.max(0, Math.min(1, dutyGain));
  // Dim to ghost floor (15% of base) when completely attenuated, full baseAlpha when unity
  const minAlpha = baseAlpha * 0.15;
  return minAlpha + (baseAlpha - minAlpha) * clampedGain;
}
