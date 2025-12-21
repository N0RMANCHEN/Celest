import { describe, expect, it } from "vitest";

import {
  boundsFromPoints,
  boundsOverlap,
  distance,
  pointInBounds,
} from "./geometry";

describe("geometry utils", () => {
  it("pointInBounds 判断点是否在矩形内（含边界）", () => {
    const bounds = { left: 0, top: 0, right: 10, bottom: 10 };
    expect(pointInBounds({ x: 0, y: 0 }, bounds)).toBe(true); // 边界
    expect(pointInBounds({ x: 10, y: 10 }, bounds)).toBe(true); // 边界
    expect(pointInBounds({ x: -1, y: 5 }, bounds)).toBe(false);
  });

  it("boundsOverlap 检测矩形部分重叠", () => {
    const a = { left: 0, top: 0, right: 5, bottom: 5 };
    const b = { left: 4, top: 4, right: 10, bottom: 10 };
    const c = { left: 6, top: 6, right: 8, bottom: 8 };
    expect(boundsOverlap(a, b)).toBe(true);
    expect(boundsOverlap(a, c)).toBe(false);
  });

  it("boundsFromPoints 生成包围盒", () => {
    const bounds = boundsFromPoints([
      { x: 1, y: 2 },
      { x: -3, y: 5 },
      { x: 4, y: -1 },
    ]);
    expect(bounds).toEqual({ left: -3, top: -1, right: 4, bottom: 5 });
  });

  it("boundsFromPoints 空数组返回 null", () => {
    expect(boundsFromPoints([])).toBeNull();
  });

  it("distance 计算两点距离", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

