import { useCallback } from "react";
import type { CanvasViewport } from "../../../entities/canvas/canvasEvents";

export type BoxSelectionState =
  | null
  | {
      start: { x: number; y: number };
      end: { x: number; y: number };
    };

type Params = {
  nodes: { id: string; position: { x: number; y: number } }[];
  viewport: CanvasViewport;
  svgRef: React.RefObject<SVGSVGElement | null>;
  boxSelection: BoxSelectionState;
  setBoxSelection: (v: BoxSelectionState) => void;
  isBoxSelectingRef: React.MutableRefObject<boolean>;
  localViewportRef: React.MutableRefObject<CanvasViewport>;
  selectedIdsRef: React.MutableRefObject<Set<string>>;
  setSelectedIds: (ids: Set<string>) => void;
  getNodeSize: (id: string) => { width: number; height: number };
  onSelectionChange: (ids: string[]) => void;
};

export function useBoxSelection(params: Params) {
  const {
    setBoxSelection,
    selectedIdsRef,
    setSelectedIds,
    onSelectionChange,
    isBoxSelectingRef,
  } = params;

  const startBoxSelection = useCallback(
    (e: MouseEvent | { clientX: number; clientY: number; shiftKey?: boolean }) => {
      // 清空选中（不按 shift）
      if (!e.shiftKey) {
        selectedIdsRef.current = new Set();
        setSelectedIds(selectedIdsRef.current);
        onSelectionChange([]);
      }

      setBoxSelection({
        start: { x: e.clientX, y: e.clientY },
        end: { x: e.clientX, y: e.clientY },
      });
      isBoxSelectingRef.current = true;
    },
    [onSelectionChange, selectedIdsRef, setBoxSelection, setSelectedIds, isBoxSelectingRef]
  );

  return {
    startBoxSelection,
  };
}


