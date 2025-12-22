/**
 * features/canvas/core/DragManager.ts
 * ----------------
 * Drag management logic for nodes.
 * 
 * Figma-like behavior:
 * - Dragging preserves selection state
 * - Multiple selected nodes move together
 * - Drag start: if dragged node not selected, select it
 */

export type DragState = {
  isDragging: boolean;
  draggedNodeIds: Set<string>;
  dragStartPositions: Map<string, { x: number; y: number }>;
};

/**
 * Initialize drag state
 */
export function initDragState(): DragState {
  return {
    isDragging: false,
    draggedNodeIds: new Set(),
    dragStartPositions: new Map(),
  };
}

/**
 * Start drag operation
 */
export function startDrag(
  nodeId: string,
  currentSelection: Set<string>,
  nodePositions: Map<string, { x: number; y: number }>
): {
  selectedIds: Set<string>;
  draggedNodeIds: Set<string>;
  dragStartPositions: Map<string, { x: number; y: number }>;
} {
  // 如果未选中，被拖拽节点应加入选区（Figma 行为）
  const selectedIds = new Set(currentSelection);
  if (!selectedIds.has(nodeId)) {
    selectedIds.add(nodeId);
  }
  // 拖拽集合 = 当前选区
  const draggedNodeIds = new Set(selectedIds);
  const dragStartPositions = new Map<string, { x: number; y: number }>();
  
  for (const id of draggedNodeIds) {
    const pos = nodePositions.get(id);
    if (pos) {
      dragStartPositions.set(id, { ...pos });
    }
  }
  
  return {
    selectedIds,
    draggedNodeIds,
    dragStartPositions,
  };
}

/**
 * Update node positions during drag
 */
export function updateDragPositions(
  draggedNodeIds: Set<string>,
  dragStartPositions: Map<string, { x: number; y: number }>,
  delta: { x: number; y: number }
): Map<string, { x: number; y: number }> {
  const newPositions = new Map<string, { x: number; y: number }>();
  
  for (const nodeId of draggedNodeIds) {
    const startPos = dragStartPositions.get(nodeId);
    if (startPos) {
      newPositions.set(nodeId, {
        x: startPos.x + delta.x,
        y: startPos.y + delta.y,
      });
    }
  }
  
  return newPositions;
}

