import React from 'react';
import { LayoutNode, SpectrumLensType } from '../core/layout-models';
import { Scene } from '../core/types';
import { RenderCoordinator } from '../renderers/render-coordinator';
import { CellViewport } from './CellViewport';

interface FlexLayoutRendererProps {
  node: LayoutNode;
  scene: Scene;
  coordinator: RenderCoordinator;
  onUpdateCellModule?: (cellId: string, module: SpectrumLensType) => void;
}

export const FlexLayoutRenderer: React.FC<FlexLayoutRendererProps> = ({
  node,
  scene,
  coordinator,
  onUpdateCellModule,
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
          onUpdateCellModule={onUpdateCellModule}
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
          onUpdateCellModule={onUpdateCellModule}
        />
      ))}
    </div>
  );
};
