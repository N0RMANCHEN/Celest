/**
 * features/canvas/hooks/useCanvasKeyboard.ts
 * ----------------
 * 键盘事件处理：删除、ESC取消等
 */

import { useEffect } from "react";
import { HOTKEYS, matchAnyHotkey } from "../../../config/hotkeys";
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
  onCancelConnection: () => void,
  onCopySelectionToClipboard: () => void,
  onCutSelectionToClipboard: () => void,
  onPasteClipboardAt: (pos: { x: number; y: number }) => void,
  getLastPointerCanvasPos: () => { x: number; y: number } | null,
  onUndoCanvas?: () => void,
  onRedoCanvas?: () => void
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

      // 检查是否在 CodeMirror 编辑器中（Inspector）
      const isInCodeMirror = target?.closest(".cm-editor") !== null;

      // 如果在 CodeMirror 编辑器中，让 CodeMirror 自己处理撤销（不拦截）
      if (isInCodeMirror) {
        return;
      }

      // 如果在其他输入元素中，也不处理
      if (isTypingElement) return;

      // Cmd/Ctrl + Z: 撤销
      if (matchAnyHotkey(e, HOTKEYS.globalUndo.bindings) && onUndoCanvas) {
        e.preventDefault();
        e.stopPropagation();
        onUndoCanvas();
        return;
      }

      // Cmd/Ctrl + Shift + Z: 重做
      if (matchAnyHotkey(e, HOTKEYS.globalRedo.bindings) && onRedoCanvas) {
        e.preventDefault();
        e.stopPropagation();
        onRedoCanvas();
        return;
      }

      // Cmd/Ctrl + X/C/V: node clipboard (app-internal, does NOT touch system clipboard)
      // IMPORTANT: We early-return above for typing elements, so Inspector text clipboard remains independent.
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && !e.shiftKey && !e.altKey && !isDragging && !isConnecting) {
        if (e.code === "KeyC") {
          e.preventDefault();
          onCopySelectionToClipboard();
          return;
        }
        if (e.code === "KeyX") {
          e.preventDefault();
          onCutSelectionToClipboard();
          return;
        }
        if (e.code === "KeyV") {
          e.preventDefault();
          const pos = getLastPointerCanvasPos();
          if (pos) onPasteClipboardAt(pos);
          return;
        }
      }

      // Delete/Backspace: remove selected nodes/edges
      if (
        matchAnyHotkey(e, HOTKEYS.canvasDelete.bindings) &&
        selectedIdsRef.current.size > 0
      ) {
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
      if (matchAnyHotkey(e, HOTKEYS.canvasEscape.bindings)) {
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
    onCopySelectionToClipboard,
    onCutSelectionToClipboard,
    onPasteClipboardAt,
    getLastPointerCanvasPos,
    onUndoCanvas,
    onRedoCanvas,
  ]);
}

