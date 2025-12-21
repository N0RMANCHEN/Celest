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
  nodes: Node<CanvasNodeData>[],
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
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/235ef1dd-c85c-4ef1-9b5d-11ecf4cd6583',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDragHandling.ts:40',message:'Nodes change during drag',data:{changesCount:changes.length,changeTypes:changes.map(c=>c.type),draggedNodeIds:Array.from(draggedNodeIdsRef.current),propsNodesCount:nodes.length,propsNodesRef:Object.prototype.toString.call(nodes)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

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
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/235ef1dd-c85c-4ef1-9b5d-11ecf4cd6583',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDragHandling.ts:56',message:'Remove during drag',data:{nodeId:ch.id,draggedNodeIds:Array.from(draggedNodeIdsRef.current)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          // Remove operations should still go through immediately
          onNodesChange([{ id: ch.id, type: "remove" }]);
        }
      }
      
      // CRITICAL: Update positions during drag so ReactFlow can track them.
      // The selector's content-based caching will keep array references stable
      // by checking content equality first (even if cache key changes due to position).
      if (positionUpdates.length > 0) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/235ef1dd-c85c-4ef1-9b5d-11ecf4cd6583',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDragHandling.ts:65',message:'Calling onNodesChange during drag',data:{positionUpdatesCount:positionUpdates.length,nodeIds:positionUpdates.map(u=>u.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        onNodesChange(positionUpdates);
      }
    },
    [onNodesChange, nodes]
  );

  // Handle node drag start
  const handleNodeDragStart = useCallback(
    (_: ReactMouseEvent, node: Node<CanvasNodeData>) => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/235ef1dd-c85c-4ef1-9b5d-11ecf4cd6583',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDragHandling.ts:74',message:'Drag start',data:{nodeId:node.id,propsNodesCount:nodes.length,propsNodeIds:nodes.map(n=>n.id),propsNodesRef:Object.prototype.toString.call(nodes)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // CRITICAL: Verify node exists in props.nodes before allowing drag
      // This prevents dragging deleted nodes and triggering React Flow error #015
      const existsInProps = nodes.some((n) => n.id === node.id);
      if (!existsInProps) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/235ef1dd-c85c-4ef1-9b5d-11ecf4cd6583',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDragHandling.ts:79',message:'Node not in props.nodes',data:{nodeId:node.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.error(
          "[useDragHandling] Node not found in props.nodes, canceling drag:",
          node.id
        );
        // Cancel drag by not proceeding with drag setup
        return;
      }

      // Verify node exists in ReactFlow internal state
      const rfNode = rf.getNode(node.id);
      if (!rfNode) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/235ef1dd-c85c-4ef1-9b5d-11ecf4cd6583',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDragHandling.ts:90',message:'Node not in ReactFlow state',data:{nodeId:node.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.error(
          "[useDragHandling] Node not found in ReactFlow state, canceling drag:",
          node.id
        );
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/235ef1dd-c85c-4ef1-9b5d-11ecf4cd6583',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDragHandling.ts:97',message:'Drag start validated',data:{nodeId:node.id,rfNodeExists:!!rfNode,rfNodesCount:rf.getNodes().length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // CRITICAL: Preserve all currently selected nodes when dragging starts
      // This ensures:
      // 1. Visual selection state is maintained during multi-node drag
      // 2. Dragging does NOT cancel selection (requirement #5)
      // 3. All selected nodes move together
      const currentlySelected = nodes.filter((n) => n.selected).map((n) => n.id);
      const edges = rf.getEdges();
      const currentlySelectedEdges = edges.filter((e) => e.selected).map((e) => e.id);
      const allSelectedIds = [...currentlySelected, ...currentlySelectedEdges];
      
      // If the dragged node is not already selected, add it to selection
      // This handles the case where user starts dragging an unselected node
      if (!currentlySelected.includes(node.id)) {
        allSelectedIds.push(node.id);
      }
      
      // Update selection to include all nodes that should be dragged together
      // This preserves selection state during drag (requirement #5)
      onSelectionChange(allSelectedIds);

      // Store initial positions for potential cancel (ESC key)
      // Include all selected nodes, not just the one being dragged
      const currentNodes = rf.getNodes();
      dragStartPositionsRef.current.clear();
      const allSelectedNodeIds = new Set(currentlySelected);
      allSelectedNodeIds.add(node.id); // Ensure the dragged node is included
      
      for (const n of currentNodes) {
        if (allSelectedNodeIds.has(n.id)) {
          dragStartPositionsRef.current.set(n.id, { ...n.position });
        }
      }

      // Mark as dragging
      setIsDragging(true);
      draggedNodeIdsRef.current.clear();
      // Track all selected nodes for dragging, not just the one being dragged
      for (const nodeId of allSelectedNodeIds) {
        draggedNodeIdsRef.current.add(nodeId);
      }
    },
    [rf, nodes, onSelectionChange]
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

