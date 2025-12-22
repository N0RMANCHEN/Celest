import { useCallback, useEffect, useRef } from "react";
import type { CanvasViewport } from "../../../entities/canvas/canvasEvents";
import type { CanvasNode } from "../adapters/codeGraphToCanvas";
import { screenToCanvas } from "../core/ViewportManager";
import { normalizeSelectionBox, getNodeBounds } from "../core/BoxSelection";
import { handleBoxSelection } from "../core/SelectionManager";

export type BoxSelectionState = {
  start: { x: number; y: number };
  end: { x: number; y: number };
} | null;

type Params = {
  nodes: CanvasNode[];
  viewport: CanvasViewport;
  svgRef: React.RefObject<SVGSVGElement | null>;
  boxSelection: BoxSelectionState;
  setBoxSelection: (value: BoxSelectionState) => void;
  isBoxSelectingRef: React.MutableRefObject<boolean>;
  localViewportRef: React.MutableRefObject<CanvasViewport>;
  selectedIdsRef: React.MutableRefObject<Set<string>>;
  setSelectedIds: (ids: Set<string>) => void;
  getNodeSize: (nodeId: string) => { width: number; height: number };
  onSelectionChange: (ids: string[]) => void;
};

/**
 * 仅负责框选的开始/更新/结束逻辑，供 useCanvasSelection 复用。
 */
export function useBoxSelection({
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
}: Params) {
  const boxSelectionShiftKeyRef = useRef(false);

  const startBoxSelection = useCallback(
    (e: React.MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const canvasPos = screenToCanvas(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        viewport
      );

      boxSelectionShiftKeyRef.current = e.shiftKey;

      if (!e.shiftKey) {
        const cleared = new Set<string>();
        setSelectedIds(cleared);
        selectedIdsRef.current = cleared;
        onSelectionChange([]);
      }

      isBoxSelectingRef.current = true;
      setBoxSelection({ start: canvasPos, end: canvasPos });
    },
    [
      svgRef,
      viewport,
      isBoxSelectingRef,
      setBoxSelection,
      setSelectedIds,
      selectedIdsRef,
      onSelectionChange,
    ]
  );

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

  const finishBoxSelection = useCallback(() => {
    if (!isBoxSelectingRef.current || !boxSelection) return;

    const normalizedBox = normalizeSelectionBox(boxSelection.start, boxSelection.end);

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

    const boxSelected = handleBoxSelection(
      nodes.map((n) => n.id),
      nodeBounds,
      normalizedBox
    );

    let finalSelection: Set<string>;
    if (boxSelectionShiftKeyRef.current) {
      finalSelection = new Set([...selectedIdsRef.current, ...boxSelected]);
    } else {
      finalSelection = boxSelected;
    }

    setSelectedIds(finalSelection);
    selectedIdsRef.current = finalSelection;
    onSelectionChange(Array.from(finalSelection));

    isBoxSelectingRef.current = false;
    setBoxSelection(null);
  }, [
    isBoxSelectingRef,
    boxSelection,
    nodes,
    getNodeSize,
    selectedIdsRef,
    setSelectedIds,
    onSelectionChange,
    setBoxSelection,
  ]);

  useEffect(() => {
    if (isBoxSelectingRef.current) {
      window.addEventListener("mousemove", updateBoxSelection);
      window.addEventListener("mouseup", finishBoxSelection);
      return () => {
        window.removeEventListener("mousemove", updateBoxSelection);
        window.removeEventListener("mouseup", finishBoxSelection);
      };
    }
  }, [updateBoxSelection, finishBoxSelection, isBoxSelectingRef]);

  const clearBoxSelection = useCallback(() => {
    isBoxSelectingRef.current = false;
    setBoxSelection(null);
  }, [isBoxSelectingRef, setBoxSelection]);

  return {
    startBoxSelection,
    clearBoxSelection,
  };
}


