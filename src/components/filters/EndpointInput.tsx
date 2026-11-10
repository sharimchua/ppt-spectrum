import React, { useState, useEffect } from 'react';
import { FilterReference, RangeEndpoint } from '../../core/filter-types';
import { parseEndpoint, formatEndpoint } from '../../core/endpoint-parse';

interface EndpointInputProps {
  label: string;
  value: RangeEndpoint | null;
  reference: FilterReference;
  onChange: (value: RangeEndpoint | null) => void;
  placeholder?: string;
  isOpenEnded?: boolean;
  onToggleOpenEnded?: () => void;
}

export const EndpointInput: React.FC<EndpointInputProps> = ({
  label,
  value,
  reference,
  onChange,
  placeholder = 'Unbounded',
  isOpenEnded = false,
  onToggleOpenEnded,
}) => {
  const [text, setText] = useState(value ? formatEndpoint(value) : '');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setText(value ? formatEndpoint(value) : '');
    setIsError(false);
  }, [value]);

  const handleBlur = () => {
    if (!text.trim()) {
      onChange(null);
      setIsError(false);
      return;
    }

    const parsed = parseEndpoint(text.trim());
    if (parsed) {
      const isAbsolute = reference === 'absolute';
      const isValidUnit = isAbsolute
        ? parsed.unit === 'd' || parsed.unit === 'hz' || parsed.unit === 'bpm'
        : parsed.unit === 'ratio' || parsed.unit === 'cents' || parsed.unit === 'edo';

      if (isValidUnit) {
        setIsError(false);
        onChange(parsed);
        setText(formatEndpoint(parsed));
        return;
      }
    }
    setIsError(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex flex-col gap-1 min-w-0 flex-1">
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span>{label}</span>
        {onToggleOpenEnded && (
          <button
            type="button"
            onClick={onToggleOpenEnded}
            className={`px-1 rounded text-[9px] uppercase tracking-wider transition-colors ${
              isOpenEnded
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {isOpenEnded ? 'Open' : 'Bound'}
          </button>
        )}
      </div>

      <div className="relative flex items-center">
        <input
          type="text"
          value={isOpenEnded ? '∞ (Open)' : text}
          disabled={isOpenEnded}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            setIsError(false);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full bg-slate-900/80 border rounded px-2.5 py-1.5 text-xs font-mono transition-all outline-none ${
            isOpenEnded
              ? 'border-slate-800 text-slate-500 italic bg-slate-950/40'
              : isError
              ? 'border-rose-500/80 text-rose-300 focus:ring-1 focus:ring-rose-500'
              : 'border-slate-700/80 text-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
          }`}
        />
        {value && !isOpenEnded && (
          <span className="absolute right-2 text-[9px] uppercase font-mono px-1 rounded bg-slate-800 text-slate-400 pointer-events-none">
            {value.unit}
          </span>
        )}
      </div>
      {isError && (
        <span className="text-[10px] text-rose-400 font-mono">
          Invalid {reference} format
        </span>
      )}
    </div>
  );
};
