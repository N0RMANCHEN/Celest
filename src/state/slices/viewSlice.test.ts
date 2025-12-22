import { describe, expect, it, vi } from "vitest";
import { createStore } from "zustand/vanilla";

import { createViewSlice } from "./viewSlice";
import type { ViewSlice } from "../types";
import type { ProjectState } from "../../entities/project/types";
import type { StateCreator } from "zustand";

type TestState = {
  projects: ProjectState[];
  activeProjectId?: string;
  markActiveProjectDirty: (source: string) => void;
  getActiveProject: () => ProjectState | null;
} & ViewSlice;

function makeStore(project?: ProjectState) {
  const slice = createViewSlice as unknown as StateCreator<TestState, [], [], ViewSlice>;
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
    graph: { version: 1, nodes: {}, edges: {} },
    selectedIds: [],
    focusNodeId: undefined,
    focusNonce: 0,
    activeViewId: "main",
    views: [
      { id: "main", name: "Main", viewport: { x: 0, y: 0, zoom: 1, z: 1 } },
      { id: "view2", name: "View 2", viewport: { x: 10, y: 20, zoom: 0.8, z: 0.8 } },
    ],
    treeExpanded: {},
    ...overrides,
  };
}

describe("viewSlice", () => {
  it("getActiveView 返回当前活动的视图", () => {
    const project = makeStubProject();
    const store = makeStore(project);
    const view = store.getState().getActiveView();
    expect(view?.id).toBe("main");
  });

  it("getActiveView 无项目时返回 null", () => {
    const store = makeStore();
    expect(store.getState().getActiveView()).toBeNull();
  });

  it("setActiveView 切换活动视图", () => {
    const project = makeStubProject();
    const store = makeStore(project);
    store.getState().setActiveView("view2");
    const view = store.getState().getActiveView();
    expect(view?.id).toBe("view2");
    expect(store.getState().markActiveProjectDirty).toHaveBeenCalledWith("view");
  });

  it("setActiveView 视图不存在时不改变", () => {
    const project = makeStubProject();
    const store = makeStore(project);
    const initialView = store.getState().getActiveView();
    store.getState().setActiveView("nonexistent" as any);
    const view = store.getState().getActiveView();
    expect(view?.id).toBe(initialView?.id);
    expect(store.getState().markActiveProjectDirty).not.toHaveBeenCalled();
  });

  it("setActiveView 已是当前视图时不改变", () => {
    const project = makeStubProject();
    const store = makeStore(project);
    store.getState().setActiveView("main");
    expect(store.getState().markActiveProjectDirty).not.toHaveBeenCalled();
  });

  it("updateActiveViewViewport 更新视口", () => {
    const project = makeStubProject();
    const store = makeStore(project);
    store.getState().updateActiveViewViewport({ x: 100, y: 200, zoom: 1.5, z: 1.5 });
    const view = store.getState().getActiveView();
    expect(view?.viewport.x).toBe(100);
    expect(view?.viewport.y).toBe(200);
    expect(view?.viewport.zoom).toBe(1.5);
    expect(store.getState().markActiveProjectDirty).toHaveBeenCalledWith("viewport");
  });

  it("updateActiveViewViewport 视口未改变时不更新", () => {
    const project = makeStubProject();
    const store = makeStore(project);
    store.getState().updateActiveViewViewport({ x: 0, y: 0, zoom: 1, z: 1 });
    expect(store.getState().markActiveProjectDirty).not.toHaveBeenCalled();
  });

  it("updateActiveViewViewport 无活动视图时不更新", () => {
    const project = makeStubProject({ activeViewId: "nonexistent" as any });
    const store = makeStore(project);
    store.getState().updateActiveViewViewport({ x: 100, y: 200, zoom: 1.5, z: 1.5 });
    expect(store.getState().markActiveProjectDirty).not.toHaveBeenCalled();
  });
});

