import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CanvasNode } from "./CanvasNode";
import type { CanvasNode as CanvasNodeType } from "../adapters/codeGraphToCanvas";
import type { CanvasNodeType as CanvasNodeTypeEnum } from "../types";
import type { CodeNodeKind } from "../../../entities/graph/types";

function mapKindToCanvasType(kind: string): CanvasNodeTypeEnum {
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

function makeNode(kind: string, id: string = "n1"): CanvasNodeType {
  return {
    id,
    type: mapKindToCanvasType(kind),
    position: { x: 0, y: 0 },
    data: { kind: kind as CodeNodeKind, title: id },
    selected: false,
  };
}

describe("CanvasNode", () => {
  const defaultProps = {
    node: makeNode("note"),
    onNodeClick: vi.fn(),
    getNodeSize: () => ({ width: 180, height: 100 }),
  };

  it("renders handles for nodes with ports", () => {
    const { container } = render(<CanvasNode {...defaultProps} />);

    const leftHandle = container.querySelector(".canvas-handle-left");
    const rightHandle = container.querySelector(".canvas-handle-right");

    expect(leftHandle).toBeTruthy();
    expect(rightHandle).toBeTruthy();
    expect(leftHandle?.getAttribute("data-handle-id")).toBe("in");
    expect(rightHandle?.getAttribute("data-handle-id")).toBe("out");
  });

  it("does not render handles for Frame nodes (ports empty)", () => {
    const frameNode = makeNode("frame", "frame1");
    const { container } = render(
      <CanvasNode {...defaultProps} node={frameNode} />
    );

    const leftHandle = container.querySelector(".canvas-handle-left");
    const rightHandle = container.querySelector(".canvas-handle-right");

    expect(leftHandle).toBeNull();
    expect(rightHandle).toBeNull();
  });

  it("does not render handles for Group nodes (ports empty)", () => {
    const groupNode = makeNode("group", "group1");
    const { container } = render(
      <CanvasNode {...defaultProps} node={groupNode} />
    );

    const leftHandle = container.querySelector(".canvas-handle-left");
    const rightHandle = container.querySelector(".canvas-handle-right");

    expect(leftHandle).toBeNull();
    expect(rightHandle).toBeNull();
  });

  it("renders handles for fileRef nodes", () => {
    const fileNode = makeNode("fileRef", "file1");
    const { container } = render(
      <CanvasNode {...defaultProps} node={fileNode} />
    );

    const leftHandle = container.querySelector(".canvas-handle-left");
    const rightHandle = container.querySelector(".canvas-handle-right");

    expect(leftHandle).toBeTruthy();
    expect(rightHandle).toBeTruthy();
  });

  it("renders handles for subgraphInstance nodes", () => {
    const subgraphNode = makeNode("subgraphInstance", "sub1");
    const { container } = render(
      <CanvasNode {...defaultProps} node={subgraphNode} />
    );

    const leftHandle = container.querySelector(".canvas-handle-left");
    const rightHandle = container.querySelector(".canvas-handle-right");

    expect(leftHandle).toBeTruthy();
    expect(rightHandle).toBeTruthy();
    expect(leftHandle?.getAttribute("data-handle-id")).toBe("input");
    expect(rightHandle?.getAttribute("data-handle-id")).toBe("output");
  });

  it("calls onConnectionStart when right handle is clicked", () => {
    const onConnectionStart = vi.fn();
    const { container } = render(
      <CanvasNode {...defaultProps} onConnectionStart={onConnectionStart} />
    );

    const rightHandle = container.querySelector(".canvas-handle-right") as HTMLElement;
    const mouseEvent = new MouseEvent("mousedown", { bubbles: true });
    
    rightHandle.dispatchEvent(mouseEvent);

    expect(onConnectionStart).toHaveBeenCalledWith(
      "n1",
      "out",
      "source",
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
    );
  });
});

