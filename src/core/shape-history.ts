/**
 * Pure session shape history navigation stack.
 * Manages undo/redo-style history traversal for preset and user shape selections.
 */

export interface ShapeHistory {
  stack: string[];
  index: number;
}

/**
 * Initialises a shape history stack with a root shape identifier.
 */
export function createHistory(initialId: string = 'hemiola-3-2'): ShapeHistory {
  return { stack: [initialId], index: 0 };
}

/**
 * Pushes a new shape identifier onto the history stack, truncating any forward redo history.
 */
export function pushHistory(history: ShapeHistory, shapeId: string): ShapeHistory {
  if (history.stack[history.index] === shapeId) return history;
  const truncated = history.stack.slice(0, history.index + 1);
  const nextStack = [...truncated, shapeId];
  return { stack: nextStack, index: nextStack.length - 1 };
}

/**
 * Steps backward (-1) or forward (+1) in the shape history.
 * Returns the updated history and the target shapeId, if within bounds.
 */
export function stepHistory(
  history: ShapeHistory,
  direction: -1 | 1
): { history: ShapeHistory; shapeId?: string } {
  if (direction === -1) {
    if (history.index <= 0) return { history };
    const nextIndex = history.index - 1;
    return {
      history: { ...history, index: nextIndex },
      shapeId: history.stack[nextIndex],
    };
  } else {
    if (history.index >= history.stack.length - 1) return { history };
    const nextIndex = history.index + 1;
    return {
      history: { ...history, index: nextIndex },
      shapeId: history.stack[nextIndex],
    };
  }
}

/**
 * Removes a deleted shape identifier from the history stack, adjusting index to keep it in bounds.
 */
export function removeFromHistory(
  history: ShapeHistory,
  shapeId: string,
  fallback: string = 'hemiola-3-2'
): ShapeHistory {
  const nextStack = history.stack.filter((id) => id !== shapeId);
  if (nextStack.length === 0) {
    return { stack: [fallback], index: 0 };
  }
  return {
    stack: nextStack,
    index: Math.min(history.index, nextStack.length - 1),
  };
}
