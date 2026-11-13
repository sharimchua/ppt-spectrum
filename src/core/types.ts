export type Ratio =
  | { kind: 'rational'; num: number; den: number }
  | { kind: 'real'; value: number };

export type VoiceId =
  | 'kick'
  | 'snare'
  | 'hihat'
  | 'woodblock'
  | 'clave'
  | 'triangle'
  | 'click';

export interface KernelParams {
  /** Pulse width as fraction of cycle: 0.02 (sharp click) to 1.0 (approaching sine) */
  pulseWidth: number;
  /** Symmetry / skew of pulse kernel: -1.0 to 1.0 */
  skew?: number;
}

export interface PartialComponent {
  id: string;
  ratio: Ratio;
  /** Linear amplitude relative to fundamental (fundamental = 1.0) */
  amp: number;
  /** Phase offset in turns [0..1) */
  phase: number;
  kernel?: KernelParams;
  voice?: VoiceId;
  label?: string;
  derived?: boolean;
  previousAmp?: number;
}

export type PresetCategory = 'rhythm' | 'harmony' | 'timbre';

export interface ADSREnvelope {
  /** Attack duration in seconds (e.g. 0.005s) */
  attack: number;
  /** Decay duration in seconds (e.g. 1.5s) */
  decay: number;
  /** Sustain amplitude ratio relative to peak (0.0 to 1.0) */
  sustain: number;
  /** Release duration in seconds (e.g. 0.4s) */
  release: number;
  /** Frequency damping: rate at which higher harmonics decay faster than fundamental (0.0 = uniform, 1.0 = heavy damping) */
  damping?: number;
}

export interface VoiceAnchor {
  id: string;
  name: string;
  /** Fundamental interval ratio relative to the root placement fundamental (default 1/1) */
  ratio: Ratio;
  /** Cycle phase offset in turns [0..1) (e.g. 0 for Do, 0.5 for Fi offbeat, 0.375 for 3/8) */
  phaseOffset: number;
  /** Optional PPT DuMetric Solfège rhythm token label (e.g. 'Do', 'Me', 'Mi', 'MeFi', 'Fi', 'Le', 'La', 'LaFi') */
  offsetToken?: string;
  /** Anchor gain multiplier (0.0 to 1.0) */
  gain: number;
  /** Previous gain retained when muted */
  previousGain?: number;
  /** Default drum/percussion voice for this anchor */
  voice?: VoiceId;
  /** Muted state for individual voice anchor */
  mute?: boolean;
  /** Nested harmonic partials relative to this anchor's fundamental */
  partials: PartialComponent[];
}

export interface Shape {
  id: string;
  name: string;
  partials: PartialComponent[];
  /** Hierarchical Voice Anchors (Root + Interval/Rhythm Fundamentals with nested partials) */
  anchors?: VoiceAnchor[];
  origin: 'preset' | 'user' | 'captured-pitch' | 'captured-rhythm';
  description?: string;
  category?: PresetCategory;
  adsr?: ADSREnvelope;
}

export interface Placement {
  shapeId: string;
  /** Position of fundamental on continuous DuPeriod axis d = log2(f_TPL / f) */
  d: number;
  gain: number;
  mute: boolean;
  solo: boolean;
}

export type FilterTrackingMode = 'fixed' | 'relative';

/**
 * @deprecated Legacy BandFilter model. Use modern Filter model from filter-types.ts instead.
 * Retained for backwards-compatibility migration of persisted scenes.
 */
export interface BandFilter {
  enabled: boolean;
  /** Centre coordinate on DuPeriod axis d (absolute coordinate when fixed, or relative offset when tracking) */
  centreD: number;
  /** Band width in DuPeriods / octaves */
  widthD: number;
  /** Edge softness (raised-cosine transition width in DuPeriods) */
  softnessD: number;
  mode: 'band-pass' | 'low-pass' | 'high-pass';
  /** Fixed formant on continuum or relative tracking with fundamental */
  trackingMode?: FilterTrackingMode;
}

import { Filter } from './filter-types';
import { Envelope } from './envelope-types';

export * from './filter-types';
export * from './envelope-types';

export interface AnchorConfig {
  tplFrequencyHz: number;
  /** Reference pitch A4 (default 440 Hz) */
  tuningA4Hz: number;
  /** Tonic pitch class (0 = C, 2 = D default) */
  tonicPitchClass: number;
}

export type LabelSetId =
  | 'ppt'
  | 'conventional-pitch'
  | 'conventional-time'
  | 'biological'
  | 'landmarks';

export interface LensConfig {
  lensId: string;
  type: string;
  labelSets: LabelSetId[];
  colorMode: 'solfege' | 'prime-family' | 'uniform';
  zoom: number;
  centerD: number;
}

export interface VoiceMap {
  [partialIndex: number]: VoiceId;
}

export interface AudioConfig {
  masterGain: number;
  audioMode: 'poetic' | 'literal';
  speakerAssist: boolean;
  audibleGhostFundamental: boolean;
  audibleInterference: boolean;
  voiceMap: VoiceMap;
}

export type BackgroundTheme = 'carbon-grid' | 'studio-obsidian' | 'cosmic-abyss' | 'velvet-dark';
export type LensFlareStyle = 'cinematic' | 'anamorphic' | 'starburst';
export type PerformanceProfile = 'max' | 'balanced' | 'eco' | 'none';

export interface CosmeticsConfig {
  performanceProfile: PerformanceProfile;
  backgroundTheme: BackgroundTheme;
  filmGrainEnabled: boolean;
  filmGrainIntensity: number;
  filmGrainSize: number;
  filmGrainContrast: number;
  sparksEnabled: boolean;
  particleIntensity: number;
  particleSize: number;
  particleVolume: number;
  particleGravity: number;
  shockwavesEnabled: boolean;
  shockwaveRadius: number;
  shockwaveSpeed: number;
  shockwaveDecayDurationMs: number;
  glowBloomEnabled: boolean;
  glowBloom: number;
  motionTrailsEnabled: boolean;
  motionTrails: number;
  ghostingEnabled: boolean;
  ghostingIntensity: number;
  lightBleedEnabled: boolean;
  lightBleedIntensity: number;
  scanlinesEnabled: boolean;
  scanlineIntensity: number;
  scanlineDensity: number;
  crtVignette: number;
  crtCurvature: number;
  lensFlareEnabled: boolean;
  lensFlareIntensity: number;
  lensFlareStyle: LensFlareStyle;
  webglEnabled: boolean;
  focusModeEnabled: boolean;
}

export interface Scene {
  shapes: Shape[];
  placements: Placement[];
  filter: Filter;
  filters?: Filter[];
  envelope?: Envelope;
  envelopes?: Envelope[];
  anchors: AnchorConfig;
  lenses: LensConfig[];
  audio: AudioConfig;
  cosmetics: CosmeticsConfig;
}
