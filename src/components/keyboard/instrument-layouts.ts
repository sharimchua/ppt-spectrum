/**
 * Pure geometry & pitch-mapping builders for alternate virtual instrument surfaces
 * driven directly by the active Tuning System (`MidiTuningConfig`):
 * 1. Scale-Degree Strip (relative to current base frequency)
 * 2. Isomorphic 2D Lattice (Harmonic, Wicki-Hayden, or All-Fourths; Rect or Hex)
 * 3. Guitar / Bass / Ukulele Fretboard (configurable string count, tuning, and frets)
 */

import { SOLFEGE_COLORS } from '../../core/ppt-constants';
import { MidiTuningConfig, midiToDWithTuning } from '../../core/midi-tuning';
import {
  resolveSystemSpec,
  resolveTuningDegrees,
  tuningDegreeToMapping,
  tuningDegreeToRelativeMapping,
} from '../../core/tuning-systems';

export type InstrumentSurfaceMode = 'piano' | 'scale-strip' | 'isomorphic' | 'guitar';

export interface ScaleStripConfig {
  octaves: 1 | 2;
  showInactive: boolean;
}

export type IsoTileShape = 'rect' | 'hex';
export type IsoTileSize = 'sm' | 'md' | 'lg';
export type IsoLayoutPresetId = 'harmonic' | 'wicki-hayden' | 'fourths';

export interface IsomorphicConfig {
  tileShape: IsoTileShape;
  layoutPreset: IsoLayoutPresetId;
  tileSize?: IsoTileSize;
  rows: number;
  cols: number;
}

export type GuitarPresetId =
  | '6-std'
  | '6-fourths'
  | '6-drop-d'
  | '6-dadgad'
  | '6-open-g'
  | '6-open-d'
  | '7-std'
  | '4-bass'
  | '4-uke';

export interface GuitarStringSpec {
  name: string;
  openMidi: number;
}

export type GuitarLabelMode = 'solfege' | 'note' | 'cents';

export interface GuitarConfig {
  presetId: GuitarPresetId | 'custom';
  fretCount: 12 | 15 | 18;
  customStrings?: GuitarStringSpec[];
  labelMode?: GuitarLabelMode;
  dimOutOfScale?: boolean;
}

export const ISOMORPHIC_LAYOUT_PRESETS: Record<
  IsoLayoutPresetId,
  { label: string; x12: number; y12: number; x31: number; y31: number }
> = {
  harmonic: { label: 'Harmonic (3:2 × 5:4)', x12: 7, y12: 4, x31: 18, y31: 10 },
  'wicki-hayden': { label: 'Wicki-Hayden (P5 × M2)', x12: 2, y12: 7, x31: 5, y31: 18 },
  fourths: { label: 'All Fourths (P4 × M2)', x12: 2, y12: 5, x31: 5, y31: 13 },
};

export const GUITAR_TUNING_PRESETS: Record<
  GuitarPresetId,
  { label: string; strings: Array<{ name: string; openMidi: number }> }
> = {
  '6-std': {
    label: '6-String Standard',
    strings: [
      { name: 'e4', openMidi: 64 }, { name: 'B3', openMidi: 59 }, { name: 'G3', openMidi: 55 },
      { name: 'D3', openMidi: 50 }, { name: 'A2', openMidi: 45 }, { name: 'E2', openMidi: 40 },
    ],
  },
  '6-fourths': {
    label: '6-String All Fourths',
    strings: [
      { name: 'F4', openMidi: 65 }, { name: 'C4', openMidi: 60 }, { name: 'G3', openMidi: 55 },
      { name: 'D3', openMidi: 50 }, { name: 'A2', openMidi: 45 }, { name: 'E2', openMidi: 40 },
    ],
  },
  '6-drop-d': {
    label: '6-String Drop D',
    strings: [
      { name: 'e4', openMidi: 64 }, { name: 'B3', openMidi: 59 }, { name: 'G3', openMidi: 55 },
      { name: 'D3', openMidi: 50 }, { name: 'A2', openMidi: 45 }, { name: 'D2', openMidi: 38 },
    ],
  },
  '6-dadgad': {
    label: '6-String DADGAD',
    strings: [
      { name: 'D4', openMidi: 62 }, { name: 'A3', openMidi: 57 }, { name: 'G3', openMidi: 55 },
      { name: 'D3', openMidi: 50 }, { name: 'A2', openMidi: 45 }, { name: 'D2', openMidi: 38 },
    ],
  },
  '6-open-g': {
    label: '6-String Open G',
    strings: [
      { name: 'D4', openMidi: 62 }, { name: 'B3', openMidi: 59 }, { name: 'G3', openMidi: 55 },
      { name: 'D3', openMidi: 50 }, { name: 'G2', openMidi: 43 }, { name: 'D2', openMidi: 38 },
    ],
  },
  '6-open-d': {
    label: '6-String Open D',
    strings: [
      { name: 'D4', openMidi: 62 }, { name: 'A3', openMidi: 57 }, { name: 'F#3', openMidi: 54 },
      { name: 'D3', openMidi: 50 }, { name: 'A2', openMidi: 45 }, { name: 'D2', openMidi: 38 },
    ],
  },
  '7-std': {
    label: '7-String Standard',
    strings: [
      { name: 'e4', openMidi: 64 }, { name: 'B3', openMidi: 59 }, { name: 'G3', openMidi: 55 },
      { name: 'D3', openMidi: 50 }, { name: 'A2', openMidi: 45 }, { name: 'E2', openMidi: 40 },
      { name: 'B1', openMidi: 35 },
    ],
  },
  '4-bass': {
    label: '4-String Bass (E-A-D-G)',
    strings: [
      { name: 'G2', openMidi: 43 }, { name: 'D2', openMidi: 38 },
      { name: 'A1', openMidi: 33 }, { name: 'E1', openMidi: 28 },
    ],
  },
  '4-uke': {
    label: '4-String Ukulele (G-C-E-A)',
    strings: [
      { name: 'A4', openMidi: 69 }, { name: 'E4', openMidi: 64 },
      { name: 'C4', openMidi: 60 }, { name: 'G4', openMidi: 67 },
    ],
  },
};

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export function midiToNoteLabel(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pc]}${oct}`;
}

export function resolveGuitarStrings(guitarConfig: GuitarConfig): GuitarStringSpec[] {
  if (guitarConfig.presetId === 'custom' && guitarConfig.customStrings?.length) {
    return guitarConfig.customStrings;
  }
  const presetKey = guitarConfig.presetId === 'custom' ? '6-std' : guitarConfig.presetId;
  return GUITAR_TUNING_PRESETS[presetKey]?.strings ?? GUITAR_TUNING_PRESETS['6-std'].strings;
}

export interface SurfacePad {
  id: string;
  midiId: number;
  label: string;
  subLabel: string;
  noteLabel?: string;
  centsLabel?: string;
  d: number;
  colorHex: string;
  inScale: boolean;
  isRoot: boolean;
  outOfRange?: boolean;
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

export function buildScaleStripPads(
  midiTuning: MidiTuningConfig,
  currentFundamentalD: number,
  _tuningA4Hz: number,
  tplHz: number,
  config: ScaleStripConfig = { octaves: 2, showInactive: true },
  baseIdOffset: number = 2000
): SurfacePad[] {
  const all = resolveTuningDegrees(midiTuning);
  const degrees = config.showInactive ? all : all.filter((d) => d.active);
  if (degrees.length === 0) return [];
  const octaves = degrees.length > 14 ? 1 : config.octaves;
  const pads: SurfacePad[] = [];

  for (let oct = 0; oct < octaves; oct++) {
    for (let i = 0; i < degrees.length; i++) {
      const deg = degrees[i];
      const idx = oct * degrees.length + i;
      const midiId = baseIdOffset + idx;
      const mapping = tuningDegreeToRelativeMapping(deg, oct, midiId, currentFundamentalD, tplHz);
      const cents = deg.cents + oct * 1200;
      pads.push({
        id: `strip-${idx}`,
        midiId,
        label: deg.label,
        subLabel: i === 0 ? mapping.address.formatted : deg.subLabel,
        d: mapping.d,
        colorHex: solfegeColorForCents(cents),
        inScale: deg.active,
        isRoot: i === 0,
      });
    }
  }
  return pads;
}

export function computeResponsiveIsoConfig(
  isoConfig: IsomorphicConfig,
  availableWidth: number
): IsomorphicConfig {
  const size = isoConfig.tileSize ?? 'md';
  const isHex = isoConfig.tileShape === 'hex';
  const stepX = isHex
    ? (size === 'sm' ? 38 : size === 'md' ? 48 : 60)
    : (size === 'sm' ? 46 : size === 'md' ? 58 : 72);
  const indent = size === 'sm' ? 20 : size === 'md' ? 25 : 31;
  const cols = Math.max(8, Math.floor((availableWidth - indent - 24) / stepX));
  const rows = size === 'sm' ? 6 : size === 'md' ? 5 : 4;
  return { ...isoConfig, rows, cols };
}

export function buildIsomorphicGrid(
  isoConfig: IsomorphicConfig,
  midiTuning: MidiTuningConfig,
  currentFundamentalD: number,
  tuningA4Hz: number,
  tplHz: number
): SurfacePad[][] {
  const is31 = midiTuning.systemMode === '31edo' || midiTuning.midiStepMap === '31edo';
  const preset = ISOMORPHIC_LAYOUT_PRESETS[isoConfig.layoutPreset] ?? ISOMORPHIC_LAYOUT_PRESETS.harmonic;
  const xStep = is31 ? preset.x31 : preset.x12;
  const yStep = is31 ? preset.y31 : preset.y12;
  const rootMidi = currentFundamentalD >= 0 ? midiTuning.rhythmRootMidi : midiTuning.pitchRootMidi;
  const centerCol = Math.floor(isoConfig.cols / 2);
  const centerRow = Math.floor(isoConfig.rows / 2);
  const baseMidi = rootMidi - centerCol * xStep - centerRow * yStep;

  const activeDegrees = resolveTuningDegrees(midiTuning).filter((d) => d.active);
  const activeCentsMod = activeDegrees.map((deg) => ((deg.cents % 1200) + 1200) % 1200);
  const effectiveConfig: MidiTuningConfig = is31 ? { ...midiTuning, midiStepMap: '31edo' } : midiTuning;

  const grid: SurfacePad[][] = [];
  for (let r = isoConfig.rows - 1; r >= 0; r--) {
    const rowPads: SurfacePad[] = [];
    for (let c = 0; c < isoConfig.cols; c++) {
      const midi = baseMidi + c * xStep + r * yStep;
      const mapping = midiToDWithTuning(midi, effectiveConfig, currentFundamentalD, tuningA4Hz, tplHz);
      const outOfRange = mapping.clampedToPolarity || Math.abs(mapping.d) > 8.0;
      const stepDelta = midi - rootMidi;
      const cents = is31 ? (stepDelta * 1200) / 31 : stepDelta * 100;
      const normCents = ((cents % 1200) + 1200) % 1200;
      const inScale = !outOfRange && isCentsInScale(cents, activeCentsMod, is31 ? 16 : 22);
      const isRoot = !outOfRange && Math.min(normCents, 1200 - normCents) < 15;
      const bandTag = mapping.address.band >= 0 ? `+${mapping.address.band}` : `${mapping.address.band}`;
      const label = is31 ? `${((stepDelta % 31) + 31) % 31}\\31${bandTag}` : mapping.address.formatted;

      rowPads.push({
        id: `iso-${r}-${c}`,
        midiId: 3000 + r * isoConfig.cols + c,
        label: outOfRange ? '' : label,
        subLabel: outOfRange ? '' : `${Math.round(normCents)}¢`,
        d: mapping.d,
        colorHex: solfegeColorForCents(normCents),
        inScale,
        isRoot,
        outOfRange,
      });
    }
    grid.push(rowPads);
  }
  return grid;
}

export function mergeAutoPlayActiveIds(
  baseIds: number[],
  heldDs: number[],
  keys: Array<{ midi: number; mapping: { d: number } }>,
  isoGrid: SurfacePad[][],
  guitarStrings: GuitarStringRow[]
): Set<number> {
  const set = new Set(baseIds);
  if (heldDs.length === 0) return set;
  const matchesD = (d: number) => heldDs.some((hd) => Math.abs(d - hd) < 0.015);
  for (const k of keys) if (matchesD(k.mapping.d)) set.add(k.midi);
  for (const row of isoGrid) for (const p of row) if (!p.outOfRange && matchesD(p.d)) set.add(p.midiId);
  for (const row of guitarStrings) for (const p of row.frets) if (matchesD(p.d)) set.add(p.midiId);
  return set;
}

export function buildGuitarFretboard(
  guitarConfig: GuitarConfig,
  midiTuning: MidiTuningConfig,
  currentFundamentalD: number,
  tuningA4Hz: number,
  tplHz: number
): GuitarStringRow[] {
  const rootMidi = currentFundamentalD >= 0 ? midiTuning.rhythmRootMidi : midiTuning.pitchRootMidi;
  const allDegrees = resolveTuningDegrees(midiTuning);
  const activeDegrees = allDegrees.filter((d) => d.active);
  const activeCentsMod = activeDegrees.map((deg) => ((deg.cents % 1200) + 1200) % 1200);
  const strings = resolveGuitarStrings(guitarConfig);
  const projMode = midiTuning.projectionMode ?? 'nearest-12';
  const spec = resolveSystemSpec(midiTuning);
  const periodRatio = spec.periodRatio ?? 2.0;

  return strings.map((str, stringIndex) => {
    const frets: SurfacePad[] = [];
    const pool = projMode === 'step-subset' && activeDegrees.length > 0 ? activeDegrees : allDegrees;
    const poolLen = Math.max(1, pool.length);

    for (let f = 0; f <= guitarConfig.fretCount; f++) {
      if (projMode === 'step-system' || projMode === 'step-subset') {
        const openStepsFromE2 = Math.round(((str.openMidi - 40) * poolLen) / 12);
        const totalSteps = openStepsFromE2 + f;
        const periods = Math.floor(totalSteps / poolLen);
        const stepIdx = ((totalSteps % poolLen) + poolLen) % poolLen;
        const deg = pool[stepIdx];
        const midiId = 4000 + stringIndex * 32 + f;
        const mapping = tuningDegreeToMapping(
          deg, periods - 2, midiId, midiTuning, currentFundamentalD, tuningA4Hz, tplHz
        );
        const cents = deg.cents + periods * Math.log2(periodRatio) * 1200;
        const normCents = ((cents % 1200) + 1200) % 1200;
        frets.push({
          id: `gtr-${stringIndex}-${f}`,
          midiId,
          label: f === 0 ? str.name : deg.label,
          subLabel: deg.label,
          noteLabel: NOTE_NAMES[((str.openMidi + f) % 12 + 12) % 12],
          centsLabel: `${Math.round(normCents)}¢`,
          d: mapping.d,
          colorHex: solfegeColorForCents(normCents),
          inScale: deg.active,
          isRoot: deg.index === 0,
        });
      } else {
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
          noteLabel: NOTE_NAMES[((midi % 12) + 12) % 12],
          centsLabel: `${Math.round(normCents)}¢`,
          d: mapping.d,
          colorHex: solfegeColorForCents(normCents),
          inScale,
          isRoot,
        });
      }
    }
    return { stringIndex, stringName: str.name, frets };
  });
}
