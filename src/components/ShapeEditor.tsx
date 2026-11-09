import React from 'react';
import { Shape, PartialComponent } from '../core/types';
import { Plus, Trash2, Volume2, VolumeX, Sparkles, Sliders } from 'lucide-react';
import { ratioToValue } from '../core/rational';

interface ShapeEditorProps {
  shape: Shape;
  onUpdateShape: (updatedShape: Shape) => void;
}

export const ShapeEditor: React.FC<ShapeEditorProps> = ({ shape, onUpdateShape }) => {
  const handleUpdatePartial = (index: number, patch: Partial<PartialComponent>) => {
    const updated = shape.partials.map((p, idx) => (idx === index ? { ...p, ...patch } : p));
    onUpdateShape({ ...shape, partials: updated });
  };

  const handleRemovePartial = (index: number) => {
    if (shape.partials.length <= 1) return; // Keep at least 1 partial
    const updated = shape.partials.filter((_, idx) => idx !== index);
    onUpdateShape({ ...shape, partials: updated });
  };

  const handleAddPartial = () => {
    const nextHarmonic = shape.partials.length + 1;
    const newPartial: PartialComponent = {
      id: `partial-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      ratio: { kind: 'rational', num: nextHarmonic, den: 1 },
      amp: Math.max(0.05, 1.0 / nextHarmonic),
      phase: 0,
      voice: 'click',
    };
    onUpdateShape({ ...shape, partials: [...shape.partials, newPartial] });
  };

  // Macro: Inharmonicity Stretch (Piano B coefficient)
  const handleApplyInharmonicity = (bCoeff: number) => {
    const updated = shape.partials.map((p, idx) => {
      const n = idx + 1;
      const stretchFactor = Math.sqrt(1 + bCoeff * n * n);
      return {
        ...p,
        ratio: {
          kind: 'real' as const,
          value: n * stretchFactor,
        },
      };
    });
    onUpdateShape({ ...shape, partials: updated });
  };

  // Macro: Spectral Damping / Rolloff
  const handleApplyDamping = (dampingSlope: number) => {
    const updated = shape.partials.map((p, idx) => {
      const n = idx + 1;
      const newAmp = Math.max(0.01, Math.exp(-dampingSlope * (n - 1)));
      return { ...p, amp: newAmp };
    });
    onUpdateShape({ ...shape, partials: updated });
  };

  return (
    <div className="space-y-4 text-xs text-slate-200">
      {/* Top Header & Shape Name */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-ppt-do" />
          <span className="font-bold text-sm text-white">Shape Partial Inspector</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          {shape.partials.length} partials
        </span>
      </div>

      {/* Acoustic Piano Inharmonicity & Damping Macros */}
      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-300">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Harmonic Macros</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[10px]">
          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Piano Inharmonicity (B):</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleApplyInharmonicity(0)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Pure Harmonic (B = 0)"
              >
                0.0
              </button>
              <button
                onClick={() => handleApplyInharmonicity(0.0004)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 cursor-pointer"
                title="Acoustic Piano (B = 0.0004)"
              >
                Piano B
              </button>
              <button
                onClick={() => handleApplyInharmonicity(0.0015)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 cursor-pointer"
                title="Stretched Chime (B = 0.0015)"
              >
                Chime
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Damping Rolloff:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleApplyDamping(0.1)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Bright (Slow Rolloff)"
              >
                Bright
              </button>
              <button
                onClick={() => handleApplyDamping(0.35)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer"
                title="Natural Pluck"
              >
                Pluck
              </button>
              <button
                onClick={() => handleApplyDamping(0.7)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer"
                title="Warm (Steep Rolloff)"
              >
                Warm
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Partials Table */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {shape.partials.map((p, idx) => {
          const ratioVal = ratioToValue(p.ratio);
          const isMuted = p.amp <= 0.0001;

          return (
            <div
              key={idx}
              className={`flex items-center gap-2 p-2 rounded-md border transition ${
                isMuted
                  ? 'bg-slate-950/40 border-slate-900 opacity-50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Harmonic Index */}
              <span className="w-5 text-[10px] font-mono text-slate-500 font-bold">
                #{idx + 1}
              </span>

              {/* Ratio Display & Control */}
              <div className="w-20 min-w-0">
                <span className="text-[10px] font-mono font-semibold text-ppt-do block truncate">
                  {p.ratio.kind === 'rational' ? `${p.ratio.num}/${p.ratio.den}` : ratioVal.toFixed(2)}x
                </span>
                <span className="text-[8px] text-slate-500 font-mono">ratio</span>
              </div>

              {/* Amplitude Slider */}
              <div className="flex-1 space-y-0.5">
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span>Amp</span>
                  <span>{(p.amp * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={p.amp}
                  onChange={(e) => handleUpdatePartial(idx, { amp: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-red-500"
                />
              </div>

              {/* Phase Offset Slider */}
              <div className="w-20 space-y-0.5">
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span>Phase</span>
                  <span>{(p.phase * 360).toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={p.phase}
                  onChange={(e) => handleUpdatePartial(idx, { phase: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* Mute Button */}
              <button
                onClick={() => handleUpdatePartial(idx, { amp: isMuted ? 0.5 : 0 })}
                className={`p-1 rounded border transition cursor-pointer ${
                  isMuted
                    ? 'border-slate-800 bg-slate-950 text-slate-600'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title={isMuted ? 'Unmute Partial' : 'Mute Partial'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              {/* Remove Partial Button */}
              <button
                onClick={() => handleRemovePartial(idx)}
                className="p-1 rounded text-slate-500 hover:text-red-400 transition cursor-pointer"
                title="Remove Partial"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Partial Button */}
      <button
        onClick={handleAddPartial}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-dashed border-slate-700 hover:border-red-500/60 bg-slate-900/40 hover:bg-slate-800/60 text-slate-300 hover:text-white transition cursor-pointer font-medium text-xs"
      >
        <Plus className="w-3.5 h-3.5 text-ppt-do" />
        <span>Add Partial Harmonic</span>
      </button>
    </div>
  );
};
