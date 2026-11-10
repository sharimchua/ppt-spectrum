/**
 * Shape Library Header component.
 * Mobile-first container composing ShapePicker, ShapeActionsMenu, and responsive tabs.
 * Australian English spelling maintained.
 */

import React from 'react';
import { Lock, User, Layers, Activity } from 'lucide-react';
import { Shape } from '../../core/types';
import { ShapePicker } from './ShapePicker';
import { ShapeActionsMenu } from './ShapeActionsMenu';

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
  return (
    <div className="flex flex-col gap-2.5 pb-2.5 border-b border-slate-800">
      {/* ROW 1: Shape Picker with category filters */}
      <ShapePicker
        currentShape={shape}
        allShapes={allShapes}
        onSelectShape={onSelectShape}
      />

      {/* ROW 2: Origin Status & Action Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isPreset ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60 shrink-0">
              <Lock className="w-3 h-3" />
              <span>Preset</span>
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

        <ShapeActionsMenu
          shape={shape}
          isPreset={isPreset}
          onUpdateShapeName={onUpdateShapeName}
          onForkShape={onForkShape}
          onDuplicateShape={onDuplicateShape}
          onDeleteShape={onDeleteShape}
          onCreateNewShape={onCreateNewShape}
        />
      </div>

      {/* ROW 3: Responsive Navigation Tabs */}
      <div className="grid grid-cols-2 gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
        <button
          type="button"
          onClick={() => onSelectTab('partials')}
          className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 truncate ${
            activeTab === 'partials'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
          title="Hierarchical Voice Anchors & Nested Harmonic Partials"
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Anchors ({anchorsCount}) & Partials ({partialsCount})</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('envelope')}
          className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 truncate ${
            activeTab === 'envelope'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
          title="Acoustic ADSR Envelope & Harmonic Damping"
        >
          <Activity className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Envelope (ADSR)</span>
        </button>
      </div>
    </div>
  );
};
