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
 * 
 * Note: Selection logic is handled in useCanvasDrag.handleNodeMouseDown before calling this function.
 * This function assumes the nodeId is already in currentSelection (or will be added for backward compatibility).
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
  // 确保被拖拽节点在选择中（向后兼容，上层已处理选择逻辑）
  const selectedIds = new Set(currentSelection);
  if (!selectedIds.has(nodeId)) {
    selectedIds.add(nodeId);
  }
  // 拖拽集合 = 当前选区（所有选中的节点一起拖动）
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

