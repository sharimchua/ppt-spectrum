import React, { useState } from 'react';
import { CycleCondition, MAX_DIVISIONS } from '../../core/filter-types';
import { bjorklund } from '../../core/filter-presets';
import { CycleSlotRing } from './CycleSlotRing';
import { SupercycleStrip } from './SupercycleStrip';

interface CycleConditionEditorProps {
  condition: CycleCondition;
  onChange: (updated: CycleCondition) => void;
}

const COMMON_DIVISIONS = [2, 3, 4, 5, 6, 8, 12, 16];

export const CycleConditionEditor: React.FC<CycleConditionEditorProps> = ({
  condition,
  onChange,
}) => {
  const [euclidK, setEuclidK] = useState(3);
  const [euclidN, setEuclidN] = useState(8);

  const handleDivisionsChange = (divs: number) => {
    const clamped = Math.max(1, Math.min(MAX_DIVISIONS, divs));
    const newWeights = Array.from({ length: clamped }, (_, i) =>
      condition.slotWeights[i % condition.slotWeights.length] ?? 1.0
    );
    onChange({
      ...condition,
      divisions: clamped,
      slotWeights: newWeights,
    });
  };

  const handleToggleSlot = (slotIdx: number) => {
    const newWeights = [...condition.slotWeights];
    newWeights[slotIdx] = newWeights[slotIdx] > 0.5 ? 0.0 : 1.0;
    onChange({ ...condition, slotWeights: newWeights });
  };

  const applyEuclidPattern = () => {
    const pattern = bjorklund(euclidK, euclidN);
    onChange({
      ...condition,
      divisions: euclidN,
      slotWeights: pattern,
      rotation: 0,
    });
  };

  return (
    <div className="flex flex-col gap-4 text-xs">
      {/* Divisions Selector */}
      <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            Cycle Divisions (Subdivisions per bar)
          </span>
          <span className="text-xs font-mono font-bold text-sky-400">
            {condition.divisions} slots
          </span>
        </div>

        {/* Quick Division Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {COMMON_DIVISIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDivisionsChange(d)}
              className={`px-2 py-1 rounded font-mono text-[11px] transition-colors ${
                condition.divisions === d
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Slot Ring */}
      <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900/50 border border-slate-800">
        <CycleSlotRing
          divisions={condition.divisions}
          slotWeights={condition.slotWeights}
          rotation={condition.rotation}
          onToggleSlot={handleToggleSlot}
          size={180}
        />

        {/* Rotation Stepper */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-slate-400 font-mono">Shift Rotation:</span>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...condition,
                rotation: (condition.rotation - 1 + condition.divisions) % condition.divisions,
              })
            }
            className="w-6 h-6 rounded bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center hover:bg-slate-700"
          >
            ←
          </button>
          <span className="font-mono text-xs text-sky-400 font-bold w-6 text-center">
            {condition.rotation}
          </span>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...condition,
                rotation: (condition.rotation + 1) % condition.divisions,
              })
            }
            className="w-6 h-6 rounded bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center hover:bg-slate-700"
          >
            →
          </button>
        </div>
      </div>

      {/* Euclidean Rhythm Generator */}
      <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
        <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
          Euclidean Pattern Generator
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-mono">Pulses (k):</span>
          <input
            type="number"
            min="1"
            max={euclidN}
            value={euclidK}
            onChange={(e) => setEuclidK(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-xs text-slate-200"
          />
          <span className="text-[10px] text-slate-400 font-mono">Steps (n):</span>
          <input
            type="number"
            min="2"
            max={MAX_DIVISIONS}
            value={euclidN}
            onChange={(e) => setEuclidN(Math.max(2, parseInt(e.target.value) || 2))}
            className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-xs text-slate-200"
          />
          <button
            type="button"
            onClick={applyEuclidPattern}
            className="flex-1 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold transition-colors"
          >
            Generate E({euclidK},{euclidN})
          </button>
        </div>
      </div>

      {/* Grid Alignment: Tolerance & Off-grid Match */}
      <div className="flex flex-col gap-3 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-300">Slot Hit Tolerance</span>
          <span className="font-mono text-[10px] text-slate-400">
            ±{Math.round(condition.tolerance * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0.05"
          max="0.5"
          step="0.01"
          value={condition.tolerance}
          onChange={(e) =>
            onChange({ ...condition, tolerance: parseFloat(e.target.value) })
          }
          className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-sky-400"
        />

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-300">Off-Grid Cross-Rhythm Match</span>
            <span className="text-[10px] text-slate-500 font-mono">0 = strict grid exclusion</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            {Math.round(condition.offGridMatch * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={condition.offGridMatch}
          onChange={(e) =>
            onChange({ ...condition, offGridMatch: parseFloat(e.target.value) })
          }
          className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-sky-400"
        />
      </div>

      {/* Supercycle Section */}
      <SupercycleStrip
        supercycle={condition.supercycle}
        onChange={(supercycle) => onChange({ ...condition, supercycle })}
      />
    </div>
  );
};
