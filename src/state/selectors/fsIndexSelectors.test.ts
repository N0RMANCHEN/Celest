import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";

import type { AppState } from "../types";
import type { FsIndexSlice } from "../types";
import type { StateCreator } from "zustand";
import { createFsIndexSlice } from "../slices/fsIndexSlice";
import {
  selectActiveFsIndex,
  selectActiveFsExpanded,
  selectActiveFsSelectedId,
  selectSelectedFsInfo,
} from "./fsIndexSelectors";

type TestState = {
  getActiveProject: () => { id: string } | null;
  markActiveProjectDirty: () => void;
} & FsIndexSlice;

function makeStore() {
  const slice = createFsIndexSlice as unknown as StateCreator<
    TestState,
    [],
    [],
    FsIndexSlice
  >;
  return createStore<TestState>((set, get, api) => ({
    getActiveProject: () => ({ id: "p1" }),
    markActiveProjectDirty: () => {},
    ...slice(set, get, api),
  }));
}

describe("fsIndexSelectors", () => {
  it("selectActiveFsIndex returns null when no project", () => {
    const store = makeStore();
    store.setState({ getActiveProject: () => null });
    expect(selectActiveFsIndex(store.getState() as unknown as AppState)).toBeNull();
  });

  it("selectActiveFsIndex returns snapshot for active project", () => {
    const store = makeStore();
    const snapshot = {
      version: 1 as const,
      rootId: "fs:/",
      nodes: {
        "fs:/": {
          id: "fs:/",
          kind: "dir" as const,
          name: "root",
          path: "/",
          children: [],
        },
      },
    };
    store.getState().setFsIndexSnapshot("p1", snapshot);
    expect(selectActiveFsIndex(store.getState() as unknown as AppState)).toEqual(snapshot);
  });

  it("selectActiveFsExpanded returns empty object when no project", () => {
    const store = makeStore();
    store.setState({ getActiveProject: () => null });
    expect(selectActiveFsExpanded(store.getState() as unknown as AppState)).toEqual({});
  });

  it("selectActiveFsExpanded returns expanded state for active project", () => {
    const store = makeStore();
    store.getState().toggleFsExpanded("p1", "fs:/dir1");
    const expanded = selectActiveFsExpanded(store.getState() as unknown as AppState);
    expect(expanded["fs:/dir1"]).toBe(true);
  });

  it("selectActiveFsSelectedId returns null when no project", () => {
    const store = makeStore();
    store.setState({ getActiveProject: () => null });
    expect(selectActiveFsSelectedId(store.getState() as unknown as AppState)).toBeNull();
  });

  it("selectActiveFsSelectedId returns selected ID for active project", () => {
    const store = makeStore();
    store.getState().selectFsEntry("p1", "fs:/file1");
    expect(selectActiveFsSelectedId(store.getState() as unknown as AppState)).toBe("fs:/file1");
  });

  it("selectSelectedFsInfo returns null when no selection", () => {
    const store = makeStore();
    expect(selectSelectedFsInfo(store.getState() as unknown as AppState)).toBeNull();
  });

  it("selectSelectedFsInfo returns FsMeta for selected entry", () => {
    const store = makeStore();
    const snapshot = {
      version: 1 as const,
      rootId: "fs:/",
      nodes: {
        "fs:/": {
          id: "fs:/",
          kind: "dir" as const,
          name: "root",
          path: "/",
          children: [],
        },
        "fs:/file1": {
          id: "fs:/file1",
          kind: "file" as const,
          name: "file1",
          path: "/file1",
          parentId: "fs:/",
          children: [],
        },
      },
    };
    store.getState().setFsIndexSnapshot("p1", snapshot);
    store.getState().selectFsEntry("p1", "fs:/file1");
    const info = selectSelectedFsInfo(store.getState() as unknown as AppState);
    expect(info).toEqual({
      id: "fs:/file1",
      kind: "file",
      name: "file1",
      path: "/file1",
      parentId: "fs:/",
    });
  });
});

