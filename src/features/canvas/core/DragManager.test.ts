import { describe, expect, it } from "vitest";

import { initDragState, startDrag, updateDragPositions } from "./DragManager";

describe("DragManager", () => {
  it("initDragState 初始化为空状态", () => {
    const s = initDragState();
    expect(s.isDragging).toBe(false);
    expect(s.draggedNodeIds.size).toBe(0);
    expect(s.dragStartPositions.size).toBe(0);
  });

  it("startDrag 拖拽已选中节点时，保持所有选中并拖拽所有选中节点", () => {
    const selection = new Set<string>(["a", "b"]);
    const positions = new Map([
      ["a", { x: 0, y: 0 }],
      ["b", { x: 10, y: 10 }],
    ]);

    const res = startDrag("a", selection, positions);
    expect(new Set(res.selectedIds)).toEqual(new Set(["a", "b"]));
    expect(new Set(res.draggedNodeIds)).toEqual(new Set(["a", "b"]));
    expect(res.dragStartPositions.get("a")).toEqual({ x: 0, y: 0 });
    expect(res.dragStartPositions.get("b")).toEqual({ x: 10, y: 10 });
  });

  it("startDrag 拖拽未选中节点时，清空所有选中，重新选中该节点并拖拽", () => {
    const selection = new Set<string>(["a", "b"]);
    const positions = new Map([
      ["a", { x: 0, y: 0 }],
      ["b", { x: 10, y: 10 }],
      ["c", { x: 5, y: 5 }],
    ]);

    const res = startDrag("c", selection, positions);
    expect(new Set(res.selectedIds)).toEqual(new Set(["c"]));
    expect(new Set(res.draggedNodeIds)).toEqual(new Set(["c"]));
    expect(res.dragStartPositions.get("c")).toEqual({ x: 5, y: 5 });
  });

  it("updateDragPositions 依据 delta 平移所有拖拽节点", () => {
    const dragged = new Set(["a", "b"]);
    const startPos = new Map([
      ["a", { x: 0, y: 0 }],
      ["b", { x: 10, y: 10 }],
    ]);

    const next = updateDragPositions(dragged, startPos, { x: 3, y: -2 });
    expect(next.get("a")).toEqual({ x: 3, y: -2 });
    expect(next.get("b")).toEqual({ x: 13, y: 8 });
  });
});

