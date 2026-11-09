import { Scene, CosmeticsConfig, Shape } from './types';
import { PRESET_SHAPES } from './presets';
import { TPL_FREQUENCY_HZ } from './ppt-constants';

export const DEFAULT_COSMETICS: CosmeticsConfig = {
  performanceProfile: 'balanced',
  backgroundTheme: 'carbon-grid',
  filmGrainEnabled: true,
  filmGrainIntensity: 0.35,
  filmGrainSize: 3,
  filmGrainContrast: 0.45,
  sparksEnabled: true,
  particleIntensity: 0.9,
  particleSize: 1.0,
  particleVolume: 1.0,
  particleGravity: 0.15,
  shockwavesEnabled: true,
  shockwaveRadius: 1.0,
  shockwaveSpeed: 1.0,
  shockwaveDecayDurationMs: 650,
  glowBloomEnabled: true,
  glowBloom: 0.8,
  motionTrailsEnabled: false,
  motionTrails: 0.6,
  ghostingEnabled: false,
  ghostingIntensity: 0.3,
  lightBleedEnabled: true,
  lightBleedIntensity: 0.45,
  scanlinesEnabled: true,
  scanlineIntensity: 0.4,
  scanlineDensity: 2,
  crtVignette: 0.25,
  crtCurvature: 0.05,
  lensFlareEnabled: true,
  lensFlareIntensity: 0.55,
  lensFlareStyle: 'cinematic',
  webglEnabled: true,
  focusModeEnabled: true,
};

export const DEFAULT_SCENE: Scene = {
  shapes: PRESET_SHAPES,
  placements: [
    {
      shapeId: 'hemiola-3-2',
      d: 2.0, // Initial placement in rhythm region (~6.45 Hz)
      gain: 0.8,
      mute: false,
      solo: false,
    }
  ],
  filter: {
    enabled: false,
    centreD: 0.0,
    widthD: 4.0,
    softnessD: 1.0,
    mode: 'band-pass',
    trackingMode: 'fixed',
  },
  anchors: {
    tplFrequencyHz: TPL_FREQUENCY_HZ,
    tuningA4Hz: 440.0,
    tonicPitchClass: 2, // 2 = D
  },
  lenses: [
    {
      lensId: 'ruler-main',
      type: 'ruler',
      labelSets: ['ppt', 'conventional-pitch', 'conventional-time', 'landmarks'],
      colorMode: 'solfege',
      zoom: 1.0,
      centerD: 0.0,
    }
  ],
  audio: {
    masterGain: 0.75,
    audioMode: 'poetic',
    speakerAssist: true,
    audibleGhostFundamental: false,
    audibleInterference: false,
    voiceMap: {
      0: 'kick',
      1: 'woodblock',
      2: 'clave',
      3: 'snare',
      4: 'hihat',
    }
  },
  cosmetics: DEFAULT_COSMETICS,
};

export const STORAGE_KEY = 'ppt_spectrum_scene_v1';
export const STORAGE_KEY_GRAPHICS_PROFILE = 'ppt_spectrum_graphics_profile_v1';

export function loadSavedScene(): Scene {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_SCENE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const dedicatedProfile = window.localStorage.getItem(STORAGE_KEY_GRAPHICS_PROFILE);
    if (!raw) {
      if (dedicatedProfile && (dedicatedProfile === 'max' || dedicatedProfile === 'balanced' || dedicatedProfile === 'eco' || dedicatedProfile === 'none')) {
        return {
          ...DEFAULT_SCENE,
          cosmetics: {
            ...DEFAULT_COSMETICS,
            performanceProfile: dedicatedProfile,
          },
        };
      }
      return DEFAULT_SCENE;
    }
    const parsed = JSON.parse(raw);
    const userShapes = Array.isArray(parsed.shapes)
      ? parsed.shapes.filter((s: Shape) => s && s.origin !== 'preset')
      : [];
    const mergedShapes = [...PRESET_SHAPES, ...userShapes];

    const rawProfile = dedicatedProfile || parsed?.cosmetics?.performanceProfile;
    const finalProfile = (rawProfile === 'max' || rawProfile === 'balanced' || rawProfile === 'eco' || rawProfile === 'none')
      ? rawProfile
      : DEFAULT_COSMETICS.performanceProfile;

    return {
      ...DEFAULT_SCENE,
      ...parsed,
      shapes: mergedShapes,
      audio: {
        ...DEFAULT_SCENE.audio,
        ...(parsed.audio || {}),
        audioMode: 'poetic',
      },
      cosmetics: {
        ...DEFAULT_COSMETICS,
        ...(parsed.cosmetics || {}),
        performanceProfile: finalProfile,
      }
    };
  } catch (err) {
    console.warn('[Config] Failed to load saved scene from localStorage:', err);
    return DEFAULT_SCENE;
  }
}

export function saveScene(scene: Scene): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scene));
    if (scene.cosmetics?.performanceProfile) {
      window.localStorage.setItem(STORAGE_KEY_GRAPHICS_PROFILE, scene.cosmetics.performanceProfile);
    }
  } catch (err) {
    console.warn('[Config] Failed to persist scene to localStorage:', err);
  }
}
