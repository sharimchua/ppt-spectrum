import React, { useState } from 'react';
import {
  X,
  Repeat,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  Music,
  ArrowRightLeft,
  Play,
  Square,
} from 'lucide-react';
import { bpmToD, pitchToD, PITCH_NAMES, resolveDuPeriodAddress, dToFreq, dToPeriodMs, dToBpm } from '../core/axis';
import { SOLFEGE_COLORS } from '../core/ppt-constants';

export interface BookmarkPoint {
  d: number;
  label: string;
  type: 'rhythm' | 'pitch' | 'custom';
  bpm?: number;
  noteIndex?: number;
  octave?: number;
}

export interface BookmarkSettings {
  a: BookmarkPoint;
  b: BookmarkPoint;
  periodSec: number;
}

export const STORAGE_KEY_BOOKMARKS = 'ppt_spectrum_bookmarks_v1';

export const DEFAULT_BOOKMARKS: BookmarkSettings = {
  a: {
    d: 3.689,
    label: '120 BPM',
    type: 'rhythm',
    bpm: 120,
  },
  b: {
    d: -4.092,
    label: 'A4 (440 Hz)',
    type: 'pitch',
    noteIndex: 9, // A
    octave: 4,
  },
  periodSec: 10,
};

export function loadSavedBookmarks(): BookmarkSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_BOOKMARKS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_BOOKMARKS);
    if (!raw) return DEFAULT_BOOKMARKS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BOOKMARKS,
      ...parsed,
      a: { ...DEFAULT_BOOKMARKS.a, ...(parsed.a || {}) },
      b: { ...DEFAULT_BOOKMARKS.b, ...(parsed.b || {}) },
    };
  } catch {
    return DEFAULT_BOOKMARKS;
  }
}

export function saveBookmarks(bookmarks: BookmarkSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(bookmarks));
  } catch (err) {
    console.warn('[Bookmarks] Failed to save bookmarks:', err);
  }
}

interface MusicalBookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentD: number;
  bookmarks: BookmarkSettings;
  onUpdateBookmarks: (newBookmarks: BookmarkSettings) => void;
  onJumpToD: (d: number) => void;
  isOscillating: boolean;
  onToggleOscillate: () => void;
}

export const MusicalBookmarksModal: React.FC<MusicalBookmarksModalProps> = ({
  isOpen,
  onClose,
  currentD,
  bookmarks,
  onUpdateBookmarks,
  onJumpToD,
  isOscillating,
  onToggleOscillate,
}) => {
  const [activeSlot, setActiveSlot] = useState<'a' | 'b'>('a');
  const [pitchOctave, setPitchOctave] = useState<number>(4);
  const [customBpm, setCustomBpm] = useState<number>(120);

  if (!isOpen) return null;

  const currentSlot = bookmarks[activeSlot];

  const updateActiveSlot = (point: BookmarkPoint) => {
    const updated = {
      ...bookmarks,
      [activeSlot]: point,
    };
    onUpdateBookmarks(updated);
    saveBookmarks(updated);
  };

  const setBpmBookmark = (bpm: number) => {
    const d = bpmToD(bpm);
    updateActiveSlot({
      d,
      label: `${Math.round(bpm)} BPM`,
      type: 'rhythm',
      bpm,
    });
  };

  const setPitchBookmark = (noteIndex: number, octave: number) => {
    const d = pitchToD(noteIndex, octave);
    const noteName = PITCH_NAMES[noteIndex];
    const freq = dToFreq(d);
    updateActiveSlot({
      d,
      label: `${noteName}${octave} (${freq.toFixed(1)} Hz)`,
      type: 'pitch',
      noteIndex,
      octave,
    });
  };

  const handleCaptureCurrentD = () => {
    const addr = resolveDuPeriodAddress(currentD);
    const freq = dToFreq(currentD);
    let label: string;
    if (currentD > 0) {
      const bpm = dToBpm(currentD);
      label = `${bpm.toFixed(0)} BPM (${dToPeriodMs(currentD).toFixed(0)} ms)`;
    } else {
      label = `${addr.formatted} (${freq.toFixed(1)} Hz)`;
    }
    updateActiveSlot({
      d: currentD,
      label,
      type: 'custom',
    });
  };

  const whiteKeyIndices = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B
  const blackKeys = [
    { index: 1, leftPercent: 10.5 },  // C#
    { index: 3, leftPercent: 24.5 },  // D#
    { index: 6, leftPercent: 53.5 },  // F#
    { index: 8, leftPercent: 67.5 },  // G#
    { index: 10, leftPercent: 81.5 }, // A#
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-[#0b0e17] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-sm">Musical Bookmarks & Continuum Sweep</h2>
              <p className="text-[11px] text-slate-400">Set start and end anchors to oscillate across rhythm and pitch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[82vh] text-xs">
          {/* Slot Selection Tabs: Bookmark A vs Bookmark B */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveSlot('a')}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition cursor-pointer ${
                activeSlot === 'a'
                  ? 'bg-cyan-950/70 border border-cyan-500/60 text-cyan-200 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                <span>Anchor A (Start)</span>
              </div>
              <span className="text-[11px] font-mono mt-0.5 text-cyan-300 font-semibold truncate max-w-full">
                {bookmarks.a.label}
              </span>
              <span className="text-[9px] text-slate-400 font-mono">d = {bookmarks.a.d.toFixed(2)}</span>
            </button>

            <button
              onClick={() => setActiveSlot('b')}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition cursor-pointer ${
                activeSlot === 'b'
                  ? 'bg-amber-950/70 border border-amber-500/60 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                <span>Anchor B (End)</span>
              </div>
              <span className="text-[11px] font-mono mt-0.5 text-amber-300 font-semibold truncate max-w-full">
                {bookmarks.b.label}
              </span>
              <span className="text-[9px] text-slate-400 font-mono">d = {bookmarks.b.d.toFixed(2)}</span>
            </button>
          </div>

          {/* Quick Capture & Jump Row */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
            <span className="text-[11px] text-slate-400">
              Editing: <strong className="text-white uppercase font-mono">{activeSlot}</strong> (Current position: <span className="font-mono text-cyan-400">d={currentD.toFixed(2)}</span>)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCaptureCurrentD}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer text-[10px] font-semibold"
                title="Capture current slider d into this bookmark"
              >
                Capture Current d
              </button>
              <button
                onClick={() => onJumpToD(currentSlot.d)}
                className="px-2.5 py-1 rounded bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/50 transition cursor-pointer text-[10px] font-semibold"
                title="Jump slider to this bookmark"
              >
                Jump to {activeSlot.toUpperCase()}
              </button>
            </div>
          </div>

          {/* SECTION 1: RHYTHM REGION (BPM) */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Rhythm Domain Anchor (BPM)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Macro (d &gt; 0)</span>
            </div>

            {/* Quick BPM Presets */}
            <div className="grid grid-cols-5 gap-1.5">
              {[60, 90, 120, 144, 180].map((bpm) => (
                <button
                  key={bpm}
                  onClick={() => setBpmBookmark(bpm)}
                  className={`py-1.5 px-1 rounded text-center font-mono font-semibold text-xs border transition cursor-pointer ${
                    currentSlot.type === 'rhythm' && currentSlot.bpm === bpm
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {bpm} BPM
                </button>
              ))}
            </div>

            {/* Custom BPM Slider & Stepper */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[11px] text-slate-400 shrink-0">Custom BPM:</span>
              <input
                type="range"
                min={40}
                max={240}
                step={1}
                value={customBpm}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setCustomBpm(val);
                  setBpmBookmark(val);
                }}
                className="flex-1 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
              />
              <span className="w-16 text-right font-mono font-bold text-cyan-300 text-xs">{customBpm} BPM</span>
            </div>
          </div>

          {/* SECTION 2: PITCH REGION (PIANO KEYBOARD & OCTAVE STEPPER) */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs">
                <Music className="w-3.5 h-3.5 text-purple-400" />
                <span>Pitch Domain Anchor (Piano Keyboard)</span>
              </div>

              {/* Octave Stepper */}
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setPitchOctave((prev) => Math.max(0, prev - 1))}
                  className="p-1 hover:text-white text-slate-400 transition cursor-pointer"
                  title="Octave Down"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-purple-300 font-bold px-1 text-[11px]">Octave {pitchOctave}</span>
                <button
                  onClick={() => setPitchOctave((prev) => Math.min(8, prev + 1))}
                  className="p-1 hover:text-white text-slate-400 transition cursor-pointer"
                  title="Octave Up"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Piano Keyboard (1 Octave with proper white/black keys) */}
            <div className="relative h-28 w-full bg-slate-950 rounded-xl p-1.5 border border-slate-800 shadow-inner select-none flex">
              {/* 7 White Keys */}
              {whiteKeyIndices.map((noteIdx) => {
                const isSelected =
                  currentSlot.type === 'pitch' &&
                  currentSlot.noteIndex === noteIdx &&
                  currentSlot.octave === pitchOctave;
                const noteName = PITCH_NAMES[noteIdx];
                const solfegeCol = SOLFEGE_COLORS[noteIdx] || '#ffffff';

                return (
                  <button
                    key={noteIdx}
                    onClick={() => setPitchBookmark(noteIdx, pitchOctave)}
                    className={`relative flex-1 h-full rounded-b-md border transition cursor-pointer flex flex-col justify-end items-center pb-2 ${
                      isSelected
                        ? 'bg-purple-200 border-purple-400 text-purple-950 font-bold ring-2 ring-purple-500 shadow-lg'
                        : 'bg-slate-100 hover:bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold leading-tight">{noteName}</span>
                    <span
                      className="w-2 h-2 rounded-full mt-0.5"
                      style={{ backgroundColor: solfegeCol }}
                    />
                  </button>
                );
              })}

              {/* 5 Black Keys (Positioned absolutely over white keys) */}
              {blackKeys.map(({ index: noteIdx, leftPercent }) => {
                const isSelected =
                  currentSlot.type === 'pitch' &&
                  currentSlot.noteIndex === noteIdx &&
                  currentSlot.octave === pitchOctave;
                const noteName = PITCH_NAMES[noteIdx];
                const solfegeCol = SOLFEGE_COLORS[noteIdx] || '#38bdf8';

                return (
                  <button
                    key={noteIdx}
                    onClick={() => setPitchBookmark(noteIdx, pitchOctave)}
                    style={{ left: `${leftPercent}%` }}
                    className={`absolute top-1.5 w-[9%] h-[60%] rounded-b border transition cursor-pointer z-10 flex flex-col justify-end items-center pb-1 ${
                      isSelected
                        ? 'bg-purple-600 border-purple-300 text-white font-bold ring-2 ring-purple-400 shadow-xl'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 shadow-md'
                    }`}
                  >
                    <span className="text-[8px] font-mono leading-none">{noteName}</span>
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-0.5"
                      style={{ backgroundColor: solfegeCol }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: OSCILLATION & SWEEP GOVERNOR */}
          <div className="bg-gradient-to-r from-red-950/30 via-slate-900/60 to-purple-950/30 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs">
                <Repeat className={`w-4 h-4 ${isOscillating ? 'text-red-400 animate-spin' : 'text-slate-400'}`} />
                <span>Continuum Sweep Oscillation</span>
              </div>
              <button
                onClick={onToggleOscillate}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-md ${
                  isOscillating
                    ? 'bg-red-600 hover:bg-red-500 text-white border border-red-400 shadow-[0_0_12px_rgba(225,54,16,0.5)]'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {isOscillating ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isOscillating ? 'Stop Sweep' : 'Start Sweep'}</span>
              </button>
            </div>

            {/* Sweep Duration / Speed Selector */}
            <div className="flex items-center justify-between gap-2 text-[11px] pt-1">
              <span className="text-slate-400">Sweep Period:</span>
              <div className="flex items-center gap-1.5">
                {[5, 10, 16, 24].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => {
                      const updated = { ...bookmarks, periodSec: sec };
                      onUpdateBookmarks(updated);
                      saveBookmarks(updated);
                    }}
                    className={`px-2.5 py-1 rounded font-mono font-semibold text-[10px] border transition cursor-pointer ${
                      bookmarks.periodSec === sec
                        ? 'bg-red-950/80 border-red-500 text-red-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sec}s {sec <= 6 ? '(Fast)' : sec >= 16 ? '(Slow)' : '(Medium)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-slate-400 leading-relaxed">
              Glides the fundamental continuously between <strong className="text-cyan-300">{bookmarks.a.label}</strong> and <strong className="text-amber-300">{bookmarks.b.label}</strong> with smooth sinusoidal easing, demonstrating how rhythm transforms into audible pitch.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
