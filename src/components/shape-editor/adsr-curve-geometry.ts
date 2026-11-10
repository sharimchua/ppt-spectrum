/**
 * ADSR SVG envelope curve geometry calculations.
 * Computes SVG bezier path strings, anchor coordinates, and phase label positions.
 */

import { ADSREnvelope } from '../../core/types';

export interface AdsrPoint {
  x: number;
  y: number;
}

export interface AdsrGeometry {
  mainPath: string;
  mainFill: string;
  dampPath: string;
  points: {
    peak: AdsrPoint;
    decay: AdsrPoint;
    sustainEnd: AdsrPoint;
    releaseEnd: AdsrPoint;
  };
  labels: {
    a: AdsrPoint;
    d: AdsrPoint;
    s: AdsrPoint;
    r: AdsrPoint;
  };
  showDamped: boolean;
}

/**
 * Calculates SVG path geometry and coordinate points for an ADSR envelope.
 */
export function calculateAdsrGeometry(
  adsr: ADSREnvelope,
  baseW: number = 320
): AdsrGeometry {
  const x0 = 20;
  const yBase = 68;
  const yPeak = 15;
  const hSpan = yBase - yPeak;

  // Segment widths (normalised)
  const wA = Math.max(12, Math.min(60, (adsr.attack / 0.3) * 60));
  const wD = Math.max(25, Math.min(100, (adsr.decay / 3.0) * 100));
  const wS = 65;
  const wR = Math.max(20, Math.min(80, (adsr.release / 2.0) * 80));
  const totalW = wA + wD + wS + wR;
  const scale = (baseW - 10) / Math.max(1, totalW);

  const swA = wA * scale;
  const swD = wD * scale;
  const swS = wS * scale;
  const swR = wR * scale;

  const p0x = x0;
  const p1x = p0x + swA;
  const p2x = p1x + swD;
  const p3x = p2x + swS;
  const p4x = p3x + swR;

  const ySus = yBase - adsr.sustain * hSpan;

  // Main fundamental envelope path
  const mainPath = `M ${p0x},${yBase} L ${p1x},${yPeak} Q ${p1x + swD * 0.4},${ySus + 5} ${p2x},${ySus} L ${p3x},${ySus} Q ${p3x + swR * 0.5},${yBase - 3} ${p4x},${yBase}`;
  const mainFill = `${mainPath} L ${p4x},${yBase} L ${p0x},${yBase} Z`;

  // High harmonic damped curve (harmonic 4)
  const dampVal = adsr.damping !== undefined ? adsr.damping : 0.0;
  const swDampD = swD / (1.0 + dampVal * 3.0);
  const pDamp2x = p1x + swDampD;
  const yDampSus = yBase - Math.min(adsr.sustain, adsr.sustain / (1.0 + dampVal * 2.0)) * hSpan;
  const dampPath = `M ${p0x},${yBase} L ${p1x},${yPeak} Q ${p1x + swDampD * 0.4},${yDampSus + 4} ${pDamp2x},${yDampSus} L ${p3x},${yDampSus} L ${p4x},${yBase}`;

  return {
    mainPath,
    mainFill,
    dampPath,
    points: {
      peak: { x: p1x, y: yPeak },
      decay: { x: p2x, y: ySus },
      sustainEnd: { x: p3x, y: ySus },
      releaseEnd: { x: p4x, y: yBase },
    },
    labels: {
      a: { x: p0x + swA * 0.5, y: 80 },
      d: { x: p1x + swD * 0.5, y: 80 },
      s: { x: p2x + swS * 0.5, y: 80 },
      r: { x: p3x + swR * 0.5, y: 80 },
    },
    showDamped: dampVal > 0.08,
  };
}
