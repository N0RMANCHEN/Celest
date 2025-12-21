/**
 * features/canvas/core/BoxSelection.ts
 * ----------------
 * Box selection logic with Figma behavior:
 * - Nodes partially overlapping with selection box are selected
 * - Selection box disappears on mouseup
 */

export type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type Point = {
  x: number;
  y: number;
};

/**
 * Check if a node partially overlaps with selection box (Figma behavior)
 * Returns true if any part of the node is inside the selection box
 */
export function isNodeInSelectionBox(
  nodeBounds: Bounds,
  selectionBox: Bounds
): boolean {
  // Partial overlap detection (Figma behavior)
  // Node is selected if any part overlaps with selection box
  return !(
    nodeBounds.right < selectionBox.left ||
    nodeBounds.left > selectionBox.right ||
    nodeBounds.bottom < selectionBox.top ||
    nodeBounds.top > selectionBox.bottom
  );
}

/**
 * Get node bounds from position and size
 */
export function getNodeBounds(
  position: { x: number; y: number },
  size: { width: number; height: number }
): Bounds {
  return {
    left: position.x,
    top: position.y,
    right: position.x + size.width,
    bottom: position.y + size.height,
  };
}

/**
 * Normalize selection box (ensure left < right, top < bottom)
 */
export function normalizeSelectionBox(
  start: Point,
  end: Point
): Bounds {
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    right: Math.max(start.x, end.x),
    bottom: Math.max(start.y, end.y),
  };
}

