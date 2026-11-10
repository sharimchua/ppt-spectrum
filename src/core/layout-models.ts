export type LayoutFlexDirection = 'row' | 'column';

export type SpectrumLensType =
  | 'ruler'
  | 'ring-clock'
  | 'cycle-wheel'
  | 'waveform-phasor'
  | 'phasor'
  | 'prime-profile'
  | 'event-lanes'
  | 'alignment-meter';

export type LensLabelMode = 'duperiod' | 'pitch' | 'bpm' | 'solfege';

export type RingClockDensityMode = 'auto-compact' | 'standard' | 'full';

export interface LayoutCellNode {
  id: string;
  type: 'cell';
  module: SpectrumLensType;
  labelMode?: LensLabelMode;
  ringClockMode?: RingClockDensityMode;
  minRings?: number;
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
  root: LayoutContainerNode;
}

/**
 * Creates a unique identifier for a new layout cell.
 */
export function createUniqueCellId(module: SpectrumLensType = 'ruler'): string {
  const rand = Math.random().toString(36).substring(2, 7);
  return `cell-${module}-${Date.now().toString(36)}-${rand}`;
}

/**
 * Creates a unique identifier for a new layout container node.
 */
export function createUniqueContainerId(): string {
  const rand = Math.random().toString(36).substring(2, 7);
  return `container-${Date.now().toString(36)}-${rand}`;
}

/**
 * Built-in Layout Presets
 */
export const PRESET_SOLO: LayoutDefinition = {
  id: 'solo',
  name: 'Solo Ruler',
  description: 'Single focused continuum ruler filling the entire viewport',
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
  description: 'Spectrum Ruler on top with Concentric Ring Clock below',
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
        ringClockMode: 'auto-compact',
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
        flex: 1.8,
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
            title: 'Waveform Phasor',
          },
        ],
      },
    ],
  },
};

export const PRESET_PHASOR_STUDIO: LayoutDefinition = {
  id: 'phasor-studio',
  name: 'Phasor Studio',
  description: 'Waveform and rotating phasors with Cycle Wheel and Prime Profile',
  root: {
    id: 'root-phasor-studio',
    type: 'container',
    direction: 'column',
    gap: 8,
    children: [
      {
        id: 'cell-studio-waveform',
        type: 'cell',
        module: 'waveform-phasor',
        flex: 2,
        title: 'Waveform Phasor Studio',
      },
      {
        id: 'container-studio-bottom',
        type: 'container',
        direction: 'row',
        flex: 1.2,
        gap: 8,
        children: [
          {
            id: 'cell-studio-cycle',
            type: 'cell',
            module: 'cycle-wheel',
            flex: 1,
            title: 'Cycle Wheel',
          },
          {
            id: 'cell-studio-profile',
            type: 'cell',
            module: 'prime-profile',
            flex: 1,
            title: 'Prime Profile',
          },
        ],
      },
    ],
  },
};

export const PRESET_QUAD: LayoutDefinition = {
  id: 'quad',
  name: 'All Lenses Quad',
  description: 'Balanced 2x2 grid featuring Ruler, Ring Clock, Cycle Wheel, and Waveform',
  root: {
    id: 'root-quad',
    type: 'container',
    direction: 'column',
    gap: 8,
    children: [
      {
        id: 'container-quad-top',
        type: 'container',
        direction: 'row',
        flex: 1,
        gap: 8,
        children: [
          {
            id: 'cell-quad-ruler',
            type: 'cell',
            module: 'ruler',
            flex: 1,
            title: 'Spectrum Ruler',
          },
          {
            id: 'cell-quad-ring',
            type: 'cell',
            module: 'ring-clock',
            ringClockMode: 'auto-compact',
            flex: 1,
            title: 'Concentric Ring Clock',
          },
        ],
      },
      {
        id: 'container-quad-bottom',
        type: 'container',
        direction: 'row',
        flex: 1,
        gap: 8,
        children: [
          {
            id: 'cell-quad-cycle',
            type: 'cell',
            module: 'cycle-wheel',
            flex: 1,
            title: 'Cycle Wheel',
          },
          {
            id: 'cell-quad-wave',
            type: 'cell',
            module: 'waveform-phasor',
            flex: 1,
            title: 'Waveform Phasor',
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
  'phasor-studio': PRESET_PHASOR_STUDIO,
  quad: PRESET_QUAD,
};

/**
 * Returns all cell nodes in the layout tree flatly.
 */
export function getAllCellNodes(node: LayoutNode): LayoutCellNode[] {
  if (node.type === 'cell') return [node];
  const cells: LayoutCellNode[] = [];
  for (const child of node.children) {
    cells.push(...getAllCellNodes(child));
  }
  return cells;
}

/**
 * Finds a cell node by ID anywhere in the layout tree.
 */
export function findCellNodeById(root: LayoutNode, id: string): LayoutCellNode | null {
  if (root.type === 'cell') {
    return root.id === id ? root : null;
  }
  for (const child of root.children) {
    const found = findCellNodeById(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * Updates a cell node in place in the layout tree.
 */
export function updateCellInTree(
  root: LayoutContainerNode,
  updatedCell: LayoutCellNode
): LayoutContainerNode {
  function update(container: LayoutContainerNode): LayoutContainerNode {
    return {
      ...container,
      children: container.children.map((child) => {
        if (child.type === 'cell') {
          return child.id === updatedCell.id ? updatedCell : child;
        }
        return update(child);
      }),
    };
  }
  return update(root);
}

/**
 * Splits an existing cell either horizontally ('column' direction) or vertically ('row' direction),
 * replacing the target cell with a container that holds the original cell and a newly spawned cell.
 */
export function splitCellInTree(
  root: LayoutContainerNode,
  targetCellId: string,
  direction: LayoutFlexDirection,
  newModule: SpectrumLensType = 'cycle-wheel'
): LayoutContainerNode {
  function splitNode(container: LayoutContainerNode): LayoutContainerNode {
    const childIndex = container.children.findIndex(
      (c) => c.type === 'cell' && c.id === targetCellId
    );

    if (childIndex !== -1) {
      const targetCell = container.children[childIndex] as LayoutCellNode;
      const newCell: LayoutCellNode = {
        id: createUniqueCellId(newModule),
        type: 'cell',
        module: newModule,
        flex: 1,
        title: getLensDisplayName(newModule),
      };

      if (container.direction === direction) {
        // Insert directly into current container with clean unit weights
        const newChildren = [...container.children];
        newChildren[childIndex] = { ...targetCell, flex: 1 };
        newChildren.splice(childIndex + 1, 0, { ...newCell, flex: 1 });
        return {
          ...container,
          children: newChildren,
        };
      } else {
        // Wrap target cell and new cell into a subcontainer
        const subContainer: LayoutContainerNode = {
          id: createUniqueContainerId(),
          type: 'container',
          direction,
          flex: targetCell.flex || 1,
          gap: container.gap ?? 8,
          children: [
            { ...targetCell, flex: 1 },
            newCell,
          ],
        };

        const newChildren = [...container.children];
        newChildren[childIndex] = subContainer;
        return {
          ...container,
          children: newChildren,
        };
      }
    }

    return {
      ...container,
      children: container.children.map((child) =>
        child.type === 'container' ? splitNode(child) : child
      ),
    };
  }

  return splitNode(root);
}

/**
 * Removes a cell from the layout tree.
 * Automatically prunes empty or single-child container nodes to keep the tree normalised.
 * Enforces a minimum of 1 cell in the layout.
 */
export function removeCellFromTree(
  root: LayoutContainerNode,
  targetCellId: string
): LayoutContainerNode {
  const allCells = getAllCellNodes(root);
  if (allCells.length <= 1) {
    return root; // Enforce minimum of 1 cell
  }

  function prune(container: LayoutContainerNode): LayoutContainerNode {
    const updatedChildren: LayoutNode[] = [];

    for (const child of container.children) {
      if (child.type === 'cell') {
        if (child.id !== targetCellId) {
          updatedChildren.push(child);
        }
      } else {
        const prunedSub = prune(child);
        if (prunedSub.children.length > 0) {
          if (prunedSub.children.length === 1) {
            updatedChildren.push(prunedSub.children[0]);
          } else {
            updatedChildren.push(prunedSub);
          }
        }
      }
    }

    return {
      ...container,
      children: updatedChildren,
    };
  }

  const prunedRoot = prune(root);
  if (prunedRoot.children.length === 0) {
    return root;
  }
  return prunedRoot;
}

/**
 * Duplicates an existing cell with its configuration overrides and inserts it alongside.
 */
export function duplicateCellInTree(
  root: LayoutContainerNode,
  targetCellId: string
): LayoutContainerNode {
  const target = findCellNodeById(root, targetCellId);
  if (!target) return root;

  const cloneId = createUniqueCellId(target.module);
  const clone: LayoutCellNode = {
    ...target,
    id: cloneId,
    title: target.title ? `${target.title} (Copy)` : undefined,
    configOverrides: target.configOverrides ? { ...target.configOverrides } : undefined,
  };

  function insertClone(container: LayoutContainerNode): LayoutContainerNode {
    const idx = container.children.findIndex(
      (c) => c.type === 'cell' && c.id === targetCellId
    );
    if (idx !== -1) {
      const newChildren = [...container.children];
      newChildren.splice(idx + 1, 0, clone);
      return {
        ...container,
        children: newChildren,
      };
    }
    return {
      ...container,
      children: container.children.map((c) =>
        c.type === 'container' ? insertClone(c) : c
      ),
    };
  }

  return insertClone(root);
}

/**
 * Moves a cell forward or backward in its parent container's child order.
 */
export function moveCellInTree(
  root: LayoutContainerNode,
  cellId: string,
  delta: -1 | 1
): LayoutContainerNode {
  function reorder(container: LayoutContainerNode): LayoutContainerNode {
    const idx = container.children.findIndex((c) => c.id === cellId);
    if (idx !== -1) {
      const newIdx = idx + delta;
      if (newIdx >= 0 && newIdx < container.children.length) {
        const newChildren = [...container.children];
        const temp = newChildren[idx];
        newChildren[idx] = newChildren[newIdx];
        newChildren[newIdx] = temp;
        return {
          ...container,
          children: newChildren,
        };
      }
      return container;
    }
    return {
      ...container,
      children: container.children.map((c) =>
        c.type === 'container' ? reorder(c) : c
      ),
    };
  }

  return reorder(root);
}

/**
 * Nudges a cell's flex weighting up or down relative to its siblings in the same container.
 * Clamps flex between 0.25 and 4.0 in steps of delta (typically 0.25).
 */
export function nudgeCellFlex(
  root: LayoutContainerNode,
  targetCellId: string,
  delta: number
): LayoutContainerNode {
  function update(container: LayoutContainerNode): LayoutContainerNode {
    const idx = container.children.findIndex(
      (c) => c.type === 'cell' && c.id === targetCellId
    );
    if (idx !== -1) {
      const targetCell = container.children[idx] as LayoutCellNode;
      const currentFlex = targetCell.flex ?? 1;
      const newFlex = Math.max(0.25, Math.min(4.0, Math.round((currentFlex + delta) * 100) / 100));
      const newChildren = [...container.children];
      newChildren[idx] = { ...targetCell, flex: newFlex };
      return { ...container, children: newChildren };
    }
    return {
      ...container,
      children: container.children.map((c) =>
        c.type === 'container' ? update(c) : c
      ),
    };
  }
  return update(root);
}

/**
 * Resets all sibling cells in the target cell's immediate parent container to equal 1.0 flex weighting.
 */
export function equaliseCellFlex(
  root: LayoutContainerNode,
  targetCellId: string
): LayoutContainerNode {
  function update(container: LayoutContainerNode): LayoutContainerNode {
    const hasTarget = container.children.some(
      (c) => c.type === 'cell' && c.id === targetCellId
    );
    if (hasTarget) {
      const newChildren = container.children.map((c) =>
        c.type === 'cell' ? { ...c, flex: 1 } : c
      );
      return { ...container, children: newChildren };
    }
    return {
      ...container,
      children: container.children.map((c) =>
        c.type === 'container' ? update(c) : c
      ),
    };
  }
  return update(root);
}

/**
 * Appends a new cell to the layout tree root.
 */
export function addCellToTree(
  root: LayoutContainerNode,
  direction: LayoutFlexDirection = 'row',
  module: SpectrumLensType = 'cycle-wheel'
): LayoutContainerNode {
  const newCell: LayoutCellNode = {
    id: createUniqueCellId(module),
    type: 'cell',
    module,
    flex: 1,
    title: getLensDisplayName(module),
  };

  if (root.direction === direction) {
    return {
      ...root,
      children: [...root.children, newCell],
    };
  }

  if (root.children.length <= 1) {
    return {
      ...root,
      direction,
      children: [...root.children, newCell],
    };
  }

  // Wrap existing root into a container
  return {
    id: createUniqueContainerId(),
    type: 'container',
    direction,
    flex: 1,
    gap: root.gap ?? 8,
    children: [
      root,
      newCell,
    ],
  };
}

/**
 * Helper to get clean human-readable name for a lens.
 */
export function getLensDisplayName(module: SpectrumLensType): string {
  switch (module) {
    case 'ruler':
      return 'Spectrum Ruler';
    case 'ring-clock':
      return 'Concentric Ring Clock';
    case 'cycle-wheel':
      return 'Cycle Wheel';
    case 'waveform-phasor':
      return 'Composite Waveform';
    case 'phasor':
      return 'Rotating Phasors';
    case 'prime-profile':
      return 'Prime Profile';
    case 'event-lanes':
      return 'Event Lanes';
    case 'alignment-meter':
      return 'Alignment Meter';
    default:
      return 'Lens';
  }
}

/**
 * Encodes a layout definition into a compact, URL-safe base64 slug for deep linking.
 */
export function encodeLayoutToSlug(layout: LayoutDefinition): string {
  try {
    const payload = {
      id: layout.id,
      name: layout.name,
      description: layout.description,
      root: layout.root,
    };

    const json = JSON.stringify(payload);
    const base64 = typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, 'utf-8').toString('base64');

    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (err) {
    console.warn('[Layout] Failed to encode layout slug:', err);
    return '';
  }
}

/**
 * Decodes a URL-safe base64 slug into a LayoutDefinition.
 * Returns null if the slug is invalid or malformed.
 */
export function decodeLayoutFromSlug(
  slug: string
): { layout: LayoutDefinition } | null {
  if (!slug || typeof slug !== 'string') return null;

  try {
    let base64 = slug.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    const json = typeof atob === 'function'
      ? decodeURIComponent(escape(atob(base64)))
      : Buffer.from(base64, 'base64').toString('utf-8');

    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || !parsed.root) {
      return null;
    }

    const layout: LayoutDefinition = {
      id: typeof parsed.id === 'string' ? parsed.id : 'custom-link',
      name: typeof parsed.name === 'string' ? parsed.name : 'Imported Layout',
      description: typeof parsed.description === 'string' ? parsed.description : 'Deep-linked custom layout',
      root: parsed.root,
    };

    return { layout };
  } catch (err) {
    console.warn('[Layout] Failed to decode layout slug:', err);
    return null;
  }
}

/**
 * Clones a layout definition and marks it as a custom user layout with an updated root container.
 */
export function markLayoutCustom(
  prev: LayoutDefinition,
  root: LayoutContainerNode
): LayoutDefinition {
  return {
    ...prev,
    id: 'custom',
    name: 'Custom Layout',
    root,
  };
}

