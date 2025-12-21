import { describe, expect, it } from "vitest";

import {
  applyViewport,
  canvasToScreen,
  getViewportTransform,
  screenToCanvas,
} from "./ViewportManager";

const vp = { x: 10, y: -5, zoom: 2 };

describe("ViewportManager", () => {
  it("screenToCanvas / canvasToScreen 互为逆变换", () => {
    const screen = { x: 14, y: -1 };
    const canvas = screenToCanvas(screen, vp);
    const back = canvasToScreen(canvas, vp);
    expect(back).toEqual(screen);
  });

  it("applyViewport 等价于 canvasToScreen", () => {
    const p = { x: 3, y: 4 };
    expect(applyViewport(p, vp)).toEqual(canvasToScreen(p, vp));
  });

  it("getViewportTransform 生成 SVG transform 字符串", () => {
    expect(getViewportTransform(vp)).toBe("translate(10, -5) scale(2)");
  });
});

