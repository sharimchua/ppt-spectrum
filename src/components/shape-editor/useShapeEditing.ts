/**
 * Shape editing state and operations hook.
 * Binds pure shape-editing mutations (anchors, partials, overtone series, ADSR) to the active shape.
 */

import { useCallback, useMemo } from 'react';
import {
  Shape,
  VoiceAnchor,
  PartialComponent,
  ADSREnvelope,
} from '../../core/types';
import { getShapeAnchors, flattenAnchorsToPartials } from '../../core/shape';
import {
  DEFAULT_ADSR,
  forkShapeForEdit,
  withAnchors,
  toggleAnchorMute,
  createAnchor,
  removeAnchor,
  updateAnchorPartial,
  toggleAnchorPartialMute,
  addAnchorPartial,
  removeAnchorPartial,
  overtonePresetPartials,
  applyInharmonicity,
  applyDamping,
  createBlankShape,
} from '../../core/shape-editing';

export interface UseShapeEditingOptions {
  shape: Shape;
  onUpdateShape: (updatedShape: Shape) => void;
  onDuplicateShape?: (shape: Shape) => void;
  onCreateShape?: (newShape: Shape) => void;
}

export interface UseShapeEditingResult {
  isPreset: boolean;
  anchors: VoiceAnchor[];
  adsr: ADSREnvelope;
  handleUpdateAnchor: (anchorIdx: number, patch: Partial<VoiceAnchor>) => void;
  handleToggleAnchorMute: (anchorIdx: number) => void;
  handleAddAnchor: (presetKind?: 'interval' | 'rhythm') => void;
  handleRemoveAnchor: (anchorIdx: number) => void;
  handleUpdateAnchorPartial: (anchorIdx: number, partialIdx: number, patch: Partial<PartialComponent>) => void;
  handleToggleAnchorPartialMute: (anchorIdx: number, partialIdx: number) => void;
  handleAddAnchorPartial: (anchorIdx: number) => void;
  handleRemoveAnchorPartial: (anchorIdx: number, partialIdx: number) => void;
  handleSetAnchorOvertonePreset: (anchorIdx: number, mode: 'pure' | 'to-p5' | 'saw4') => void;
  handleApplyInharmonicity: (bCoeff: number) => void;
  handleApplyDamping: (dampingSlope: number) => void;
  handleUpdateAdsr: (patch: Partial<ADSREnvelope>) => void;
  handleDuplicateCurrentShape: () => void;
  handleCreateNewShape: () => void;
}

export function useShapeEditing({
  shape,
  onUpdateShape,
  onDuplicateShape,
  onCreateShape,
}: UseShapeEditingOptions): UseShapeEditingResult {
  const isPreset = shape.origin === 'preset';
  const anchors = useMemo(() => getShapeAnchors(shape), [shape]);
  const adsr = useMemo(() => shape.adsr || DEFAULT_ADSR, [shape.adsr]);

  const commitAnchors = useCallback(
    (nextAnchors: VoiceAnchor[]) => {
      const target = forkShapeForEdit(shape);
      onUpdateShape(withAnchors(target, nextAnchors));
    },
    [shape, onUpdateShape]
  );

  const handleUpdateAdsr = useCallback(
    (patch: Partial<ADSREnvelope>) => {
      const target = forkShapeForEdit(shape);
      const currentAdsr: ADSREnvelope = target.adsr || DEFAULT_ADSR;
      onUpdateShape({ ...target, adsr: { ...currentAdsr, ...patch } });
    },
    [shape, onUpdateShape]
  );

  const handleUpdateAnchor = useCallback(
    (anchorIdx: number, patch: Partial<VoiceAnchor>) => {
      const next = anchors.map((a, idx) => (idx === anchorIdx ? { ...a, ...patch } : a));
      commitAnchors(next);
    },
    [anchors, commitAnchors]
  );

  const handleToggleAnchorMute = useCallback(
    (anchorIdx: number) => {
      const next = toggleAnchorMute(anchors, anchorIdx);
      commitAnchors(next);
    },
    [anchors, commitAnchors]
  );

  const handleAddAnchor = useCallback(
    (presetKind: 'interval' | 'rhythm' = 'interval') => {
      const idx = anchors.length + 1;
      const newAnchor = createAnchor(presetKind, idx);
      commitAnchors([...anchors, newAnchor]);
    },
    [anchors, commitAnchors]
  );

  const handleRemoveAnchor = useCallback(
    (anchorIdx: number) => {
      if (anchors.length <= 1) return;
      commitAnchors(removeAnchor(anchors, anchorIdx));
    },
    [anchors, commitAnchors]
  );

  const handleUpdateAnchorPartial = useCallback(
    (anchorIdx: number, partialIdx: number, patch: Partial<PartialComponent>) => {
      commitAnchors(updateAnchorPartial(anchors, anchorIdx, partialIdx, patch));
    },
    [anchors, commitAnchors]
  );

  const handleToggleAnchorPartialMute = useCallback(
    (anchorIdx: number, partialIdx: number) => {
      commitAnchors(toggleAnchorPartialMute(anchors, anchorIdx, partialIdx));
    },
    [anchors, commitAnchors]
  );

  const handleAddAnchorPartial = useCallback(
    (anchorIdx: number) => {
      commitAnchors(addAnchorPartial(anchors, anchorIdx));
    },
    [anchors, commitAnchors]
  );

  const handleRemoveAnchorPartial = useCallback(
    (anchorIdx: number, partialIdx: number) => {
      commitAnchors(removeAnchorPartial(anchors, anchorIdx, partialIdx));
    },
    [anchors, commitAnchors]
  );

  const handleSetAnchorOvertonePreset = useCallback(
    (anchorIdx: number, mode: 'pure' | 'to-p5' | 'saw4') => {
      const anchor = anchors[anchorIdx];
      if (!anchor) return;
      const baseVoice = anchor.voice || 'woodblock';
      const newPartials = overtonePresetPartials(mode, baseVoice);
      handleUpdateAnchor(anchorIdx, { partials: newPartials });
    },
    [anchors, handleUpdateAnchor]
  );

  const handleApplyInharmonicity = useCallback(
    (bCoeff: number) => {
      commitAnchors(applyInharmonicity(anchors, bCoeff));
    },
    [anchors, commitAnchors]
  );

  const handleApplyDamping = useCallback(
    (dampingSlope: number) => {
      commitAnchors(applyDamping(anchors, dampingSlope));
    },
    [anchors, commitAnchors]
  );

  const handleDuplicateCurrentShape = useCallback(() => {
    if (onDuplicateShape) {
      onDuplicateShape(shape);
    } else {
      const copiedAnchors = anchors.map((a) => ({
        ...a,
        id: `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        partials: a.partials.map((p) => ({
          ...p,
          id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        })),
      }));
      const copy: Shape = {
        ...shape,
        id: `user-shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        name: isPreset ? `${shape.name} (Custom)` : `${shape.name} (Copy)`,
        origin: 'user',
        anchors: copiedAnchors,
        partials: flattenAnchorsToPartials(copiedAnchors),
      };
      onUpdateShape(copy);
    }
  }, [shape, isPreset, anchors, onDuplicateShape, onUpdateShape]);

  const handleCreateNewShape = useCallback(() => {
    const newShape = createBlankShape();
    if (onCreateShape) {
      onCreateShape(newShape);
    } else {
      onUpdateShape(newShape);
    }
  }, [onCreateShape, onUpdateShape]);

  return {
    isPreset,
    anchors,
    adsr,
    handleUpdateAnchor,
    handleToggleAnchorMute,
    handleAddAnchor,
    handleRemoveAnchor,
    handleUpdateAnchorPartial,
    handleToggleAnchorPartialMute,
    handleAddAnchorPartial,
    handleRemoveAnchorPartial,
    handleSetAnchorOvertonePreset,
    handleApplyInharmonicity,
    handleApplyDamping,
    handleUpdateAdsr,
    handleDuplicateCurrentShape,
    handleCreateNewShape,
  };
}
