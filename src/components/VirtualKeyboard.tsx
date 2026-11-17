/**
 * On-screen interactive Solfège piano keyboard for Pitch Space and Rhythm Space.
 * Mirrors ppt-visualiser's Fit/Fixed sizing and white-key-bounded range presets,
 * removes polarity-flip clutter (handled by Tab / Radial Menu), and renders
 * optional Harmonic-Geometry-style stacked interval ratio bands.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Eraser, Keyboard as MidiIcon, Maximize2, Minimize2, Minus, Plus, Ruler, Sliders, Sparkles, X,
} from 'lucide-react';
import { MIDI_TUNING_PRESETS } from '../core/midi-tuning';
import { PITCH_NAMES } from '../core/axis';
import {
  KEYBOARD_RANGE_PRESETS,
  buildIntervalBands,
  buildVirtualKeys,
  getBlackKeyOffset,
  loadSavedKeyboardRange,
  resolveVisibleRangeForNotes,
  saveKeyboardRange,
  VirtualKeyItem,
} from './keyboard/keyboard-layout';
import { AlternateSurfaces } from './keyboard/AlternateSurfaces';
import { PianoKeybed } from './keyboard/PianoKeybed';
import { PlayPanelStrumBar } from './keyboard/PlayPanelStrumBar';
import {
  InstrumentSurfaceMode,
  buildGuitarFretboard,
  buildIsomorphicGrid,
  buildScaleStripPads,
} from './keyboard/instrument-layouts';
import { UseMidiResult } from './hooks/useMidi';
import { UseTuningStrumResult } from './hooks/useTuningStrum';

export interface VirtualKeyboardProps {
  midi: UseMidiResult;
  currentFundamentalD: number;
  tuningA4Hz: number;
  tplFrequencyHz: number;
  autoShowIntervals?: boolean;
  tuningStrum?: UseTuningStrumResult;
  onToggleStrumMode?: () => void;
}

function formatMidiShort(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${PITCH_NAMES[pc]}${oct}`;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  midi,
  currentFundamentalD,
  tuningA4Hz,
  tplFrequencyHz,
  autoShowIntervals = false,
  tuningStrum,
  onToggleStrumMode,
}) => {
  const {
    isKeyboardOpen: isOpen, closeKeyboard: onClose, midiTuning, activeMidiNumbers,
    midiState, toggleVirtualNote: onToggleLatchNote,
    virtualNoteOn: onVirtualNoteOn, virtualNoteOff: onVirtualNoteOff,
    isMidiHoldActive, toggleMidiHold, clearAllNotes: onClearAllNotes,
    openTuningModal: onOpenTuningModal, openMidiModal: onOpenMidiModal,
  } = midi;

  const [rangePresetId, setRangePresetId] = useState<string>(() => loadSavedKeyboardRange());
  const [octaveOffset, setOctaveOffset] = useState<number>(0);
  const [isFitMode, setIsFitMode] = useState<boolean>(true);
  const [showIntervals, setShowIntervals] = useState<boolean>(false);
  const [surfaceMode, setSurfaceMode] = useState<InstrumentSurfaceMode>('piano');
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    if (autoShowIntervals) setShowIntervals(true);
  }, [autoShowIntervals]);

  useEffect(() => {
    if (!isOpen) return;
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 0) setAvailableWidth(el.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [isOpen]);

  const preset = KEYBOARD_RANGE_PRESETS.find((p) => p.id === rangePresetId) ?? KEYBOARD_RANGE_PRESETS[0];
  const is88 = preset.id === '88key';
  const startMidi = is88 ? preset.startMidi : Math.max(21, preset.startMidi + octaveOffset * 12);
  const endMidi = is88 ? preset.endMidi : Math.min(108, preset.endMidi + octaveOffset * 12);

  // Auto-shift octave or expand range preset when physical/piano MIDI notes fall outside visible keys
  useEffect(() => {
    if (!isOpen) return;
    const pianoNotes = activeMidiNumbers.filter((m) => m >= 0 && m <= 127);
    if (pianoNotes.length === 0) return;
    const next = resolveVisibleRangeForNotes(pianoNotes, rangePresetId, octaveOffset);
    if (next) {
      if (next.rangePresetId !== rangePresetId) setRangePresetId(next.rangePresetId);
      if (next.octaveOffset !== octaveOffset) setOctaveOffset(next.octaveOffset);
    }
  }, [isOpen, activeMidiNumbers, rangePresetId, octaveOffset]);

  const isRhythm = currentFundamentalD >= 0;
  const activeSet = useMemo(() => new Set(activeMidiNumbers), [activeMidiNumbers]);

  const keys = useMemo(
    () => buildVirtualKeys(startMidi, endMidi, midiTuning, currentFundamentalD, tuningA4Hz, tplFrequencyHz),
    [startMidi, endMidi, midiTuning, currentFundamentalD, tuningA4Hz, tplFrequencyHz]
  );

  const whiteKeys = useMemo(() => keys.filter((k) => !k.isBlack), [keys]);
  const blackKeys = useMemo(() => keys.filter((k) => k.isBlack), [keys]);
  const { bands: intervalBands, rowCount: intervalRowCount } = useMemo(
    () => (showIntervals ? buildIntervalBands(keys, activeSet, isRhythm) : { bands: [], rowCount: 0 }),
    [showIntervals, keys, activeSet, isRhythm]
  );

  const stripPads = useMemo(
    () =>
      surfaceMode === 'scale-strip'
        ? buildScaleStripPads(midiTuning, currentFundamentalD, tuningA4Hz, tplFrequencyHz)
        : [],
    [surfaceMode, midiTuning, currentFundamentalD, tuningA4Hz, tplFrequencyHz]
  );
  const isoGrid = useMemo(
    () =>
      surfaceMode === 'isomorphic'
        ? buildIsomorphicGrid(4, 8, midiTuning, currentFundamentalD, tuningA4Hz, tplFrequencyHz)
        : [],
    [surfaceMode, midiTuning, currentFundamentalD, tuningA4Hz, tplFrequencyHz]
  );
  const guitarStrings = useMemo(
    () =>
      surfaceMode === 'guitar'
        ? buildGuitarFretboard(12, midiTuning, currentFundamentalD, tuningA4Hz, tplFrequencyHz)
        : [],
    [surfaceMode, midiTuning, currentFundamentalD, tuningA4Hz, tplFrequencyHz]
  );

  const keyCenterMap = useMemo(() => {
    const map = new Map<number, number>();
    const totalWhite = Math.max(1, whiteKeys.length);
    let whiteIdx = 0;
    for (const k of keys) {
      if (!k.isBlack) {
        map.set(k.midi, (whiteIdx + 0.5) / totalWhite);
        whiteIdx++;
      } else {
        map.set(k.midi, (whiteIdx + getBlackKeyOffset(k.pitchClass)) / totalWhite);
      }
    }
    return map;
  }, [keys, whiteKeys.length]);

  if (!isOpen) return null;

  const totalWhite = Math.max(1, whiteKeys.length);
  const fixedKeyWidthPx = 36;
  const keyboardWidthPx = isFitMode
    ? Math.max(280, availableWidth - 16)
    : Math.max(280, totalWhite * fixedKeyWidthPx);
  const effectiveKeyWidth = keyboardWidthPx / totalWhite;
  const semitoneWidthPx = keyboardWidthPx / Math.max(1, keys.length - 1);
  const isCompact = effectiveKeyWidth < 28;
  const isUltraCompact = effectiveKeyWidth < 19;

  const rootMidi = isRhythm ? midiTuning.rhythmRootMidi : midiTuning.pitchRootMidi;
  const presetLabel =
    midiTuning.presetId === 'custom'
      ? 'Mixed / Custom'
      : MIDI_TUNING_PRESETS[midiTuning.presetId].label;

  const handleKeyPointerDown = (k: VirtualKeyItem, e: React.PointerEvent) => {
    e.preventDefault();
    if (isMidiHoldActive) {
      onToggleLatchNote(k.midi);
    } else {
      onVirtualNoteOn(k.midi);
    }
  };

  const handleKeyPointerUpOrLeave = (k: VirtualKeyItem) => {
    if (!isMidiHoldActive && activeSet.has(k.midi)) {
      onVirtualNoteOff(k.midi);
    }
  };

  return (
    <div
      ref={containerRef}
      className="shrink-0 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-md px-2 sm:px-4 py-1.5 sm:py-2 select-none z-20"
    >
      {/* Single-row responsive Control Strip (horizontally scrollable on narrow mobile) */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Tuning + Tonic Shortcut */}
          <button
            type="button"
            onClick={onOpenTuningModal}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] sm:text-xs text-slate-200 transition cursor-pointer shrink-0"
            title="Open Tuning & Rhythm Map"
          >
            <Sliders className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
            <span className="font-medium max-w-[84px] sm:max-w-none truncate">{presetLabel}</span>
            <span className="text-slate-500 hidden sm:inline">·</span>
            <span className="font-mono text-amber-300">{formatMidiShort(rootMidi)}</span>
          </button>

          {/* Surface Mode Switcher: Piano | Scale | Iso | Guitar */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 shrink-0">
            {(
              [
                { id: 'piano', label: 'Piano' },
                { id: 'scale-strip', label: 'Scale' },
                { id: 'isomorphic', label: 'Iso' },
                { id: 'guitar', label: 'Guitar' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSurfaceMode(m.id)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                  surfaceMode === m.id ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {onToggleStrumMode && tuningStrum && (
            <button type="button"
              onClick={() => { if (!tuningStrum.isStrumMode && surfaceMode === 'piano') setSurfaceMode('scale-strip'); onToggleStrumMode(); }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer shrink-0 ${
                tuningStrum.isStrumMode
                  ? 'bg-rose-600/25 border-rose-500 text-rose-200'
                  : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
              title="Toggle Strum & Scale Walk mode inside the Play Panel"
            >
              <Sparkles className="w-3 h-3 text-rose-400" />
              <span>Strum</span>
            </button>
          )}

          {/* Range Selector */}
          <select
            value={rangePresetId}
            onChange={(e) => {
              const nextId = e.target.value;
              setRangePresetId(nextId);
              saveKeyboardRange(nextId);
              setOctaveOffset(0);
              e.currentTarget.blur();
            }}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] font-mono text-slate-200 focus:outline-none cursor-pointer shrink-0"
            aria-label="Select visible key range"
          >
            {KEYBOARD_RANGE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Fit vs Fixed Width */}
          <button
            type="button"
            onClick={() => setIsFitMode((v) => !v)}
            className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-slate-300 transition cursor-pointer shrink-0"
            title={isFitMode ? 'Fit to window width (click for Fixed key size)' : 'Fixed key size (click to Fit window)'}
          >
            {isFitMode ? <Minimize2 className="w-3 h-3 text-sky-400" /> : <Maximize2 className="w-3 h-3 text-sky-400" />}
            <span className="hidden sm:inline">{isFitMode ? 'Fit' : 'Fixed'}</span>
          </button>

          {/* MIDI Hold Toggle (H) */}
          <button
            type="button"
            onClick={toggleMidiHold}
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer shrink-0 ${
              isMidiHoldActive
                ? 'bg-red-600/25 border-red-500/70 text-red-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Sostenuto for MIDI (captures currently held keys) & Sustain for Virtual Keyboard; turning off clears held keys (H)"
          >
            <span>Hold</span>
            <kbd className="hidden sm:inline text-[9px] px-1 bg-black/30 rounded text-slate-300">H</kbd>
          </button>

          {/* Interval Bands Toggle */}
          <button
            type="button"
            onClick={() => setShowIntervals((v) => !v)}
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer shrink-0 ${
              showIntervals
                ? 'bg-indigo-950/70 border-indigo-500/70 text-indigo-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Show pairwise interval ratios & frequency distance bands above keys"
          >
            <Ruler className="w-3 h-3" />
            <span className="hidden sm:inline">Intervals</span>
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Clear Latched / Active Keys */}
          <button
            type="button"
            onClick={onClearAllNotes}
            disabled={activeMidiNumbers.length === 0}
            className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg bg-slate-900 hover:bg-red-950/70 disabled:opacity-40 border border-slate-700/80 text-[11px] font-medium text-slate-200 transition cursor-pointer disabled:cursor-default shrink-0"
            title="Clear all active & latched keys"
          >
            <Eraser className="w-3 h-3 text-red-400" />
            <span className="hidden sm:inline">Clear</span>
            {activeMidiNumbers.length > 0 && <span>({activeMidiNumbers.length})</span>}
          </button>

          {/* MIDI Connect Shortcut */}
          <button
            type="button"
            onClick={onOpenMidiModal}
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer shrink-0 ${
              midiState.isConnected
                ? 'bg-emerald-950/50 border-emerald-600/60 text-emerald-300'
                : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800'
            }`}
            title="Connect Hardware MIDI Keyboard"
          >
            <MidiIcon className="w-3 h-3" />
            <span className="hidden sm:inline">
              {midiState.isConnected ? `MIDI (${midiState.inputs.length})` : 'MIDI'}
            </span>
          </button>

          {/* Octave Shift (disabled in 88-key mode) */}
          {!is88 && (
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setOctaveOffset((o) => Math.max(-2, o - 1))}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Octave down"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-1 text-[10px] font-mono text-slate-300">
                {formatMidiShort(startMidi)}
              </span>
              <button
                type="button"
                onClick={() => setOctaveOffset((o) => Math.min(2, o + 1))}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Octave up"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Close Keyboard */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Close virtual keyboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline Strum & Scale Walk Bar (when Strum is toggled on) */}
      {tuningStrum?.isStrumMode && (
        <PlayPanelStrumBar
          midiTuning={midiTuning}
          onChangeTuning={midi.setMidiTuning}
          tuningStrum={tuningStrum}
        />
      )}

      {/* Scrollable Keybed / Alternate Surface */}
      {surfaceMode !== 'piano' ? (
        <AlternateSurfaces
          mode={surfaceMode}
          stripPads={stripPads}
          isoGrid={isoGrid}
          guitarStrings={guitarStrings}
          activeSet={activeSet}
          isMidiHoldActive={isMidiHoldActive}
          onNoteOn={(id, d) => onVirtualNoteOn(id, 0.85, undefined, d)}
          onNoteOff={onVirtualNoteOff}
          onToggleLatch={(id, d) => onToggleLatchNote(id, 0.85, d)}
        />
      ) : (
        <PianoKeybed
          isFitMode={isFitMode}
          keyboardWidthPx={keyboardWidthPx}
          showIntervals={showIntervals}
          intervalBands={intervalBands}
          intervalRowCount={intervalRowCount}
          keyCenterMap={keyCenterMap}
          semitoneWidthPx={semitoneWidthPx}
          whiteKeys={whiteKeys}
          blackKeys={blackKeys}
          activeSet={activeSet}
          totalWhite={totalWhite}
          isCompact={isCompact}
          isUltraCompact={isUltraCompact}
          onKeyDown={handleKeyPointerDown}
          onKeyUpOrLeave={handleKeyPointerUpOrLeave}
        />
      )}
    </div>
  );
};
