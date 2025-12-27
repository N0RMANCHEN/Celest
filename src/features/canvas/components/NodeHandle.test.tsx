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
    // 连接时的端点：描边 #60a5fa (rgb(96, 165, 250))，填充 #b3d5ff
    // 浏览器会将十六进制颜色转换为 RGB，所以检查 RGB 值
    expect(el.style.border).toContain("rgb(96, 165, 250)");
    expect(el.style.background).toBe("rgb(179, 213, 255)"); // #b3d5ff 的 RGB 值
  });
});


