import { describe, expect, it } from "vitest";

import { codeGraphToCanvas } from "./codeGraphToCanvas";
import type { CodeGraphModel } from "../../../entities/graph/types";

describe("codeGraphToCanvas", () => {
  it("转换基本图结构", () => {
    const graph: CodeGraphModel = {
      version: 1,
      nodes: {
        n1: {
          id: "n1",
          kind: "note",
          title: "Note 1",
          position: { x: 0, y: 0 },
          text: "Content",
        },
        n2: {
          id: "n2",
          kind: "fileRef",
          title: "File",
          position: { x: 100, y: 100 },
          path: "/file.md",
        },
      },
      edges: {
        e1: {
          id: "e1",
          source: "n1",
          target: "n2",
        },
      },
    };

    const result = codeGraphToCanvas(graph);
    expect(result.nodes.length).toBe(2);
    expect(result.edges.length).toBe(1);
    expect(result.nodes[0].id).toBe("n1");
    expect(result.nodes[0].type).toBe("noteNode");
    expect(result.nodes[1].type).toBe("fileRefNode");
    expect(result.edges[0].source).toBe("n1");
    expect(result.edges[0].target).toBe("n2");
  });

  it("标记选中的节点和边", () => {
    const graph: CodeGraphModel = {
      version: 1,
      nodes: {
        n1: {
          id: "n1",
          kind: "note",
          title: "Note 1",
          position: { x: 0, y: 0 },
          text: "",
        },
      },
      edges: {
        e1: {
          id: "e1",
          source: "n1",
          target: "n1",
        },
      },
    };

    const result = codeGraphToCanvas(graph, ["n1", "e1"]);
    expect(result.nodes[0].selected).toBe(true);
    expect(result.edges[0].selected).toBe(true);
  });

  it("处理 frame 节点的尺寸", () => {
    const graph: CodeGraphModel = {
      version: 1,
      nodes: {
        f1: {
          id: "f1",
          kind: "frame",
          title: "Frame",
          position: { x: 0, y: 0 },
          width: 300,
          height: 200,
        },
      },
      edges: {},
    };

    const result = codeGraphToCanvas(graph);
    expect(result.nodes[0].width).toBe(300);
    expect(result.nodes[0].height).toBe(200);
  });

  it("处理不同类型的节点", () => {
    const graph: CodeGraphModel = {
      version: 1,
      nodes: {
        n1: {
          id: "n1",
          kind: "note",
          title: "Note",
          position: { x: 0, y: 0 },
          text: "",
        },
        g1: {
          id: "g1",
          kind: "group",
          title: "Group",
          position: { x: 0, y: 0 },
        },
        s1: {
          id: "s1",
          kind: "subgraphInstance",
          title: "Subgraph",
          position: { x: 0, y: 0 },
          defId: "def1",
        },
      },
      edges: {},
    };

    const result = codeGraphToCanvas(graph);
    expect(result.nodes.find((n) => n.id === "n1")?.type).toBe("noteNode");
    expect(result.nodes.find((n) => n.id === "g1")?.type).toBe("groupNode");
    expect(result.nodes.find((n) => n.id === "s1")?.type).toBe("subgraphNode");
  });

  it("处理边的手柄", () => {
    const graph: CodeGraphModel = {
      version: 1,
      nodes: {
        n1: {
          id: "n1",
          kind: "note",
          title: "Note 1",
          position: { x: 0, y: 0 },
          text: "",
        },
        n2: {
          id: "n2",
          kind: "note",
          title: "Note 2",
          position: { x: 100, y: 100 },
          text: "",
        },
      },
      edges: {
        e1: {
          id: "e1",
          source: "n1",
          target: "n2",
          sourceHandle: "out",
          targetHandle: "in",
        },
      },
    };

    const result = codeGraphToCanvas(graph);
    expect(result.edges[0].sourceHandle).toBe("out");
    expect(result.edges[0].targetHandle).toBe("in");
  });

  it("清理无效的手柄值", () => {
    const graph: CodeGraphModel = {
      version: 1,
      nodes: {
        n1: {
          id: "n1",
          kind: "note",
          title: "Note 1",
          position: { x: 0, y: 0 },
          text: "",
        },
        n2: {
          id: "n2",
          kind: "note",
          title: "Note 2",
          position: { x: 100, y: 100 },
          text: "",
        },
      },
      edges: {
        e1: {
          id: "e1",
          source: "n1",
          target: "n2",
          sourceHandle: "undefined" as any,
          targetHandle: "null" as any,
        },
      },
    };

    const result = codeGraphToCanvas(graph);
    expect(result.edges[0].sourceHandle).toBeUndefined();
    expect(result.edges[0].targetHandle).toBeUndefined();
  });

  it("节点按 key 排序", () => {
    const graph: CodeGraphModel = {
      version: 1,
      nodes: {
        z_node: {
          id: "z_node",
          kind: "note",
          title: "Z",
          position: { x: 0, y: 0 },
          text: "",
        },
        a_node: {
          id: "a_node",
          kind: "note",
          title: "A",
          position: { x: 0, y: 0 },
          text: "",
        },
        m_node: {
          id: "m_node",
          kind: "note",
          title: "M",
          position: { x: 0, y: 0 },
          text: "",
        },
      },
      edges: {},
    };

    const result = codeGraphToCanvas(graph);
    expect(result.nodes.map((n) => n.id)).toEqual(["a_node", "m_node", "z_node"]);
  });

  it("边按 key 排序", () => {
    const graph: CodeGraphModel = {
      version: 1,
      nodes: {
        n1: {
          id: "n1",
          kind: "note",
          title: "Note 1",
          position: { x: 0, y: 0 },
          text: "",
        },
        n2: {
          id: "n2",
          kind: "note",
          title: "Note 2",
          position: { x: 100, y: 100 },
          text: "",
        },
      },
      edges: {
        e3: {
          id: "e3",
          source: "n1",
          target: "n2",
        },
        e1: {
          id: "e1",
          source: "n1",
          target: "n2",
        },
        e2: {
          id: "e2",
          source: "n1",
          target: "n2",
        },
      },
    };

    const result = codeGraphToCanvas(graph);
    expect(result.edges.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
  });

  it("处理缺失位置的节点", () => {
    const graph: CodeGraphModel = {
      version: 1,
      nodes: {
        n1: {
          id: "n1",
          kind: "note",
          title: "Note",
          position: { x: undefined as any, y: undefined as any },
          text: "",
        },
      },
      edges: {},
    };

    const result = codeGraphToCanvas(graph);
    expect(result.nodes[0].position).toEqual({ x: 0, y: 0 });
  });
});

