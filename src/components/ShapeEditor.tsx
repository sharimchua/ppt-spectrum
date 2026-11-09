import React, { useState } from 'react';
import { Shape, PartialComponent, BandFilter, ADSREnvelope } from '../core/types';
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
  RotateCcw,
  Play,
  Activity,
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
  onTriggerNote?: () => void;
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
  onTriggerNote,
}) => {
  const [activeTab, setActiveTab] = useState<'partials' | 'envelope' | 'filter'>('partials');
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
        adsr: shape.adsr ? { ...shape.adsr } : undefined,
      };
    }
    return shape;
  };

  const adsr: ADSREnvelope = shape.adsr || {
    attack: 0.01,
    decay: 1.0,
    sustain: 0.8,
    release: 0.3,
    damping: 0.2,
  };

  const handleUpdateAdsr = (patch: Partial<ADSREnvelope>) => {
    const target = getEditableShape();
    const currentAdsr: ADSREnvelope = target.adsr || {
      attack: 0.01,
      decay: 1.0,
      sustain: 0.8,
      release: 0.3,
      damping: 0.2,
    };
    onUpdateShape({ ...target, adsr: { ...currentAdsr, ...patch } });
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
        name: isPreset ? `${shape.name} (Custom)` : `${shape.name} (Copy)`,
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

  const rhythmShapes = allShapes.filter((s) => s.origin === 'preset' && s.category === 'rhythm');
  const harmonyShapes = allShapes.filter((s) => s.origin === 'preset' && s.category === 'harmony');
  const timbreShapes = allShapes.filter((s) => s.origin === 'preset' && (s.category === 'timbre' || (!s.category && s.origin === 'preset')));
  const userShapes = allShapes.filter((s) => s.origin !== 'preset');

  return (
    <div className="space-y-3.5 text-xs text-slate-200 overflow-x-hidden">
      {/* Top Header & Detailed Shape Selector */}
      <div className="flex flex-col gap-2.5 pb-2.5 border-b border-slate-800">
        {/* ROW 1: Shape Selector & Library Actions */}
        <div className="flex items-center gap-2">
          {/* Shape Selector Dropdown */}
          <div className="relative flex-1 min-w-0">
            {onSelectShape && allShapes.length > 0 ? (
              <>
                <select
                  value={shape.id}
                  onChange={(e) => onSelectShape(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-red-500 cursor-pointer pr-7 appearance-none truncate"
                >
                  {rhythmShapes.length > 0 && (
                    <optgroup label="── 🥁 Rhythmic Patterns ──" className="bg-slate-900 text-amber-400 font-semibold">
                      {rhythmShapes.map((s) => (
                        <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200 font-normal">
                          {s.name} ({s.partials.length} {s.partials.length === 1 ? 'partial' : 'partials'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {harmonyShapes.length > 0 && (
                    <optgroup label="── 🎵 Harmonies & Chords ──" className="bg-slate-900 text-purple-400 font-semibold">
                      {harmonyShapes.map((s) => (
                        <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200 font-normal">
                          {s.name} ({s.partials.length} {s.partials.length === 1 ? 'partial' : 'partials'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {timbreShapes.length > 0 && (
                    <optgroup label="── 🎻 Timbral Profiles ──" className="bg-slate-900 text-emerald-400 font-semibold">
                      {timbreShapes.map((s) => (
                        <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200 font-normal">
                          {s.name} ({s.partials.length} {s.partials.length === 1 ? 'partial' : 'partials'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {userShapes.length > 0 && (
                    <optgroup label="── 👤 User Library ──" className="bg-slate-900 text-cyan-400 font-semibold">
                      {userShapes.map((s) => (
                        <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200 font-normal">
                          {s.name} ({s.partials.length} {s.partials.length === 1 ? 'partial' : 'partials'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
              </>
            ) : (
              <span className="font-bold text-sm text-white truncate block">{shape.name}</span>
            )}
          </div>

          {/* Action Buttons cluster */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isPreset ? (
              <button
                onClick={handleDuplicateCurrentShape}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer whitespace-nowrap transition shadow-sm"
                title="Fork to User Library to customise"
              >
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Fork</span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={shape.name}
                  onChange={(e) => onUpdateShape({ ...shape, name: e.target.value })}
                  className="bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded px-2 py-1 text-xs font-semibold text-white focus:outline-none w-28 truncate"
                  title="Rename custom shape"
                  placeholder="Shape name"
                />
                <button
                  onClick={handleDuplicateCurrentShape}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 cursor-pointer"
                  title="Duplicate this custom shape"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {onDeleteShape && (
                  <button
                    onClick={() => onDeleteShape(shape.id)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-red-950/60 border border-slate-700 text-slate-400 hover:text-red-400 transition cursor-pointer"
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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-600/50 text-emerald-300 transition cursor-pointer font-semibold text-xs whitespace-nowrap shadow-sm"
              title="Create New Custom Shape"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* ROW 2: Status Indicator & Navigation Tabs */}
        <div className="flex items-center justify-between gap-2">
          {/* Origin Status Indicator */}
          <div className="flex items-center gap-1.5 min-w-0">
            {isPreset ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60 shrink-0">
                <Lock className="w-3 h-3" />
                <span>Preset (Read-only)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 shrink-0">
                <User className="w-3 h-3" />
                <span>User Library</span>
              </span>
            )}
            <span className="text-[10px] text-slate-500 font-mono truncate hidden sm:inline">
              {isPreset ? 'Edits automatically create a custom shape' : 'Managed in your personal library'}
            </span>
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
              onClick={() => setActiveTab('envelope')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                activeTab === 'envelope' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Acoustic ADSR Envelope & Harmonic Damping"
            >
              <Activity className="w-3 h-3" />
              <span>Envelope (ADSR)</span>
            </button>
            <button
              onClick={() => setActiveTab('filter')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                activeTab === 'filter' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Acoustic Lens & Formant Aperture View"
            >
              <Filter className="w-3 h-3" />
              <span>Filter View</span>
            </button>
          </div>
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

      {/* TAB 2: ACOUSTIC ADSR ENVELOPE & DYNAMIC HARMONIC DAMPING */}
      {activeTab === 'envelope' && (
        <div className="space-y-3.5 p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 overflow-x-hidden">
          {/* Header row with Title and Strike Note preview button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-semibold text-white block">Acoustic ADSR Envelope</span>
                <span className="text-[9px] text-amber-400 font-mono">Time-varying amplitude in pitch space</span>
              </div>
            </div>
            {onTriggerNote && (
              <button
                type="button"
                onClick={onTriggerNote}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition shadow-md cursor-pointer"
                title="Strike acoustic note with current ADSR envelope (Hot key: T)"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Strike Note (T)</span>
              </button>
            )}
          </div>

          <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800/80">
            Acoustic instruments (piano, plucked strings, bells) evolve dynamically over time. When in pitch space (f &gt; 25.8 Hz), the ADSR envelope shapes the note strike, with <strong className="text-amber-300">harmonic damping</strong> dissipating higher overtones faster than the fundamental.
          </div>

          {/* Interactive SVG Envelope Curve Visualization */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span className="text-amber-400 font-semibold">Envelope Contour:</span>
              <span className="text-slate-400">
                A: {(adsr.attack * 1000).toFixed(0)}ms | D: {adsr.decay.toFixed(2)}s | S: {(adsr.sustain * 100).toFixed(0)}% | R: {adsr.release.toFixed(2)}s
              </span>
            </div>

            {/* SVG Visualizer */}
            <div className="w-full h-24 relative bg-[#06080e] rounded border border-slate-800 flex items-center justify-center overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 360 85" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="adsrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                    <stop offset="70%" stopColor="#d97706" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#b45309" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line x1="20" y1="15" x2="340" y2="15" stroke="#334155" strokeDasharray="2,2" strokeWidth="0.8" opacity="0.4" />
                <line x1="20" y1="68" x2="340" y2="68" stroke="#334155" strokeWidth="1" opacity="0.6" />

                {/* Time markers and segments */}
                {(() => {
                  const baseW = 320;
                  const x0 = 20;
                  const yBase = 68;
                  const yPeak = 15;
                  const hSpan = yBase - yPeak;

                  // Segment widths (normalized)
                  const wA = Math.max(12, Math.min(60, (adsr.attack / 0.3) * 60));
                  const wD = Math.max(25, Math.min(100, (adsr.decay / 3.0) * 100));
                  const wS = 65;
                  const wR = Math.max(20, Math.min(80, (adsr.release / 2.0) * 80));
                  const totalW = wA + wD + wS + wR;
                  const scale = (baseW - 10) / Math.max(1, totalW);

                  const swA = wA * scale;
                  const swD = wD * scale;
                  const swS = wS * scale;
                  const swR = wR * scale;

                  const p0x = x0;
                  const p1x = p0x + swA;
                  const p2x = p1x + swD;
                  const p3x = p2x + swS;
                  const p4x = p3x + swR;

                  const ySus = yBase - adsr.sustain * hSpan;

                  // Main fundamental envelope path
                  const mainPath = `M ${p0x},${yBase} L ${p1x},${yPeak} Q ${p1x + swD * 0.4},${ySus + 5} ${p2x},${ySus} L ${p3x},${ySus} Q ${p3x + swR * 0.5},${yBase - 3} ${p4x},${yBase}`;
                  const mainFill = `${mainPath} L ${p4x},${yBase} L ${p0x},${yBase} Z`;

                  // High harmonic damped curve (harmonic 4)
                  const dampVal = adsr.damping !== undefined ? adsr.damping : 0.0;
                  const swDampD = swD / (1.0 + dampVal * 3.0);
                  const pDamp2x = p1x + swDampD;
                  const yDampSus = yBase - Math.min(adsr.sustain, adsr.sustain / (1.0 + dampVal * 2.0)) * hSpan;
                  const dampPath = `M ${p0x},${yBase} L ${p1x},${yPeak} Q ${p1x + swDampD * 0.4},${yDampSus + 4} ${pDamp2x},${yDampSus} L ${p3x},${yDampSus} L ${p4x},${yBase}`;

                  return (
                    <>
                      {/* Damped High Harmonic Comparison Curve */}
                      {dampVal > 0.08 && (
                        <path
                          d={dampPath}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="1.2"
                          strokeDasharray="3,2"
                          opacity="0.75"
                        />
                      )}

                      {/* Main Fundamental Curve Filled Area */}
                      <path d={mainFill} fill="url(#adsrGrad)" />
                      <path d={mainPath} fill="none" stroke="#f59e0b" strokeWidth="2.0" />

                      {/* Anchor Points */}
                      <circle cx={p1x} cy={yPeak} r="3" fill="#ffffff" stroke="#f59e0b" strokeWidth="1.5" />
                      <circle cx={p2x} cy={ySus} r="2.5" fill="#f59e0b" />
                      <circle cx={p3x} cy={ySus} r="2.5" fill="#f59e0b" />
                      <circle cx={p4x} cy={yBase} r="2.5" fill="#f59e0b" />

                      {/* Phase Labels */}
                      <text x={p0x + swA * 0.5} y="80" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">A</text>
                      <text x={p1x + swD * 0.5} y="80" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">D</text>
                      <text x={p2x + swS * 0.5} y="80" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">S</text>
                      <text x={p3x + swR * 0.5} y="80" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">R</text>
                    </>
                  );
                })()}
              </svg>
            </div>
            {adsr.damping && adsr.damping > 0.08 ? (
              <div className="flex items-center gap-1.5 text-[9px] text-cyan-400 font-mono">
                <span className="w-3 h-0.5 bg-cyan-400 border-b border-dashed border-cyan-400"></span>
                <span>Cyan dashed line: Damped 4th harmonic decay rate</span>
              </div>
            ) : null}
          </div>

          {/* Instrument Acoustic Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-300 font-medium">Instrument Envelopes:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleUpdateAdsr({ attack: 0.006, decay: 1.8, sustain: 0.22, release: 0.5, damping: 0.6 })}
                className="py-1 px-2 rounded text-[10px] font-semibold transition border border-slate-800 bg-slate-950/60 hover:bg-amber-950/50 hover:border-amber-500/60 text-slate-300 hover:text-amber-200 cursor-pointer"
              >
                Piano Hammer
              </button>
              <button
                type="button"
                onClick={() => handleUpdateAdsr({ attack: 0.003, decay: 1.2, sustain: 0.06, release: 0.35, damping: 0.8 })}
                className="py-1 px-2 rounded text-[10px] font-semibold transition border border-slate-800 bg-slate-950/60 hover:bg-amber-950/50 hover:border-amber-500/60 text-slate-300 hover:text-amber-200 cursor-pointer"
              >
                Plucked String
              </button>
              <button
                type="button"
                onClick={() => handleUpdateAdsr({ attack: 0.08, decay: 0.4, sustain: 0.85, release: 0.3, damping: 0.1 })}
                className="py-1 px-2 rounded text-[10px] font-semibold transition border border-slate-800 bg-slate-950/60 hover:bg-amber-950/50 hover:border-amber-500/60 text-slate-300 hover:text-amber-200 cursor-pointer"
              >
                Bowed Strings
              </button>
              <button
                type="button"
                onClick={() => handleUpdateAdsr({ attack: 0.002, decay: 2.8, sustain: 0.12, release: 0.8, damping: 0.4 })}
                className="py-1 px-2 rounded text-[10px] font-semibold transition border border-slate-800 bg-slate-950/60 hover:bg-amber-950/50 hover:border-amber-500/60 text-slate-300 hover:text-amber-200 cursor-pointer"
              >
                Church Bell
              </button>
              <button
                type="button"
                onClick={() => handleUpdateAdsr({ attack: 0.004, decay: 2.2, sustain: 0.18, release: 0.6, damping: 0.35 })}
                className="py-1 px-2 rounded text-[10px] font-semibold transition border border-slate-800 bg-slate-950/60 hover:bg-amber-950/50 hover:border-amber-500/60 text-slate-300 hover:text-amber-200 cursor-pointer"
              >
                Vibraphone
              </button>
              <button
                type="button"
                onClick={() => handleUpdateAdsr({ attack: 0.04, decay: 0.25, sustain: 0.9, release: 0.15, damping: 0.05 })}
                className="py-1 px-2 rounded text-[10px] font-semibold transition border border-slate-800 bg-slate-950/60 hover:bg-amber-950/50 hover:border-amber-500/60 text-slate-300 hover:text-amber-200 cursor-pointer"
              >
                Clarinet / Reed
              </button>
              <button
                type="button"
                onClick={() => handleUpdateAdsr({ attack: 0.25, decay: 0.8, sustain: 0.9, release: 0.6, damping: 0.0 })}
                className="py-1 px-2 rounded text-[10px] font-semibold transition border border-slate-800 bg-slate-950/60 hover:bg-amber-950/50 hover:border-amber-500/60 text-slate-300 hover:text-amber-200 cursor-pointer"
              >
                Ambient Pad
              </button>
              <button
                type="button"
                onClick={() => handleUpdateAdsr({ attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1, damping: 0.0 })}
                className="py-1 px-2 rounded text-[10px] font-semibold transition border border-slate-800 bg-slate-950/60 hover:bg-amber-950/50 hover:border-amber-500/60 text-slate-300 hover:text-amber-200 cursor-pointer"
              >
                Flat Drone (Organ)
              </button>
            </div>
          </div>

          {/* Interactive Sliders */}
          <div className="space-y-3 pt-1 border-t border-slate-800/80">
            {/* Attack */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-300">Attack Time (A):</span>
                <span className="text-amber-400 font-semibold">{(adsr.attack * 1000).toFixed(0)} ms</span>
              </div>
              <input
                type="range"
                min="0.001"
                max="0.5"
                step="0.001"
                value={adsr.attack}
                onChange={(e) => handleUpdateAdsr({ attack: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Decay */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-300">Decay Time (D):</span>
                <span className="text-amber-400 font-semibold">{adsr.decay.toFixed(2)} s</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="4.0"
                step="0.05"
                value={adsr.decay}
                onChange={(e) => handleUpdateAdsr({ decay: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Sustain */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-300">Sustain Level (S):</span>
                <span className="text-amber-400 font-semibold">{(adsr.sustain * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.01"
                value={adsr.sustain}
                onChange={(e) => handleUpdateAdsr({ sustain: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Release */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-300">Release Time (R):</span>
                <span className="text-amber-400 font-semibold">{adsr.release.toFixed(2)} s</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="3.0"
                step="0.02"
                value={adsr.release}
                onChange={(e) => handleUpdateAdsr({ release: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Harmonic Damping */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-300">Harmonic Damping (High-Frequency Dissipation):</span>
                <span className="text-cyan-400 font-semibold">{((adsr.damping || 0) * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.02"
                value={adsr.damping || 0}
                onChange={(e) => handleUpdateAdsr({ damping: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NON-DESTRUCTIVE ACOUSTIC APERTURE FILTER VIEW */}
      {activeTab === 'filter' && filter && onUpdateFilter && (
        <div className="space-y-3.5 p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 overflow-x-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="font-semibold text-white block">Acoustic Formant Lens</span>
                <span className="text-[9px] text-cyan-400 font-mono">Non-destructive view aperture</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={filter.enabled}
                onChange={(e) => onUpdateFilter({ ...filter, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800/80">
            A temporary raised-cosine frequency aperture that sculpts perceived acoustics and resonance cavities in real-time without modifying your shape’s stored harmonic partials. Visible on the <strong className="text-cyan-300">Spectrum Ruler</strong>.
          </div>

          {/* Tracking Behavior: Fixed Formant vs Relative Fundamental */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-300 font-medium">Tracking Behaviour:</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateFilter({ ...filter, trackingMode: 'fixed' })}
                className={`py-1.5 px-2 rounded text-center text-xs font-semibold transition border cursor-pointer ${
                  (filter.trackingMode || 'fixed') === 'fixed'
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Fixed Formant
              </button>
              <button
                type="button"
                onClick={() => onUpdateFilter({ ...filter, trackingMode: 'relative' })}
                className={`py-1.5 px-2 rounded text-center text-xs font-semibold transition border cursor-pointer ${
                  filter.trackingMode === 'relative'
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Relative Tracking
              </button>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight pt-0.5">
              {filter.trackingMode === 'relative'
                ? 'Relative mode locks the aperture to the fundamental, sweeping dynamically with pitch & tempo.'
                : 'Fixed mode anchors the aperture to absolute continuum coordinates (physical vocal/instrument formant).'}
            </p>
          </div>

          {/* Filter Mode */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-300 font-medium">Aperture Mode:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['band-pass', 'low-pass', 'high-pass'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onUpdateFilter({ ...filter, mode })}
                  className={`py-1.5 rounded text-center text-xs font-semibold capitalize transition border cursor-pointer whitespace-nowrap ${
                    filter.mode === mode
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm'
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
              <span className="text-slate-300">
                {filter.trackingMode === 'relative' ? 'Relative Offset (Δd from Fund):' : 'Aperture Centre (d):'}
              </span>
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
              <span className="text-slate-300">Aperture Width (DuPeriods / Octaves):</span>
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
              <span className="text-slate-300">Skirt Softness (Raised-Cosine):</span>
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

          {/* Reset Aperture Button */}
          <div className="pt-1">
            <button
              onClick={() => onUpdateFilter({ ...filter, enabled: false, centreD: 0, widthD: 4, softnessD: 1 })}
              className="w-full py-1.5 rounded border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset & Bypass Filter View</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
