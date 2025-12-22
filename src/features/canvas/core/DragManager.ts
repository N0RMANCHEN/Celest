/**
 * features/canvas/core/DragManager.ts
 * ----------------
 * Drag management logic for nodes.
 * 
 * Figma-like behavior:
 * - Dragging preserves selection state
 * - Multiple selected nodes move together
 * - Drag start: if dragged node not selected, clear selection and select only that node
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
  let selectedIds: Set<string>;
  let draggedNodeIds: Set<string>;

  if (currentSelection.has(nodeId)) {
    // 拖拽已选中节点 → 保持所有选中，拖拽所有已选节点
    selectedIds = new Set(currentSelection);
    draggedNodeIds = new Set(selectedIds);
  } else {
    // 拖拽未选中节点 → 清空所有选中，重新选中该节点并拖拽
    selectedIds = new Set([nodeId]);
    draggedNodeIds = new Set([nodeId]);
  }

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

