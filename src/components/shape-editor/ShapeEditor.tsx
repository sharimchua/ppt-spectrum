/**
 * Shape Editor main container.
 * Coordinates shape library header and hierarchical voice anchor / partial inspectors.
 */

import React from 'react';
import { Shape } from '../../core/types';
import { useShapeEditing } from './useShapeEditing';
import { ShapeLibraryHeader } from './ShapeLibraryHeader';
import { PartialsTab } from './PartialsTab';

export interface ShapeEditorProps {
  shape: Shape;
  onUpdateShape: (updatedShape: Shape) => void;
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
  allShapes = [],
  onSelectShape,
  onDuplicateShape,
  onDeleteShape,
  onCreateShape,
}) => {
  const {
    isPreset,
    anchors,
    handleUpdateAnchor,
    handleToggleAnchorMute,
    handleAddAnchor,
    handleRemoveAnchor,
    handleUpdateAnchorPartial,
    handleToggleAnchorPartialMute,
    handleAddAnchorPartial,
    handleRemoveAnchorPartial,
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
        onSelectShape={onSelectShape}
        onUpdateShapeName={(name) => onUpdateShape({ ...shape, name })}
        onForkShape={handleDuplicateCurrentShape}
        onDuplicateShape={handleDuplicateCurrentShape}
        onDeleteShape={onDeleteShape}
        onCreateNewShape={handleCreateNewShape}
      />

      <PartialsTab
        anchors={anchors}
        onAddAnchor={handleAddAnchor}
        onUpdateAnchor={handleUpdateAnchor}
        onToggleAnchorMute={handleToggleAnchorMute}
        onRemoveAnchor={handleRemoveAnchor}
        onUpdatePartial={handleUpdateAnchorPartial}
        onTogglePartialMute={handleToggleAnchorPartialMute}
        onAddPartial={handleAddAnchorPartial}
        onRemovePartial={handleRemoveAnchorPartial}
      />
    </div>
  );
};

export default ShapeEditor;
