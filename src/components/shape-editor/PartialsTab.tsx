/**
 * Partials tab component.
 * Displays overtone macros, list of voice anchor cards, and add-anchor action buttons.
 */

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { VoiceAnchor, PartialComponent } from '../../core/types';
import { OvertoneMacros } from './OvertoneMacros';
import { VoiceAnchorCard } from './VoiceAnchorCard';
import { ShapeRulerPreview } from './ShapeRulerPreview';

export interface PartialsTabProps {
  anchors: VoiceAnchor[];
  onApplyInharmonicity: (bCoeff: number) => void;
  onApplyDamping: (dampingSlope: number) => void;
  onAddAnchor: (presetKind?: 'interval' | 'rhythm') => void;
  onUpdateAnchor: (anchorIdx: number, patch: Partial<VoiceAnchor>) => void;
  onToggleAnchorMute: (anchorIdx: number) => void;
  onRemoveAnchor: (anchorIdx: number) => void;
  onSetAnchorOvertonePreset: (anchorIdx: number, mode: 'pure' | 'to-p5' | 'saw4') => void;
  onUpdatePartial: (anchorIdx: number, partialIdx: number, patch: Partial<PartialComponent>) => void;
  onTogglePartialMute: (anchorIdx: number, partialIdx: number) => void;
  onAddPartial: (anchorIdx: number) => void;
  onRemovePartial: (anchorIdx: number, partialIdx: number) => void;
}

export const PartialsTab: React.FC<PartialsTabProps> = ({
  anchors,
  onApplyInharmonicity,
  onApplyDamping,
  onAddAnchor,
  onUpdateAnchor,
  onToggleAnchorMute,
  onRemoveAnchor,
  onSetAnchorOvertonePreset,
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
    <div className="space-y-3">
      {/* Harmonic Inharmonicity & Damping Macros */}
      <OvertoneMacros
        onApplyInharmonicity={onApplyInharmonicity}
        onApplyDamping={onApplyDamping}
      />

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

      {/* Anchor Selector Tabs */}
      {anchors.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {anchors.map((a, idx) => (
            <button
              key={a.id || idx}
              type="button"
              onClick={() => {
                setSelectedAnchorIdx(idx);
                setSelectedPartialIdx(0);
              }}
              className={`px-2.5 py-1 rounded text-[10px] font-mono border shrink-0 cursor-pointer transition ${
                idx === safeAnchorIdx
                  ? 'bg-red-950/70 border-red-500/60 text-red-200 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {idx === 0 ? 'ROOT' : `#${idx + 1}`} {a.name}
            </button>
          ))}
        </div>
      )}

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
          onSetAnchorOvertonePreset={onSetAnchorOvertonePreset}
          onUpdatePartial={onUpdatePartial}
          onTogglePartialMute={onTogglePartialMute}
          onAddPartial={onAddPartial}
          onRemovePartial={onRemovePartial}
        />
      )}

      {/* Add Voice Anchor Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800">
        <button
          type="button"
          onClick={() => onAddAnchor('interval')}
          className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/50 text-purple-200 text-xs font-semibold transition cursor-pointer shadow-sm"
          title="Add a musical interval harmonic anchor (Do, Re, Mi, So, etc.) with its own overtone stack"
        >
          <Plus className="w-3.5 h-3.5 text-purple-400" />
          <span>Add Harmonic Voice Anchor</span>
        </button>
        <button
          type="button"
          onClick={() => onAddAnchor('rhythm')}
          className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/50 text-amber-200 text-xs font-semibold transition cursor-pointer shadow-sm"
          title="Add a metric offbeat anchor (Fi Antipode 1/2, MeFi 5/8, etc.) with percussion timbre"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span>Add Metric Rhythm Anchor</span>
        </button>
      </div>
    </div>
  );
};
