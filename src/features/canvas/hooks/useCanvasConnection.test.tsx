import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCanvasConnection } from "./useCanvasConnection";
import type { CanvasNode } from "../adapters/codeGraphToCanvas";
import type { CanvasNodeType } from "../types";

const viewport = { x: 0, y: 0, zoom: 1, z: 1 };

function makeSvgRef() {
  return {
    current: {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    } as unknown as SVGSVGElement,
  };
}

function mapKindToCanvasType(kind: string): CanvasNodeType {
  switch (kind) {
    case "note":
      return "noteNode";
    case "fileRef":
      return "fileRefNode";
    case "group":
      return "groupNode";
    case "subgraphInstance":
      return "subgraphNode";
    case "frame":
      return "frameNode";
    default:
      return "noteNode";
  }
}

function makeNodes(nodes: Array<{ id: string; kind: string }>): CanvasNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: mapKindToCanvasType(n.kind),
    position: { x: 0, y: 0 },
    data: { kind: n.kind as any, title: n.id },
    selected: false,
  }));
}

describe("useCanvasConnection", () => {
  it("creates a connection when valid target", () => {
    const onConnect = vi.fn();
    const onEdgesChange = vi.fn();
    const nodes = makeNodes([
      { id: "a", kind: "note" },
      { id: "b", kind: "note" },
    ]);

    const { result } = renderHook(() =>
      useCanvasConnection([], nodes, makeSvgRef(), viewport, onConnect, onEdgesChange)
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
    const nodes = makeNodes([
      { id: "a", kind: "note" },
      { id: "b", kind: "note" },
    ]);

    const { result } = renderHook(() =>
      useCanvasConnection(edges as any, nodes, makeSvgRef(), viewport, onConnect, onEdgesChange)
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

  it("allows fileRef.out to connect to note.in (accepts rule)", () => {
    const onConnect = vi.fn();
    const onEdgesChange = vi.fn();
    const nodes = makeNodes([
      { id: "file1", kind: "fileRef" },
      { id: "note1", kind: "note" },
    ]);

    const { result } = renderHook(() =>
      useCanvasConnection([], nodes, makeSvgRef(), viewport, onConnect, onEdgesChange)
    );

    act(() => {
      result.current.handleConnectionStart("file1", "out", "source", { x: 0, y: 0 }, "create");
    });

    const target = document.createElement("div");
    target.className = "canvas-handle";
    target.dataset.nodeId = "note1";
    target.dataset.handleId = "in";
    target.dataset.handleType = "target";

    act(() => {
      result.current.handleConnectionEnd({ target } as any);
    });

    expect(onConnect).toHaveBeenCalledWith({
      source: "file1",
      target: "note1",
      sourceHandle: "out",
      targetHandle: "in",
    });
  });

  it("rejects fileRef.out connecting to fileRef.in (accepts rule violation)", () => {
    const onConnect = vi.fn();
    const onEdgesChange = vi.fn();
    const nodes = makeNodes([
      { id: "file1", kind: "fileRef" },
      { id: "file2", kind: "fileRef" },
    ]);

    const { result } = renderHook(() =>
      useCanvasConnection([], nodes, makeSvgRef(), viewport, onConnect, onEdgesChange)
    );

    act(() => {
      result.current.handleConnectionStart("file1", "out", "source", { x: 0, y: 0 }, "create");
    });

    const target = document.createElement("div");
    target.className = "canvas-handle";
    target.dataset.nodeId = "file2";
    target.dataset.handleId = "in";
    target.dataset.handleType = "target";

    act(() => {
      result.current.handleConnectionEnd({ target } as any);
    });

    // fileRef.out 只接受 note，不接受 fileRef，所以不应该调用 onConnect
    expect(onConnect).not.toHaveBeenCalled();
  });

  it("allows note.out to connect to any node (no accepts restriction)", () => {
    const onConnect = vi.fn();
    const onEdgesChange = vi.fn();
    const nodes = makeNodes([
      { id: "note1", kind: "note" },
      { id: "file1", kind: "fileRef" },
    ]);

    const { result } = renderHook(() =>
      useCanvasConnection([], nodes, makeSvgRef(), viewport, onConnect, onEdgesChange)
    );

    act(() => {
      result.current.handleConnectionStart("note1", "out", "source", { x: 0, y: 0 }, "create");
    });

    const target = document.createElement("div");
    target.className = "canvas-handle";
    target.dataset.nodeId = "file1";
    target.dataset.handleId = "in";
    target.dataset.handleType = "target";

    act(() => {
      result.current.handleConnectionEnd({ target } as any);
    });

    // note.out 没有 accepts 限制，应该可以连接任何节点
    expect(onConnect).toHaveBeenCalledWith({
      source: "note1",
      target: "file1",
      sourceHandle: "out",
      targetHandle: "in",
    });
  });
});


