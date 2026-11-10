import React from 'react';
import { RangeCondition, RangeSpan, MAX_SPANS } from '../../core/filter-types';
import { SpanRow } from './SpanRow';

interface RangeConditionEditorProps {
  condition: RangeCondition;
  onChange: (updated: RangeCondition) => void;
}

export const RangeConditionEditor: React.FC<RangeConditionEditorProps> = ({
  condition,
  onChange,
}) => {
  const referenceBadgeColor = condition.reference === 'scene'
    ? 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20'
    : condition.reference === 'anchor'
      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20'
      : 'text-amber-400 border-amber-500/30 bg-amber-950/20';

  const handleSpanChange = (index: number, updated: RangeSpan) => {
    const newSpans = [...condition.spans];
    newSpans[index] = updated;
    onChange({ ...condition, spans: newSpans });
  };

  const handleSpanDelete = (index: number) => {
    if (condition.spans.length <= 1) return;
    const newSpans = condition.spans.filter((_, i) => i !== index);
    onChange({ ...condition, spans: newSpans });
  };

  const handleAddSpan = () => {
    if (condition.spans.length >= MAX_SPANS) return;
    const lastSpan = condition.spans[condition.spans.length - 1];
    const newSpan: RangeSpan = lastSpan
      ? { ...lastSpan }
      : {
          lo: condition.reference === 'absolute' ? { unit: 'd', value: -1 } : { unit: 'cents', value: 0 },
          hi: condition.reference === 'absolute' ? { unit: 'd', value: 1 } : { unit: 'cents', value: 1200 },
        };
    onChange({ ...condition, spans: [...condition.spans, newSpan] });
  };

  const toggleReduction = () => {
    if (condition.reductionPeriod) {
      onChange({ ...condition, reductionPeriod: null });
    } else {
      onChange({
        ...condition,
        reductionPeriod: { kind: 'rational', num: 2, den: 1 },
      });
    }
  };

  const setReductionRatio = (num: number, den: number) => {
    onChange({
      ...condition,
      reductionPeriod: { kind: 'rational', num, den },
    });
  };

  const handleSoftnessChange = (value: number) => {
    onChange({
      ...condition,
      softness: { ...condition.softness, value: Math.max(0.01, Math.min(1200, value)) },
    });
  };

  const toggleSoftnessUnit = () => {
    const isD = condition.softness.unit === 'd';
    const nextUnit = isD ? 'cents' : 'd';
    const nextVal = isD ? condition.softness.value * 1200 : condition.softness.value / 1200;
    onChange({
      ...condition,
      softness: { value: Math.round(nextVal * 10) / 10, unit: nextUnit },
    });
  };

  return (
    <div className="flex flex-col gap-4 text-xs">
      {/* Header Info: Reference & Reduction */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium">Coordinate Reference:</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${referenceBadgeColor}`}>
            {condition.reference}
          </span>
        </div>

        {/* Reduction Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Octave Reduction:</span>
          <button
            type="button"
            onClick={toggleReduction}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
              condition.reductionPeriod
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {condition.reductionPeriod ? 'Enabled' : 'Off'}
          </button>

          {condition.reductionPeriod && condition.reductionPeriod.kind === 'rational' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setReductionRatio(2, 1)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  condition.reductionPeriod.num === 2 ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                }`}
              >
                2/1 (Oct)
              </button>
              <button
                type="button"
                onClick={() => setReductionRatio(3, 1)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  condition.reductionPeriod.num === 3 ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                }`}
              >
                3/1 (Tritave)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Spans List */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-300 tracking-wide uppercase">
            Aperture Spans ({condition.spans.length}/{MAX_SPANS})
          </span>
          {condition.spans.length < MAX_SPANS && (
            <button
              type="button"
              onClick={handleAddSpan}
              className="text-[10px] text-sky-400 hover:text-sky-300 font-mono flex items-center gap-1 hover:underline"
            >
              + Add Span
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {condition.spans.map((span, idx) => (
            <SpanRow
              key={idx}
              span={span}
              index={idx}
              reference={condition.reference}
              canDelete={condition.spans.length > 1}
              onChange={(updated) => handleSpanChange(idx, updated)}
              onDelete={() => handleSpanDelete(idx)}
            />
          ))}
        </div>
      </div>

      {/* Skirt Softness */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-slate-300">Skirt Softness (Cos² roll-off)</span>
          <span className="text-[10px] text-slate-500 font-mono">
            Aperture transition shoulder width
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            step={condition.softness.unit === 'd' ? '0.1' : '10'}
            min="0.01"
            max={condition.softness.unit === 'd' ? '4.0' : '4800'}
            value={condition.softness.value}
            onChange={(e) => handleSoftnessChange(parseFloat(e.target.value) || 0.1)}
            className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-right text-slate-200 outline-none focus:border-sky-500"
          />
          <button
            type="button"
            onClick={toggleSoftnessUnit}
            title="Toggle unit"
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono border border-slate-700 uppercase"
          >
            {condition.softness.unit}
          </button>
        </div>
      </div>
    </div>
  );
};
