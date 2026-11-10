/**
 * Shape Editor main container.
 * Coordinates shape library header, tab switching, and partial/envelope/filter inspectors.
 */

import React, { useState } from 'react';
import { Shape, BandFilter } from '../../core/types';
import { useShapeEditing } from './useShapeEditing';
import { ShapeLibraryHeader } from './ShapeLibraryHeader';
import { PartialsTab } from './PartialsTab';
import { EnvelopeTab } from './EnvelopeTab';
import { FilterTab } from './FilterTab';

export interface ShapeEditorProps {
  shape: Shape;
  onUpdateShape: (updatedShape: Shape) => void;
  filter?: BandFilter;
  onUpdateFilter?: (filter: BandFilter) => void;
  allShapes?: Shape[];
  onSelectShape?: (shapeId: string) => void;
  onDuplicateShape?: (shape: Shape) => void;
  onDeleteShape?: (shapeId: string) => void;
  onCreateShape?: (newShape: Shape) => void;
  onTriggerNote?: () => void;
  onNoteOn?: () => void;
  onNoteOff?: () => void;
}

export const ShapeEditor: React.FC<ShapeEditorProps> = ({
  shape,
  onUpdateShape,
  filter,
  onUpdateFilter,
  allShapes = [],
  onSelectShape,
  onDuplicateShape,
  onDeleteShape,
  onCreateShape,
  onTriggerNote,
  onNoteOn,
  onNoteOff,
}) => {
  const [activeTab, setActiveTab] = useState<'partials' | 'envelope' | 'filter'>('partials');

  const {
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
  } = useShapeEditing({
    shape,
    onUpdateShape,
    onDuplicateShape,
    onCreateShape,
  });

  return (
    <div className="space-y-3.5 text-xs text-slate-200 overflow-x-hidden">
      <ShapeLibraryHeader
        shape={shape}
        allShapes={allShapes}
        isPreset={isPreset}
        anchorsCount={anchors.length}
        partialsCount={shape.partials.length}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onSelectShape={onSelectShape}
        onUpdateShapeName={(name) => onUpdateShape({ ...shape, name })}
        onForkShape={handleDuplicateCurrentShape}
        onDuplicateShape={handleDuplicateCurrentShape}
        onDeleteShape={onDeleteShape}
        onCreateNewShape={handleCreateNewShape}
      />

      {activeTab === 'partials' && (
        <PartialsTab
          anchors={anchors}
          onApplyInharmonicity={handleApplyInharmonicity}
          onApplyDamping={handleApplyDamping}
          onAddAnchor={handleAddAnchor}
          onUpdateAnchor={handleUpdateAnchor}
          onToggleAnchorMute={handleToggleAnchorMute}
          onRemoveAnchor={handleRemoveAnchor}
          onSetAnchorOvertonePreset={handleSetAnchorOvertonePreset}
          onUpdatePartial={handleUpdateAnchorPartial}
          onTogglePartialMute={handleToggleAnchorPartialMute}
          onAddPartial={handleAddAnchorPartial}
          onRemovePartial={handleRemoveAnchorPartial}
        />
      )}

      {activeTab === 'envelope' && (
        <EnvelopeTab
          adsr={adsr}
          onUpdateAdsr={handleUpdateAdsr}
          onTriggerNote={onTriggerNote}
          onNoteOn={onNoteOn}
          onNoteOff={onNoteOff}
        />
      )}

      {activeTab === 'filter' && filter && onUpdateFilter && (
        <FilterTab filter={filter} onUpdateFilter={onUpdateFilter} />
      )}
    </div>
  );
};

export default ShapeEditor;
