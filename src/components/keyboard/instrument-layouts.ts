/**
 * Pure geometry & pitch-mapping builders for alternate virtual instrument surfaces
 * driven directly by the active Tuning System (`MidiTuningConfig`):
 * 1. Scale-Degree Strip (plays only active degrees in the Tuning System)
 * 2. Isomorphic 2D Lattice (Tri 3:2 fifths on X, Qui 5:4 thirds on Y)
 * 3. Guitar Fretboard (6-string standard tuning with active Tuning degree highlighting)
 */

import { SOLFEGE_COLORS } from '../../core/ppt-constants';
import { MidiTuningConfig, midiToDWithTuning } from '../../core/midi-tuning';
import { resolveTuningDegrees, tuningDegreeToMapping } from '../../core/tuning-systems';

export type InstrumentSurfaceMode = 'piano' | 'scale-strip' | 'isomorphic' | 'guitar';

export interface SurfacePad {
  id: string;
  midiId: number;
  label: string;
  subLabel: string;
  d: number;
  colorHex: string;
  inScale: boolean;
  isRoot: boolean;
}

export interface GuitarStringRow {
  stringIndex: number;
  stringName: string;
  frets: SurfacePad[];
}

function solfegeColorForCents(centsMod1200: number): string {
  const norm = ((centsMod1200 % 1200) + 1200) % 1200;
  const pc = Math.round(norm / 100) % 12;
  return SOLFEGE_COLORS[pc] ?? SOLFEGE_COLORS[0];
}

function isCentsInScale(cents: number, activeCentsMod: number[], toleranceCents: number = 18): boolean {
  if (activeCentsMod.length === 0) return true;
  const cNorm = ((cents % 1200) + 1200) % 1200;
  return activeCentsMod.some((target) => {
    const diff = Math.abs(cNorm - target);
    return Math.min(diff, 1200 - diff) <= toleranceCents;
  });
}

/**
 * Builds a 1D Scale-Degree Strip from the active degrees of `midiTuning` (1 or 2 octaves).
 */
export function buildScaleStripPads(
  midiTuning: MidiTuningConfig,
  currentFundamentalD: number,
  tuningA4Hz: number,
  tplHz: number,
  baseIdOffset: number = 2000
): SurfacePad[] {
  const active = resolveTuningDegrees(midiTuning).filter((d) => d.active);
  if (active.length === 0) return [];
  const octaves = active.length > 14 ? 1 : 2;
  const pads: SurfacePad[] = [];

  for (let oct = 0; oct < octaves; oct++) {
    for (let i = 0; i < active.length; i++) {
      const deg = active[i];
      const idx = oct * active.length + i;
      const midiId = baseIdOffset + idx;
      const mapping = tuningDegreeToMapping(
        deg,
        oct,
        midiId,
        midiTuning,
        currentFundamentalD,
        tuningA4Hz,
        tplHz
      );
      const cents = deg.cents + oct * 1200;
      pads.push({
        id: `strip-${idx}`,
        midiId,
        label: deg.label,
        subLabel: deg.subLabel,
        d: mapping.d,
        colorHex: solfegeColorForCents(cents),
        inScale: true,
        isRoot: i === 0,
      });
    }
  }
  return pads;
}

/**
 * Builds a 2D Isomorphic Lattice (rows × cols):
 * X-axis steps by 3:2 fifths (+7 semitones or +18 in 31-EDO),
 * Y-axis steps upward by 5:4 major thirds (+4 semitones or +10 in 31-EDO).
 */
export function buildIsomorphicGrid(
  rows: number,
  cols: number,
  midiTuning: MidiTuningConfig,
  currentFundamentalD: number,
  tuningA4Hz: number,
  tplHz: number
): SurfacePad[][] {
  const is31 = midiTuning.systemMode === '31edo' || midiTuning.midiStepMap === '31edo';
  const fifthStep = is31 ? 18 : 7;
  const thirdStep = is31 ? 10 : 4;
  const rootMidi = currentFundamentalD >= 0 ? midiTuning.rhythmRootMidi : midiTuning.pitchRootMidi;
  const baseMidi = rootMidi - (is31 ? 18 : 7);

  const activeDegrees = resolveTuningDegrees(midiTuning).filter((d) => d.active);
  const activeCentsMod = activeDegrees.map((deg) => ((deg.cents % 1200) + 1200) % 1200);
  const effectiveConfig: MidiTuningConfig = is31
    ? { ...midiTuning, midiStepMap: '31edo' }
    : midiTuning;

  const grid: SurfacePad[][] = [];

  for (let r = rows - 1; r >= 0; r--) {
    const rowPads: SurfacePad[] = [];
    for (let c = 0; c < cols; c++) {
      const midi = baseMidi + c * fifthStep + r * thirdStep;
      const mapping = midiToDWithTuning(midi, effectiveConfig, currentFundamentalD, tuningA4Hz, tplHz);
      const stepDelta = midi - rootMidi;
      const cents = is31 ? (stepDelta * 1200) / 31 : stepDelta * 100;
      const normCents = ((cents % 1200) + 1200) % 1200;
      const inScale = isCentsInScale(cents, activeCentsMod, is31 ? 16 : 22);
      const isRoot = Math.min(normCents, 1200 - normCents) < 15;
      const label = is31
        ? `${((stepDelta % 31) + 31) % 31}\\31`
        : mapping.address.syllable;

      rowPads.push({
        id: `iso-${r}-${c}`,
        midiId: 3000 + r * cols + c,
        label,
        subLabel: `${Math.round(normCents)}¢`,
        d: mapping.d,
        colorHex: solfegeColorForCents(normCents),
        inScale,
        isRoot,
      });
    }
    grid.push(rowPads);
  }
  return grid;
}

const GUITAR_STRINGS: Array<{ name: string; openMidi: number }> = [
  { name: 'e4', openMidi: 64 },
  { name: 'B3', openMidi: 59 },
  { name: 'G3', openMidi: 55 },
  { name: 'D3', openMidi: 50 },
  { name: 'A2', openMidi: 45 },
  { name: 'E2', openMidi: 40 },
];

/**
 * Builds a 6-string Guitar Fretboard (0..fretCount) with active Tuning degree highlighting.
 */
export function buildGuitarFretboard(
  fretCount: number,
  midiTuning: MidiTuningConfig,
  currentFundamentalD: number,
  tuningA4Hz: number,
  tplHz: number
): GuitarStringRow[] {
  const rootMidi = currentFundamentalD >= 0 ? midiTuning.rhythmRootMidi : midiTuning.pitchRootMidi;
  const activeDegrees = resolveTuningDegrees(midiTuning).filter((d) => d.active);
  const activeCentsMod = activeDegrees.map((deg) => ((deg.cents % 1200) + 1200) % 1200);

  return GUITAR_STRINGS.map((str, stringIndex) => {
    const frets: SurfacePad[] = [];
    for (let f = 0; f <= fretCount; f++) {
      const midi = str.openMidi + f;
      const mapping = midiToDWithTuning(midi, midiTuning, currentFundamentalD, tuningA4Hz, tplHz);
      const cents = (midi - rootMidi) * 100;
      const normCents = ((cents % 1200) + 1200) % 1200;
      const inScale = isCentsInScale(cents, activeCentsMod, 25);
      const isRoot = Math.min(normCents, 1200 - normCents) < 20;

      frets.push({
        id: `gtr-${stringIndex}-${f}`,
        midiId: 4000 + stringIndex * 32 + f,
        label: f === 0 ? str.name : `${f}`,
        subLabel: mapping.address.syllable,
        d: mapping.d,
        colorHex: solfegeColorForCents(normCents),
        inScale,
        isRoot,
      });
    }
    return {
      stringIndex,
      stringName: str.name,
      frets,
    };
  });
}
