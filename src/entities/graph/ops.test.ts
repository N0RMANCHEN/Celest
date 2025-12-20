import { describe, expect, it } from "vitest";

import {
  createEmptyCodeGraph,
  removeNode,
  upsertEdge,
  upsertNode,
  updateNodePosition,
} from "./ops";

describe("CodeGraph ops", () => {
  it("upsertNode + updateNodePosition works and is immutable", () => {
    const g0 = createEmptyCodeGraph();
    const g1 = upsertNode(g0, {
      id: "n1",
      kind: "note",
      title: "Note",
      position: { x: 0, y: 0 },
      text: "hi",
    });

    expect(g0).not.toBe(g1);
    expect(Object.keys(g0.nodes)).toHaveLength(0);
    expect(g1.nodes.n1.title).toBe("Note");

    const g2 = updateNodePosition(g1, "n1", { x: 10, y: 20 });
    expect(g2.nodes.n1.position).toEqual({ x: 10, y: 20 });
    expect(g1.nodes.n1.position).toEqual({ x: 0, y: 0 });
  });

  it("removeNode also removes connected edges", () => {
    const g0 = createEmptyCodeGraph();
    const g1 = upsertNode(g0, {
      id: "a",
      kind: "note",
      title: "A",
      position: { x: 0, y: 0 },
      text: "",
    });
    const g2 = upsertNode(g1, {
      id: "b",
      kind: "note",
      title: "B",
      position: { x: 0, y: 0 },
      text: "",
    });
    const g3 = upsertEdge(g2, { id: "e1", source: "a", target: "b" });

    expect(Object.keys(g3.edges)).toEqual(["e1"]);
    const g4 = removeNode(g3, "a");
    expect(g4.nodes.a).toBeUndefined();
    expect(g4.edges.e1).toBeUndefined();
  });
});
