/**
 * features/canvas/hooks/useCanvasSelection.ts
 * ----------------
 * 画布选择逻辑：单选、多选、框选
 */

import { useCallback } from "react";
import type { CanvasViewport } from "../../../entities/canvas/canvasEvents";
import type { CanvasNode } from "../adapters/codeGraphToCanvas";
import {
  handleNodeClick as handleNodeClickSelection,
  handlePaneClick as clearSelection,
} from "../core/SelectionManager";
import { useBoxSelection } from "./useBoxSelection";

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
  const boxSelectionHandlers = useBoxSelection({
    nodes,
    viewport,
    svgRef,
    boxSelection,
    setBoxSelection,
    isBoxSelectingRef,
    localViewportRef,
    selectedIdsRef,
    setSelectedIds,
    getNodeSize,
    onSelectionChange,
  });

  return {
    handleNodeClick,
    handleEdgeClick,
    handlePaneClick,
    startBoxSelection: boxSelectionHandlers.startBoxSelection,
    clearBoxSelection: boxSelectionHandlers.clearBoxSelection,
  };
}

