import React from 'react';
import { FilterReference, RangeSpan, RangeEndpoint } from '../../core/filter-types';
import { EndpointInput } from './EndpointInput';

interface SpanRowProps {
  span: RangeSpan;
  index: number;
  reference: FilterReference;
  canDelete: boolean;
  onChange: (updated: RangeSpan) => void;
  onDelete: () => void;
}

export const SpanRow: React.FC<SpanRowProps> = ({
  span,
  index,
  reference,
  canDelete,
  onChange,
  onDelete,
}) => {
  const defaultEndpoint: RangeEndpoint = reference === 'absolute'
    ? { unit: 'd', value: 0.0 }
    : { unit: 'cents', value: 0 };

  const handleLoChange = (lo: RangeEndpoint | null) => {
    onChange({ ...span, lo });
  };

  const handleHiChange = (hi: RangeEndpoint | null) => {
    onChange({ ...span, hi });
  };

  const toggleLoOpen = () => {
    if (span.lo === null) {
      onChange({ ...span, lo: defaultEndpoint });
    } else {
      onChange({ ...span, lo: null });
    }
  };

  const toggleHiOpen = () => {
    if (span.hi === null) {
      onChange({ ...span, hi: defaultEndpoint });
    } else {
      onChange({ ...span, hi: null });
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/60 transition-colors">
      <span className="text-[10px] font-mono text-slate-500 font-bold px-1">
        #{index + 1}
      </span>

      <div className="flex flex-1 items-center gap-2 min-w-0">
        <EndpointInput
          label="Lower Bound"
          value={span.lo}
          reference={reference}
          isOpenEnded={span.lo === null}
          onToggleOpenEnded={toggleLoOpen}
          onChange={handleLoChange}
          placeholder="Unbounded"
        />

        <span className="text-slate-600 text-xs self-center pt-4">→</span>

        <EndpointInput
          label="Upper Bound"
          value={span.hi}
          reference={reference}
          isOpenEnded={span.hi === null}
          onToggleOpenEnded={toggleHiOpen}
          onChange={handleHiChange}
          placeholder="Unbounded"
        />
      </div>

      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="Remove span"
          className="self-center mt-3 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};
