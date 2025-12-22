import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BoxSelectionState } from "./useBoxSelection";
import { useBoxSelection } from "./useBoxSelection";

const viewport = { x: 0, y: 0, zoom: 1, z: 1 };
const svgRef = {
  current: {
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  } as unknown as SVGSVGElement,
};

describe("useBoxSelection", () => {
  it("startBoxSelection clears selection when not holding shift", () => {
    let boxSelection: BoxSelectionState = null;
    const setBoxSelection = (v: BoxSelectionState) => {
      boxSelection = v;
    };
    const selectedIdsRef = { current: new Set<string>(["a"]) };
    const setSelectedIds = (ids: Set<string>) => {
      selectedIdsRef.current = ids;
    };
    const onSelectionChange: string[][] = [];

    const { result } = renderHook(() =>
      useBoxSelection({
        nodes: [],
        viewport,
        svgRef,
        boxSelection,
        setBoxSelection,
        isBoxSelectingRef: { current: false },
        localViewportRef: { current: viewport },
        selectedIdsRef,
        setSelectedIds,
        getNodeSize: () => ({ width: 10, height: 10 }),
        onSelectionChange: (ids) => onSelectionChange.push(ids),
      })
    );

    act(() => {
      result.current.startBoxSelection({
        clientX: 5,
        clientY: 5,
        shiftKey: false,
      } as any);
    });

    expect(selectedIdsRef.current.size).toBe(0);
    expect(boxSelection).not.toBeNull();
  });
});


