/**
 * Partials tab component.
 * Displays overtone macros, list of voice anchor cards, and add-anchor action buttons.
 */

import React from 'react';
import { Plus } from 'lucide-react';
import { VoiceAnchor, PartialComponent } from '../../core/types';
import { OvertoneMacros } from './OvertoneMacros';
import { VoiceAnchorCard } from './VoiceAnchorCard';

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
  return (
    <div className="space-y-3">
      {/* Harmonic Inharmonicity & Damping Macros */}
      <OvertoneMacros
        onApplyInharmonicity={onApplyInharmonicity}
        onApplyDamping={onApplyDamping}
      />

      {/* Hierarchical Voice Anchors List */}
      <div className="space-y-2.5 max-h-72 sm:max-h-80 overflow-y-auto overflow-x-hidden pr-1">
        {anchors.map((anchor, aIdx) => (
          <VoiceAnchorCard
            key={anchor.id || aIdx}
            anchor={anchor}
            anchorIdx={aIdx}
            totalAnchors={anchors.length}
            onUpdateAnchor={onUpdateAnchor}
            onToggleAnchorMute={onToggleAnchorMute}
            onRemoveAnchor={onRemoveAnchor}
            onSetAnchorOvertonePreset={onSetAnchorOvertonePreset}
            onUpdatePartial={onUpdatePartial}
            onTogglePartialMute={onTogglePartialMute}
            onAddPartial={onAddPartial}
            onRemovePartial={onRemovePartial}
          />
        ))}
      </div>

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
