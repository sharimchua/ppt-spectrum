/**
 * Shape Library Header component.
 * Mobile-first container composing ShapePicker, ShapeActionsMenu, and responsive tabs.
 * Australian English spelling maintained.
 */

import React from 'react';
import { Lock, User } from 'lucide-react';
import { Shape } from '../../core/types';
import { ShapePicker } from './ShapePicker';
import { ShapeActionsMenu } from './ShapeActionsMenu';

export interface ShapeLibraryHeaderProps {
  shape: Shape;
  allShapes: Shape[];
  isPreset: boolean;
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
    </div>
  );
};
