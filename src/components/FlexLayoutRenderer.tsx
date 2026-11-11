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
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onOpenRadialMenuAt?: (pos: { x: number; y: number }) => void;
  // Layout Edit Mode Props
  isEditMode?: boolean;
  isFilterEditMode?: boolean;
  filterControlParam?: 'centre' | 'width' | 'skirt';
  canDelete?: boolean;
  onSplitCell?: (targetCellId: string, direction: LayoutFlexDirection, newModule: SpectrumLensType) => void;
  onRemoveCell?: (targetCellId: string) => void;
  onDuplicateCell?: (targetCellId: string) => void;
  onNudgeCellFlex?: (targetCellId: string, delta: number) => void;
  onEqualiseCellFlex?: (targetCellId: string) => void;
  // Spatial context from parent container
  parentDirection?: LayoutFlexDirection;
  siblingCount?: number;
  localSharePercent?: number;
}

export const FlexLayoutRenderer: React.FC<FlexLayoutRendererProps> = ({
  node,
  scene,
  coordinator,
  onUpdatePlacementD,
  onUpdateFilterCentreD,
  onUpdateFilterParams,
  onUpdateCell,
  isPlaying,
  onTogglePlay,
  onOpenRadialMenuAt,
  isEditMode = false,
  isFilterEditMode = false,
  filterControlParam = 'centre',
  canDelete = false,
  onSplitCell,
  onRemoveCell,
  onDuplicateCell,
  onNudgeCellFlex,
  onEqualiseCellFlex,
  parentDirection,
  siblingCount,
  localSharePercent,
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
          isPlaying={isPlaying}
          onTogglePlay={onTogglePlay}
          onOpenRadialMenuAt={onOpenRadialMenuAt}
          isEditMode={isEditMode}
          isFilterEditMode={isFilterEditMode}
          filterControlParam={filterControlParam}
          canDelete={canDelete}
          onSplitCell={onSplitCell}
          onRemoveCell={onRemoveCell}
          onDuplicateCell={onDuplicateCell}
          parentDirection={parentDirection}
          siblingCount={siblingCount}
          localSharePercent={localSharePercent}
          onNudgeCellFlex={onNudgeCellFlex}
          onEqualiseCellFlex={onEqualiseCellFlex}
        />
      </div>
    );
  }

  // Container node
  const isRow = node.direction === 'row';
  const totalFlex = node.children.reduce((acc, c) => acc + (c.flex ?? 1), 0);

  return (
    <div
      className={`relative w-full h-full flex min-w-0 min-h-0 ${
        isRow ? (node.children.length <= 2 ? 'flex-row' : 'flex-col sm:flex-row') : 'flex-col'
      } ${
        isEditMode
          ? 'p-1 rounded-2xl border border-dashed border-purple-500/25 bg-purple-950/10'
          : ''
      }`}
      style={{
        flex: node.flex ?? 1,
        gap: `${node.gap ?? 8}px`,
      }}
    >
      {node.children.map((child) => {
        const childFlex = child.flex ?? 1;
        const childSharePercent = Math.round((childFlex / (totalFlex || 1)) * 100);
        return (
          <FlexLayoutRenderer
            key={child.id}
            node={child}
            scene={scene}
            coordinator={coordinator}
            onUpdatePlacementD={onUpdatePlacementD}
            onUpdateFilterCentreD={onUpdateFilterCentreD}
            onUpdateFilterParams={onUpdateFilterParams}
            onUpdateCell={onUpdateCell}
            isPlaying={isPlaying}
            onTogglePlay={onTogglePlay}
            onOpenRadialMenuAt={onOpenRadialMenuAt}
            isEditMode={isEditMode}
            isFilterEditMode={isFilterEditMode}
            filterControlParam={filterControlParam}
            canDelete={canDelete}
            onSplitCell={onSplitCell}
            onRemoveCell={onRemoveCell}
            onDuplicateCell={onDuplicateCell}
            onNudgeCellFlex={onNudgeCellFlex}
            onEqualiseCellFlex={onEqualiseCellFlex}
            parentDirection={node.direction}
            siblingCount={node.children.length}
            localSharePercent={childSharePercent}
          />
        );
      })}
    </div>
  );
};
