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
}

export interface Shape {
  id: string;
  name: string;
  partials: PartialComponent[];
  origin: 'preset' | 'user' | 'captured-pitch' | 'captured-rhythm';
  description?: string;
}

export interface Placement {
  shapeId: string;
  /** Position of fundamental on continuous DuPeriod axis d = log2(f_TPL / f) */
  d: number;
  gain: number;
  mute: boolean;
  solo: boolean;
}

export interface BandFilter {
  enabled: boolean;
  /** Centre coordinate on DuPeriod axis d */
  centreD: number;
  /** Band width in DuPeriods / octaves */
  widthD: number;
  /** Edge softness (raised-cosine transition width in DuPeriods) */
  softnessD: number;
  mode: 'band-pass' | 'low-pass' | 'high-pass';
}

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
export type PerformanceProfile = 'max' | 'balanced' | 'eco';

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
  filter: BandFilter;
  anchors: AnchorConfig;
  lenses: LensConfig[];
  audio: AudioConfig;
  cosmetics: CosmeticsConfig;
}
