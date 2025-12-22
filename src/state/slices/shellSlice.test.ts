import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";

import { createShellSlice } from "./shellSlice";
import type { ShellSlice } from "../types";
import type { StateCreator } from "zustand";

type TestState = ShellSlice;

function makeStore() {
  const slice = createShellSlice as unknown as StateCreator<TestState, [], [], ShellSlice>;
  return createStore<TestState>((set, get, api) => slice(set, get, api));
}

describe("shellSlice", () => {
  it("初始化时 panels 为默认值", () => {
    const store = makeStore();
    const panels = store.getState().panels;
    expect(panels.left).toBe(true);
    expect(panels.inspector).toBe(true);
    expect(panels.terminal).toBe(true);
  });

  it("togglePanel 切换面板状态", () => {
    const store = makeStore();
    store.getState().togglePanel("left");
    expect(store.getState().panels.left).toBe(false);
    expect(store.getState().panels.inspector).toBe(true);
    expect(store.getState().panels.terminal).toBe(true);

    store.getState().togglePanel("left");
    expect(store.getState().panels.left).toBe(true);
  });

  it("togglePanel 不影响其他面板", () => {
    const store = makeStore();
    store.getState().togglePanel("inspector");
    expect(store.getState().panels.left).toBe(true);
    expect(store.getState().panels.inspector).toBe(false);
    expect(store.getState().panels.terminal).toBe(true);
  });
});

