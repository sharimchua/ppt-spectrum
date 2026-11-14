import React from 'react';
import { RhythmSimplificationMode } from '../../core/decompose';
import { Play, Sparkles, Square } from 'lucide-react';

const SHAPE_MODES: [RhythmSimplificationMode, string][] = [
  ['raw', 'Raw Hits'],
  ['minimal', 'Minimal Partials'],
  ['grid', 'Extrapolated Grid'],
  ['polyrhythm', 'Polyrhythm'],
];

export interface RhythmPreviewBarProps {
  shapeMode: RhythmSimplificationMode;
  summary: string;
  bpm: number;
  anchorCount: number;
  hasCycleOverride: boolean;
  isPreviewPlaying: boolean;
  onSelectMode: (mode: RhythmSimplificationMode) => void;
  onTempoChange: (nextBpm: number) => void;
  onResetTempo: () => void;
  onTogglePreview: () => void;
  onApply: () => void;
}

export const RhythmPreviewBar: React.FC<RhythmPreviewBarProps> = ({
  shapeMode,
  summary,
  bpm,
  anchorCount,
  hasCycleOverride,
  isPreviewPlaying,
  onSelectMode,
  onTempoChange,
  onResetTempo,
  onTogglePreview,
  onApply,
}) => (
  <div className="space-y-2.5">
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5">
      <div className="flex flex-wrap items-center gap-1 text-[10px]">
        <span className="text-slate-400 mr-1">Representation:</span>
        {SHAPE_MODES.map(([modeKey, modeLabel]) => (
          <button
            key={modeKey}
            type="button"
            onClick={() => onSelectMode(modeKey)}
            className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
              shapeMode === modeKey
                ? 'bg-red-600/30 text-white border border-red-500/60'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            {modeLabel}
          </button>
        ))}
      </div>
      <span className="text-[10px] font-mono text-emerald-300">{summary}</span>
    </div>

    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-[10px] font-mono text-slate-300">
      <span className="shrink-0 text-slate-400">Preview / Output Tempo</span>
      <input
        type="range"
        min={40}
        max={240}
        value={Math.max(40, Math.min(240, bpm))}
        onChange={(e) => onTempoChange(Number(e.target.value))}
        className="flex-1 accent-red-500 cursor-pointer"
      />
      <span className="w-16 text-right font-bold text-white">{bpm} BPM</span>
      {hasCycleOverride && (
        <button
          type="button"
          onClick={onResetTempo}
          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          title="Reset to detected tempo"
        >
          Reset
        </button>
      )}
    </div>

    <div className="flex gap-2">
      <button
        type="button"
        disabled={anchorCount === 0}
        onClick={onTogglePreview}
        className={`px-4 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 border ${
          anchorCount === 0
            ? 'border-slate-800 bg-slate-900 text-slate-500 opacity-40 cursor-not-allowed'
            : isPreviewPlaying
              ? 'border-amber-500 bg-amber-600/25 text-amber-200 cursor-pointer'
              : 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
        }`}
      >
        {isPreviewPlaying ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        <span>{isPreviewPlaying ? 'Stop' : 'Preview'}</span>
      </button>

      <button
        type="button"
        disabled={anchorCount === 0}
        onClick={onApply}
        className={`flex-1 py-2 rounded-lg font-bold text-xs text-white transition flex items-center justify-center gap-1.5 ${
          anchorCount > 0
            ? 'bg-red-600 hover:bg-red-500 cursor-pointer shadow-[0_0_12px_rgba(238,54,16,0.3)]'
            : 'bg-slate-800 opacity-40 cursor-not-allowed'
        }`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>Apply Captured Rhythm ({anchorCount} anchors) to Scene</span>
      </button>
    </div>
  </div>
);
