import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";

import { createFsIndexSlice } from "./fsIndexSlice";

function makeStore() {
  return createStore<any>((set, get, api) => ({
    // Minimal stubs required by fsIndexSlice
    getActiveProject: () => ({ id: "p1" }),
    ...createFsIndexSlice(set, get, api),
  }));
}

describe("fsIndexSlice", () => {
  it("setFsIndexSnapshot initializes root expanded", () => {
    const store = makeStore();
    store.getState().setFsIndexSnapshot("p1", {
      version: 1,
      rootId: "root",
      nodes: {
        root: { id: "root", kind: "dir", name: "Project", path: "/Project", children: [] },
      },
    });
    const expanded = store.getState().getActiveFsExpanded();
    expect(expanded.root).toBe(true);
  });

  it("toggleFsExpanded toggles correctly", () => {
    const store = makeStore();
    store.getState().setFsIndexSnapshot("p1", {
      version: 1,
      rootId: "root",
      nodes: {
        root: { id: "root", kind: "dir", name: "Project", path: "/Project", children: [] },
      },
    });

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
