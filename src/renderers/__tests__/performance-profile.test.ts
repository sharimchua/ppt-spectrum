import { describe, it, expect } from 'vitest';
import {
  getMaxParticlesForProfile,
  getCanvasDprCaps,
  getDefaultPerformanceProfileForDevice,
} from '../performance-profile';

describe('performance-profile', () => {
  it('allocates scaled particle budgets per performance band', () => {
    expect(getMaxParticlesForProfile('max')).toBe(2048);
    expect(getMaxParticlesForProfile('balanced')).toBe(512);
    expect(getMaxParticlesForProfile('eco')).toBe(128);
    expect(getMaxParticlesForProfile('none')).toBe(0);
  });

  it('caps DPR safely in non-DOM desktop fallback', () => {
    const balancedCaps = getCanvasDprCaps('balanced');
    const maxCaps = getCanvasDprCaps('max');
    expect(balancedCaps.lensDpr).toBeGreaterThanOrEqual(1);
    expect(balancedCaps.webglDpr).toBeLessThanOrEqual(1.25);
    expect(maxCaps.webglDpr).toBeLessThanOrEqual(1.5);
  });

  it('defaults to balanced when no mobile/iOS globals are present', () => {
    expect(getDefaultPerformanceProfileForDevice()).toBe('balanced');
  });
});
