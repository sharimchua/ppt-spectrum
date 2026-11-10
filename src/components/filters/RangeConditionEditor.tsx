import React from 'react';
import { RangeCondition, RangeSpan, MAX_SPANS, FilterReference } from '../../core/filter-types';
import { convertEndpointForReference } from '../../core/endpoint-parse';
import { SpanRow } from './SpanRow';

interface RangeConditionEditorProps {
  condition: RangeCondition;
  onChange: (updated: RangeCondition) => void;
}

export const RangeConditionEditor: React.FC<RangeConditionEditorProps> = ({
  condition,
  onChange,
}) => {
  const handleReferenceChange = (newRef: FilterReference) => {
    if (newRef === condition.reference) return;

    // Convert existing spans to target reference format
    const convertedSpans = condition.spans.map((span) => ({
      lo: convertEndpointForReference(span.lo, newRef),
      hi: convertEndpointForReference(span.hi, newRef),
    }));

    // Convert softness if switching between absolute and relative
    const isCurrentlyAbsolute = condition.reference === 'absolute';
    const isTargetAbsolute = newRef === 'absolute';
    let newSoftness = condition.softness;

    if (isCurrentlyAbsolute && !isTargetAbsolute) {
      const centsVal = Math.round(condition.softness.value * 1200);
      newSoftness = { value: Math.max(1, centsVal), unit: 'cents' };
    } else if (!isCurrentlyAbsolute && isTargetAbsolute) {
      const dVal = Math.round((condition.softness.value / 1200) * 100) / 100;
      newSoftness = { value: Math.max(0.01, dVal), unit: 'd' };
    }

    onChange({
      ...condition,
      reference: newRef,
      spans: convertedSpans,
      softness: newSoftness,
    });
  };

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
      <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Reference Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Coordinate Reference:</span>
            <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => handleReferenceChange('scene')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                  condition.reference === 'scene'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Relative to Scene Fundamental (scrubs when scene frequency changes)"
              >
                <span>Scene</span>
                <span className={`text-[8px] uppercase tracking-wider ${condition.reference === 'scene' ? 'text-cyan-950 font-semibold' : 'text-slate-500'}`}>
                  (Rel)
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleReferenceChange('anchor')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                  condition.reference === 'anchor'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Relative to Voice Anchor (transposes per placed voice)"
              >
                <span>Anchor</span>
                <span className={`text-[8px] uppercase tracking-wider ${condition.reference === 'anchor' ? 'text-emerald-950 font-semibold' : 'text-slate-500'}`}>
                  (Rel)
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleReferenceChange('absolute')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  condition.reference === 'absolute'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Fixed Continuum space (absolute d / Hz / BPM coordinates)"
              >
                Absolute
              </button>
            </div>
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

        {/* Dynamic contextual explanation banner */}
        <div className="text-[10px] font-mono px-1 pt-1 border-t border-slate-800/60 flex items-center gap-1.5">
          <span className="text-slate-500">Mode:</span>
          {condition.reference === 'scene' && (
            <span className="text-cyan-300">
              Relative to Scene Fundamental — intervals scale and scrub with the fundamental slider.
            </span>
          )}
          {condition.reference === 'anchor' && (
            <span className="text-emerald-300">
              Relative to Shape Voice Anchor — intervals track each voice anchor independently.
            </span>
          )}
          {condition.reference === 'absolute' && (
            <span className="text-amber-300">
              Absolute Continuum — fixed in DuPeriod (d), frequency (Hz), or tempo (BPM) space.
            </span>
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
