/**
 * Guided tutorial demo configurations and section types.
 * Connects the interactive tutorial modal to live studio configurations
 * with a context-aware "Back to Guide" return toast.
 */

import { Filter, PitchCarrierMode, RhythmContainerMode } from '../../core/types';
import { MidiPhaseMode, MidiTuningPresetId } from '../../core/midi-tuning';
import { TuningSubsetId } from '../../core/tuning-systems';
import { PRIME_SWEEP_DEMOS } from './prime-sweep-demos';
import { TIMBRE_SWEEP_DEMOS } from './timbre-sweep-demos';
import { COUPLING_DEMOS } from './coupling-demos';
import { KEYBOARD_CADENCE_DEMOS } from './keyboard-cadence-demos';
import { TUNING_SYSTEM_DEMOS } from './tuning-demos';

export type TutorialSectionId = 'overview' | 'concepts' | 'tuning' | 'hood' | 'customise';

export type TutorialDemoId =
  | 'hemiola-sweep'
  | 'polyrhythm-4-3-sweep'
  | 'polyrhythm-5-4-sweep'
  | 'polyrhythm-7-4-sweep'
  | 'polyrhythm-7-5-sweep'
  | 'polyrhythm-11-8-sweep'
  | 'triad-sweep'
  | 'sine-timbre'
  | 'sawtooth-timbre'
  | 'clarinet-timbre'
  | 'bell-timbre'
  | 'custom-timbre'
  | 'tresillo-sieve'
  | 'piano-comb'
  | 'bowl-swell'
  | 'fractal-self-triad'
  | 'neutral-limen-hemiola'
  | 'cross-shape-clarinet-hemiola'
  | 'keyboard-12tet-drift'
  | 'keyboard-5limit-lock'
  | 'tempo-cadence-modulation'
  | 'pythagorean-pentatonic-demo'
  | 'pythagorean-heptatonic-dissonance'
  | '31edo-meantone-demo'
  | '31edo-septimal-demo';

export interface KeyboardDemoConfig {
  tuningPresetId: Exclude<MidiTuningPresetId, 'custom'>;
  subsetId?: TuningSubsetId;
  latchedMidiNotes: number[];
  showIntervals?: boolean;
  rhythmPhaseMode?: MidiPhaseMode;
}

export interface DemoPartialSpec {
  ratioVal: number;
  num?: number;
  den?: number;
  amp: number;
  label: string;
  voice?: 'kick' | 'snare' | 'woodblock' | 'clave' | 'hihat' | 'triangle' | 'click';
}

export interface CustomTutorialDemoOverride {
  title?: string;
  shortTitle?: string;
  badge?: string;
  listenHint?: string;
  /** Custom overtone partials mixed by the user in OvertoneTimbreDiagram or cadence demos */
  customPartials?: DemoPartialSpec[];
  /** Custom 8-slot cycle sieve toggled by the user in UnderTheHoodSection */
  customSieveSlots?: boolean[];
  /** Custom filter (e.g. Supercycle Band Filter for metric modulation demos) */
  customFilter?: Filter;
  pitchCarrier?: PitchCarrierMode;
  rhythmContainer?: RhythmContainerMode;
  keyboardConfig?: KeyboardDemoConfig;
}

export interface DemoNarrationConfig {
  /** Shown while in Rhythm Space (d > 0.8) */
  rhythm?: string;
  /** Shown while crossing the 25.8 Hz TPL zone (-0.8 <= d <= 0.8) */
  crossover?: string;
  /** Shown while in Pitch Space (d < -0.8) */
  pitch?: string;
  /** Gentle invitation shown once a sweep completes a full A -> B -> A round trip */
  afterRoundTrip?: string;
  /** Shown when the user manually drags d (taking control from the sweep) */
  manualControl?: string;
  /** Shown when an active filter is shaping the sound (e.g. bandpass isolation) */
  filterActive?: string;
}

export interface SpotlightVoiceConfig {
  label: string;
  centreD: number;
  widthD: number;
  softnessD: number;
  narration: string;
}

export interface TuningCompareConfig {
  altPresetId: Exclude<MidiTuningPresetId, 'custom'>;
  altSubsetId?: TuningSubsetId;
  label: string;
  altLabel: string;
  altNarration: string;
}

export interface ContextualDemoAction {
  cardId: string;
  label: string;
  demoId: TutorialDemoId;
  fromSection: TutorialSectionId;
  customOverride?: CustomTutorialDemoOverride;
}

export type DemoRegime = 'rhythm' | 'crossover' | 'pitch';

export interface TutorialDemoConfig {
  id: TutorialDemoId;
  title: string;
  shortTitle: string;
  badge: string;
  summary: string;
  listenHint: string;
  fromSection: TutorialSectionId;
  mode: 'sweep' | 'bundle' | 'static-place';
  shapeId?: string;
  bundleId?: string;
  rhythmBpm?: number;
  rhythmD?: number;
  pitchLabel?: string;
  pitchD?: number;
  noteIndex?: number;
  octave?: number;
  /** Destination dwell duration in seconds at Bookmarks A and B (defaults to 4s for sweep demos) */
  dwellSec?: number;
  /** Full transit duration (A -> B + B -> A) in seconds (defaults to 10s) */
  periodSec?: number;
  /** Preferred layout preset ID on desktop viewports (>= 640px) */
  desktopLayoutId?: string;
  /** Preferred layout preset ID on mobile viewports (< 640px) */
  mobileLayoutId?: string;
  /** Context-aware narration lines keyed by regime and user interaction */
  narration?: DemoNarrationConfig;
  /** Optional relative bandpass spotlight voices (automated on Cycle 2 + one-tap toast cycle) */
  spotlightVoices?: SpotlightVoiceConfig[];
  /** Optional one-tap tuning A/B comparison for keyboard demos */
  tuningCompare?: TuningCompareConfig;
  /** Optional inline partial list (e.g. pure fundamental-only triad for Polyrhythm is Harmony) */
  customPartials?: DemoPartialSpec[];
  pitchCarrier?: PitchCarrierMode;
  rhythmContainer?: RhythmContainerMode;
  /** Explicit flag indicating whether this demo opens and latches the on-screen Solfège Keyboard */
  requiresKeyboard?: boolean;
  /** Configuration for demos that open and latch the on-screen Solfège Keyboard */
  keyboardConfig?: KeyboardDemoConfig;
  /** Whether this demo appears in the main featured tour cycle */
  featuredInTour?: boolean;
}

export const STORAGE_KEY_DONT_SHOW_INTRO = 'ppt_spectrum_dont_show_intro_v1';

export const TUTORIAL_DEMOS: TutorialDemoConfig[] = [
  {
    id: 'hemiola-sweep',
    title: '3:2 Polyrhythm → Perfect Fifth',
    shortTitle: '3:2 Hemiola Sweep',
    badge: 'TPL Crossover · 3:2',
    summary: 'Hear a 3-against-2 drum beat speed up past 25.8 Hz until it fuses into a musical fifth.',
    listenHint:
      'Listen as the 3-against-2 drum beat accelerates across the 25.8 Hz crossover and melts into a smooth Perfect Fifth interval.',
    fromSection: 'overview',
    mode: 'sweep',
    shapeId: 'hemiola-3-2',
    rhythmBpm: 60,
    rhythmD: 4.689,
    pitchLabel: 'A4 440 Hz (Pitch)',
    pitchD: -4.092,
    noteIndex: 9,
    octave: 4,
    dwellSec: 4,
    desktopLayoutId: 'trio',
    mobileLayoutId: 'rhythm-duo',
    pitchCarrier: 'kit',
    rhythmContainer: 'static',
    narration: {
      rhythm: 'Rhythm Space: hear the 3-against-2 beats interact and lock onto The Sam (12 o’clock) each cycle.',
      crossover: 'Crossing 25.8 Hz: the separate hits are speeding up and blurring into one continuous sound…',
      pitch: 'Pitch Space: the same 3:2 pattern is now a smooth Perfect Fifth.',
      afterRoundTrip: 'Watch Cycle 2 spotlight each voice—or pause and drag the slider anywhere.',
      manualControl: 'You’re driving: slide across 25.8 Hz to hear where the 3:2 groove fuses into a fifth.',
    },
    spotlightVoices: [
      {
        label: '1× Root',
        centreD: 0.0,
        widthD: 0.42,
        softnessD: 0.15,
        narration: 'Bandpass spotlight: isolating the lower voice (1×) while the upper voice is filtered out.',
      },
      {
        label: '3/2× Fifth',
        centreD: -0.585,
        widthD: 0.42,
        softnessD: 0.15,
        narration: 'Bandpass spotlight: sliding up to isolate the upper voice (3/2×, a Fifth above).',
      },
    ],
    featuredInTour: true,
  },
  {
    id: 'polyrhythm-4-3-sweep',
    title: '4:3 Polyrhythm → Perfect Fourth',
    shortTitle: '4:3 Fourth Sweep',
    badge: 'TPL Crossover · 4:3',
    summary: 'Hear a 4-against-3 cross-rhythm speed up across 25.8 Hz into a suspended Perfect Fourth.',
    listenHint:
      'Notice the 4-against-3 cross-rhythm locking onto The Sam each cycle at 120 BPM, then fusing into a pure Perfect Fourth (498¢) above 25.8 Hz.',
    fromSection: 'concepts',
    mode: 'sweep',
    shapeId: 'polyrhythm-4-3',
    rhythmBpm: 120,
    rhythmD: 3.689,
    pitchLabel: 'A4 440 Hz (Pitch)',
    pitchD: -4.092,
    noteIndex: 9,
    octave: 4,
    dwellSec: 4,
    desktopLayoutId: 'trio',
    mobileLayoutId: 'rhythm-duo',
    pitchCarrier: 'kit',
    rhythmContainer: 'static',
    narration: {
      rhythm: 'Rhythm Space: hear 4 beats against 3 interlock and land together on Beat 1.',
      crossover: 'Crossing 25.8 Hz: the 4:3 cross-rhythm is blurring into a single steady tone…',
      pitch: 'Pitch Space: those 4:3 beats are now a pure Perfect Fourth (498¢).',
      afterRoundTrip: 'Heard the full sweep? Pause or drag the slider to compare the groove and the fourth.',
    },
  },
  {
    id: 'polyrhythm-5-4-sweep',
    title: '5:4 Polyrhythm → Major Third',
    shortTitle: '5:4 Major 3rd Sweep',
    badge: 'TPL Crossover · 5:4',
    summary: 'Hear a 5-against-4 quintuplet groove accelerate across 25.8 Hz into a sweet Just Major Third.',
    listenHint:
      'Listen to the 5-against-4 groove at 120 BPM transform across the 25.8 Hz horizon into a warm, beatless Just Major Third (386¢).',
    fromSection: 'concepts',
    mode: 'sweep',
    shapeId: 'polyrhythm-5-4',
    rhythmBpm: 120,
    rhythmD: 3.689,
    pitchLabel: 'A4 440 Hz (Pitch)',
    pitchD: -4.092,
    noteIndex: 9,
    octave: 4,
    dwellSec: 4,
    desktopLayoutId: 'trio',
    mobileLayoutId: 'rhythm-duo',
    pitchCarrier: 'kit',
    rhythmContainer: 'static',
    narration: {
      rhythm: 'Rhythm Space: feel the 5-against-4 quintuplet groove resolve onto The Sam each cycle.',
      crossover: 'Crossing 25.8 Hz: the 5:4 pulses are fusing into a warm chord…',
      pitch: 'Pitch Space: 5:4 becomes a beatless Just Major Third (386¢).',
      afterRoundTrip: 'Heard the full sweep? Pause or drag the slider to explore the crossover.',
    },
  },
  ...PRIME_SWEEP_DEMOS,
  {
    id: 'triad-sweep',
    title: '4:5:6 Polyrhythm → Major Chord',
    shortTitle: '4:5:6 Triad Sweep',
    badge: 'Voice Anchors · 4:5:6',
    summary: 'Three interlocking rhythmic pulses accelerate together into a glowing Just Major triad.',
    listenHint:
      'Notice how three separate drum pulses (4 : 5 : 6) lock together on Beat 1 in rhythm space, then fuse into a pure Major chord in pitch space.',
    fromSection: 'concepts',
    mode: 'sweep',
    shapeId: 'triad-4-5-6-pure',
    customPartials: [
      { ratioVal: 1, num: 1, den: 1, amp: 1.0, label: '1 (Do / 4-Pulse)', voice: 'kick' },
      { ratioVal: 1.25, num: 5, den: 4, amp: 0.9, label: '5/4 (Mi / 5-Pulse)', voice: 'clave' },
      { ratioVal: 1.5, num: 3, den: 2, amp: 0.85, label: '3/2 (So / 6-Pulse)', voice: 'woodblock' },
    ],
    rhythmBpm: 60,
    rhythmD: 4.689,
    pitchLabel: 'C4 262 Hz (Pitch)',
    pitchD: -3.344,
    noteIndex: 0,
    octave: 4,
    dwellSec: 4,
    desktopLayoutId: 'trio',
    mobileLayoutId: 'rhythm-duo',
    pitchCarrier: 'kit',
    rhythmContainer: 'static',
    narration: {
      rhythm: 'Rhythm Space: three separate pulses (4 : 5 : 6) lock together on Beat 1.',
      crossover: 'Crossing 25.8 Hz: the three-way groove is merging into a single chord…',
      pitch: 'Pitch Space: 4 : 5 : 6 fuses into a pure, beatless Just Major Triad.',
      afterRoundTrip: 'Heard the full sweep? Pause or drag the slider to listen at any speed.',
    },
    featuredInTour: true,
  },
  ...TIMBRE_SWEEP_DEMOS,
  {
    id: 'tresillo-sieve',
    title: 'Rhythm Sieve: Octuple 8th-Grid + Cycle Filter',
    shortTitle: 'Cycle Sieve Groove',
    badge: '8-Slot Cycle Sieve',
    summary: 'An 8-slot circular sieve carves a dense 1:2:4:8 8th-note drum stack into a syncopated groove.',
    listenHint:
      'The active 8-slot Cycle Filter acts like a musical stencil (sieve) over a dense 1:2:4:8 8th-note stack, keeping only beats that land on your open KEEP slots.',
    fromSection: 'hood',
    mode: 'bundle',
    bundleId: 'bundle-hemiola-tresillo',
    desktopLayoutId: 'rhythm-lab',
    mobileLayoutId: 'rhythm-duo',
    narration: {
      manualControl: 'Try dragging the spectrum slider or opening Filters to flip slots on the 8-slot sieve.',
    },
    featuredInTour: true,
  },
  {
    id: 'piano-comb',
    title: 'Stretched Piano + Harmonic Comb',
    shortTitle: 'Piano + Comb Filter',
    badge: 'Stretch B + Comb',
    summary: 'Warm stretched piano strings sculpted by a percussive hammer envelope and harmonic comb filter.',
    listenHint:
      'Slightly stretched overtones (Inharmonicity B) give the piano its warm acoustic ring, while the Harmonic Comb filter shapes the body resonance.',
    fromSection: 'hood',
    mode: 'bundle',
    bundleId: 'bundle-piano-harmonic-comb',
    desktopLayoutId: 'timbre-lab',
    mobileLayoutId: 'timbre-duo',
    featuredInTour: true,
  },
  {
    id: 'bowl-swell',
    title: 'Singing Bowl + 4-Bar Swell',
    shortTitle: 'Bowl + Supercycle',
    badge: 'Inharmonic + Swell',
    summary: 'Non-integer metallic modes shimmer and beat while a Supercycle envelope swells over 4 cycles.',
    listenHint:
      'Because a singing bowl\'s partials sit off the simple-ratio grid, they never lock into a clean cycle, creating a slow, hypnotic shimmer.',
    fromSection: 'hood',
    mode: 'bundle',
    bundleId: 'bundle-bowl-swell',
    desktopLayoutId: 'timbre-lab',
    mobileLayoutId: 'timbre-duo',
    featuredInTour: true,
  },
  ...COUPLING_DEMOS,
  ...KEYBOARD_CADENCE_DEMOS,
  ...TUNING_SYSTEM_DEMOS,
];

export const FEATURED_TOUR_DEMOS: TutorialDemoConfig[] = TUTORIAL_DEMOS.filter((d) => d.featuredInTour);

export function getTutorialDemoById(id: TutorialDemoId): TutorialDemoConfig {
  return TUTORIAL_DEMOS.find((d) => d.id === id) || TUTORIAL_DEMOS[0];
}

/**
 * Classifies a DuPeriod coordinate `d` into Rhythm, Crossover (near 25.8 Hz), or Pitch.
 */
export function getDemoRegime(d: number): DemoRegime {
  if (d > 0.8) return 'rhythm';
  if (d < -0.8) return 'pitch';
  return 'crossover';
}

export interface ResolveNarrationOptions {
  demo: TutorialDemoConfig;
  regime: DemoRegime;
  hasCompletedRoundTrip: boolean;
  userTookControl: boolean;
  isFilterEnabled: boolean;
}

/**
 * Selects the most relevant single-line narration for TutorialReturnToast
 * based on the current demo, perceptual regime, and user interaction state.
 */
export function resolveDemoNarration({
  demo,
  regime,
  hasCompletedRoundTrip,
  userTookControl,
  isFilterEnabled,
}: ResolveNarrationOptions): string {
  const n = demo.narration;
  if (!n) return demo.listenHint;

  if (isFilterEnabled && n.filterActive) {
    return n.filterActive;
  }
  if (userTookControl && n.manualControl) {
    return n.manualControl;
  }
  if (hasCompletedRoundTrip && !userTookControl && n.afterRoundTrip) {
    return n.afterRoundTrip;
  }
  if (regime === 'rhythm' && n.rhythm) return n.rhythm;
  if (regime === 'crossover' && n.crossover) return n.crossover;
  if (regime === 'pitch' && n.pitch) return n.pitch;
  return demo.listenHint;
}
