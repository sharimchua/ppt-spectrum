import React, { useState } from 'react';
import { Shape, PartialComponent, BandFilter } from '../core/types';
import {
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Sparkles,
  Filter,
  ChevronDown,
  Lock,
  User,
  Copy,
} from 'lucide-react';
import { ratioToValue } from '../core/rational';

interface ShapeEditorProps {
  shape: Shape;
  onUpdateShape: (updatedShape: Shape) => void;
  filter?: BandFilter;
  onUpdateFilter?: (filter: BandFilter) => void;
  allShapes?: Shape[];
  onSelectShape?: (shapeId: string) => void;
  onDuplicateShape?: (shape: Shape) => void;
  onDeleteShape?: (shapeId: string) => void;
  onCreateShape?: (newShape: Shape) => void;
}

export const ShapeEditor: React.FC<ShapeEditorProps> = ({
  shape,
  onUpdateShape,
  filter,
  onUpdateFilter,
  allShapes = [],
  onSelectShape,
  onDuplicateShape,
  onDeleteShape,
  onCreateShape,
}) => {
  const [activeTab, setActiveTab] = useState<'partials' | 'filter'>('partials');
  const isPreset = shape.origin === 'preset';

  // Preset shapes are read-only; fork to a user shape when edited
  const getEditableShape = (): Shape => {
    if (isPreset) {
      return {
        ...shape,
        id: `user-shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        name: `${shape.name} (Custom)`,
        origin: 'user',
        partials: shape.partials.map((p) => ({ ...p })),
      };
    }
    return shape;
  };

  const handleUpdatePartial = (index: number, patch: Partial<PartialComponent>) => {
    const target = getEditableShape();
    const updated = target.partials.map((p, idx) => (idx === index ? { ...p, ...patch } : p));
    onUpdateShape({ ...target, partials: updated });
  };

  const handleToggleMute = (index: number) => {
    const p = shape.partials[index];
    const isMuted = p.amp <= 0.0001;
    if (isMuted) {
      const restored = p.previousAmp && p.previousAmp > 0.001 ? p.previousAmp : 0.75;
      handleUpdatePartial(index, { amp: restored });
    } else {
      handleUpdatePartial(index, { amp: 0, previousAmp: p.amp });
    }
  };

  const handleRemovePartial = (index: number) => {
    if (shape.partials.length <= 1) return;
    const target = getEditableShape();
    const updated = target.partials.filter((_, idx) => idx !== index);
    onUpdateShape({ ...target, partials: updated });
  };

  const handleAddPartial = () => {
    const target = getEditableShape();
    const nextHarmonic = target.partials.length + 1;
    const newPartial: PartialComponent = {
      id: `partial-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      ratio: { kind: 'rational', num: nextHarmonic, den: 1 },
      amp: Math.max(0.05, 1.0 / nextHarmonic),
      previousAmp: Math.max(0.05, 1.0 / nextHarmonic),
      phase: 0,
      voice: 'click',
      label: `${nextHarmonic}`,
    };
    onUpdateShape({ ...target, partials: [...target.partials, newPartial] });
  };

  // Macro: Inharmonicity Stretch (Piano B coefficient)
  const handleApplyInharmonicity = (bCoeff: number) => {
    const target = getEditableShape();
    const updated = target.partials.map((p, idx) => {
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
    onUpdateShape({ ...target, partials: updated });
  };

  // Macro: Spectral Damping / Rolloff
  const handleApplyDamping = (dampingSlope: number) => {
    const target = getEditableShape();
    const updated = target.partials.map((p, idx) => {
      const n = idx + 1;
      const newAmp = Math.max(0.01, Math.exp(-dampingSlope * (n - 1)));
      return { ...p, amp: newAmp, previousAmp: newAmp };
    });
    onUpdateShape({ ...target, partials: updated });
  };

  const handleDuplicateCurrentShape = () => {
    if (onDuplicateShape) {
      onDuplicateShape(shape);
    } else {
      const copy: Shape = {
        ...shape,
        id: `user-shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        name: `${shape.name} (Custom)`,
        origin: 'user',
        partials: shape.partials.map((p) => ({
          ...p,
          id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        })),
      };
      onUpdateShape(copy);
    }
  };

  const handleCreateNewShape = () => {
    const newShape: Shape = {
      id: `user-shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      name: 'Custom Shape',
      origin: 'user',
      partials: [
        {
          id: `p1-${Date.now().toString(36)}`,
          ratio: { kind: 'rational', num: 1, den: 1 },
          amp: 1.0,
          previousAmp: 1.0,
          phase: 0,
          voice: 'woodblock',
          label: '1 (Fund)',
        },
      ],
    };
    if (onCreateShape) {
      onCreateShape(newShape);
    } else {
      onUpdateShape(newShape);
    }
  };

  const presetShapes = allShapes.filter((s) => s.origin === 'preset');
  const userShapes = allShapes.filter((s) => s.origin !== 'preset');

  return (
    <div className="space-y-3.5 text-xs text-slate-200 overflow-x-hidden">
      {/* Top Header & Detailed Shape Selector */}
      <div className="flex flex-col gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {onSelectShape && allShapes.length > 0 ? (
              <div className="relative min-w-0 max-w-[240px]">
                <select
                  value={shape.id}
                  onChange={(e) => onSelectShape(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-red-500 cursor-pointer pr-7 appearance-none truncate w-full"
                >
                  <optgroup label="── Built-in Presets ──" className="bg-slate-900 text-slate-400 font-semibold">
                    {presetShapes.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200 font-normal">
                        {s.name} ({s.partials.length} {s.partials.length === 1 ? 'partial' : 'partials'})
                      </option>
                    ))}
                  </optgroup>
                  {userShapes.length > 0 && (
                    <optgroup label="── User Library ──" className="bg-slate-900 text-cyan-400 font-semibold">
                      {userShapes.map((s) => (
                        <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200 font-normal">
                          {s.name} ({s.partials.length} {s.partials.length === 1 ? 'partial' : 'partials'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>
            ) : (
              <span className="font-bold text-sm text-white truncate">{shape.name}</span>
            )}

            {/* Fork/Customise button when on built-in preset */}
            {isPreset ? (
              <button
                onClick={handleDuplicateCurrentShape}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-[10px] font-semibold cursor-pointer whitespace-nowrap transition shrink-0"
                title="Duplicate to User Library to customise"
              >
                <Copy className="w-3 h-3 text-cyan-400" />
                <span>Customise</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 min-w-0">
                <input
                  type="text"
                  value={shape.name}
                  onChange={(e) => onUpdateShape({ ...shape, name: e.target.value })}
                  className="bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded px-2 py-0.5 text-xs font-semibold text-white focus:outline-none w-28 truncate"
                  title="Rename custom shape"
                />
                {onDeleteShape && (
                  <button
                    onClick={() => onDeleteShape(shape.id)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition cursor-pointer shrink-0"
                    title="Delete custom shape"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Create new blank shape button */}
            <button
              onClick={handleCreateNewShape}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 hover:text-emerald-300 transition cursor-pointer shrink-0"
              title="Create New Custom Shape"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-md border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab('partials')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'partials' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Partials ({shape.partials.length})
            </button>
            <button
              onClick={() => setActiveTab('filter')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                activeTab === 'filter' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>Band Filter</span>
            </button>
          </div>
        </div>

        {/* Origin Status Indicator */}
        <div className="flex items-center justify-between text-[10px]">
          {isPreset ? (
            <div className="flex items-center gap-1 text-amber-400 font-medium">
              <Lock className="w-3 h-3" />
              <span>Built-in Preset (Read-only) — edits fork into your User Library</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-cyan-400 font-medium">
              <User className="w-3 h-3" />
              <span>User Library Shape (Customised)</span>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: PARTIALS INSPECTOR & HARMONIC MACROS */}
      {activeTab === 'partials' && (
        <div className="space-y-3">
          {/* Harmonic Inharmonicity & Damping Macros */}
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Harmonic Inharmonicity & Damping Macros</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[10px]">
              <div className="space-y-1">
                <div className="text-slate-400 font-medium">
                  Piano Inharmonicity (<span className="font-mono">B</span>):
                </div>
                <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto">
                  <button
                    onClick={() => handleApplyInharmonicity(0)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer whitespace-nowrap transition"
                    title="Pure Harmonic (B = 0)"
                  >
                    Pure (0)
                  </button>
                  <button
                    onClick={() => handleApplyInharmonicity(0.0004)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 cursor-pointer whitespace-nowrap transition"
                    title="Acoustic Piano (B = 0.0004)"
                  >
                    Piano B
                  </button>
                  <button
                    onClick={() => handleApplyInharmonicity(0.0015)}
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
                    onClick={() => handleApplyDamping(0.1)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer whitespace-nowrap transition"
                    title="Bright (Slow Rolloff)"
                  >
                    Bright
                  </button>
                  <button
                    onClick={() => handleApplyDamping(0.35)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer whitespace-nowrap transition"
                    title="Natural Pluck"
                  >
                    Pluck
                  </button>
                  <button
                    onClick={() => handleApplyDamping(0.7)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer whitespace-nowrap transition"
                    title="Warm (Steep Rolloff)"
                  >
                    Warm
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Partials Table */}
          <div className="space-y-1.5 max-h-64 sm:max-h-72 overflow-y-auto overflow-x-hidden pr-1">
            {shape.partials.map((p, idx) => {
              const ratioVal = ratioToValue(p.ratio);
              const isMuted = p.amp <= 0.0001;

              return (
                <div
                  key={p.id || idx}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition ${
                    isMuted
                      ? 'bg-slate-950/40 border-slate-900 opacity-50'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Harmonic Index */}
                  <span className="w-5 text-[10px] font-mono text-slate-500 font-bold shrink-0">
                    #{idx + 1}
                  </span>

                  {/* Ratio Display */}
                  <div className="w-14 min-w-0 shrink-0">
                    <span className="text-[10px] font-mono font-semibold text-ppt-do block truncate">
                      {p.ratio.kind === 'rational' ? `${p.ratio.num}/${p.ratio.den}` : ratioVal.toFixed(2)}x
                    </span>
                    <span className="text-[8px] text-slate-500 font-mono block">ratio</span>
                  </div>

                  {/* Amplitude Slider */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>Amp</span>
                      <span className="font-semibold text-white">{(p.amp * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={p.amp}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        handleUpdatePartial(idx, { amp: val, previousAmp: val > 0 ? val : p.previousAmp });
                      }}
                      className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-red-500 block"
                    />
                  </div>

                  {/* Phase Offset Slider */}
                  <div className="w-16 sm:w-20 min-w-0 space-y-0.5 shrink-0">
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>Phase</span>
                      <span className="font-semibold text-purple-300">{(p.phase * 360).toFixed(0)}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={p.phase}
                      onChange={(e) => handleUpdatePartial(idx, { phase: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500 block"
                    />
                  </div>

                  {/* Mute Button with Amplitude Retention */}
                  <button
                    onClick={() => handleToggleMute(idx)}
                    className={`p-1.5 rounded border transition cursor-pointer shrink-0 ${
                      isMuted
                        ? 'border-slate-800 bg-slate-950 text-slate-600'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                    title={isMuted ? 'Unmute Partial (Restores Amplitude)' : 'Mute Partial'}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>

                  {/* Remove Partial Button */}
                  <button
                    onClick={() => handleRemovePartial(idx)}
                    disabled={shape.partials.length <= 1}
                    className="p-1 rounded text-slate-500 hover:text-red-400 transition cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
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
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border border-dashed border-slate-700 hover:border-red-500/60 bg-slate-900/40 hover:bg-slate-800/60 text-slate-300 hover:text-white transition cursor-pointer font-medium text-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-ppt-do" />
            <span>Add Harmonic Partial</span>
          </button>
        </div>
      )}

      {/* TAB 2: SPECTRAL BAND FILTER CONTROLS */}
      {activeTab === 'filter' && filter && onUpdateFilter && (
        <div className="space-y-3.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800 overflow-x-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-ppt-do" />
              <span className="font-semibold text-white">Spectral Band Filter</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={filter.enabled}
                onChange={(e) => onUpdateFilter({ ...filter, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          <div className="text-[10px] text-slate-400 leading-relaxed">
            Raised-cosine window filter applied across the continuous DuPeriod continuum to sculpt harmonic amplitudes and model physical resonant cavities.
          </div>

          {/* Filter Mode */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-300 font-medium">Filter Mode:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['band-pass', 'low-pass', 'high-pass'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onUpdateFilter({ ...filter, mode })}
                  className={`py-1.5 rounded text-center text-xs font-semibold capitalize transition border cursor-pointer whitespace-nowrap ${
                    filter.mode === mode
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {mode.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Centre d */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Filter Centre (d):</span>
              <span className="font-mono text-cyan-300">{filter.centreD.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={-7}
              max={7}
              step={0.05}
              value={filter.centreD}
              onChange={(e) => onUpdateFilter({ ...filter, centreD: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Filter Width d */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Filter Width (DuPeriods / Octaves):</span>
              <span className="font-mono text-cyan-300">{filter.widthD.toFixed(2)} oct</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={8}
              step={0.1}
              value={filter.widthD}
              onChange={(e) => onUpdateFilter({ ...filter, widthD: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Filter Edge Softness */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Edge Softness (Raised-Cosine):</span>
              <span className="font-mono text-cyan-300">{filter.softnessD.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={3}
              step={0.05}
              value={filter.softnessD}
              onChange={(e) => onUpdateFilter({ ...filter, softnessD: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
