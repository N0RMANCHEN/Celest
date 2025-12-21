import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";

import { createFsIndexSlice } from "./fsIndexSlice";

import type { FsIndexSlice } from "../types";
import type { StateCreator } from "zustand";

type TestState = {
  getActiveProject: () => { id: string } | null;
  markActiveProjectDirty: (source: string) => void;
} & FsIndexSlice;

function makeStore() {
  const slice = createFsIndexSlice as unknown as StateCreator<
    TestState,
    [],
    [],
    FsIndexSlice
  >;
  return createStore<TestState>((set, get, api) => ({
    // Minimal stubs required by fsIndexSlice
    getActiveProject: () => ({ id: "p1" }),
    markActiveProjectDirty: () => {},
    ...slice(set, get, api),
  }));
}

describe("fsIndexSlice", () => {
  it("hydrateFsTreeUi initializes root expanded", () => {
    const store = makeStore();
    store.getState().setFsIndexSnapshot("p1", {
      version: 1,
      rootId: "root",
      nodes: {
        root: {
          id: "root",
          kind: "dir",
          name: "Project",
          path: "/Project",
          children: [],
        },
      },
    });
    // hydrate to apply default root expanded
    store.getState().hydrateFsTreeUi("p1", { expanded: {}, selectedId: null });
    expect(store.getState().getActiveFsExpanded().root).toBe(true);
  });

  it("toggleFsExpanded toggles correctly", () => {
    const store = makeStore();
    store.getState().setFsIndexSnapshot("p1", {
      version: 1,
      rootId: "root",
      nodes: {
        root: {
          id: "root",
          kind: "dir",
          name: "Project",
          path: "/Project",
          children: [],
        },
      },
    });

    // hydrate to ensure root 初始为展开状态，再进行 toggle
    store.getState().hydrateFsTreeUi("p1", { expanded: {}, selectedId: null });

    store.getState().toggleFsExpanded("p1", "root");
    expect(store.getState().getActiveFsExpanded().root).toBe(false);
    store.getState().toggleFsExpanded("p1", "root");
    expect(store.getState().getActiveFsExpanded().root).toBe(true);
  });

  it("selectFsEntry / clearFsSelection works", () => {
    const store = makeStore();
    store.getState().selectFsEntry("p1", "abc");
    expect(store.getState().getActiveFsSelectedId()).toBe("abc");
    store.getState().clearFsSelection("p1");
    expect(store.getState().getActiveFsSelectedId()).toBeNull();
  });
});
