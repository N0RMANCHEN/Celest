/**
 * features/canvas/hooks/useCanvasFocus.test.tsx
 * ----------------
 * 测试 Canvas focus hook
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCanvasFocus } from "./useCanvasFocus";
import type { CanvasViewport } from "../../../entities/canvas/canvasEvents";
import type { CanvasNode } from "../adapters/codeGraphToCanvas";

describe("useCanvasFocus", () => {
  let mockContainer: HTMLDivElement;
  let containerRef: React.RefObject<HTMLDivElement | null>;
  let onViewportChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockContainer = document.createElement("div");
    Object.defineProperty(mockContainer, "clientWidth", {
      value: 800,
      writable: false,
      configurable: true,
    });
    Object.defineProperty(mockContainer, "clientHeight", {
      value: 600,
      writable: false,
      configurable: true,
    });
    containerRef = { current: mockContainer };
    onViewportChange = vi.fn();
  });

  it("应该在 focusRequest 存在时居中节点", () => {
    const nodes: CanvasNode[] = [
      {
        id: "node1",
        type: "noteNode",
        position: { x: 100, y: 100 },
        data: { kind: "note", title: "Test" },
        selected: false,
      },
    ];

    const viewport: CanvasViewport = { x: 0, y: 0, zoom: 1, z: 1 };
    const focusRequest = { nodeId: "node1", nonce: 1 };

    renderHook(() =>
      useCanvasFocus(
        focusRequest,
        nodes,
        viewport,
        containerRef,
        false,
        false,
        false,
        onViewportChange
      )
    );

    expect(onViewportChange).toHaveBeenCalled();
    const call = onViewportChange.mock.calls[0][0];
    expect(call.x).toBe(400 - 100 * 1); // centerX - node.x * zoom
    expect(call.y).toBe(300 - 100 * 1); // centerY - node.y * zoom
    expect(call.zoom).toBe(1);
  });

  it("在交互中不应该执行 focus", () => {
    const nodes: CanvasNode[] = [
      {
        id: "node1",
        type: "noteNode",
        position: { x: 100, y: 100 },
        data: { kind: "note", title: "Test" },
        selected: false,
      },
    ];

    const viewport: CanvasViewport = { x: 0, y: 0, zoom: 1, z: 1 };
    const focusRequest = { nodeId: "node1", nonce: 1 };

    // 测试 isDragging
    renderHook(() =>
      useCanvasFocus(
        focusRequest,
        nodes,
        viewport,
        containerRef,
        true, // isDragging
        false,
        false,
        onViewportChange
      )
    );

    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it("当 focusRequest 为 null 时不应该调用 onViewportChange", () => {
    const nodes: CanvasNode[] = [];
    const viewport: CanvasViewport = { x: 0, y: 0, zoom: 1, z: 1 };

    renderHook(() =>
      useCanvasFocus(
        null,
        nodes,
        viewport,
        containerRef,
        false,
        false,
        false,
        onViewportChange
      )
    );

    expect(onViewportChange).not.toHaveBeenCalled();
  });
});

