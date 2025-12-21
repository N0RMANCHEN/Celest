/**
 * features/canvas/hooks/useKeyboardHandling.ts
 * ----------------
 * Handles keyboard shortcuts: ESC (cancel drag), Delete/Backspace (remove nodes/edges).
 */

import { useEffect } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { CanvasNodeData, CanvasEdgeData } from "../types";
import type { CanvasNodeChange, CanvasEdgeChange } from "../canvasEvents";

function isTypingTarget(t: EventTarget | null): boolean {
  if (!t || !(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (t.isContentEditable) return true;
  if (typeof t.closest === "function") {
    if (t.closest(".monaco-editor")) return true;
  }
  return false;
}

export function useKeyboardHandling(
  nodes: Node<CanvasNodeData>[],
  edges: Edge<CanvasEdgeData>[],
  isDragging: boolean,
  cancelDrag: () => void,
  onNodesChange: (changes: CanvasNodeChange[]) => void,
  onEdgesChange: (changes: CanvasEdgeChange[]) => void
) {
  useEffect(() => {
    const opts: AddEventListenerOptions = { capture: true };

    const onKeyDown = (e: KeyboardEvent) => {
      // Handle ESC to cancel drag
      if (e.key === "Escape" && isDragging) {
        e.preventDefault();
        cancelDrag();
        return;
      }

      // Handle Delete/Backspace
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const nodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
      const edgeIds = edges.filter((ed) => ed.selected).map((ed) => ed.id);

      if (nodeIds.length === 0 && edgeIds.length === 0) return;

      e.preventDefault();

      // If dragging, cancel drag first (delete should work on store state)
      if (isDragging) {
        cancelDrag();
      }

      // Delete from store (always use store handlers)
      if (edgeIds.length > 0) {
        onEdgesChange(edgeIds.map((id) => ({ id, type: "remove" })));
      }
      if (nodeIds.length > 0) {
        onNodesChange(nodeIds.map((id) => ({ id, type: "remove" })));
      }
    };

    window.addEventListener("keydown", onKeyDown, opts);
    return () => {
      window.removeEventListener("keydown", onKeyDown, opts);
    };
  }, [nodes, edges, isDragging, cancelDrag, onNodesChange, onEdgesChange]);
}

