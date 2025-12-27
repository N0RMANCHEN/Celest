import { describe, expect, it, vi } from "vitest";
import { createStore } from "zustand/vanilla";

import { createGraphSlice } from "./graphSlice";
import type { GraphSlice } from "../types";
import type { ProjectState } from "../../entities/project/types";
import type { StateCreator } from "zustand";

type TestState = {
  projects: ProjectState[];
  activeProjectId?: string;
  markActiveProjectDirty: (source: string) => void;
  getActiveProject: () => ProjectState | null;
} & GraphSlice;

function makeStore(project?: ProjectState) {
  const slice = createGraphSlice as unknown as StateCreator<TestState, [], [], GraphSlice>;
  return createStore<TestState>((set, get, api) => ({
    projects: project ? [project] : [],
    activeProjectId: project?.id,
    markActiveProjectDirty: vi.fn(),
    getActiveProject: () => {
      if (!project) return null;
      const state = get();
      return state.projects.find((p) => p.id === state.activeProjectId) ?? null;
    },
    ...slice(set, get, api),
  }));
}

function makeStubProject(overrides?: Partial<ProjectState>): ProjectState {
  return {
    id: "p1",
    name: "Test Project",
    workspaceMeta: { createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
    dirHandle: {} as FileSystemDirectoryHandle,
    handles: {},
    rootDirId: "root",
    meta: {},
    graph: {
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
    },
    selectedIds: [],
    focusNodeId: undefined,
    focusNonce: 0,
    activeViewId: "main",
    views: [{ id: "main", name: "Main", viewport: { x: 0, y: 0, zoom: 1, z: 1 } }],
    treeExpanded: {},
    ...overrides,
  };
}

describe("graphSlice", () => {
  describe("selectAndFocusNode", () => {
    it("选择并聚焦节点", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      store.getState().selectAndFocusNode("n1");
      const updated = store.getState().projects[0];
      expect(updated.selectedIds).toEqual(["n1"]);
      expect(updated.focusNodeId).toBe("n1");
      expect(updated.focusNonce).toBe(1);
    });
  });

  describe("createNoteNodeAt", () => {
    it("在指定位置创建笔记节点", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      store.getState().createNoteNodeAt({ x: 200, y: 300 });
      const updated = store.getState().projects[0];
      const newNodeId = Object.keys(updated.graph.nodes).find((id) => id !== "n1" && id !== "n2");
      expect(newNodeId).toBeTruthy();
      const newNode = updated.graph.nodes[newNodeId!];
      expect(newNode.kind).toBe("note");
      expect(newNode.title).toBe("Note");
      expect(newNode.position).toEqual({ x: 200, y: 300 });
      expect(updated.selectedIds).toEqual([newNodeId]);
      expect(store.getState().markActiveProjectDirty).toHaveBeenCalledWith("graph");
    });
  });

  describe("updateNodeTitle", () => {
    it("更新节点标题", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      store.getState().updateNodeTitle("n1", "New Title");
      const updated = store.getState().projects[0];
      expect(updated.graph.nodes.n1.title).toBe("New Title");
      expect(store.getState().markActiveProjectDirty).toHaveBeenCalledWith("graph");
    });

    it("节点不存在时不更新", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      const before = store.getState().projects[0];
      store.getState().updateNodeTitle("nonexistent", "New Title");
      const after = store.getState().projects[0];
      expect(after).toBe(before);
      expect(store.getState().markActiveProjectDirty).toHaveBeenCalled();
    });

    it("标题未改变时不更新", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      const before = store.getState().projects[0];
      store.getState().updateNodeTitle("n1", "Note 1");
      const after = store.getState().projects[0];
      expect(after).toBe(before);
      expect(store.getState().markActiveProjectDirty).toHaveBeenCalled();
    });
  });

  describe("updateNoteText", () => {
    it("更新笔记文本", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      store.getState().updateNoteText("n1", "New Content");
      const updated = store.getState().projects[0];
      const node = updated.graph.nodes.n1;
      expect(node?.kind === "note" ? node.text : undefined).toBe("New Content");
      expect(store.getState().markActiveProjectDirty).toHaveBeenCalledWith("graph");
    });

    it("非笔记节点不更新", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      const before = store.getState().projects[0];
      store.getState().updateNoteText("n2", "New Content");
      const after = store.getState().projects[0];
      expect(after).toBe(before);
    });
  });

  describe("updateFilePath", () => {
    it("更新文件路径", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      store.getState().updateFilePath("n2", "/new/path.md");
      const updated = store.getState().projects[0];
      const node = updated.graph.nodes.n2;
      expect(node?.kind === "fileRef" ? node.path : undefined).toBe("/new/path.md");
      expect(store.getState().markActiveProjectDirty).toHaveBeenCalledWith("graph");
    });

    it("非文件引用节点不更新", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      const before = store.getState().projects[0];
      store.getState().updateFilePath("n1", "/new/path.md");
      const after = store.getState().projects[0];
      expect(after).toBe(before);
    });
  });

  describe("onNodesChange", () => {
    it("处理位置变更", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      store.getState().onNodesChange([
        { id: "n1", type: "position", position: { x: 50, y: 60 } },
      ]);
      const updated = store.getState().projects[0];
      expect(updated.graph.nodes.n1.position).toEqual({ x: 50, y: 60 });
      expect(store.getState().markActiveProjectDirty).toHaveBeenCalledWith("graph");
    });

    it("处理尺寸变更", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      store.getState().onNodesChange([
        { id: "n1", type: "dimensions", dimensions: { width: 320, height: 180 } },
      ]);
      const updated = store.getState().projects[0];
      const node = updated.graph.nodes.n1;
      expect(node?.width).toBe(320);
      expect(node?.height).toBe(180);
      expect(store.getState().markActiveProjectDirty).toHaveBeenCalledWith("graph");
    });

    it("处理节点删除", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      store.getState().onNodesChange([{ id: "n1", type: "remove" }]);
      const updated = store.getState().projects[0];
      expect(updated.graph.nodes.n1).toBeUndefined();
      expect(store.getState().markActiveProjectDirty).toHaveBeenCalledWith("graph");
    });

    it("空变更数组不处理", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      const before = store.getState().projects[0];
      store.getState().onNodesChange([]);
      const after = store.getState().projects[0];
      expect(after).toBe(before);
      expect(store.getState().markActiveProjectDirty).not.toHaveBeenCalled();
    });

    it("无活动项目时不处理", () => {
      const store = makeStore();
      store.getState().onNodesChange([{ id: "n1", type: "remove" }]);
      expect(store.getState().markActiveProjectDirty).not.toHaveBeenCalled();
    });
  });

  describe("onEdgesChange", () => {
    it("处理边删除", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      store.getState().onEdgesChange([{ id: "e1", type: "remove" }]);
      const updated = store.getState().projects[0];
      expect(updated.graph.edges.e1).toBeUndefined();
      expect(store.getState().markActiveProjectDirty).toHaveBeenCalledWith("graph");
    });

    it("空变更数组不处理", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      const before = store.getState().projects[0];
      store.getState().onEdgesChange([]);
      const after = store.getState().projects[0];
      expect(after).toBe(before);
      expect(store.getState().markActiveProjectDirty).not.toHaveBeenCalled();
    });
  });

  describe("onConnect", () => {
    it("创建新连接", () => {
      const project = makeStubProject({
        graph: {
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
          edges: {},
        },
      });
      const store = makeStore(project);
      store.getState().onConnect({ source: "n1", target: "n2" });
      const updated = store.getState().projects[0];
      const edgeIds = Object.keys(updated.graph.edges);
      expect(edgeIds.length).toBe(1);
      const edge = updated.graph.edges[edgeIds[0]];
      expect(edge.source).toBe("n1");
      expect(edge.target).toBe("n2");
      expect(store.getState().markActiveProjectDirty).toHaveBeenCalledWith("graph");
    });

    it("节点不存在时不创建连接", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      const before = store.getState().projects[0];
      store.getState().onConnect({ source: "nonexistent", target: "n2" });
      const after = store.getState().projects[0];
      expect(after).toBe(before);
    });

    it("group 节点不可连接", () => {
      const project = makeStubProject({
        graph: {
          version: 1,
          nodes: {
            n1: {
              id: "n1",
              kind: "group",
              title: "Group",
              position: { x: 0, y: 0 },
            },
            n2: {
              id: "n2",
              kind: "note",
              title: "Note",
              position: { x: 100, y: 100 },
              text: "",
            },
          },
          edges: {},
        },
      });
      const store = makeStore(project);
      const before = store.getState().projects[0];
      store.getState().onConnect({ source: "n1", target: "n2" });
      const after = store.getState().projects[0];
      expect(after).toBe(before);
    });
  });

  describe("onSelectionChange", () => {
    it("更新选择", () => {
      const project = makeStubProject();
      const store = makeStore(project);
      store.getState().onSelectionChange(["n1", "n2"]);
      const updated = store.getState().projects[0];
      expect(updated.selectedIds).toEqual(["n1", "n2"]);
      expect(store.getState().markActiveProjectDirty).toHaveBeenCalledWith("graph");
    });

    it("选择未改变时不更新", () => {
      const project = makeStubProject({ selectedIds: ["n1"] });
      const store = makeStore(project);
      const before = store.getState().projects[0];
      store.getState().onSelectionChange(["n1"]);
      const after = store.getState().projects[0];
      expect(after).toBe(before);
      expect(store.getState().markActiveProjectDirty).not.toHaveBeenCalled();
    });

    it("无活动项目时不处理", () => {
      const store = makeStore();
      store.getState().onSelectionChange(["n1"]);
      expect(store.getState().markActiveProjectDirty).not.toHaveBeenCalled();
    });
  });
});

