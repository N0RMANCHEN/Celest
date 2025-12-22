import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";

import { createEditorSlice } from "./editorSlice";
import type { EditorSlice } from "../types";
import type { StateCreator } from "zustand";

type TestState = EditorSlice;

function makeStore() {
  const slice = createEditorSlice as unknown as StateCreator<TestState, [], [], EditorSlice>;
  return createStore<TestState>((set, get, api) => slice(set, get, api));
}

describe("editorSlice", () => {
  it("初始化时 activeFilePath 为 null", () => {
    const store = makeStore();
    expect(store.getState().activeFilePath).toBeNull();
  });

  it("openFile 设置文件路径", () => {
    const store = makeStore();
    store.getState().openFile("/path/to/file.md");
    expect(store.getState().activeFilePath).toBe("/path/to/file.md");
  });

  it("closeFile 清空文件路径", () => {
    const store = makeStore();
    store.getState().openFile("/path/to/file.md");
    store.getState().closeFile();
    expect(store.getState().activeFilePath).toBeNull();
  });
});

