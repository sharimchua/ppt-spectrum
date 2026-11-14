/**
 * Shape Library Header component.
 * Mobile-first container composing ShapePicker, ShapeActionsMenu, and responsive tabs.
 * Australian English spelling maintained.
 */

import React from 'react';
import { Lock, User } from 'lucide-react';
import { Shape } from '../../core/types';
import { isShapeRhythmEligible } from '../../core/coupling';
import { ShapePicker } from './ShapePicker';
import { ShapeActionsMenu } from './ShapeActionsMenu';

export interface ShapeLibraryHeaderProps {
  shape: Shape;
  allShapes: Shape[];
  isPreset: boolean;
  onSelectShape?: (shapeId: string) => void;
  onUpdateShapeName: (name: string) => void;
  onUpdateShapeDefaults?: (patch: Partial<Pick<Shape, 'defaultCarrier' | 'defaultContainer'>>) => void;
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
  onUpdateShapeDefaults,
  onForkShape,
  onDuplicateShape,
  onDeleteShape,
  onCreateNewShape,
}) => {
  const effectiveCarrier = shape.defaultCarrier ?? (shape.category === 'timbre' ? 'kit' : 'self');
  const effectiveContainer =
    shape.defaultContainer ?? (isShapeRhythmEligible(shape) ? 'self' : 'static');

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

      {/* ROW 3: Shape Default Cross-Limen Coupling (Carrier & Container) */}
      {onUpdateShapeDefaults && (
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 text-[10px] font-mono">
          <label className="flex items-center justify-between gap-1.5 bg-slate-950/70 border border-slate-800/90 rounded px-2 py-1">
            <span className="text-slate-400 truncate" title="Default Pitch Carrier when placed in Rhythm Space (d > 0)">
              Rhythm Carrier:
            </span>
            <select
              value={effectiveCarrier}
              onChange={(e) =>
                onUpdateShapeDefaults({
                  defaultCarrier: e.target.value as Shape['defaultCarrier'],
                })
              }
              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-amber-300 font-semibold focus:outline-none cursor-pointer max-w-[115px]"
              aria-label="Default Rhythm Carrier"
            >
              <option value="self">Self (Fractal)</option>
              <option value="kit">Drum Kit</option>
              {allShapes
                .filter((s) => s.id !== shape.id)
                .map((s) => (
                  <option key={s.id} value={`shape:${s.id}`}>
                    Shape: {s.name.split('(')[0].trim()}
                  </option>
                ))}
            </select>
          </label>

          <label className="flex items-center justify-between gap-1.5 bg-slate-950/70 border border-slate-800/90 rounded px-2 py-1">
            <span className="text-slate-400 truncate" title="Default Rhythm Container when placed in Pitch Space (d ≤ 0)">
              Pitch Container:
            </span>
            <select
              value={effectiveContainer}
              onChange={(e) =>
                onUpdateShapeDefaults({
                  defaultContainer: e.target.value as Shape['defaultContainer'],
                })
              }
              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-cyan-300 font-semibold focus:outline-none cursor-pointer max-w-[115px]"
              aria-label="Default Pitch Container"
            >
              <option value="self">Self (Fractal)</option>
              <option value="static">Static (Unified)</option>
              {allShapes
                .filter((s) => s.id !== shape.id)
                .map((s) => (
                  <option key={s.id} value={`shape:${s.id}`}>
                    Shape: {s.name.split('(')[0].trim()}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
};
