/**
 * features/canvas/hooks/useCanvasDrag.ts
 * ----------------
 * 节点拖动逻辑
 * 使用 RAF 优化性能，避免频繁的 store 更新
 */

import { useCallback, useEffect, useRef } from "react";
import type { CanvasNodeChange, CanvasViewport } from "../../../entities/canvas/canvasEvents";
import type { CanvasNode } from "../adapters/codeGraphToCanvas";
import { screenToCanvas } from "../core/ViewportManager";
import { startDrag, updateDragPositions } from "../core/DragManager";
import { logger } from "../../../shared/utils/logger";

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
  onSelectionChange: (ids: string[]) => void,
  selectionHandledInMouseDownRef?: React.MutableRefObject<boolean>,
  onDuplicateNodesForDrag?: (
    nodeIds: string[]
  ) => { nodes: { id: string; position: { x: number; y: number } }[]; edgeIds: string[] }
) {
  // Alt 拖拽中是否已生成副本（防止重复生成）
  const hasDuplicatedInDragRef = useRef(false);

  // 开始拖动节点
  const handleNodeMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      // Only start drag on left button
      if (e.button !== 0) return;
      hasDuplicatedInDragRef.current = false;

      // Don't start drag if clicking on handle
      const target = e.target as HTMLElement;
      if (target.closest(".canvas-handle")) {
        return;
      }

      // 防止与其他交互冲突
      if (isDragging) {
      logger.warn("[useCanvasDrag] Already dragging, ignoring new drag start");
        return;
      }

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Use actual viewport props for accurate positioning
      const canvasPos = screenToCanvas(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        viewport
      );

      // 修复选择逻辑（Figma 行为）：
      // - 正常点击：如果节点未选中，则清空并只选中该节点，便于拖动；已选中则保持
      // - Shift+点击：toggle 选择；若未选中则加入并准备拖动，若已选中则留给 click 阶段取消（不在此改动）
      const isNodeSelected = selectedIdsRef.current.has(nodeId);
      const shiftKey = e.shiftKey;
      
      let finalSelection = selectedIdsRef.current;
      
      if (shiftKey) {
        if (!isNodeSelected) {
          // Shift+点击且未选中：加入选择，便于拖动
          finalSelection = new Set(selectedIdsRef.current);
          finalSelection.add(nodeId);
          setSelectedIds(finalSelection);
          selectedIdsRef.current = finalSelection;
          onSelectionChange(Array.from(finalSelection));
          if (selectionHandledInMouseDownRef) {
            selectionHandledInMouseDownRef.current = true;
          }
        }
        // Shift+点击且已选中：不在此处理，让 click 阶段执行取消
      } else if (!isNodeSelected) {
        // 正常点击且节点未选中：清除选择，只选中该节点
        finalSelection = new Set([nodeId]);
        setSelectedIds(finalSelection);
        selectedIdsRef.current = finalSelection;
        onSelectionChange(Array.from(finalSelection));
        if (selectionHandledInMouseDownRef) {
          selectionHandledInMouseDownRef.current = true;
        }
      }
      // 如果节点已选中且未按 Shift，保持当前选择不变

      // Start drag - use current node positions from props
      const nodePositions = new Map<string, { x: number; y: number }>();
      for (const node of nodes) {
        nodePositions.set(node.id, { ...node.position });
      }

      // Alt/Option-drag: duplicate selection first (Figma-like), then drag the duplicate.
      let dragNodeId = nodeId;
      let dragSelection = finalSelection;

      if (e.altKey && onDuplicateNodesForDrag) {
        const selectedNodeIds = Array.from(finalSelection).filter((id) => nodePositions.has(id));
        const idsForDup = selectedNodeIds.includes(nodeId)
          ? [nodeId, ...selectedNodeIds.filter((id) => id !== nodeId)]
          : [nodeId, ...selectedNodeIds];

        const dup = onDuplicateNodesForDrag(idsForDup);
        if (dup.nodes.length > 0) {
          const dupNodeIds = dup.nodes.map((n) => n.id);

          // Sync selection locally (store selection is already updated by the action)
          const nextSelection = new Set<string>([...dupNodeIds, ...dup.edgeIds]);
          setSelectedIds(nextSelection);
          selectedIdsRef.current = nextSelection;
          onSelectionChange(Array.from(nextSelection));
          if (selectionHandledInMouseDownRef) {
            selectionHandledInMouseDownRef.current = true;
          }

          // Seed local positions so drag updates are smooth even before next render
          for (const n of dup.nodes) {
            nodePositions.set(n.id, { ...n.position });
            localNodePositionsRef.current.set(n.id, { ...n.position });
          }

          dragNodeId = dupNodeIds[0];
          dragSelection = new Set<string>(dupNodeIds);
        }
      }

      const dragResult = startDrag(dragNodeId, dragSelection, nodePositions);

      // dragResult.selectedIds 应该和 finalSelection 一致，但为了安全还是检查一下
      if (
        dragResult.selectedIds.size !== finalSelection.size ||
        !Array.from(dragResult.selectedIds).every((id) => finalSelection.has(id))
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
      isDragging,
      selectedIdsRef,
      setSelectedIds,
      setIsDragging,
      dragStateRef,
      onSelectionChange,
      selectionHandledInMouseDownRef,
      onDuplicateNodesForDrag,
      localNodePositionsRef,
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

        // Alt/Option 在拖动中按下：动态复制并切换到副本继续拖拽（Figma 行为）
        if (
          e.altKey &&
          !hasDuplicatedInDragRef.current &&
          onDuplicateNodesForDrag &&
          dragStateRef.current.draggedNodeIds.size > 0
        ) {
          const idsToDup = Array.from(dragStateRef.current.draggedNodeIds);
          const dup = onDuplicateNodesForDrag(idsToDup);
          if (dup.nodes.length > 0) {
            hasDuplicatedInDragRef.current = true;

            // 计算当前鼠标的画布坐标，作为新的拖拽起点
            const currentMouseNow = screenToCanvas(
              { x: mouseX - rect.left, y: mouseY - rect.top },
              localViewportRef.current
            );

            // 重建拖拽状态，切换到新生成的节点
            const newDragStartPositions = new Map<string, { x: number; y: number }>();
            for (const n of dup.nodes) {
              newDragStartPositions.set(n.id, { ...n.position });
              localNodePositionsRef.current.set(n.id, { ...n.position });
            }

            const newDragged = new Set<string>(dup.nodes.map((n) => n.id));
            const selection = new Set<string>([
              ...dup.nodes.map((n) => n.id),
              ...dup.edgeIds,
            ]);

            dragStateRef.current = {
              draggedNodeIds: newDragged,
              dragStartPositions: newDragStartPositions,
              dragStartMouse: currentMouseNow,
            };

            // 同步选择到副本
            setSelectedIds(selection);
            selectedIdsRef.current = selection;
            onSelectionChange(Array.from(selection));
          }
        }

        // Use latest viewport from ref
        const currentMouse = screenToCanvas(
          { x: mouseX - rect.left, y: mouseY - rect.top },
          localViewportRef.current
        );

        const delta = {
          x: currentMouse.x - dragStateRef.current.dragStartMouse.x,
          y: currentMouse.y - dragStateRef.current.dragStartMouse.y,
        };

        // 只有当移动距离超过阈值时，才标记选择已在拖动中处理
        // 这样，如果只是轻微抖动（移动距离很小），handleNodeClick 仍然会被调用
        const DRAG_THRESHOLD = 5; // 拖动阈值（像素）
        const dragDistance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
        if (selectionHandledInMouseDownRef && dragDistance > DRAG_THRESHOLD) {
          selectionHandledInMouseDownRef.current = true;
        }

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
      selectionHandledInMouseDownRef,
      onDuplicateNodesForDrag,
      hasDuplicatedInDragRef,
      setSelectedIds,
      selectedIdsRef,
      onSelectionChange,
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

    hasDuplicatedInDragRef.current = false;
    setIsDragging(false);
    dragStateRef.current = null;
    
    // 清除选择处理标志（延迟清除，确保 click 事件能检查到）
    // click 事件在 mouseup 之后触发，所以需要延迟清除
    if (selectionHandledInMouseDownRef) {
      setTimeout(() => {
        if (selectionHandledInMouseDownRef) {
          selectionHandledInMouseDownRef.current = false;
        }
      }, 100);
    }
  }, [
    isDragging,
    dragAnimationFrameRef,
    dragStateRef,
    localNodePositionsRef,
    setIsDragging,
    onNodesChange,
    selectionHandledInMouseDownRef,
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

