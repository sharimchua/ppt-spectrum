/**
 * Dedicated Tuning & Rhythm Map dialogue.
 * Decoupled from MIDI hardware permissions so users can explore Prime Family
 * tuning philosophy, DuTri Closure, and Rhythm Space anchoring with or without MIDI.
 */

import React, { useEffect } from 'react';
import { Sliders } from 'lucide-react';
import { MidiNoteMappingResult, MidiTuningConfig } from '../core/midi-tuning';
import { MidiTuningPanel } from './MidiTuningPanel';

export interface TuningModalProps {
  isOpen: boolean;
  onClose: () => void;
  midiTuning: MidiTuningConfig;
  onChangeTuning: (updater: MidiTuningConfig | ((prev: MidiTuningConfig) => MidiTuningConfig)) => void;
  currentFundamentalD: number;
  tplFrequencyHz?: number;
  lastMapping: MidiNoteMappingResult | null;
  heldMappings: MidiNoteMappingResult[];
}

export const TuningModal: React.FC<TuningModalProps> = ({
  isOpen,
  onClose,
  midiTuning,
  onChangeTuning,
  currentFundamentalD,
  tplFrequencyHz,
  lastMapping,
  heldMappings,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tuning-modal-title"
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-700/60 flex items-center justify-center text-amber-400 shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 id="tuning-modal-title" className="text-lg font-semibold text-white tracking-wide">
                Tuning &amp; Rhythm Map
              </h2>
              <p className="text-xs text-slate-400">
                Harmonic Profiler Prime Family Mapping Across Pitch &amp; Rhythm Space
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close dialogue"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <MidiTuningPanel
          midiTuning={midiTuning}
          onChangeTuning={onChangeTuning}
          currentFundamentalD={currentFundamentalD}
          tplFrequencyHz={tplFrequencyHz}
          lastMapping={lastMapping}
          heldMappings={heldMappings}
        />

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
