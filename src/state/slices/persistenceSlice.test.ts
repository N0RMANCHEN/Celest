import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "zustand/vanilla";

import { createTerminalSlice } from "./terminalSlice";

import type { StateCreator } from "zustand";
import type { CodeGraphModel } from "../../entities/graph/types";
import type { PersistenceSlice, TerminalSlice } from "../types";
import type { ViewState } from "../../entities/project/types";

vi.mock("../../core/persistence/loadSave", () => ({
  saveMainGraph: vi.fn(async () => {}),
  ensureWorkspaceFile: vi.fn(async () => ({
    version: 1,
    views: {
      activeViewId: "main",
      viewports: {
        main: { x: 0, y: 0, zoom: 1 },
        view2: { x: 10, y: 20, zoom: 0.8 },
      },
    },
  })),
  saveWorkspaceFile: vi.fn(async () => {}),
}));

import {
  ensureWorkspaceFile,
  saveMainGraph,
  saveWorkspaceFile,
} from "../../core/persistence/loadSave";

type StubProject = {
  id: string;
  name: string;
  dirHandle: FileSystemDirectoryHandle | ({} & Record<string, never>);
  graph: CodeGraphModel;
  views: ViewState[];
  activeViewId: string;
};

function makeStubProject(): StubProject {
  return {
    id: "p1",
    name: "Demo",
    dirHandle: {},
    graph: { version: 1, nodes: {}, edges: {} },
    views: [
      { id: "main", name: "Main", viewport: { x: 0, y: 0, zoom: 1 } },
      { id: "view2", name: "View 2", viewport: { x: 10, y: 20, zoom: 0.8 } },
    ],
    activeViewId: "main",
  };
}

async function makeStore() {
  // IMPORTANT: dynamic import so the vi.mock above applies.
  const { createPersistenceSlice } = await import("./persistenceSlice");

  const project = makeStubProject();

  type TestState = {
    getActiveProject: () => StubProject | null;
  } & TerminalSlice &
    PersistenceSlice;

  const terminal = createTerminalSlice as unknown as StateCreator<
    TestState,
    [],
    [],
    TerminalSlice
  >;
  const persistence = createPersistenceSlice as unknown as StateCreator<
    TestState,
    [],
    [],
    PersistenceSlice
  >;

  return createStore<TestState>((set, get, api) => ({
    getActiveProject: () => project,
    ...terminal(set, get, api),
    ...persistence(set, get, api),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("persistenceSlice", () => {
  it("markActiveProjectDirty initializes ui state and sets dirty", async () => {
    const store = await makeStore();
    store.getState().markActiveProjectDirty("graph");
    const ui = store.getState().saveUiByProjectId.p1;
    expect(ui).toBeTruthy();
    expect(ui.dirty).toBe(true);
    expect(ui.seq).toBe(1);
  });

  it("initProjectPersistence seeds lastSavedAt", async () => {
    const store = await makeStore();
    store
      .getState()
      .initProjectPersistence("p1", { lastSavedAt: "2023-12-31T00:00:00Z" });

    const ui = store.getState().saveUiByProjectId.p1;
    expect(ui?.lastSavedAt).toBe("2023-12-31T00:00:00Z");

    // Subsequent dirty marks should keep the timestamp until a save completes.
    store.getState().markActiveProjectDirty("graph");
    const afterDirty = store.getState().saveUiByProjectId.p1;
    expect(afterDirty?.lastSavedAt).toBe("2023-12-31T00:00:00Z");
  });

  it("flushActiveProjectSave saves graph + workspace and clears dirty", async () => {
    const store = await makeStore();
    store.getState().initProjectPersistence("p1");
    store.getState().markActiveProjectDirty("graph");

    await store.getState().flushActiveProjectSave({ reason: "manual" });

    expect(saveMainGraph).toHaveBeenCalledTimes(1);
    expect(ensureWorkspaceFile).toHaveBeenCalledTimes(1);
    expect(saveWorkspaceFile).toHaveBeenCalledTimes(1);

    const ui = store.getState().saveUiByProjectId.p1;
    expect(ui.dirty).toBe(false);
    expect(ui.status).toBe("idle");

    const lines = store.getState().terminalLines;
    expect(lines.length).toBe(1);
    expect(lines[0].message).toContain("Saved");
  });

  it("flushActiveProjectSave reports errors", async () => {
    const store = await makeStore();
    store.getState().initProjectPersistence("p1");
    vi.mocked(saveMainGraph).mockImplementationOnce(async () => {
      throw new Error("boom");
    });

    await store.getState().flushActiveProjectSave({ reason: "manual" });

    const ui = store.getState().saveUiByProjectId.p1;
    expect(ui.status).toBe("error");
    expect(ui.lastError).toContain("boom");

    const lines = store.getState().terminalLines;
    expect(lines[0].level).toBe("error");
  });
});
