/**
 * features/canvas/hooks/useSelectionHandling.ts
 * ----------------
 * Handles selection logic with de-duplication to prevent ReactFlow StoreUpdater feedback loops.
 * 
 * Figma-like selection behavior:
 * - Click node: immediately select (clear others)
 * - Shift+click node: toggle in selection
 * - Box selection start: clear previous selection immediately
 * - Box selection: nodes that intersect with box are selected
 * - Box selection end: selection box disappears
 */

import { useCallback, useEffect, useRef } from "react";
import type { OnSelectionChangeParams } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { CanvasNodeData, CanvasEdgeData } from "../types";

function normalizeIds(ids: string[]): string[] {
  const out = new Set<string>();
  for (const id of ids) {
    if (typeof id !== "string") continue;
    const s = id.trim();
    if (!s) continue;
    out.add(s);
  }
  return Array.from(out).sort();
}

function arrayEq(a: string[], b: string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function useSelectionHandling(
  nodes: Node<CanvasNodeData>[],
  edges: Edge<CanvasEdgeData>[],
  onSelectionChange: (ids: string[]) => void
) {
  const selectedIdsRef = useRef<string[]>([]);
  const isInitialMountRef = useRef(true);
  const isBoxSelectingRef = useRef(false);
  const boxSelectStartTimeRef = useRef<number>(0);

  // Update selectedIdsRef from props
  useEffect(() => {
    const next = normalizeIds([
      ...nodes.filter((n) => n.selected).map((n) => n.id),
      ...edges.filter((e) => e.selected).map((e) => e.id),
    ]);

    // On initial mount, if props have selection but ref is empty,
    // this means we're restoring from persisted state. Don't let ReactFlow
    // override it with an empty selection.
    if (isInitialMountRef.current && next.length > 0 && selectedIdsRef.current.length === 0) {
      selectedIdsRef.current = next;
      isInitialMountRef.current = false;
      return;
    }

    selectedIdsRef.current = next;
    isInitialMountRef.current = false;
  }, [nodes, edges]);

  // Emit selection only when it actually differs from the selection already projected on props.
  // CRITICAL: This breaks ReactFlow StoreUpdater feedback loop.
  const emitSelection = useCallback(
    (ids: string[]) => {
      const next = normalizeIds(ids);
      const cur = selectedIdsRef.current;
      if (arrayEq(next, cur)) return; // CRITICAL: break ReactFlow StoreUpdater feedback loop
      onSelectionChange(next);
    },
    [onSelectionChange]
  );

  // Handle box selection start - clear previous selection immediately (Figma behavior)
  const handleBoxSelectionStart = useCallback(() => {
    isBoxSelectingRef.current = true;
    boxSelectStartTimeRef.current = Date.now();
    // CRITICAL: Clear previous selection when box selection starts (Figma behavior)
    emitSelection([]);
  }, [emitSelection]);

  // Handle ReactFlow's selection change (box-select etc.)
  // This is called:
  // 1. During box selection (while dragging) - nodes/edges that intersect with selection box
  // 2. When box selection ends (mouseup) - final selection state
  const handleSelectionChange = useCallback(
    (sel: OnSelectionChangeParams) => {
      const nodeIds = sel?.nodes?.map((n) => n.id) ?? [];
      const edgeIds = sel?.edges?.map((e) => e.id) ?? [];
      const next = [...nodeIds, ...edgeIds];

      // If ReactFlow is trying to clear selection on initial mount,
      // but we have persisted selection in props, ignore it.
      if (isInitialMountRef.current && next.length === 0) {
        const fromProps = normalizeIds([
          ...nodes.filter((n) => n.selected).map((n) => n.id),
          ...edges.filter((e) => e.selected).map((e) => e.id),
        ]);
        if (fromProps.length > 0) {
          // Don't let ReactFlow override persisted selection.
          return;
        }
      }

      // Detect box selection: if we're box selecting or multiple items selected
      const isBoxSelection = isBoxSelectingRef.current || next.length > 1;

      // Update box selection state
      if (isBoxSelection && next.length > 0) {
        // Box selection is active and has results
        isBoxSelectingRef.current = true;
      } else if (next.length === 0 && isBoxSelectingRef.current) {
        // Box selection ended with no selection
        isBoxSelectingRef.current = false;
      } else if (!isBoxSelectingRef.current) {
        // Not a box selection, just a click
        isBoxSelectingRef.current = false;
      }

      // ReactFlow's box selection automatically handles intersection:
      // - Nodes/edges that partially or fully intersect with selection box are included
      emitSelection(next);
    },
    [emitSelection, nodes, edges]
  );

  // Handle node click - Figma behavior: immediate selection, no delay
  const handleNodeClick = useCallback(
    (evt: ReactMouseEvent, node: Node<CanvasNodeData>) => {
      evt.stopPropagation();
      
      // CRITICAL: Handle immediately, no setTimeout - this fixes click selection issues
      if (evt.shiftKey) {
        // Shift+click: toggle selection (multi-select mode)
        const current = new Set(selectedIdsRef.current);
        if (current.has(node.id)) {
          current.delete(node.id);
        } else {
          current.add(node.id);
        }
        emitSelection(Array.from(current));
        return;
      }

      // Normal click: select only this node (clear all other selections)
      emitSelection([node.id]);
    },
    [emitSelection]
  );

  // Handle edge click - same as node click
  const handleEdgeClick = useCallback(
    (evt: ReactMouseEvent, edge: Edge<CanvasEdgeData>) => {
      evt.stopPropagation();
      
      if (evt.shiftKey) {
        // Shift+click: toggle selection (multi-select mode)
        const current = new Set(selectedIdsRef.current);
        if (current.has(edge.id)) {
          current.delete(edge.id);
        } else {
          current.add(edge.id);
        }
        emitSelection(Array.from(current));
        return;
      }

      // Normal click: select only this edge (clear all other selections)
      emitSelection([edge.id]);
    },
    [emitSelection]
  );

  return {
    handleSelectionChange,
    handleNodeClick,
    handleEdgeClick,
    emitSelection,
    handleBoxSelectionStart,
    isBoxSelecting: isBoxSelectingRef,
  };
}
