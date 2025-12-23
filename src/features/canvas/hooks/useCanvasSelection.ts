/**
 * features/canvas/hooks/useCanvasSelection.ts
 * ----------------
 * 画布选择逻辑：单选、多选、框选
 */

import { useCallback, useEffect, useRef } from "react";
import type { CanvasViewport } from "../../../entities/canvas/canvasEvents";
import type { CanvasNode } from "../adapters/codeGraphToCanvas";
import { screenToCanvas } from "../core/ViewportManager";
import {
  handleNodeClick as handleNodeClickSelection,
  handleBoxSelection,
  handlePaneClick as clearSelection,
} from "../core/SelectionManager";
import { normalizeSelectionBox, getNodeBounds } from "../core/BoxSelection";

export function useCanvasSelection(
  nodes: CanvasNode[],
  viewport: CanvasViewport,
  svgRef: React.RefObject<SVGSVGElement | null>,
  boxSelection: { start: { x: number; y: number }; end: { x: number; y: number } } | null,
  setBoxSelection: (value: { start: { x: number; y: number }; end: { x: number; y: number } } | null) => void,
  isBoxSelectingRef: React.MutableRefObject<boolean>,
  localViewportRef: React.MutableRefObject<CanvasViewport>,
  selectedIdsRef: React.MutableRefObject<Set<string>>,
  setSelectedIds: (ids: Set<string>) => void,
  getNodeSize: (nodeId: string) => { width: number; height: number },
  onSelectionChange: (ids: string[]) => void,
  selectionHandledInMouseDownRef?: React.MutableRefObject<boolean>,
  doubleClickWasDragRef?: React.MutableRefObject<boolean>,
  boxSelectionJustFinishedRef?: React.MutableRefObject<boolean>
) {
  // 追踪框选开始时的 shiftKey 状态和初始选择
  const boxSelectionShiftKeyRef = useRef(false);
  const boxSelectionInitialSelectionRef = useRef<Set<string>>(new Set());
  // 处理节点点击
  const handleNodeClick = useCallback(
    (nodeId: string, shiftKey: boolean) => {
      // 如果选择已在 mousedown 中处理（拖动逻辑），则跳过，避免重复处理
      if (selectionHandledInMouseDownRef?.current) {
        // 清除标志，为下次点击做准备
        selectionHandledInMouseDownRef.current = false;
        return;
      }
      
      const newSelection = handleNodeClickSelection(nodeId, selectedIdsRef.current, shiftKey);
      setSelectedIds(newSelection);
      selectedIdsRef.current = newSelection;
      onSelectionChange(Array.from(newSelection));
    },
    [selectedIdsRef, setSelectedIds, onSelectionChange, selectionHandledInMouseDownRef]
  );

  // 处理边点击
  const handleEdgeClick = useCallback(
    (edgeId: string, shiftKey: boolean) => {
      const newSelection = handleNodeClickSelection(edgeId, selectedIdsRef.current, shiftKey);
      setSelectedIds(newSelection);
      selectedIdsRef.current = newSelection;
      onSelectionChange(Array.from(newSelection));
    },
    [selectedIdsRef, setSelectedIds, onSelectionChange]
  );

  // 处理画布点击（清除选择）
  const handlePaneClick = useCallback(() => {
    const newSelection = clearSelection();
    setSelectedIds(newSelection);
    selectedIdsRef.current = newSelection;
    onSelectionChange([]);
  }, [setSelectedIds, selectedIdsRef, onSelectionChange]);

  // 开始框选
  const startBoxSelection = useCallback(
    (e: React.MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const canvasPos = screenToCanvas(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        viewport
      );

      // 记录 shiftKey 状态和初始选择，用于完成框选时判断
      boxSelectionShiftKeyRef.current = e.shiftKey;
      boxSelectionInitialSelectionRef.current = new Set(selectedIdsRef.current);

      // Figma 行为：不按 Shift 时清除之前的选择，按 Shift 时保留
      if (!e.shiftKey) {
        handlePaneClick();
        boxSelectionInitialSelectionRef.current = new Set(); // 清除后初始选择为空
      }

      isBoxSelectingRef.current = true;
      setBoxSelection({ start: canvasPos, end: canvasPos });
    },
    [svgRef, viewport, isBoxSelectingRef, selectedIdsRef, setBoxSelection, handlePaneClick]
  );

  // 实时更新框选选择（提取为独立函数，供 updateBoxSelection 和 finishBoxSelection 使用）
  const updateSelectionFromBox = useCallback(
    (currentBoxSelection: { start: { x: number; y: number }; end: { x: number; y: number } }) => {
      // Finalize box selection
      const normalizedBox = normalizeSelectionBox(currentBoxSelection.start, currentBoxSelection.end);

      // Build node bounds map
      const nodeBounds = new Map<
        string,
        { left: number; top: number; right: number; bottom: number }
      >();
      for (const node of nodes) {
        const size = getNodeSize(node.id);
        if (size) {
          const bounds = getNodeBounds(node.position, size);
          nodeBounds.set(node.id, bounds);
        }
      }

      // Select nodes in box
      const boxSelected = handleBoxSelection(
        nodes.map((n) => n.id),
        nodeBounds,
        normalizedBox
      );

      // Figma 行为：Shift 框选时，与初始选择合并（取并集）
      let finalSelection: Set<string>;
      if (boxSelectionShiftKeyRef.current) {
        // Shift 框选：累加到框选开始时的选择（而不是实时更新的选择）
        finalSelection = new Set([...boxSelectionInitialSelectionRef.current, ...boxSelected]);
      } else {
        // 普通框选：只选中框选的节点
        finalSelection = boxSelected;
      }

      setSelectedIds(finalSelection);
      selectedIdsRef.current = finalSelection;
      onSelectionChange(Array.from(finalSelection));
    },
    [nodes, getNodeSize, selectedIdsRef, setSelectedIds, onSelectionChange]
  );

  // 更新框选（鼠标移动时）
  const updateBoxSelection = useCallback(
    (e: MouseEvent) => {
      if (!isBoxSelectingRef.current || !boxSelection) return;

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const canvasPos = screenToCanvas(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        localViewportRef.current
      );
      
      const newBoxSelection = { ...boxSelection, end: canvasPos };
      setBoxSelection(newBoxSelection);
      
      // 实时更新选择（鼠标移动时）
      updateSelectionFromBox(newBoxSelection);
    },
    [boxSelection, isBoxSelectingRef, svgRef, localViewportRef, setBoxSelection, updateSelectionFromBox]
  );

  // 完成框选
  const finishBoxSelection = useCallback(() => {
    if (!isBoxSelectingRef.current || !boxSelection) return;

    // 检查框选框大小，判断是否是拖动（用于双击场景）
    const DRAG_THRESHOLD = 5; // 拖动阈值（像素）
    const boxWidth = Math.abs(boxSelection.end.x - boxSelection.start.x);
    const boxHeight = Math.abs(boxSelection.end.y - boxSelection.start.y);
    const wasDrag = boxWidth > DRAG_THRESHOLD || boxHeight > DRAG_THRESHOLD;
    
    // 如果是拖动，设置标志（用于双击场景，防止创建 node）
    if (doubleClickWasDragRef && wasDrag) {
      doubleClickWasDragRef.current = true;
    }

    // 使用统一的更新逻辑（已经在 updateBoxSelection 中实时更新过了，这里确保最终状态正确）
    updateSelectionFromBox(boxSelection);

    // 标记框选刚刚完成，防止 click 事件清除选择
    if (boxSelectionJustFinishedRef) {
      boxSelectionJustFinishedRef.current = true;
      // 延迟清除标志，确保 click 事件能检查到
      setTimeout(() => {
        if (boxSelectionJustFinishedRef) {
          boxSelectionJustFinishedRef.current = false;
        }
      }, 100);
    }

    // Clear box selection
    isBoxSelectingRef.current = false;
    setBoxSelection(null);
  }, [
    isBoxSelectingRef,
    boxSelection,
    setBoxSelection,
    updateSelectionFromBox,
    doubleClickWasDragRef,
    boxSelectionJustFinishedRef,
  ]);

  // 清除框选状态
  const clearBoxSelection = useCallback(() => {
    isBoxSelectingRef.current = false;
    setBoxSelection(null);
  }, [isBoxSelectingRef, setBoxSelection]);

  // 全局鼠标监听（框选过程中）
  useEffect(() => {
    if (isBoxSelectingRef.current) {
      window.addEventListener("mousemove", updateBoxSelection);
      window.addEventListener("mouseup", finishBoxSelection);
      return () => {
        window.removeEventListener("mousemove", updateBoxSelection);
        window.removeEventListener("mouseup", finishBoxSelection);
      };
    }
  }, [isBoxSelectingRef.current, updateBoxSelection, finishBoxSelection]);

  return {
    handleNodeClick,
    handleEdgeClick,
    handlePaneClick,
    startBoxSelection,
    clearBoxSelection,
  };
}

