/**
 * Envelope tab component.
 * Displays acoustic ADSR envelope controls, instrument envelope presets, and interactive sliders.
 */

import React from 'react';
import { Activity, Play } from 'lucide-react';
import { ADSREnvelope } from '../../core/types';
import { ADSR_INSTRUMENT_PRESETS } from './shape-editor-data';
import { AdsrCurve } from './AdsrCurve';

export interface EnvelopeTabProps {
  adsr: ADSREnvelope;
  onUpdateAdsr: (patch: Partial<ADSREnvelope>) => void;
  onTriggerNote?: () => void;
  onNoteOn?: () => void;
  onNoteOff?: () => void;
}

export const EnvelopeTab: React.FC<EnvelopeTabProps> = ({
  adsr,
  onUpdateAdsr,
  onTriggerNote,
  onNoteOn,
  onNoteOff,
}) => {
  return (
    <div className="space-y-3.5 p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 overflow-x-hidden">
      {/* Header row with Title and Strike Note preview button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <div>
            <span className="font-semibold text-white block">Acoustic ADSR Envelope</span>
            <span className="text-[9px] text-amber-400 font-mono">Time-varying amplitude in pitch space</span>
          </div>
        </div>
        {(onTriggerNote || onNoteOn) && (
          <button
            type="button"
            onMouseDown={onNoteOn || onTriggerNote}
            onMouseUp={onNoteOff}
            onTouchStart={onNoteOn || onTriggerNote}
            onTouchEnd={onNoteOff}
            onClick={!onNoteOn ? onTriggerNote : undefined}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition shadow-md cursor-pointer select-none"
            title="Strike acoustic note with current ADSR envelope (Hot key: T - tap or hold)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Strike Note (T)</span>
          </button>
        )}
      </div>

      <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800/80">
        Acoustic instruments (piano, plucked strings, bells) evolve dynamically over time. When in pitch space (f &gt; 25.8 Hz), the ADSR envelope shapes the note strike, with <strong className="text-amber-300">harmonic damping</strong> dissipating higher overtones faster than the fundamental.
      </div>

      {/* Interactive SVG Envelope Curve Visualisation */}
      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 space-y-1">
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span className="text-amber-400 font-semibold">Envelope Contour:</span>
          <span className="text-slate-400">
            A: {(adsr.attack * 1000).toFixed(0)}ms | D: {adsr.decay.toFixed(2)}s | S: {(adsr.sustain * 100).toFixed(0)}% | R: {adsr.release.toFixed(2)}s
          </span>
        </div>

        <AdsrCurve adsr={adsr} />
      </div>

      {/* Instrument Acoustic Presets */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-slate-300 font-medium">Instrument Envelopes:</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {ADSR_INSTRUMENT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onUpdateAdsr(preset.adsr)}
              className="py-1 px-2 rounded text-[10px] font-semibold transition border border-slate-800 bg-slate-950/60 hover:bg-amber-950/50 hover:border-amber-500/60 text-slate-300 hover:text-amber-200 cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Sliders */}
      <div className="space-y-3 pt-1 border-t border-slate-800/80">
        {/* Attack */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-slate-300">Attack Time (A):</span>
            <span className="text-amber-400 font-semibold">{(adsr.attack * 1000).toFixed(0)} ms</span>
          </div>
          <input
            type="range"
            min="0.001"
            max="0.5"
            step="0.001"
            value={adsr.attack}
            onChange={(e) => onUpdateAdsr({ attack: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Decay */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-slate-300">Decay Time (D):</span>
            <span className="text-amber-400 font-semibold">{adsr.decay.toFixed(2)} s</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="4.0"
            step="0.05"
            value={adsr.decay}
            onChange={(e) => onUpdateAdsr({ decay: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Sustain */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-slate-300">Sustain Level (S):</span>
            <span className="text-amber-400 font-semibold">{(adsr.sustain * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.01"
            value={adsr.sustain}
            onChange={(e) => onUpdateAdsr({ sustain: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Release */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-slate-300">Release Time (R):</span>
            <span className="text-amber-400 font-semibold">{adsr.release.toFixed(2)} s</span>
          </div>
          <input
            type="range"
            min="0.02"
            max="3.0"
            step="0.02"
            value={adsr.release}
            onChange={(e) => onUpdateAdsr({ release: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Harmonic Damping */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-slate-300">Harmonic Damping (High-Frequency Dissipation):</span>
            <span className="text-cyan-400 font-semibold">{((adsr.damping || 0) * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.02"
            value={adsr.damping || 0}
            onChange={(e) => onUpdateAdsr({ damping: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>
    </div>
  );
};
