import React from 'react';
import { Mic, RotateCcw, Square } from 'lucide-react';

export interface RhythmRecorderControlsProps {
  isListening: boolean;
  onsetCount: number;
  targetVoices: number;
  rootCycles: number;
  autoStopSilence: boolean;
  sensitivity: number;
  inputLevel: number;
  onTargetVoicesChange: (v: number) => void;
  onRootCyclesChange: (c: number) => void;
  onAutoStopChange: (checked: boolean) => void;
  onSensitivityChange: (val: number) => void;
  onStartCapture: () => void;
  onStopCapture: () => void;
  onClear: () => void;
}

export const RhythmRecorderControls: React.FC<RhythmRecorderControlsProps> = ({
  isListening,
  onsetCount,
  targetVoices,
  rootCycles,
  autoStopSilence,
  sensitivity,
  inputLevel,
  onTargetVoicesChange,
  onRootCyclesChange,
  onAutoStopChange,
  onSensitivityChange,
  onStartCapture,
  onStopCapture,
  onClear,
}) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="text-[11px] text-slate-300">
        Play or tap a rhythmic figure into your mic (repeat 2–4 cycles for best accuracy). Silence is trimmed automatically.
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <span>Voices:</span>
          {[0, 1, 2, 3, 4].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onTargetVoicesChange(v)}
              className={`px-1.5 py-0.5 rounded font-mono text-[10px] border transition cursor-pointer ${
                targetVoices === v
                  ? 'border-emerald-500 bg-emerald-600/30 text-white'
                  : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
              title={v === 0 ? 'Auto-detect voice count' : `Expect ${v} distinct voice anchor${v > 1 ? 's' : ''}`}
            >
              {v === 0 ? 'Auto' : v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <span>Cycles:</span>
          {[1, 2, 3, 4].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onRootCyclesChange(c)}
              className={`px-1.5 py-0.5 rounded font-mono text-[10px] border transition cursor-pointer ${
                rootCycles === c
                  ? 'border-red-500 bg-red-600/30 text-white'
                  : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
              title={`Treat captured phrase as ${c} root cycle${c > 1 ? 's' : ''}`}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoStopSilence}
            onChange={(e) => onAutoStopChange(e.target.checked)}
            className="accent-red-500"
          />
          <span>Auto-stop on silence (2.5s)</span>
        </label>
      </div>
    </div>

    <div className="flex items-center gap-2">
      {!isListening ? (
        <button
          type="button"
          onClick={onStartCapture}
          className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 font-bold text-xs text-white transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Mic className="h-3.5 w-3.5" />
          <span>{onsetCount > 0 ? 'Re-record Rhythm' : 'Record Rhythm'}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onStopCapture}
          className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 font-bold text-xs text-white transition cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
        >
          <Square className="h-3.5 w-3.5" />
          <span>Stop Listening ({onsetCount} hits)</span>
        </button>
      )}

      {onsetCount > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/80 text-xs text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1"
          title="Clear captured onsets"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Clear</span>
        </button>
      )}
    </div>

    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
      <label className="flex items-center gap-1.5 shrink-0">
        <span>Sensitivity</span>
        <input
          type="range"
          min={1}
          max={10}
          value={sensitivity}
          onChange={(e) => onSensitivityChange(Number(e.target.value))}
          className="w-20 accent-red-500 cursor-pointer"
        />
        <span className="text-slate-300 w-3">{sensitivity}</span>
      </label>
      <div className="relative h-2 flex-1 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-red-500 to-amber-400 transition-all duration-75"
          style={{ width: `${Math.round(inputLevel * 100)}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80"
          style={{ left: `${Math.round(Math.min(95, (0.016 - (sensitivity - 1) * 0.0016) * 14 * 100))}%` }}
          title="Trigger threshold"
        />
      </div>
    </div>
  </div>
);
