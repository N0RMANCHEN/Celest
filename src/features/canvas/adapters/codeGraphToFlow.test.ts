import { describe, expect, it } from "vitest";

import { codeGraphToFlow } from "./codeGraphToFlow";

describe("codeGraphToFlow", () => {
  it("maps node kinds and positions into ReactFlow view-model", () => {
    const g = {
      version: 1,
      nodes: {
        n1: {
          id: "n1",
          kind: "note",
          title: "N",
          position: { x: 1, y: 2 },
          text: "hello",
        },
        f1: {
          id: "f1",
          kind: "fileRef",
          title: "README",
          position: { x: 3, y: 4 },
          path: "/Project/README.md",
        },
      },
      edges: {
        e1: {
          id: "e1",
          source: "n1",
          target: "f1",
          sourceHandle: "out",
          targetHandle: "in",
        },
      },
    } as const;

    const vm = codeGraphToFlow(g as any);

    expect(vm.nodes).toHaveLength(2);
    const n1 = vm.nodes.find((n) => n.id === "n1");
    const f1 = vm.nodes.find((n) => n.id === "f1");
    expect(n1?.type).toBe("noteNode");
    expect(f1?.type).toBe("fileRefNode");
    expect(n1?.position).toEqual({ x: 1, y: 2 });
    expect(f1?.data.subtitle).toBe("/Project/README.md");

    expect(vm.edges).toHaveLength(1);
    const e1 = vm.edges[0];
    expect(e1.type).toBe("smoothstep");
    expect(e1.sourceHandle).toBe("out");
    expect(e1.targetHandle).toBe("in");
  });
});
