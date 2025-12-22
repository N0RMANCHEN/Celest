import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NodeHandle } from "./NodeHandle";

describe("NodeHandle", () => {
  it("renders left handle with dataset", () => {
    const { container } = render(
      <NodeHandle
        side="left"
        className="custom"
        dataNodeId="n1"
        dataHandleId="in"
        dataHandleType="target"
      />
    );

    const el = container.querySelector(".canvas-handle.custom") as HTMLElement;
    expect(el?.getAttribute("data-node-id")).toBe("n1");
    expect(el?.getAttribute("data-handle-id")).toBe("in");
    expect(el?.getAttribute("data-handle-type")).toBe("target");
  });

  it("applies valid/connecting visual states", () => {
    const onMouseDown = vi.fn();
    const { container } = render(
      <NodeHandle
        side="right"
        dataNodeId="n1"
        dataHandleId="out"
        dataHandleType="source"
        isValid
        isConnecting
        onMouseDown={onMouseDown}
      />
    );

    const el = container.querySelector(".canvas-handle") as HTMLElement;
    expect(el.style.opacity).toBe("0.9");
    expect(el.style.border).toContain("var(--accent)");
    expect(el.style.background).toBe("var(--accent)");
  });
});


