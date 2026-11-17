/**
 * On-screen interactive Solfège piano keyboard for Pitch Space and Rhythm Space.
 * Mirrors ppt-visualiser's Fit/Fixed sizing and white-key-bounded range presets,
 * removes polarity-flip clutter (handled by Tab / Radial Menu), and renders
 * optional Harmonic-Geometry-style stacked interval ratio bands.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Eraser,
  Keyboard as MidiIcon,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Ruler,
  Sliders,
  X,
} from 'lucide-react';
import { MIDI_TUNING_PRESETS } from '../core/midi-tuning';
import { PITCH_NAMES } from '../core/axis';
import {
  KEYBOARD_RANGE_PRESETS,
  buildIntervalBands,
  buildVirtualKeys,
  getBlackKeyOffset,
  VirtualKeyItem,
} from './keyboard/keyboard-layout';
import { IntervalBandsStrip } from './keyboard/IntervalBandsStrip';
import { UseMidiResult } from './hooks/useMidi';

export type VirtualKeyboardMode = 'latch' | 'hold';

export interface VirtualKeyboardProps {
  midi: UseMidiResult;
  currentFundamentalD: number;
  tuningA4Hz: number;
  tplFrequencyHz: number;
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
}) => {
  const {
    isKeyboardOpen: isOpen,
    closeKeyboard: onClose,
    midiTuning,
    activeMidiNumbers,
    latchedMidiNumbers,
    midiState,
    toggleVirtualNote: onToggleLatchNote,
    virtualNoteOn: onHoldNoteOn,
    virtualNoteOff: onHoldNoteOff,
    clearAllNotes: onClearAllNotes,
    openTuningModal: onOpenTuningModal,
    openMidiModal: onOpenMidiModal,
  } = midi;

  const [rangePresetId, setRangePresetId] = useState<string>('2oct-f');
  const [octaveOffset, setOctaveOffset] = useState<number>(0);
  const [isFitMode, setIsFitMode] = useState<boolean>(true);
  const [mode, setMode] = useState<VirtualKeyboardMode>('latch');
  const [showIntervals, setShowIntervals] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

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

  const isRhythm = currentFundamentalD >= 0;
  const activeSet = useMemo(() => new Set(activeMidiNumbers), [activeMidiNumbers]);
  const latchedSet = useMemo(() => new Set(latchedMidiNumbers), [latchedMidiNumbers]);

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
    if (mode === 'latch') onToggleLatchNote(k.midi);
    else onHoldNoteOn(k.midi);
  };

  const handleKeyPointerUpOrLeave = (k: VirtualKeyItem) => {
    if (mode === 'hold' && activeSet.has(k.midi)) onHoldNoteOff(k.midi);
  };

  return (
    <div
      ref={containerRef}
      className="shrink-0 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-md px-2 sm:px-4 py-2 select-none z-20"
    >
      {/* Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Tuning + Tonic Shortcut */}
          <button
            type="button"
            onClick={onOpenTuningModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-200 transition cursor-pointer"
            title="Open Tuning & Rhythm Map"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">{presetLabel}</span>
            <span className="text-slate-500">·</span>
            <span className="font-mono text-amber-300">Do={formatMidiShort(rootMidi)}</span>
          </button>

          {/* Range Selector */}
          <select
            value={rangePresetId}
            onChange={(e) => {
              setRangePresetId(e.target.value);
              setOctaveOffset(0);
            }}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200 focus:outline-none cursor-pointer"
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
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-slate-300 transition cursor-pointer"
            title={isFitMode ? 'Fit to window width (click for Fixed key size)' : 'Fixed key size (click to Fit window)'}
          >
            {isFitMode ? <Minimize2 className="w-3 h-3 text-sky-400" /> : <Maximize2 className="w-3 h-3 text-sky-400" />}
            <span>{isFitMode ? 'Fit' : 'Fixed'}</span>
          </button>

          {/* Latch vs Hold Toggle */}
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setMode('latch')}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                mode === 'latch' ? 'bg-red-600/25 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Latch
            </button>
            <button
              type="button"
              onClick={() => setMode('hold')}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                mode === 'hold' ? 'bg-red-600/25 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hold
            </button>
          </div>

          {/* Interval Bands Toggle */}
          <button
            type="button"
            onClick={() => setShowIntervals((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
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

        <div className="flex items-center gap-1.5">
          {/* Clear Latched / Active Keys */}
          <button
            type="button"
            onClick={onClearAllNotes}
            disabled={activeMidiNumbers.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-red-950/70 disabled:opacity-40 border border-slate-700/80 text-[11px] font-medium text-slate-200 transition cursor-pointer disabled:cursor-default"
            title="Clear all active & latched keys"
          >
            <Eraser className="w-3 h-3 text-red-400" />
            <span>Clear{activeMidiNumbers.length > 0 ? ` (${activeMidiNumbers.length})` : ''}</span>
          </button>

          {/* MIDI Connect Shortcut */}
          <button
            type="button"
            onClick={onOpenMidiModal}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
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
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg">
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
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close virtual keyboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Keybed + Stacked Interval Bands */}
      <div className="w-full overflow-x-auto">
        <div
          style={{ width: isFitMode ? '100%' : `${keyboardWidthPx}px` }}
          className="mx-auto"
        >
          {showIntervals && (
            <IntervalBandsStrip
              bands={intervalBands}
              rowCount={intervalRowCount}
              keyCenterMap={keyCenterMap}
              semitoneWidthPx={semitoneWidthPx}
            />
          )}

          {/* Keybed */}
          <div className="relative h-24 sm:h-28 w-full flex">
            {whiteKeys.map((k) => {
              const isActive = activeSet.has(k.midi);
              const isLatched = latchedSet.has(k.midi);
              const darkInk = k.semitoneFromRoot === 3 || k.semitoneFromRoot === 4;
              return (
                <button
                  key={k.midi}
                  type="button"
                  onPointerDown={(e) => handleKeyPointerDown(k, e)}
                  onPointerUp={() => handleKeyPointerUpOrLeave(k)}
                  onPointerLeave={() => handleKeyPointerUpOrLeave(k)}
                  style={
                    isActive
                      ? { backgroundColor: k.colorHex, borderColor: k.colorHex }
                      : undefined
                  }
                  className={`relative flex-1 h-full border rounded-b-lg flex flex-col items-center justify-end pb-1.5 transition-colors cursor-pointer ${
                    isActive
                      ? darkInk
                        ? 'text-slate-950 font-semibold'
                        : 'text-white font-semibold'
                      : 'bg-slate-100 hover:bg-white border-slate-400 text-slate-800'
                  }`}
                >
                  {k.isTonic && (
                    <span
                      className="w-1.5 h-1.5 rounded-full mb-0.5"
                      style={{ backgroundColor: isActive ? '#ffffff' : k.colorHex }}
                      title="Tonic (Do)"
                    />
                  )}
                  {!isUltraCompact && (
                    <span className="text-[10px] font-mono leading-none">{k.syllable}</span>
                  )}
                  {!isCompact && (
                    <span className="text-[8px] opacity-65 font-mono leading-none mt-0.5">{k.noteName}</span>
                  )}
                  {isLatched && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white/90 shadow" />
                  )}
                </button>
              );
            })}

            {/* Black Keys */}
            {blackKeys.map((k) => {
              const isActive = activeSet.has(k.midi);
              const isLatched = latchedSet.has(k.midi);
              const centerPct = (keyCenterMap.get(k.midi) ?? 0) * 100;
              const widthPct = (1 / totalWhite) * 58;
              const darkInk = k.semitoneFromRoot === 3 || k.semitoneFromRoot === 4;
              return (
                <button
                  key={k.midi}
                  type="button"
                  onPointerDown={(e) => handleKeyPointerDown(k, e)}
                  onPointerUp={() => handleKeyPointerUpOrLeave(k)}
                  onPointerLeave={() => handleKeyPointerUpOrLeave(k)}
                  style={{
                    left: `calc(${centerPct}% - ${widthPct / 2}%)`,
                    width: `${widthPct}%`,
                    ...(isActive ? { backgroundColor: k.colorHex, borderColor: k.colorHex } : {}),
                  }}
                  className={`absolute top-0 h-[62%] z-10 border rounded-b-md flex flex-col items-center justify-end pb-1 shadow-md transition-colors cursor-pointer ${
                    isActive
                      ? darkInk
                        ? 'text-slate-950 font-semibold'
                        : 'text-white font-semibold'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                  }`}
                >
                  {k.isTonic && (
                    <span
                      className="w-1.5 h-1.5 rounded-full mb-0.5"
                      style={{ backgroundColor: isActive ? '#ffffff' : k.colorHex }}
                      title="Tonic (Do)"
                    />
                  )}
                  {!isCompact && (
                    <span className="text-[9px] font-mono leading-none">{k.syllable}</span>
                  )}
                  {isLatched && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white/90" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
