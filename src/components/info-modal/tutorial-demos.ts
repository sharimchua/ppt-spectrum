/**
 * Guided tutorial demo configurations and section types.
 * Connects the interactive tutorial modal to live studio configurations
 * with a context-aware "Back to Guide" return toast.
 */

export type TutorialSectionId = 'overview' | 'concepts' | 'hood' | 'customise';

export type TutorialDemoId =
  | 'hemiola-sweep'
  | 'polyrhythm-4-3-sweep'
  | 'polyrhythm-5-4-sweep'
  | 'triad-sweep'
  | 'sine-timbre'
  | 'sawtooth-timbre'
  | 'clarinet-timbre'
  | 'bell-timbre'
  | 'custom-timbre'
  | 'tresillo-sieve'
  | 'piano-comb'
  | 'bowl-swell';

export interface CustomTutorialDemoOverride {
  title?: string;
  shortTitle?: string;
  badge?: string;
  listenHint?: string;
  /** Custom overtone partials mixed by the user in OvertoneTimbreDiagram */
  customPartials?: { ratioVal: number; amp: number; label: string }[];
  /** Custom 8-slot cycle sieve toggled by the user in UnderTheHoodSection */
  customSieveSlots?: boolean[];
}

export interface TutorialDemoConfig {
  id: TutorialDemoId;
  title: string;
  shortTitle: string;
  badge: string;
  summary: string;
  listenHint: string;
  fromSection: TutorialSectionId;
  mode: 'sweep' | 'bundle';
  shapeId?: string;
  bundleId?: string;
  rhythmBpm?: number;
  rhythmD?: number;
  pitchLabel?: string;
  pitchD?: number;
  noteIndex?: number;
  octave?: number;
  /** Whether this demo appears in the main 6-demo tour cycle */
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
    rhythmBpm: 120,
    rhythmD: 3.689,
    pitchLabel: 'A4 440 Hz (Pitch)',
    pitchD: -4.092,
    noteIndex: 9,
    octave: 4,
    featuredInTour: true,
  },
  {
    id: 'polyrhythm-4-3-sweep',
    title: '4:3 Polyrhythm → Perfect Fourth',
    shortTitle: '4:3 Fourth Sweep',
    badge: 'TPL Crossover · 4:3',
    summary: 'Hear a 4-against-3 cross-rhythm speed up across 25.8 Hz into a suspended Perfect Fourth.',
    listenHint:
      'Notice the 4-against-3 cross-rhythm locking every bar at 120 BPM, then fusing into a pure Perfect Fourth (498¢) above 25.8 Hz.',
    fromSection: 'concepts',
    mode: 'sweep',
    shapeId: 'polyrhythm-4-3',
    rhythmBpm: 120,
    rhythmD: 3.689,
    pitchLabel: 'A4 440 Hz (Pitch)',
    pitchD: -4.092,
    noteIndex: 9,
    octave: 4,
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
  },
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
    shapeId: 'major-triad-4-5-6',
    rhythmBpm: 90,
    rhythmD: 4.104,
    pitchLabel: 'C4 262 Hz (Pitch)',
    pitchD: -3.344,
    noteIndex: 0,
    octave: 4,
    featuredInTour: true,
  },
  {
    id: 'sine-timbre',
    title: 'Pure Sine: Single Metronome → Flute Tone',
    shortTitle: 'Pure Sine Sweep',
    badge: '1× Fundamental Only',
    summary: 'A single unadorned pulse per cycle with zero upper overtones.',
    listenHint:
      'With only the 1× fundamental active, you hear a plain metronome beat below 25.8 Hz and a pure, flute-like sine wave above it.',
    fromSection: 'concepts',
    mode: 'sweep',
    shapeId: 'pure-tone',
    rhythmBpm: 90,
    rhythmD: 4.104,
    pitchLabel: 'A3 220 Hz (Pitch)',
    pitchD: -3.092,
    noteIndex: 9,
    octave: 3,
  },
  {
    id: 'sawtooth-timbre',
    title: 'Sawtooth: Drum Stack vs Brass Tone',
    shortTitle: 'Sawtooth Timbre Sweep',
    badge: 'Partials 1×–8×',
    summary: 'One overtone recipe acts as a layered subdivision groove at low speed and a buzzy string/brass tone at high speed.',
    listenHint:
      'Below 25.8 Hz, the 8 harmonics play a layered drum subdivision tree; above 25.8 Hz, your ear fuses those exact same layers into a bright sawtooth tone.',
    fromSection: 'concepts',
    mode: 'sweep',
    shapeId: 'saw-like',
    rhythmBpm: 90,
    rhythmD: 4.104,
    pitchLabel: 'A3 220 Hz (Pitch)',
    pitchD: -3.092,
    noteIndex: 9,
    octave: 3,
    featuredInTour: true,
  },
  {
    id: 'clarinet-timbre',
    title: 'Clarinet (Odd Harmonics): Tuplets → Hollow Reed',
    shortTitle: 'Clarinet Odd Sweep',
    badge: 'Odd Partials 1·3·5·7×',
    summary: 'Odd-numbered harmonics create triplet/quintuplet cross-rhythms at slow speeds and a woody clarinet tone at high speeds.',
    listenHint:
      'Because even harmonics (2×, 4×, 6×) are absent, you hear odd-tuplet cross-rhythms below 25.8 Hz and a hollow, woody reed timbre above it.',
    fromSection: 'concepts',
    mode: 'sweep',
    shapeId: 'square-like',
    rhythmBpm: 90,
    rhythmD: 4.104,
    pitchLabel: 'A3 220 Hz (Pitch)',
    pitchD: -3.092,
    noteIndex: 9,
    octave: 3,
  },
  {
    id: 'bell-timbre',
    title: 'Church Bell: Drifting Pulses → Metallic Chime',
    shortTitle: 'Church Bell Sweep',
    badge: 'Inharmonic Modes',
    summary: 'Stretched, non-integer bell modes drift past each other in rhythm space and shimmer as a metallic chime in pitch space.',
    listenHint:
      'Listen to how the non-integer bell ratios refuse to lock onto a neat bar in rhythm space, then fuse into a shimmering church bell chime in pitch space.',
    fromSection: 'concepts',
    mode: 'sweep',
    shapeId: 'bell',
    rhythmBpm: 90,
    rhythmD: 4.104,
    pitchLabel: 'A3 220 Hz (Pitch)',
    pitchD: -3.092,
    noteIndex: 9,
    octave: 3,
  },
  {
    id: 'custom-timbre',
    title: 'Custom Overtone Mix: Groove → Timbre',
    shortTitle: 'Custom Overtone Mix',
    badge: 'Custom Mixer Shape',
    summary: 'Your custom overtone bar recipe from the tutorial mixer, sweeping across the 25.8 Hz horizon.',
    listenHint:
      'Listening to the exact overtone bar recipe you mixed in the tutorial—hear how your custom partial stack behaves as a rhythm and as a tone!',
    fromSection: 'concepts',
    mode: 'sweep',
    shapeId: 'tutorial-custom-overtone-mix',
    rhythmBpm: 90,
    rhythmD: 4.104,
    pitchLabel: 'A3 220 Hz (Pitch)',
    pitchD: -3.092,
    noteIndex: 9,
    octave: 3,
  },
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
    featuredInTour: true,
  },
  {
    id: 'bowl-swell',
    title: 'Singing Bowl + 4-Bar Swell',
    shortTitle: 'Bowl + Supercycle',
    badge: '>11 Inharmonic + Swell',
    summary: 'Non-integer metallic modes shimmer and beat while a Supercycle envelope swells over 4 cycles.',
    listenHint:
      'Because a singing bowl uses non-integer ratios (>11 prime family), its partials never neatly lock—creating a slow, hypnotic shimmer.',
    fromSection: 'hood',
    mode: 'bundle',
    bundleId: 'bundle-bowl-swell',
    featuredInTour: true,
  },
];

export const FEATURED_TOUR_DEMOS: TutorialDemoConfig[] = TUTORIAL_DEMOS.filter(
  (d) => d.featuredInTour
);

export function getTutorialDemoById(id: TutorialDemoId): TutorialDemoConfig {
  return TUTORIAL_DEMOS.find((d) => d.id === id) || TUTORIAL_DEMOS[0];
}
