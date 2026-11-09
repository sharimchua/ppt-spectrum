export type LayoutFlexDirection = 'row' | 'column';

export type SpectrumLensType =
  | 'ruler'
  | 'ring-clock'
  | 'cycle-wheel'
  | 'waveform-phasor'
  | 'prime-profile';

export interface LayoutCellNode {
  id: string;
  type: 'cell';
  module: SpectrumLensType;
  flex?: number;
  minSize?: number;
  title?: string;
  configOverrides?: Record<string, unknown>;
}

export interface LayoutContainerNode {
  id: string;
  type: 'container';
  direction: LayoutFlexDirection;
  flex?: number;
  gap?: number;
  children: LayoutNode[];
}

export type LayoutNode = LayoutCellNode | LayoutContainerNode;

export interface LayoutDefinition {
  id: string;
  name: string;
  description: string;
  root: LayoutNode;
}

export const PRESET_SOLO: LayoutDefinition = {
  id: 'solo',
  name: 'Solo Viewport',
  description: 'Single focused lens filling the entire viewport',
  root: {
    id: 'root-solo',
    type: 'container',
    direction: 'column',
    children: [
      {
        id: 'cell-main',
        type: 'cell',
        module: 'ruler',
        flex: 1,
        title: 'Spectrum Ruler',
      },
    ],
  },
};

export const PRESET_DUO_HORIZONTAL: LayoutDefinition = {
  id: 'duo-horizontal',
  name: 'Stacked Duo',
  description: 'Spectrum Ruler on top with Ring Clock below',
  root: {
    id: 'root-duo-h',
    type: 'container',
    direction: 'column',
    gap: 8,
    children: [
      {
        id: 'cell-top',
        type: 'cell',
        module: 'ruler',
        flex: 1.5,
        title: 'Spectrum Ruler',
      },
      {
        id: 'cell-bottom',
        type: 'cell',
        module: 'ring-clock',
        flex: 1.5,
        title: 'Concentric Ring Clock',
      },
    ],
  },
};

export const PRESET_DUO_VERTICAL: LayoutDefinition = {
  id: 'duo-vertical',
  name: 'Side-by-Side Duo',
  description: 'Spectrum Ruler on left with Cycle Wheel on right',
  root: {
    id: 'root-duo-v',
    type: 'container',
    direction: 'row',
    gap: 8,
    children: [
      {
        id: 'cell-left',
        type: 'cell',
        module: 'ruler',
        flex: 1.2,
        title: 'Spectrum Ruler',
      },
      {
        id: 'cell-right',
        type: 'cell',
        module: 'cycle-wheel',
        flex: 1,
        title: 'Cycle Wheel',
      },
    ],
  },
};

export const PRESET_TRIO: LayoutDefinition = {
  id: 'trio',
  name: 'Teaching Trio',
  description: 'Spectrum Ruler on top with Cycle Wheel and Waveform Phasors below',
  root: {
    id: 'root-trio',
    type: 'container',
    direction: 'column',
    gap: 8,
    children: [
      {
        id: 'cell-trio-top',
        type: 'cell',
        module: 'ruler',
        flex: 2,
        title: 'Spectrum Ruler',
      },
      {
        id: 'container-trio-bottom',
        type: 'container',
        direction: 'row',
        flex: 1.5,
        gap: 8,
        children: [
          {
            id: 'cell-trio-left',
            type: 'cell',
            module: 'cycle-wheel',
            flex: 1,
            title: 'Cycle Wheel',
          },
          {
            id: 'cell-trio-right',
            type: 'cell',
            module: 'waveform-phasor',
            flex: 1.2,
            title: 'Waveform / Phasor',
          },
        ],
      },
    ],
  },
};

export const PRESET_LAYOUTS: Record<string, LayoutDefinition> = {
  solo: PRESET_SOLO,
  'duo-horizontal': PRESET_DUO_HORIZONTAL,
  'duo-vertical': PRESET_DUO_VERTICAL,
  trio: PRESET_TRIO,
};

export function getAllCellNodes(node: LayoutNode): LayoutCellNode[] {
  if (node.type === 'cell') return [node];
  const cells: LayoutCellNode[] = [];
  for (const child of node.children) {
    cells.push(...getAllCellNodes(child));
  }
  return cells;
}
