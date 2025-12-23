/**
 * features/canvas/core/SelectionManager.ts
 * ----------------
 * Selection management logic (click, box selection, multi-select).
 * 
 * Figma-like behavior:
 * - Click node: select only that node (clear others)
 * - Shift+click: toggle node selection (add if not selected, remove if selected)
 * - Box selection: nodes partially overlapping are selected
 * - Box selection start: clear previous selection
 */

export type SelectionState = {
  selectedIds: Set<string>;
};

/**
 * Handle node click selection
 */
export function handleNodeClick(
  nodeId: string,
  currentSelection: Set<string>,
  shiftKey: boolean
): Set<string> {
  if (shiftKey) {
    // Shift+click: toggle selection
    // 如果节点已选中，从选择中移除；如果未选中，添加到选择中
    // 其他已选中的节点保持不变
    const next = new Set(currentSelection);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    return next;
  } else {
    // Normal click:
    // - If already selected (in any selection size), deselect all (toggle off)
    // - Otherwise select only this node
    if (currentSelection.has(nodeId)) {
      return new Set();
    }
    return new Set([nodeId]);
  }
}

/**
 * Handle box selection
 * Returns set of node IDs that are partially overlapping with selection box
 */
export function handleBoxSelection(
  nodeIds: string[],
  nodeBounds: Map<string, { left: number; top: number; right: number; bottom: number }>,
  selectionBox: { left: number; top: number; right: number; bottom: number }
): Set<string> {
  const selected = new Set<string>();
  
  for (const nodeId of nodeIds) {
    const bounds = nodeBounds.get(nodeId);
    if (!bounds) continue;
    
    // Check partial overlap (Figma behavior)
    if (
      bounds.right >= selectionBox.left &&
      bounds.left <= selectionBox.right &&
      bounds.bottom >= selectionBox.top &&
      bounds.top <= selectionBox.bottom
    ) {
      selected.add(nodeId);
    }
  }
  
  return selected;
}

/**
 * Handle pane click (clear selection)
 */
export function handlePaneClick(): Set<string> {
  return new Set<string>();
}

