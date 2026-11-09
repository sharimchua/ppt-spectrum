export const TPL_FREQUENCY_HZ = 25.8;
export const TPL_PERIOD_MS = 1000 / TPL_FREQUENCY_HZ; // ~38.7596899 ms

export const TRANSITION_ZONE_MIN_HZ = 10.0;
export const TRANSITION_ZONE_MAX_HZ = 40.0;

export const FLUTTER_ZONE_MIN_HZ = 10.0;
export const FLUTTER_ZONE_MAX_HZ = 20.0;
export const ROUGHNESS_ZONE_MIN_HZ = 20.0;
export const ROUGHNESS_ZONE_MAX_HZ = 40.0;

export const AUDITORY_HORIZON_MAX_HZ = 20000.0;

export const SOLFEGE_SYLLABLES = [
  'Do', 'Ra', 'Re', 'Me', 'Mi', 'Fa', 'Fi', 'So', 'Le', 'La', 'Te', 'Ti'
] as const;

export type SolfegeSyllable = typeof SOLFEGE_SYLLABLES[number];

export const SOLFEGE_COLORS: Record<number, string> = {
  0: '#E13610',  // Do (Unison)
  1: '#F98016',  // Ra (Minor second)
  2: '#F98016',  // Re (Major second)
  3: '#F5D432',  // Me (Minor third)
  4: '#F5D432',  // Mi (Major third)
  5: '#43A440',  // Fa (Perfect fourth)
  6: '#0284c7',  // Fi (Tritone - vibrant sky blue for dark canvas legibility)
  7: '#0032A4',  // So (Perfect fifth)
  8: '#5300A4',  // Le (Minor sixth)
  9: '#5300A4',  // La (Major sixth)
  10: '#F158A4', // Te (Minor seventh)
  11: '#F158A4', // Ti (Major seventh)
};

export const SOLFEGE_NEON_COLORS: Record<number, string> = {
  0: '#FF4D4D',  // Do
  1: '#FB923C',  // Ra
  2: '#FB923C',  // Re
  3: '#FDE047',  // Me
  4: '#FDE047',  // Mi
  5: '#4ADE80',  // Fa
  6: '#38BDF8',  // Fi
  7: '#60A5FA',  // So
  8: '#C084FC',  // Le
  9: '#C084FC',  // La
  10: '#F472B6', // Te
  11: '#F472B6', // Ti
};

export const PRIME_FAMILY_COLORS: Record<string, string> = {
  '2': '#6b7280',     // 2-Prime (Octaves / Halving)
  '3': '#3b82f6',     // 3-Prime (Fifths / Triplets)
  '5': '#22c55e',     // 5-Prime (Thirds / Quintuplets)
  '7': '#f59e0b',     // 7-Prime (Septimal)
  '11': '#a855f7',    // 11-Prime (Neutral)
  'higher': '#ec4899' // Higher primes / Inharmonic
};

export function getDecayFadeFactor(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 0.5 * (1 + Math.cos(Math.PI * clamped));
}
