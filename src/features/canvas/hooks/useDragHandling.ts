/**
 * features/canvas/hooks/useDragHandling.ts
 * ----------------
 * Handles node dragging logic with store isolation during drag.
 * 
 * CRITICAL: According to React Flow error #015, in controlled mode we must NOT
 * change the node array reference during drag. This hook implements the solution:
 * - During drag: Do NOT update store (positions only exist in ReactFlow internal state)
 * - After drag: Get final positions from ReactFlow and sync to store once
 * 
 * This ensures the selector doesn't recalculate during drag, keeping array references stable.
 */

import { useCallback, useRef, useState } from "react";
import {
  useReactFlow,
  type NodeChange as RFNodeChange,
  type Node,
} from "@xyflow/react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { CanvasNodeChange } from "../canvasEvents";
import type { CanvasNodeData } from "../types";

export function useDragHandling(
  onNodesChange: (changes: CanvasNodeChange[]) => void,
  onSelectionChange: (ids: string[]) => void
) {
  const rf = useReactFlow<Node<CanvasNodeData>>();
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const draggedNodeIdsRef = useRef<Set<string>>(new Set());
  const lastDragStopAtRef = useRef<number>(0);
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Handle node changes during drag
  // CRITICAL: According to React Flow error #015, we must call onNodesChange to update positions,
  // but the selector's caching must keep array references stable even when positions change.
  // The selector checks content equality first, so it can return cached array reference
  // when only positions changed (positions are handled internally by ReactFlow via onNodesChange).
  const handleNodesChangeDuringDrag = useCallback(
    (changes: RFNodeChange[]) => {
      // Track dragged nodes
      const positionUpdates: CanvasNodeChange[] = [];
      
      for (const ch of changes) {
        if (ch.type === "position") {
          draggedNodeIdsRef.current.add(ch.id);
          const pos = (ch as unknown as { position?: { x: number; y: number } }).position;
          if (pos) {
            positionUpdates.push({
              id: ch.id,
              type: "position",
              position: pos,
            });
          }
        } else if (ch.type === "remove") {
          // Remove operations should still go through immediately
          onNodesChange([{ id: ch.id, type: "remove" }]);
        }
      }
      
      // CRITICAL: Update positions during drag so ReactFlow can track them.
      // The selector's content-based caching will keep array references stable
      // by checking content equality first (even if cache key changes due to position).
      if (positionUpdates.length > 0) {
        onNodesChange(positionUpdates);
      }
    },
    [onNodesChange]
  );

  // Handle node drag start
  const handleNodeDragStart = useCallback(
    (_: ReactMouseEvent, node: Node<CanvasNodeData>) => {
      // Select on drag start so the selection tint + Inspector stay in sync during drag
      onSelectionChange([node.id]);

      // Store initial positions for potential cancel (ESC key)
      const currentNodes = rf.getNodes();
      dragStartPositionsRef.current.clear();
      for (const n of currentNodes) {
        if (draggedNodeIdsRef.current.has(n.id) || n.id === node.id) {
          dragStartPositionsRef.current.set(n.id, { ...n.position });
        }
      }

      // Mark as dragging
      setIsDragging(true);
      draggedNodeIdsRef.current.clear();
      draggedNodeIdsRef.current.add(node.id);
    },
    [rf, onSelectionChange]
  );

  // Handle node drag stop
  // CRITICAL: Get final positions from ReactFlow and sync to store ONCE
  const handleNodeDragStop = useCallback(() => {
    lastDragStopAtRef.current = Date.now();

    // Get final positions from ReactFlow's internal state (most accurate)
    const positionUpdates: CanvasNodeChange[] = [];
    const draggedIds = Array.from(draggedNodeIdsRef.current);

    for (const nodeId of draggedIds) {
      const node = rf.getNode(nodeId);
      if (node) {
        // Compare with original position to see if it actually changed
        const originalPos = dragStartPositionsRef.current.get(nodeId);
        if (
          !originalPos ||
          originalPos.x !== node.position.x ||
          originalPos.y !== node.position.y
        ) {
          positionUpdates.push({
            id: nodeId,
            type: "position",
            position: { x: node.position.x, y: node.position.y },
          });
        }
      }
    }

    // One-time store update with all position changes
    if (positionUpdates.length > 0) {
      onNodesChange(positionUpdates);
    }

    // Reset dragging state
    setIsDragging(false);
    draggedNodeIdsRef.current.clear();
    dragStartPositionsRef.current.clear();
  }, [rf, onNodesChange]);

  // Cancel drag (ESC key)
  // Restore original positions by syncing from store (which hasn't changed)
  const cancelDrag = useCallback(() => {
    if (!isDragging) return;

    // Reset dragging state
    setIsDragging(false);
    draggedNodeIdsRef.current.clear();
    dragStartPositionsRef.current.clear();

    // Note: Positions will be restored automatically because store hasn't changed,
    // and ReactFlow will sync from props on next render
  }, [isDragging]);

  return {
    isDragging,
    handleNodesChangeDuringDrag,
    handleNodeDragStart,
    handleNodeDragStop,
    cancelDrag,
    lastDragStopAt: lastDragStopAtRef,
  };
}

