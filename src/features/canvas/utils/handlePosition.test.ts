/**
 * features/canvas/utils/handlePosition.test.ts
 * ----------------
 * 测试 handle 位置计算函数
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { getHandleCanvasPosition } from "./handlePosition";
import type { CanvasViewport } from "../../../entities/canvas/canvasEvents";

describe("handlePosition", () => {
  let mockSvgElement: SVGSVGElement;
  let mockHandleElement: HTMLElement;
  let svgRef: React.RefObject<SVGSVGElement | null>;

  beforeEach(() => {
    // 创建模拟的 SVG 元素
    mockSvgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    ) as SVGSVGElement;
    mockSvgElement.getBoundingClientRect = vi.fn(() => ({
      left: 100,
      top: 100,
      width: 800,
      height: 600,
      right: 900,
      bottom: 700,
      x: 100,
      y: 100,
      toJSON: vi.fn(),
    })) as any;

    // 创建模拟的 handle 元素
    mockHandleElement = document.createElement("div");
    mockHandleElement.setAttribute("data-node-id", "node1");
    mockHandleElement.setAttribute("data-handle-id", "handle1");
    mockHandleElement.getBoundingClientRect = vi.fn(() => ({
      left: 200,
      top: 200,
      width: 20,
      height: 20,
      right: 220,
      bottom: 220,
      x: 200,
      y: 200,
      toJSON: vi.fn(),
    })) as any;

    svgRef = { current: mockSvgElement };
  });

  it("应该返回 handle 的 canvas 坐标", () => {
    // Mock querySelector
    mockSvgElement.querySelector = vi.fn(() => mockHandleElement) as any;

    const viewport: CanvasViewport = { x: 0, y: 0, zoom: 1, z: 1 };
    const result = getHandleCanvasPosition(
      svgRef,
      viewport,
      "node1",
      "handle1"
    );

    expect(result).not.toBeNull();
    // handle 中心点: (200 + 10, 200 + 10) = (210, 210)
    // 相对 SVG: (210 - 100, 210 - 100) = (110, 110)
    // 转换为 canvas 坐标（考虑 viewport）
    expect(result?.x).toBeCloseTo(110, 1);
    expect(result?.y).toBeCloseTo(110, 1);
  });

  it("当 svgRef 为 null 时应该返回 null", () => {
    const nullRef = { current: null };
    const viewport: CanvasViewport = { x: 0, y: 0, zoom: 1, z: 1 };
    const result = getHandleCanvasPosition(
      nullRef,
      viewport,
      "node1",
      "handle1"
    );

    expect(result).toBeNull();
  });

  it("当找不到 handle 元素时应该返回 null", () => {
    mockSvgElement.querySelector = vi.fn(() => null) as any;
    const viewport: CanvasViewport = { x: 0, y: 0, zoom: 1, z: 1 };
    const result = getHandleCanvasPosition(
      svgRef,
      viewport,
      "node1",
      "handle1"
    );

    expect(result).toBeNull();
  });
});

