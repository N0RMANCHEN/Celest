/**
 * features/canvas/hooks/useCanvasKeyboard.ts
 * ----------------
 * 键盘事件处理：删除、ESC取消等
 */

import { useEffect } from "react";
import type { CanvasNodeChange, CanvasEdgeChange } from "../../../entities/canvas/canvasEvents";
import type { CanvasNode, CanvasEdge } from "../adapters/codeGraphToCanvas";

export function useCanvasKeyboard(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  isDragging: boolean,
  isConnecting: boolean,
  selectedIdsRef: React.MutableRefObject<Set<string>>,
  dragStateRef: React.MutableRefObject<{
    draggedNodeIds: Set<string>;
    dragStartPositions: Map<string, { x: number; y: number }>;
    dragStartMouse: { x: number; y: number };
  } | null>,
  setSelectedIds: (ids: Set<string>) => void,
  onNodesChange: (changes: CanvasNodeChange[]) => void,
  onEdgesChange: (changes: CanvasEdgeChange[]) => void,
  onSelectionChange: (ids: string[]) => void,
  onCancelConnection: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingElement =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true" ||
          target.getAttribute("role") === "textbox");

      if (isTypingElement) return;

      // Delete/Backspace: remove selected nodes/edges
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIdsRef.current.size > 0) {
        e.preventDefault();
        const changes: (CanvasNodeChange | CanvasEdgeChange)[] = [];
        for (const id of selectedIdsRef.current) {
          const node = nodes.find((n) => n.id === id);
          if (node) {
            changes.push({ id, type: "remove" });
          } else {
            const edge = edges.find((e) => e.id === id);
            if (edge) {
              changes.push({ id, type: "remove" });
            }
          }
        }

        const nodeChanges = changes.filter(
          (c) =>
            c.type === "remove" &&
            "type" in c &&
            c.type === "remove" &&
            nodes.some((n) => n.id === c.id)
        ) as CanvasNodeChange[];
        const edgeChanges = changes.filter(
          (c) => c.type === "remove" && edges.some((e) => e.id === c.id)
        ) as CanvasEdgeChange[];

        if (nodeChanges.length > 0) onNodesChange(nodeChanges);
        if (edgeChanges.length > 0) onEdgesChange(edgeChanges);

        // Clear selection
        const newSelection = new Set<string>();
        setSelectedIds(newSelection);
        selectedIdsRef.current = newSelection;
        onSelectionChange([]);
      }

      // ESC: cancel connection or drag
      if (e.key === "Escape") {
        if (isConnecting) {
          onCancelConnection();
          return;
        }
        if (isDragging && dragStateRef.current) {
          // Restore original positions
          const changes: CanvasNodeChange[] = [];
          for (const [nodeId, pos] of dragStateRef.current.dragStartPositions) {
            changes.push({ id: nodeId, type: "position", position: pos });
          }
          onNodesChange(changes);
        }
      }

    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    nodes,
    edges,
    isDragging,
    isConnecting,
    selectedIdsRef,
    dragStateRef,
    setSelectedIds,
    onNodesChange,
    onEdgesChange,
    onSelectionChange,
    onCancelConnection,
  ]);
}

