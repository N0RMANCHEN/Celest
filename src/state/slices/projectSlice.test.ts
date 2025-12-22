import { describe, it, expect, vi, beforeEach } from "vitest";
import { create } from "zustand";
import { createProjectSlice } from "./projectSlice";
import type { AppState, TerminalSlice } from "../types";
import type { Mock } from "vitest";

vi.mock("../../features/project/usecases", () => {
  return {
    openProjectFolderUsecase: vi.fn(),
    reopenRecentUsecase: vi.fn(),
  };
});

function createStore(overrides?: Partial<AppState>) {
  const terminalSlice: TerminalSlice = {
    terminalLines: [],
    terminalLog: vi.fn(),
    terminalClear: vi.fn(),
  };

  const baseState = {
    projects: [],
    activeProjectId: undefined,
    recents: [],
    openStatus: { state: "idle" } as AppState["openStatus"],
  };

  const store = create<AppState>()((...a) => ({
    ...(baseState as unknown as AppState),
    ...terminalSlice,
    ...overrides,
    ...createProjectSlice(...a),
  }));

  return store;
}

describe("projectSlice open/reopen status", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.stubGlobal("alert", vi.fn());
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("showDirectoryPicker", vi.fn());
  });

  it("openProjectFolder: cancel -> idle, no error", async () => {
    const { openProjectFolderUsecase } = await import("../../features/project/usecases");
    (openProjectFolderUsecase as Mock).mockResolvedValue({ kind: "cancel" });

    const store = createStore();

    await store.getState().openProjectFolder();

    expect(store.getState().openStatus.state).toBe("idle");
    expect(store.getState().terminalLines).toEqual([]);
  });

  it("openProjectFolder: error -> error state + terminal error log", async () => {
    const { openProjectFolderUsecase } = await import("../../features/project/usecases");
    (openProjectFolderUsecase as Mock).mockResolvedValue({ kind: "error", message: "boom" });

    const terminalLog = vi.fn();
    const store = createStore({ terminalLog });

    await store.getState().openProjectFolder();

    const status = store.getState().openStatus;
    expect(status.state).toBe("error");
    if (status.state === "error") {
      expect(status.message).toContain("boom");
    }
    expect(terminalLog).toHaveBeenCalledWith("error", expect.stringContaining("boom"));
  });

  it("openProjectFolder: ok -> idle and terminal info log", async () => {
    const mockProject = {
      id: "p1",
      name: "proj",
      dirHandle: {} as FileSystemDirectoryHandle,
      meta: {},
      workspaceMeta: { updatedAt: "2024-01-01T00:00:00Z" },
      graph: { version: 1, nodes: {}, edges: {} },
      handles: {},
      rootDirId: "fs:/",
      selectedIds: [],
      focusNodeId: undefined,
      focusNonce: 0,
      activeViewId: "main",
      views: [],
      treeExpanded: {},
    };
    const { openProjectFolderUsecase } = await import("../../features/project/usecases");
    (openProjectFolderUsecase as Mock).mockResolvedValue({
      kind: "ok",
      project: mockProject,
      recents: [],
      fsIndex: null,
    });

    // hydrateFsTreeUi requires setFsIndexSnapshot sync; stub dependencies
    const hydrateFsTreeUi = vi.fn();
    const setFsIndexSnapshot = vi.fn();
    const initProjectPersistence = vi.fn();

    const store = createStore({
      hydrateFsTreeUi,
      setFsIndexSnapshot,
      initProjectPersistence,
    });

    await store.getState().openProjectFolder();

    expect(store.getState().openStatus.state).toBe("idle");
    expect(store.getState().projects.length).toBe(1);
    // Terminal info should be called至少一次（开始/结束）
    const terminalLog = store.getState().terminalLog as unknown as Mock;
    expect(terminalLog).toHaveBeenCalled();
  });

  it("reopenRecent: cancel -> idle", async () => {
    const { reopenRecentUsecase } = await import("../../features/project/usecases");
    (reopenRecentUsecase as Mock).mockResolvedValue({ kind: "cancel" });

    const store = createStore();
    await store.getState().reopenRecent("k");

    expect(store.getState().openStatus.state).toBe("idle");
  });

  it("reopenRecent: error -> error state + terminal error log", async () => {
    const { reopenRecentUsecase } = await import("../../features/project/usecases");
    (reopenRecentUsecase as Mock).mockResolvedValue({ kind: "error", message: "fail" });

    const terminalLog = vi.fn();
    const store = createStore({ terminalLog });
    await store.getState().reopenRecent("k");

    const status = store.getState().openStatus;
    expect(status.state).toBe("error");
    if (status.state === "error") {
      expect(status.message).toContain("fail");
    }
    expect(terminalLog).toHaveBeenCalledWith("error", expect.stringContaining("fail"));
  });
});

