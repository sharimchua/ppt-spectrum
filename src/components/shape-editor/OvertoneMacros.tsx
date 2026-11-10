/**
 * Overtone macros toolbar.
 * Provides quick actions to apply piano inharmonicity coefficient (B) and spectral damping across voice anchors.
 */

import React from 'react';
import { Sparkles } from 'lucide-react';

export interface OvertoneMacrosProps {
  onApplyInharmonicity: (bCoeff: number) => void;
  onApplyDamping: (dampingSlope: number) => void;
}

export const OvertoneMacros: React.FC<OvertoneMacrosProps> = ({
  onApplyInharmonicity,
  onApplyDamping,
}) => {
  return (
    <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-300">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Voice Anchors & Overtone Macros</span>
        </div>
        <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">
          Root + Interval / DuMetric Offset Fundamentals → Nested Partials
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[10px]">
        <div className="space-y-1">
          <div className="text-slate-400 font-medium">
            Piano Inharmonicity (<span className="font-mono">B</span>):
          </div>
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto">
            <button
              onClick={() => onApplyInharmonicity(0)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer whitespace-nowrap transition"
              title="Pure Harmonic (B = 0)"
            >
              Pure (0)
            </button>
            <button
              onClick={() => onApplyInharmonicity(0.0004)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 cursor-pointer whitespace-nowrap transition"
              title="Acoustic Piano (B = 0.0004)"
            >
              Piano B
            </button>
            <button
              onClick={() => onApplyInharmonicity(0.0015)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 cursor-pointer whitespace-nowrap transition"
              title="Stretched Chime (B = 0.0015)"
            >
              Chime
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-slate-400 font-medium">Spectral Rolloff Damping:</div>
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto">
            <button
              onClick={() => onApplyDamping(0.1)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer whitespace-nowrap transition"
              title="Bright (Slow Rolloff)"
            >
              Bright
            </button>
            <button
              onClick={() => onApplyDamping(0.35)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer whitespace-nowrap transition"
              title="Natural Pluck"
            >
              Pluck
            </button>
            <button
              onClick={() => onApplyDamping(0.7)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer whitespace-nowrap transition"
              title="Warm (Steep Rolloff)"
            >
              Warm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
