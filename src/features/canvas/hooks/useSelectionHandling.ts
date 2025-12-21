/**
 * features/canvas/hooks/useSelectionHandling.ts
 * ----------------
 * Handles selection logic with de-duplication to prevent ReactFlow StoreUpdater feedback loops.
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

  // Handle ReactFlow's selection change (box-select etc.)
  // IMPORTANT: de-dupe to avoid StoreUpdater feedback loop.
  // Also protect against ReactFlow initializing with empty selection
  // when we're restoring from persisted state.
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

      emitSelection(next);
    },
    [emitSelection, nodes, edges]
  );

  // Handle node click
  const handleNodeClick = useCallback(
    (evt: ReactMouseEvent, node: Node<CanvasNodeData>) => {
      if (evt.shiftKey) {
        const current = new Set(selectedIdsRef.current);
        if (current.has(node.id)) current.delete(node.id);
        else current.add(node.id);
        emitSelection(Array.from(current));
        return;
      }

      emitSelection([node.id]);
    },
    [emitSelection]
  );

  // Handle edge click
  const handleEdgeClick = useCallback(
    (evt: ReactMouseEvent, edge: Edge<CanvasEdgeData>) => {
      if (evt.shiftKey) {
        const current = new Set(selectedIdsRef.current);
        if (current.has(edge.id)) current.delete(edge.id);
        else current.add(edge.id);
        emitSelection(Array.from(current));
        return;
      }

      emitSelection([edge.id]);
    },
    [emitSelection]
  );

  return {
    handleSelectionChange,
    handleNodeClick,
    handleEdgeClick,
    emitSelection,
  };
}

