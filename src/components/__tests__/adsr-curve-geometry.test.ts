import { describe, it, expect } from 'vitest';
import { calculateAdsrGeometry } from '../shape-editor/adsr-curve-geometry';
import { ADSREnvelope } from '../../core/types';

describe('adsr-curve-geometry', () => {
  const baseAdsr: ADSREnvelope = {
    attack: 0.01,
    decay: 1.0,
    sustain: 0.8,
    release: 0.3,
    damping: 0.2,
  };

  it('calculates valid SVG path strings and anchor coordinates', () => {
    const geo = calculateAdsrGeometry(baseAdsr, 320);
    expect(geo.mainPath).toContain('M 20,68');
    expect(geo.mainFill).toContain('Z');
    expect(geo.points.peak.y).toBe(15);
    expect(geo.points.releaseEnd.y).toBe(68);
    expect(geo.labels.a.x).toBeGreaterThan(20);
    expect(geo.labels.d.x).toBeGreaterThan(geo.labels.a.x);
    expect(geo.labels.s.x).toBeGreaterThan(geo.labels.d.x);
    expect(geo.labels.r.x).toBeGreaterThan(geo.labels.s.x);
  });

  it('clamps extreme segment attack/decay/release values', () => {
    const extremeAdsr: ADSREnvelope = {
      attack: 100, // very large
      decay: 0.0001, // very small
      sustain: 0.5,
      release: 50,
      damping: 0,
    };
    const geo = calculateAdsrGeometry(extremeAdsr, 320);
    expect(geo.mainPath).toBeDefined();
    expect(geo.points.peak.x).toBeLessThan(320);
    expect(geo.points.releaseEnd.x).toBeLessThanOrEqual(330);
  });

  it('maps sustain height correctly from 0 (baseline) to 1 (peak)', () => {
    const fullSustain: ADSREnvelope = { ...baseAdsr, sustain: 1.0 };
    const fullGeo = calculateAdsrGeometry(fullSustain, 320);
    expect(fullGeo.points.decay.y).toBe(15); // equal to yPeak

    const zeroSustain: ADSREnvelope = { ...baseAdsr, sustain: 0.0 };
    const zeroGeo = calculateAdsrGeometry(zeroSustain, 320);
    expect(zeroGeo.points.decay.y).toBe(68); // equal to yBase
  });

  it('hides damped curve when damping <= 0.08 and shows when > 0.08', () => {
    const lowDamping: ADSREnvelope = { ...baseAdsr, damping: 0.05 };
    expect(calculateAdsrGeometry(lowDamping).showDamped).toBe(false);

    const boundaryDamping: ADSREnvelope = { ...baseAdsr, damping: 0.08 };
    expect(calculateAdsrGeometry(boundaryDamping).showDamped).toBe(false);

    const highDamping: ADSREnvelope = { ...baseAdsr, damping: 0.2 };
    expect(calculateAdsrGeometry(highDamping).showDamped).toBe(true);
  });
});
