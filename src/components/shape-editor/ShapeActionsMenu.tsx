/**
 * Shape Actions Menu component.
 * Mobile-first action toolbar supporting fork, rename, duplicate, delete, and new shape creation.
 * Australian English spelling maintained.
 */

import React, { useState } from 'react';
import { Copy, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { Shape } from '../../core/types';

export interface ShapeActionsMenuProps {
  shape: Shape;
  isPreset: boolean;
  onUpdateShapeName: (name: string) => void;
  onForkShape: () => void;
  onDuplicateShape: () => void;
  onDeleteShape?: (shapeId: string) => void;
  onCreateNewShape: () => void;
}

export const ShapeActionsMenu: React.FC<ShapeActionsMenuProps> = ({
  shape,
  isPreset,
  onUpdateShapeName,
  onForkShape,
  onDuplicateShape,
  onDeleteShape,
  onCreateNewShape,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(shape.name);

  const handleSaveName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== shape.name) {
      onUpdateShapeName(trimmed);
    }
    setIsEditingName(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
      {isPreset ? (
        <button
          type="button"
          onClick={onForkShape}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer whitespace-nowrap transition shadow-sm active:scale-95"
          title="Fork to User Library to customise"
        >
          <Copy className="w-3.5 h-3.5 text-cyan-400" />
          <span>Fork</span>
        </button>
      ) : isEditingName ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveName();
              if (e.key === 'Escape') setIsEditingName(false);
            }}
            autoFocus
            className="bg-slate-900 border border-cyan-500 rounded px-2 py-1 text-xs font-semibold text-white focus:outline-none w-28 truncate"
            placeholder="Shape name"
          />
          <button
            type="button"
            onClick={handleSaveName}
            className="p-1.5 rounded bg-cyan-900 hover:bg-cyan-800 text-cyan-200 border border-cyan-600 cursor-pointer"
            title="Save name"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setNameValue(shape.name);
              setIsEditingName(true);
            }}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white cursor-pointer transition"
            title="Rename shape"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDuplicateShape}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 cursor-pointer transition"
            title="Duplicate this custom shape"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {onDeleteShape && (
            <button
              type="button"
              onClick={() => onDeleteShape(shape.id)}
              className="p-1.5 rounded bg-slate-800 hover:bg-red-950/60 border border-slate-700 text-slate-400 hover:text-red-400 transition cursor-pointer"
              title="Delete custom shape"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Create new shape */}
      <button
        type="button"
        onClick={onCreateNewShape}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-600/50 text-emerald-300 transition cursor-pointer font-semibold text-xs whitespace-nowrap shadow-sm active:scale-95"
        title="Create New Custom Shape (1 Voice Anchor + 1 Fundamental Partial)"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>New</span>
      </button>
    </div>
  );
};
