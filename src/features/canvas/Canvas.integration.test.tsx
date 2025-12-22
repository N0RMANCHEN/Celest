import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Canvas } from "./Canvas";
import { NODE_HEIGHT, NODE_WIDTH, DEFAULT_VIEWPORT } from "./config/constants";

const noop = () => {};

function setupCanvas(extraProps: Partial<React.ComponentProps<typeof Canvas>> = {}) {
  const onCreateNoteNodeAt = vi.fn();
  const props: React.ComponentProps<typeof Canvas> = {
    nodes: [],
    edges: [],
    onNodesChange: noop,
    onEdgesChange: noop,
    onConnect: noop,
    onSelectionChange: noop,
    activeViewId: "main",
    viewport: DEFAULT_VIEWPORT,
    onViewportChange: noop,
    onCreateNoteNodeAt,
    ...extraProps,
  };

  const utils = render(<Canvas {...props} />);
  return { ...utils, onCreateNoteNodeAt };
}

describe("Canvas integration (smoke)", () => {
  it("double-click pane creates node centered at cursor", () => {
    const { container, onCreateNoteNodeAt } = setupCanvas();
    const canvasDiv = container.querySelector(".canvas-container") as HTMLElement;

    fireEvent.click(canvasDiv, { detail: 2, clientX: 0, clientY: 0 });

    expect(onCreateNoteNodeAt).toHaveBeenCalledTimes(1);
    const pos = onCreateNoteNodeAt.mock.calls[0][0];
    // canvas 坐标 = (screen - viewport) / zoom，再减去节点尺寸的一半
    expect(pos).toEqual({
      x: (0 - DEFAULT_VIEWPORT.x) / DEFAULT_VIEWPORT.zoom - NODE_WIDTH / 2,
      y: (0 - DEFAULT_VIEWPORT.y) / DEFAULT_VIEWPORT.zoom - NODE_HEIGHT / 2,
    });
  });

  it("renders background pattern", () => {
    const { container } = setupCanvas();
    const pattern = container.querySelector("pattern#dot-pattern");
    expect(pattern).toBeTruthy();
  });
});


