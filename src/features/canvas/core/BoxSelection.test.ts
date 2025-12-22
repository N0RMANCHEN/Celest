import { describe, expect, it } from "vitest";

import {
  getNodeBounds,
  isNodeInSelectionBox,
  normalizeSelectionBox,
} from "./BoxSelection";

describe("BoxSelection", () => {
  it("normalizeSelectionBox 标准化坐标（左右/上下交换）", () => {
    const box = normalizeSelectionBox({ x: 10, y: 30 }, { x: -5, y: 5 });
    expect(box).toEqual({ left: -5, top: 5, right: 10, bottom: 30 });
  });

  it("getNodeBounds 依据位置和尺寸生成包围盒", () => {
    const bounds = getNodeBounds({ x: 5, y: 6 }, { width: 10, height: 20 });
    expect(bounds).toEqual({ left: 5, top: 6, right: 15, bottom: 26 });
  });

  it("isNodeInSelectionBox 部分重叠即为选中（Figma 行为）", () => {
    const node = { left: 10, top: 10, right: 20, bottom: 20 };
    const box = { left: 15, top: 15, right: 30, bottom: 30 };
    expect(isNodeInSelectionBox(node, box)).toBe(true);
  });

  it("isNodeInSelectionBox 无重叠则不选中", () => {
    const node = { left: 0, top: 0, right: 5, bottom: 5 };
    const box = { left: 10, top: 10, right: 15, bottom: 15 };
    expect(isNodeInSelectionBox(node, box)).toBe(false);
  });
});

