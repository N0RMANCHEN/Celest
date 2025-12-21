/**
 * features/canvas/hooks/useCanvasSelection.ts
 * ----------------
 * 画布选择逻辑：单选、多选、框选
 */

import { useCallback, useEffect } from "react";
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
  onSelectionChange: (ids: string[]) => void
) {
  // 处理节点点击
  const handleNodeClick = useCallback(
    (nodeId: string, shiftKey: boolean) => {
      const newSelection = handleNodeClickSelection(nodeId, selectedIdsRef.current, shiftKey);
      setSelectedIds(newSelection);
      selectedIdsRef.current = newSelection;
      onSelectionChange(Array.from(newSelection));
    },
    [selectedIdsRef, setSelectedIds, onSelectionChange]
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

      // Clear previous selection when box selection starts
      handlePaneClick();

      isBoxSelectingRef.current = true;
      setBoxSelection({ start: canvasPos, end: canvasPos });
    },
    [svgRef, viewport, isBoxSelectingRef, setBoxSelection, handlePaneClick]
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
      setBoxSelection({ ...boxSelection, end: canvasPos });
    },
    [boxSelection, isBoxSelectingRef, svgRef, localViewportRef, setBoxSelection]
  );

  // 完成框选
  const finishBoxSelection = useCallback(() => {
    if (!isBoxSelectingRef.current || !boxSelection) return;

    // Finalize box selection
    const normalizedBox = normalizeSelectionBox(boxSelection.start, boxSelection.end);

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
    const selected = handleBoxSelection(
      nodes.map((n) => n.id),
      nodeBounds,
      normalizedBox
    );

    setSelectedIds(selected);
    selectedIdsRef.current = selected;
    onSelectionChange(Array.from(selected));

    // Clear box selection
    isBoxSelectingRef.current = false;
    setBoxSelection(null);
  }, [
    isBoxSelectingRef,
    boxSelection,
    nodes,
    getNodeSize,
    setSelectedIds,
    selectedIdsRef,
    onSelectionChange,
    setBoxSelection,
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

