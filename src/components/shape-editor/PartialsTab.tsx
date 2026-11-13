/**
 * Partials tab component.
 * Displays overtone macros, list of voice anchor cards, and add-anchor action buttons.
 */

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { VoiceAnchor, PartialComponent } from '../../core/types';
import { VoiceAnchorCard } from './VoiceAnchorCard';
import { ShapeRulerPreview } from './ShapeRulerPreview';

export interface PartialsTabProps {
  anchors: VoiceAnchor[];
  onAddAnchor: (presetKind?: 'interval' | 'rhythm') => void;
  onUpdateAnchor: (anchorIdx: number, patch: Partial<VoiceAnchor>) => void;
  onToggleAnchorMute: (anchorIdx: number) => void;
  onRemoveAnchor: (anchorIdx: number) => void;
  onUpdatePartial: (anchorIdx: number, partialIdx: number, patch: Partial<PartialComponent>) => void;
  onTogglePartialMute: (anchorIdx: number, partialIdx: number) => void;
  onAddPartial: (anchorIdx: number) => void;
  onRemovePartial: (anchorIdx: number, partialIdx: number) => void;
}

export const PartialsTab: React.FC<PartialsTabProps> = ({
  anchors,
  onAddAnchor,
  onUpdateAnchor,
  onToggleAnchorMute,
  onRemoveAnchor,
  onUpdatePartial,
  onTogglePartialMute,
  onAddPartial,
  onRemovePartial,
}) => {
  const [selectedAnchorIdx, setSelectedAnchorIdx] = useState(0);
  const [selectedPartialIdx, setSelectedPartialIdx] = useState(0);

  const safeAnchorIdx = Math.min(selectedAnchorIdx, Math.max(0, anchors.length - 1));
  const activeAnchor = anchors[safeAnchorIdx];
  const safePartialIdx = activeAnchor
    ? Math.min(selectedPartialIdx, Math.max(0, activeAnchor.partials.length - 1))
    : 0;

  return (
    <div className="space-y-3 min-w-0 w-full">
      {/* Interactive Ruler-Style Shape Preview */}
      <ShapeRulerPreview
        anchors={anchors}
        selectedAnchorIdx={safeAnchorIdx}
        selectedPartialIdx={safePartialIdx}
        onSelect={(aIdx, pIdx) => {
          setSelectedAnchorIdx(aIdx);
          setSelectedPartialIdx(pIdx);
        }}
      />

      {/* Scalable Anchor Selector Tabs + Add Anchor Button */}
      <div className="flex flex-wrap items-center gap-1 pb-0.5 min-w-0">
        {anchors.map((a, idx) => (
          <button
            key={a.id || idx}
            type="button"
            onClick={() => {
              setSelectedAnchorIdx(idx);
              setSelectedPartialIdx(0);
            }}
            title={a.name}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border shrink-0 max-w-[116px] truncate cursor-pointer transition ${
              idx === safeAnchorIdx
                ? 'bg-red-950/70 border-red-500/60 text-red-200 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {idx === 0 ? 'ROOT' : `#${idx + 1}`} {a.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            onAddAnchor('interval');
            setSelectedAnchorIdx(anchors.length);
            setSelectedPartialIdx(0);
          }}
          className="px-2 py-0.5 rounded border border-dashed border-slate-700 text-[10px] font-mono text-slate-400 hover:text-white shrink-0 cursor-pointer flex items-center gap-1"
          title="Add a new Voice Anchor with nested harmonic partials"
        >
          <Plus className="w-3 h-3 text-purple-400" /> Add
        </button>
      </div>

      {/* Focused Voice Anchor & Partial Inspector */}
      {activeAnchor && (
        <VoiceAnchorCard
          key={activeAnchor.id || safeAnchorIdx}
          anchor={activeAnchor}
          anchorIdx={safeAnchorIdx}
          totalAnchors={anchors.length}
          selectedPartialIdx={safePartialIdx}
          onSelectPartial={setSelectedPartialIdx}
          onUpdateAnchor={onUpdateAnchor}
          onToggleAnchorMute={onToggleAnchorMute}
          onRemoveAnchor={(idx) => {
            onRemoveAnchor(idx);
            setSelectedAnchorIdx(Math.max(0, idx - 1));
            setSelectedPartialIdx(0);
          }}
          onUpdatePartial={onUpdatePartial}
          onTogglePartialMute={onTogglePartialMute}
          onAddPartial={onAddPartial}
          onRemovePartial={onRemovePartial}
        />
      )}
    </div>
  );
};
