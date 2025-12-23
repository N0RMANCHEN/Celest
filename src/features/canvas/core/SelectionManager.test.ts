import { describe, expect, it } from "vitest";

import {
  handleBoxSelection,
  handleNodeClick,
  handlePaneClick,
} from "./SelectionManager";

describe("SelectionManager", () => {
  it("handleNodeClick 正常点击仅选该节点", () => {
    const next = handleNodeClick("a", new Set(["x"]), false);
    expect(Array.from(next)).toEqual(["a"]);
  });

  it("handleNodeClick 非 shift 点击已选中则取消选中", () => {
    const next = handleNodeClick("a", new Set(["a"]), false);
    expect(Array.from(next)).toEqual([]);

    const next2 = handleNodeClick("a", new Set(["a", "b"]), false);
    expect(Array.from(next2)).toEqual([]);
  });

  it("handleNodeClick Shift 点击切换选中状态（toggle）", () => {
    // Shift+点击已选中的节点：从选择中移除，其他节点保持选中
    const next = handleNodeClick("a", new Set(["a", "b"]), true);
    expect(new Set(next)).toEqual(new Set(["b"]));

    // Shift+点击未选中的节点：添加到选择中，其他节点保持选中
    const next2 = handleNodeClick("c", new Set(["a", "b"]), true);
    expect(new Set(next2)).toEqual(new Set(["a", "b", "c"]));
    
    // 再次 Shift+点击已选中的节点：从选择中移除
    const next3 = handleNodeClick("c", new Set(["a", "b", "c"]), true);
    expect(new Set(next3)).toEqual(new Set(["a", "b"]));
  });

  it("handleBoxSelection 部分重叠即选中（Figma 行为）", () => {
    const ids = ["n1", "n2", "n3"];
    const bounds = new Map([
      ["n1", { left: 0, top: 0, right: 10, bottom: 10 }],
      ["n2", { left: 20, top: 20, right: 30, bottom: 30 }],
      ["n3", { left: 5, top: 5, right: 15, bottom: 15 }],
    ]);
    const box = { left: 8, top: 8, right: 25, bottom: 25 };

    const selected = handleBoxSelection(ids, bounds, box);
    expect(new Set(selected)).toEqual(new Set(["n1", "n2", "n3"]));
  });

  it("handlePaneClick 清空选中", () => {
    expect(handlePaneClick().size).toBe(0);
  });
});

