import { PerformanceProfile } from '../core/types';

export interface CanvasDprCaps {
  lensDpr: number;
  bgDpr: number;
  webglDpr: number;
}

/**
 * Returns true on handheld/tablet touch devices without a precision fine pointer.
 */
export function isMobileTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const hasFinePointer = window.matchMedia?.('(pointer: fine)').matches;
  return !hasFinePointer && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

/**
 * Returns true on iOS / iPadOS Safari & WebKit devices.
 */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

/**
 * Platform-aware initial graphics profile when the user has not saved a preference.
 * iOS and mobile touch devices default to 'eco' for thermal/battery stability;
 * Desktop defaults to 'balanced' (6-light WebGL optics, capped particles).
 */
export function getDefaultPerformanceProfileForDevice(): PerformanceProfile {
  return isMobileTouchDevice() || isIosDevice() ? 'eco' : 'balanced';
}

/**
 * Returns device- and profile-calibrated devicePixelRatio caps for 2D and WebGL layers.
 */
export function getCanvasDprCaps(profile: PerformanceProfile = 'balanced'): CanvasDprCaps {
  const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const mobile = isMobileTouchDevice() || isIosDevice();

  if (mobile) {
    const lensCap = profile === 'eco' || profile === 'none' ? 1.25 : 1.5;
    return {
      lensDpr: Math.min(rawDpr, lensCap),
      bgDpr: Math.min(rawDpr, 1.25),
      webglDpr: Math.min(rawDpr, 1.0),
    };
  }

  return {
    lensDpr: Math.min(rawDpr, 2.0),
    bgDpr: Math.min(rawDpr, 1.5),
    webglDpr: Math.min(rawDpr, profile === 'max' ? 1.5 : 1.25),
  };
}

/**
 * Maximum active GPU/2D particles permitted per performance profile.
 */
export function getMaxParticlesForProfile(profile: PerformanceProfile): number {
  switch (profile) {
    case 'max':
      return 2048;
    case 'balanced':
      return 512;
    case 'eco':
      return 128;
    case 'none':
    default:
      return 0;
  }
}
