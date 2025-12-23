import { describe, expect, it } from "vitest";

import {
  applyViewport,
  canvasToScreen,
  clampViewportToBounds,
  getViewportTransform,
  screenToCanvas,
} from "./ViewportManager";
import { rectFromCenterSize } from "./canvasBounds";

const vp = { x: 10, y: -5, zoom: 2, z: 2 };

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

  it("clampViewportToBounds 会把平移限制在画布边界内（zoom=1）", () => {
    const bounds = rectFromCenterSize({ x: 0, y: 0 }, { width: 8000, height: 8000 });
    const size = { width: 1000, height: 800 };

    // Too far left (vx too large) -> clamp to maxVx = -minX*zoom = 4000
    const v1 = clampViewportToBounds({ x: 6000, y: 0, zoom: 1, z: 1 }, size, bounds);
    expect(v1.x).toBe(4000);

    // Too far right (vx too small) -> clamp to minVx = W - maxX*zoom = 1000 - 4000 = -3000
    const v2 = clampViewportToBounds({ x: -9000, y: 0, zoom: 1, z: 1 }, size, bounds);
    expect(v2.x).toBe(-3000);
  });

  it("clampViewportToBounds 在缩放很小时会锁定居中（可视区域大于边界）", () => {
    const bounds = rectFromCenterSize({ x: 0, y: 0 }, { width: 8000, height: 8000 });
    const size = { width: 1000, height: 800 };

    const v = clampViewportToBounds({ x: 0, y: 0, zoom: 0.1, z: 0.1 }, size, bounds);
    // Centered: vx = W/2 - centerX*zoom = 500, vy = 400
    expect(v.x).toBe(500);
    expect(v.y).toBe(400);
  });
});

