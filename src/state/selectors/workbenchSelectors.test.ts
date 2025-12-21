import { describe, expect, it } from "vitest";

import type { AppState } from "../types";
import {
  selectSelectedGraphNode,
  selectFocusRequest,
  selectCanvasViewModel,
} from "./workbenchSelectors";
import { createEmptyCodeGraph, upsertNode } from "../../entities/graph/ops";

function makeMockState(project: AppState["projects"][0] | null): AppState {
  return {
    getActiveProject: () => project,
    panels: { left: true, inspector: true, terminal: true },
    togglePanel: () => {},
    projects: project ? [project] : [],
    activeProjectId: project?.id,
    recents: [],
    hydrateRecents: async () => {},
    goHome: () => {},
    setActiveProject: () => {},
    closeProject: () => {},
    openProjectFolder: async () => {},
    reopenRecent: async () => {},
    saveActiveProject: async () => {},
    getActiveView: () => null,
    setActiveView: () => {},
    updateActiveViewViewport: () => {},
    selectAndFocusNode: () => {},
    createNoteNodeAt: () => {},
    updateNodeTitle: () => {},
    updateNoteText: () => {},
    updateFilePath: () => {},
    onNodesChange: () => {},
    onEdgesChange: () => {},
    onConnect: () => {},
    onSelectionChange: () => {},
    fsIndexByProjectId: {},
    fsExpandedByProjectId: {},
    fsSelectedIdByProjectId: {},
    setFsIndexSnapshot: () => {},
    removeFsIndexSnapshot: () => {},
    getFsIndexForProject: () => null,
    getActiveFsIndex: () => null,
    toggleFsExpanded: () => {},
    selectFsEntry: () => {},
    clearFsSelection: () => {},
    hydrateFsTreeUi: () => {},
    getActiveFsExpanded: () => ({}),
    getActiveFsSelectedId: () => null,
    activeFilePath: null,
    openFile: () => {},
    closeFile: () => {},
    terminalLines: [],
    terminalLog: () => {},
    terminalClear: () => {},
    saveUiByProjectId: {},
    initProjectPersistence: () => {},
    removeProjectPersistence: () => {},
    markActiveProjectDirty: () => {},
    flushActiveProjectSave: async () => {},
    getActiveSaveUi: () => null,
  } as AppState;
}

describe("workbenchSelectors", () => {
  it("selectSelectedGraphNode returns null when no project", () => {
    const state = makeMockState(null);
    expect(selectSelectedGraphNode(state)).toBeNull();
  });

  it("selectSelectedGraphNode returns null when no selection", () => {
    const graph = createEmptyCodeGraph();
    const project = {
      id: "p1",
      name: "test",
      workspaceMeta: { createdAt: "", updatedAt: "" },
      dirHandle: {} as FileSystemDirectoryHandle,
      handles: {},
      rootDirId: "fs:/",
      meta: {},
      graph,
      selectedIds: [],
      focusNodeId: undefined,
      focusNonce: 0,
      activeViewId: "main" as const,
      views: [],
      treeExpanded: {},
    };
    const state = makeMockState(project);
    expect(selectSelectedGraphNode(state)).toBeNull();
  });

  it("selectSelectedGraphNode returns selected node", () => {
    const graph = createEmptyCodeGraph();
    const nodeId = "n1";
    const updatedGraph = upsertNode(graph, {
      id: nodeId,
      kind: "note",
      title: "Test Note",
      position: { x: 0, y: 0 },
      text: "content",
    });
    const project = {
      id: "p1",
      name: "test",
      workspaceMeta: { createdAt: "", updatedAt: "" },
      dirHandle: {} as FileSystemDirectoryHandle,
      handles: {},
      rootDirId: "fs:/",
      meta: {},
      graph: updatedGraph,
      selectedIds: [nodeId],
      focusNodeId: undefined,
      focusNonce: 0,
      activeViewId: "main" as const,
      views: [],
      treeExpanded: {},
    };
    const state = makeMockState(project);
    const node = selectSelectedGraphNode(state);
    expect(node).not.toBeNull();
    expect(node?.id).toBe(nodeId);
    expect(node?.kind).toBe("note");
  });

  it("selectFocusRequest returns null when no focus", () => {
    const project = {
      id: "p1",
      name: "test",
      workspaceMeta: { createdAt: "", updatedAt: "" },
      dirHandle: {} as FileSystemDirectoryHandle,
      handles: {},
      rootDirId: "fs:/",
      meta: {},
      graph: createEmptyCodeGraph(),
      selectedIds: [],
      focusNodeId: undefined,
      focusNonce: 0,
      activeViewId: "main" as const,
      views: [],
      treeExpanded: {},
    };
    const state = makeMockState(project);
    expect(selectFocusRequest(state)).toBeNull();
  });

  it("selectFocusRequest returns focus request", () => {
    const project = {
      id: "p1",
      name: "test",
      workspaceMeta: { createdAt: "", updatedAt: "" },
      dirHandle: {} as FileSystemDirectoryHandle,
      handles: {},
      rootDirId: "fs:/",
      meta: {},
      graph: createEmptyCodeGraph(),
      selectedIds: [],
      focusNodeId: "n1",
      focusNonce: 5,
      activeViewId: "main" as const,
      views: [],
      treeExpanded: {},
    };
    const state = makeMockState(project);
    const request = selectFocusRequest(state);
    expect(request).toEqual({ nodeId: "n1", nonce: 5 });
  });

  it("selectCanvasViewModel returns empty when no project", () => {
    const state = makeMockState(null);
    const vm = selectCanvasViewModel(state);
    expect(vm.nodes).toEqual([]);
    expect(vm.edges).toEqual([]);
  });

  it("selectCanvasViewModel converts graph to ReactFlow format", () => {
    const graph = createEmptyCodeGraph();
    const nodeId = "n1";
    const updatedGraph = upsertNode(graph, {
      id: nodeId,
      kind: "note",
      title: "Test Note",
      position: { x: 10, y: 20 },
      text: "content",
    });
    const project = {
      id: "p1",
      name: "test",
      workspaceMeta: { createdAt: "", updatedAt: "" },
      dirHandle: {} as FileSystemDirectoryHandle,
      handles: {},
      rootDirId: "fs:/",
      meta: {},
      graph: updatedGraph,
      selectedIds: [nodeId],
      focusNodeId: undefined,
      focusNonce: 0,
      activeViewId: "main" as const,
      views: [],
      treeExpanded: {},
    };
    const state = makeMockState(project);
    const vm = selectCanvasViewModel(state);
    expect(vm.nodes).toHaveLength(1);
    expect(vm.nodes[0].id).toBe(nodeId);
    expect(vm.nodes[0].selected).toBe(true);
    expect(vm.nodes[0].position).toEqual({ x: 10, y: 20 });
  });
});

