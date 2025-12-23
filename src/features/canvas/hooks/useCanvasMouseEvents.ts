/**
 * features/canvas/hooks/useCanvasMouseEvents.ts
 * ----------------
 * 处理 Canvas 的鼠标事件（mousedown, mouseup, click）
 */

import { useCallback } from "react";
import type { CanvasViewport } from "../../../entities/canvas/canvasEvents";
import { screenToCanvas } from "../core/ViewportManager";
import { NODE_HEIGHT, NODE_WIDTH } from "../config/constants";
import { logger } from "../../../shared/utils/logger";

export function useCanvasMouseEvents(
  viewport: CanvasViewport,
  svgRef: React.RefObject<SVGSVGElement | null>,
  isDragging: boolean,
  isPanning: boolean,
  isConnecting: boolean,
  spaceKeyPressedRef: React.MutableRefObject<boolean>,
  doubleClickWasDragRef: React.MutableRefObject<boolean>,
  boxSelectionJustFinishedRef: React.MutableRefObject<boolean>,
  startPan: (e: React.MouseEvent) => void,
  handlePanEnd: () => void,
  handleDragEnd: () => void,
  handleConnectionEnd: (e: MouseEvent) => void,
  handleConnectionCancel: () => void,
  startBoxSelection: (e: React.MouseEvent) => void,
  clearBoxSelection: () => void,
  handlePaneClick: () => void,
  onCreateNoteNodeAt?: (pos: { x: number; y: number }) => void
) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if clicking on node or edge
      const isOnNode = target.closest(".canvas-node") || target.closest("foreignObject");
      const isOnEdge =
        target.closest(".canvas-edge") || target.closest(".canvas-edge-hit");
      const isOnHandle = target.closest(".canvas-handle");

      if (isOnNode || isOnEdge || isOnHandle) {
        return;
      }

      // 防止多个交互状态冲突
      if (isDragging || isPanning || isConnecting) {
        logger.warn("[Canvas] Interaction conflict detected, ignoring mouseDown");
        return;
      }

      // Check for panning: Space + left button, or middle button
      const isSpacePan = e.button === 0 && spaceKeyPressedRef.current;
      const isMiddleButton = e.button === 1;

      if (isSpacePan || isMiddleButton) {
        clearBoxSelection();
        startPan(e);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Left click on pane: start box selection
      // 即使是双击的第二下（e.detail === 2），如果是拖动，也应该启动框选
      if (e.button === 0) {
        // 如果是双击的第二下，重置拖动标志
        if (e.detail === 2) {
          doubleClickWasDragRef.current = false;
        }
        startBoxSelection(e);
      }
    },
    [
      spaceKeyPressedRef,
      isDragging,
      isPanning,
      isConnecting,
      clearBoxSelection,
      startPan,
      startBoxSelection,
    ]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // If this is part of a double-click, clear all interaction states
      // 但不立即清除框选，让 handlePaneClickInternal 检查框选框大小来判断是点击还是拖动
      if (e.detail >= 2) {
        // 确保清除所有交互状态，防止状态污染
        if (isPanning) {
          handlePanEnd();
        }
        if (isDragging) {
          handleDragEnd();
        }
        if (isConnecting) {
          handleConnectionCancel();
        }
        // 不在这里清除框选，让 handlePaneClickInternal 处理
        return;
      }

      if (isPanning) {
        handlePanEnd();
      }

      if (isDragging) {
        handleDragEnd();
      }

      if (isConnecting) {
        handleConnectionEnd(e.nativeEvent);
      }
    },
    [
      isPanning,
      isDragging,
      isConnecting,
      handlePanEnd,
      handleDragEnd,
      handleConnectionEnd,
      handleConnectionCancel,
    ]
  );

  const handlePaneClickInternal = useCallback(
    (e: React.MouseEvent) => {
      if (!e || typeof e.detail !== "number") {
        return;
      }

      // Double-click creates note node
      // 但如果双击的第二下是拖动，则不创建 node
      if (e.detail >= 2 && onCreateNoteNodeAt) {
        // 检查是否发生了拖动（通过 finishBoxSelection 设置的标志）
        if (doubleClickWasDragRef.current) {
          // 如果是拖动，不创建 node（框选已经在 finishBoxSelection 中处理了）
          doubleClickWasDragRef.current = false; // 重置标志
          return;
        }

        // 如果是点击（没有拖动），创建 node
        e.preventDefault();
        e.stopPropagation();

        clearBoxSelection();
        if (isConnecting) {
          handleConnectionCancel();
        }

        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const canvasPos = screenToCanvas(
            { x: e.clientX - rect.left, y: e.clientY - rect.top },
            viewport
          );
          onCreateNoteNodeAt({
            x: canvasPos.x - NODE_WIDTH / 2,
            y: canvasPos.y - NODE_HEIGHT / 2,
          });
        }
        return;
      }

      // Single click clears selection
      // 但如果框选刚刚完成，不清除选择（因为框选完成后，click 事件会触发，但此时选择应该保持）
      if (boxSelectionJustFinishedRef.current) {
        // 框选刚刚完成，不清除选择
        return;
      }

      const target = e.target as HTMLElement;
      const isOnNode = target.closest(".canvas-node") || target.closest("foreignObject");
      const isOnEdge = target.closest(".canvas-edge");

      if (!isOnNode && !isOnEdge) {
        handlePaneClick();
      }
    },
    [
      onCreateNoteNodeAt,
      viewport,
      svgRef,
      doubleClickWasDragRef,
      boxSelectionJustFinishedRef,
      clearBoxSelection,
      handlePaneClick,
      isConnecting,
      handleConnectionCancel,
    ]
  );

  return {
    handleMouseDown,
    handleMouseUp,
    handlePaneClickInternal,
  };
}

