/**
 * Shape Library Header component.
 * Displays shape selector dropdown grouped by category, fork/duplicate/delete/new actions, origin badge, and tabs.
 */

import React, { useMemo } from 'react';
import {
  ChevronDown,
  Copy,
  Plus,
  Trash2,
  Lock,
  User,
  Layers,
  Activity,
} from 'lucide-react';
import { Shape } from '../../core/types';
import { getShapeAnchors } from '../../core/shape';

export interface ShapeLibraryHeaderProps {
  shape: Shape;
  allShapes: Shape[];
  isPreset: boolean;
  anchorsCount: number;
  partialsCount: number;
  activeTab: 'partials' | 'envelope';
  onSelectTab: (tab: 'partials' | 'envelope') => void;
  onSelectShape?: (shapeId: string) => void;
  onUpdateShapeName: (name: string) => void;
  onForkShape: () => void;
  onDuplicateShape: () => void;
  onDeleteShape?: (shapeId: string) => void;
  onCreateNewShape: () => void;
}

export const ShapeLibraryHeader: React.FC<ShapeLibraryHeaderProps> = ({
  shape,
  allShapes,
  isPreset,
  anchorsCount,
  partialsCount,
  activeTab,
  onSelectTab,
  onSelectShape,
  onUpdateShapeName,
  onForkShape,
  onDuplicateShape,
  onDeleteShape,
  onCreateNewShape,
}) => {
  const rhythmShapes = useMemo(
    () => allShapes.filter((s) => s.origin === 'preset' && s.category === 'rhythm'),
    [allShapes]
  );
  const harmonyShapes = useMemo(
    () => allShapes.filter((s) => s.origin === 'preset' && s.category === 'harmony'),
    [allShapes]
  );
  const timbreShapes = useMemo(
    () =>
      allShapes.filter(
        (s) => s.origin === 'preset' && (s.category === 'timbre' || (!s.category && s.origin === 'preset'))
      ),
    [allShapes]
  );
  const userShapes = useMemo(
    () => allShapes.filter((s) => s.origin !== 'preset'),
    [allShapes]
  );

  return (
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
                        {s.name} ({getShapeAnchors(s).length} {getShapeAnchors(s).length === 1 ? 'anchor' : 'anchors'} / {s.partials.length} {s.partials.length === 1 ? 'partial' : 'partials'})
                      </option>
                    ))}
                  </optgroup>
                )}
                {harmonyShapes.length > 0 && (
                  <optgroup label="── 🎵 Harmonies & Chords ──" className="bg-slate-900 text-purple-400 font-semibold">
                    {harmonyShapes.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200 font-normal">
                        {s.name} ({getShapeAnchors(s).length} {getShapeAnchors(s).length === 1 ? 'anchor' : 'anchors'} / {s.partials.length} {s.partials.length === 1 ? 'partial' : 'partials'})
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
                        {s.name} ({getShapeAnchors(s).length} {getShapeAnchors(s).length === 1 ? 'anchor' : 'anchors'} / {s.partials.length} {s.partials.length === 1 ? 'partial' : 'partials'})
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
              onClick={onForkShape}
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
                onChange={(e) => onUpdateShapeName(e.target.value)}
                className="bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded px-2 py-1 text-xs font-semibold text-white focus:outline-none w-28 truncate"
                title="Rename custom shape"
                placeholder="Shape name"
              />
              <button
                onClick={onDuplicateShape}
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
            onClick={onCreateNewShape}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-600/50 text-emerald-300 transition cursor-pointer font-semibold text-xs whitespace-nowrap shadow-sm"
            title="Create New Custom Shape (1 Voice Anchor + 1 Fundamental Partial)"
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
            onClick={() => onSelectTab('partials')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'partials' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Hierarchical Voice Anchors & Nested Harmonic Partials"
          >
            <Layers className="w-3 h-3" />
            <span>Anchors ({anchorsCount}) & Partials ({partialsCount})</span>
          </button>
          <button
            onClick={() => onSelectTab('envelope')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'envelope' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Acoustic ADSR Envelope & Harmonic Damping"
          >
            <Activity className="w-3 h-3" />
            <span>Envelope (ADSR)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
