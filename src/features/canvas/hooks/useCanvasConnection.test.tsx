import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCanvasConnection } from "./useCanvasConnection";

const viewport = { x: 0, y: 0, zoom: 1, z: 1 };

function makeSvgRef() {
  return {
    current: {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    } as unknown as SVGSVGElement,
  };
}

describe("useCanvasConnection", () => {
  it("creates a connection when valid target", () => {
    const onConnect = vi.fn();
    const onEdgesChange = vi.fn();

    const { result } = renderHook(() =>
      useCanvasConnection([], makeSvgRef(), viewport, onConnect, onEdgesChange)
    );

    act(() => {
      result.current.handleConnectionStart("a", "out", "source", { x: 0, y: 0 }, "create");
    });

    const target = document.createElement("div");
    target.className = "canvas-handle";
    target.dataset.nodeId = "b";
    target.dataset.handleId = "in";
    target.dataset.handleType = "target";

    act(() => {
      result.current.handleConnectionEnd({ target } as any);
    });

    expect(onConnect).toHaveBeenCalledWith({
      source: "a",
      target: "b",
      sourceHandle: "out",
      targetHandle: "in",
    });
    expect(onEdgesChange).not.toHaveBeenCalled();
  });

  it("deletes a connection in delete mode", () => {
    const onConnect = vi.fn();
    const onEdgesChange = vi.fn();
    const edges = [
      { id: "e1", source: "a", target: "b", sourceHandle: "out", targetHandle: "in" },
    ];

    const { result } = renderHook(() =>
      useCanvasConnection(edges as any, makeSvgRef(), viewport, onConnect, onEdgesChange)
    );

    act(() => {
      result.current.handleConnectionStart("a", "out", "source", { x: 0, y: 0 }, "delete");
    });

    const target = document.createElement("div");
    target.className = "canvas-handle";
    target.dataset.nodeId = "b";
    target.dataset.handleId = "in";
    target.dataset.handleType = "target";

    act(() => {
      result.current.handleConnectionEnd({ target } as any);
    });

    expect(onConnect).not.toHaveBeenCalled();
    expect(onEdgesChange).toHaveBeenCalledWith([{ id: "e1", type: "remove" }]);
  });
});


