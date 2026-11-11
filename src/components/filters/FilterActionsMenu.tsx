/**
 * Filter Actions Menu component.
 * Mobile-first action toolbar supporting fork, rename, duplicate, delete, and new filter creation.
 * Australian English spelling maintained.
 */

import React, { useState } from 'react';
import { Copy, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { Filter } from '../../core/types';

export interface FilterActionsMenuProps {
  filter: Filter;
  isPreset: boolean;
  onUpdateFilterName: (name: string) => void;
  onForkFilter: () => void;
  onDuplicateFilter: () => void;
  onDeleteFilter?: (filterId: string) => void;
  onCreateNewFilter: () => void;
}

export const FilterActionsMenu: React.FC<FilterActionsMenuProps> = ({
  filter,
  isPreset,
  onUpdateFilterName,
  onForkFilter,
  onDuplicateFilter,
  onDeleteFilter,
  onCreateNewFilter,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(filter.name);

  const handleSaveName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== filter.name) {
      onUpdateFilterName(trimmed);
    }
    setIsEditingName(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
      {isPreset ? (
        <button
          type="button"
          onClick={onForkFilter}
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
            placeholder="Filter name"
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
              setNameValue(filter.name);
              setIsEditingName(true);
            }}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white cursor-pointer transition"
            title="Rename filter"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDuplicateFilter}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white cursor-pointer transition"
            title="Duplicate filter"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {onDeleteFilter && filter.id && (
            <button
              type="button"
              onClick={() => onDeleteFilter(filter.id!)}
              className="p-1.5 rounded bg-slate-800 hover:bg-red-950/80 border border-slate-700 hover:border-red-500 text-slate-300 hover:text-red-300 cursor-pointer transition"
              title="Delete user filter"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* New Filter Button */}
      <button
        type="button"
        onClick={onCreateNewFilter}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-sky-950/80 hover:bg-sky-900/90 text-sky-200 border border-sky-500/40 hover:border-sky-400 text-xs font-semibold cursor-pointer whitespace-nowrap transition shadow-sm active:scale-95"
        title="Create new custom filter"
      >
        <Plus className="w-3.5 h-3.5 text-sky-400" />
        <span className="hidden sm:inline">New Filter</span>
      </button>
    </div>
  );
};
