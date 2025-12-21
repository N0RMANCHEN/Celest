/**
 * features/canvas/hooks/useCanvasDrag.ts
 * ----------------
 * 节点拖动逻辑
 * 使用 RAF 优化性能，避免频繁的 store 更新
 */

import { useCallback, useEffect } from "react";
import type { CanvasNodeChange, CanvasViewport } from "../../../entities/canvas/canvasEvents";
import type { CanvasNode } from "../adapters/codeGraphToCanvas";
import { screenToCanvas } from "../core/ViewportManager";
import { startDrag, updateDragPositions } from "../core/DragManager";

export function useCanvasDrag(
  nodes: CanvasNode[],
  viewport: CanvasViewport,
  svgRef: React.RefObject<SVGSVGElement | null>,
  isDragging: boolean,
  setIsDragging: (value: boolean) => void,
  dragStateRef: React.MutableRefObject<{
    draggedNodeIds: Set<string>;
    dragStartPositions: Map<string, { x: number; y: number }>;
    dragStartMouse: { x: number; y: number };
  } | null>,
  localNodePositionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>,
  localViewportRef: React.MutableRefObject<CanvasViewport>,
  dragAnimationFrameRef: React.MutableRefObject<number | null>,
  selectedIdsRef: React.MutableRefObject<Set<string>>,
  setSelectedIds: (ids: Set<string>) => void,
  onNodesChange: (changes: CanvasNodeChange[]) => void,
  onSelectionChange: (ids: string[]) => void
) {
  // 开始拖动节点
  const handleNodeMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      // Only start drag on left button
      if (e.button !== 0) return;

      // Don't start drag if clicking on handle
      const target = e.target as HTMLElement;
      if (target.closest(".canvas-handle")) {
        return;
      }

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Use actual viewport props for accurate positioning
      const canvasPos = screenToCanvas(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        viewport
      );

      // Start drag - use current node positions from props
      const nodePositions = new Map<string, { x: number; y: number }>();
      for (const node of nodes) {
        nodePositions.set(node.id, { ...node.position });
      }

      const dragResult = startDrag(nodeId, selectedIdsRef.current, nodePositions);

      // Update selection if needed
      if (
        dragResult.selectedIds.size !== selectedIdsRef.current.size ||
        !Array.from(dragResult.selectedIds).every((id) => selectedIdsRef.current.has(id))
      ) {
        setSelectedIds(dragResult.selectedIds);
        selectedIdsRef.current = dragResult.selectedIds;
        onSelectionChange(Array.from(dragResult.selectedIds));
      }

      setIsDragging(true);
      dragStateRef.current = {
        draggedNodeIds: dragResult.draggedNodeIds,
        dragStartPositions: dragResult.dragStartPositions,
        dragStartMouse: canvasPos,
      };

      e.preventDefault();
      e.stopPropagation();
    },
    [
      nodes,
      viewport,
      svgRef,
      selectedIdsRef,
      setSelectedIds,
      setIsDragging,
      dragStateRef,
      onSelectionChange,
    ]
  );

  // 拖动过程中更新位置（使用 RAF）
  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStateRef.current) return;

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (dragAnimationFrameRef.current !== null) {
        cancelAnimationFrame(dragAnimationFrameRef.current);
      }

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      dragAnimationFrameRef.current = requestAnimationFrame(() => {
        if (!dragStateRef.current || !rect) return;

        // Use latest viewport from ref
        const currentMouse = screenToCanvas(
          { x: mouseX - rect.left, y: mouseY - rect.top },
          localViewportRef.current
        );

        const delta = {
          x: currentMouse.x - dragStateRef.current.dragStartMouse.x,
          y: currentMouse.y - dragStateRef.current.dragStartMouse.y,
        };

        const newPositions = updateDragPositions(
          dragStateRef.current.draggedNodeIds,
          dragStateRef.current.dragStartPositions,
          delta
        );

        // Update local positions for optimistic UI
        for (const [nodeId, pos] of newPositions) {
          localNodePositionsRef.current.set(nodeId, pos);
        }

        // Emit position changes to store (batched by RAF)
        const changes: CanvasNodeChange[] = [];
        for (const [nodeId, pos] of newPositions) {
          changes.push({ id: nodeId, type: "position", position: pos });
        }
        onNodesChange(changes);
        dragAnimationFrameRef.current = null;
      });
    },
    [
      isDragging,
      svgRef,
      dragStateRef,
      dragAnimationFrameRef,
      localNodePositionsRef,
      localViewportRef,
      onNodesChange,
    ]
  );

  // 结束拖动
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    // Cancel any pending drag animation
    if (dragAnimationFrameRef.current !== null) {
      cancelAnimationFrame(dragAnimationFrameRef.current);
      dragAnimationFrameRef.current = null;
    }

    // Final sync to store (ensure all changes are committed)
    if (dragStateRef.current) {
      const changes: CanvasNodeChange[] = [];
      for (const [nodeId, pos] of localNodePositionsRef.current) {
        if (dragStateRef.current.draggedNodeIds.has(nodeId)) {
          changes.push({ id: nodeId, type: "position", position: pos });
        }
      }
      if (changes.length > 0) {
        onNodesChange(changes);
      }
    }

    setIsDragging(false);
    dragStateRef.current = null;
  }, [
    isDragging,
    dragAnimationFrameRef,
    dragStateRef,
    localNodePositionsRef,
    setIsDragging,
    onNodesChange,
  ]);

  // 全局鼠标移动监听（拖动过程中）
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  return {
    handleNodeMouseDown,
    handleDragEnd,
  };
}

