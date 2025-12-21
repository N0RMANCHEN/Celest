import { describe, expect, it } from "vitest";

import {
  calculateBezierPath,
  calculateStraightPath,
} from "./edgeRouting";

describe("edgeRouting", () => {
  it("calculateStraightPath 生成直线路径和控制点", () => {
    const res = calculateStraightPath({ x: 0, y: 0 }, { x: 10, y: 0 });
    expect(res.d).toBe("M 0,0 L 10,0");
    expect(res.points).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
  });

  it("calculateBezierPath 生成平滑曲线路径并包含控制点", () => {
    const res = calculateBezierPath({ x: 0, y: 0 }, { x: 100, y: 0 });
    expect(res.points).toHaveLength(4);
    expect(res.d.startsWith("M 0,0 C")).toBe(true);
    // 控制点对称于起终点附近（仅验证大致特征）
    const [, cp1, cp2, end] = res.points;
    expect(cp1.y).toBe(0);
    expect(cp2.y).toBe(0);
    expect(end).toEqual({ x: 100, y: 0 });
  });
});

