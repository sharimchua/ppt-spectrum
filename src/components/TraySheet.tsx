import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Shape } from '../core/types';
import { ShapeEditor } from './shape-editor/ShapeEditor';
import { FloatingStudioWindow } from './FloatingStudioWindow';

interface TraySheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeShape: Shape | undefined;
  onUpdateShape: (shape: Shape) => void;
  allShapes?: Shape[];
  onSelectShape?: (shapeId: string) => void;
  onDuplicateShape?: (shape: Shape) => void;
  onDeleteShape?: (shapeId: string) => void;
  onCreateShape?: (newShape: Shape) => void;
  onTriggerNote?: () => void;
  onNoteOn?: () => void;
  onNoteOff?: () => void;
}

export const TraySheet: React.FC<TraySheetProps> = ({
  isOpen,
  onClose,
  activeShape,
  onUpdateShape,
  allShapes = [],
  onSelectShape,
  onDuplicateShape,
  onDeleteShape,
  onCreateShape,
  onTriggerNote,
  onNoteOn,
  onNoteOff,
}) => {
  if (!activeShape) return null;

  return (
    <FloatingStudioWindow
      isOpen={isOpen}
      onClose={onClose}
      icon={<SlidersHorizontal className="w-4 h-4 text-ppt-do shrink-0" />}
      title={
        <span>
          Shape Synthesiser: <span className="text-ppt-do">{activeShape.name}</span>
        </span>
      }
      defaultPosition={{ x: 24, y: 70 }}
      desktopWidthClass="w-[490px] lg:w-[500px]"
      ariaLabel="Shape Synthesiser"
    >
      <ShapeEditor
        shape={activeShape}
        onUpdateShape={onUpdateShape}
        allShapes={allShapes}
        onSelectShape={onSelectShape}
        onDuplicateShape={onDuplicateShape}
        onDeleteShape={onDeleteShape}
        onCreateShape={onCreateShape}
        onTriggerNote={onTriggerNote}
        onNoteOn={onNoteOn}
        onNoteOff={onNoteOff}
      />
    </FloatingStudioWindow>
  );
};
