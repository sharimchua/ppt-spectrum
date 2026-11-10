import React from 'react';
import {
  LayoutNode,
  LayoutCellNode,
  LayoutFlexDirection,
  SpectrumLensType,
} from '../core/layout-models';
import { Scene, BandFilter } from '../core/types';
import { RenderCoordinator } from '../renderers/render-coordinator';
import { CellViewport } from './CellViewport';

interface FlexLayoutRendererProps {
  node: LayoutNode;
  scene: Scene;
  coordinator: RenderCoordinator;
  onUpdatePlacementD?: (d: number) => void;
  onUpdateFilterCentreD?: (centreD: number) => void;
  onUpdateFilterParams?: (params: Partial<Pick<BandFilter, 'centreD' | 'widthD' | 'softnessD'>>) => void;
  onUpdateCell?: (updated: LayoutCellNode) => void;
  // Layout Edit Mode Props
  isEditMode?: boolean;
  canDelete?: boolean;
  onSplitCell?: (targetCellId: string, direction: LayoutFlexDirection, newModule: SpectrumLensType) => void;
  onRemoveCell?: (targetCellId: string) => void;
  onDuplicateCell?: (targetCellId: string) => void;
}

export const FlexLayoutRenderer: React.FC<FlexLayoutRendererProps> = ({
  node,
  scene,
  coordinator,
  onUpdatePlacementD,
  onUpdateFilterCentreD,
  onUpdateFilterParams,
  onUpdateCell,
  isEditMode = false,
  canDelete = false,
  onSplitCell,
  onRemoveCell,
  onDuplicateCell,
}) => {
  if (node.type === 'cell') {
    return (
      <div
        className="relative w-full h-full min-w-0 min-h-0"
        style={{
          flex: node.flex ?? 1,
        }}
      >
        <CellViewport
          cell={node}
          scene={scene}
          coordinator={coordinator}
          onUpdatePlacementD={onUpdatePlacementD}
          onUpdateFilterCentreD={onUpdateFilterCentreD}
          onUpdateFilterParams={onUpdateFilterParams}
          onUpdateCell={onUpdateCell}
          isEditMode={isEditMode}
          canDelete={canDelete}
          onSplitCell={onSplitCell}
          onRemoveCell={onRemoveCell}
          onDuplicateCell={onDuplicateCell}
        />
      </div>
    );
  }

  // Container node
  const isRow = node.direction === 'row';
  return (
    <div
      className={`relative w-full h-full flex min-w-0 min-h-0 ${
        isRow ? 'flex-col sm:flex-row' : 'flex-col'
      }`}
      style={{
        flex: node.flex ?? 1,
        gap: `${node.gap ?? 8}px`,
      }}
    >
      {node.children.map((child) => (
        <FlexLayoutRenderer
          key={child.id}
          node={child}
          scene={scene}
          coordinator={coordinator}
          onUpdatePlacementD={onUpdatePlacementD}
          onUpdateFilterCentreD={onUpdateFilterCentreD}
          onUpdateFilterParams={onUpdateFilterParams}
          onUpdateCell={onUpdateCell}
          isEditMode={isEditMode}
          canDelete={canDelete}
          onSplitCell={onSplitCell}
          onRemoveCell={onRemoveCell}
          onDuplicateCell={onDuplicateCell}
        />
      ))}
    </div>
  );
};
