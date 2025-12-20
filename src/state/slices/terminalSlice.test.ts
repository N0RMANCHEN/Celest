import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";

import { createTerminalSlice } from "./terminalSlice";

function makeStore() {
  return createStore<any>((set, get, api) => ({
    ...createTerminalSlice(set, get, api),
  }));
}

describe("terminalSlice", () => {
  it("logs and clears lines", () => {
    const store = makeStore();
    store.getState().terminalLog("info", "hello");
    store.getState().terminalLog("warn", "world");

    const lines = store.getState().terminalLines;
    expect(lines.length).toBe(2);
    expect(lines[0].level).toBe("info");
    expect(lines[1].level).toBe("warn");

    store.getState().terminalClear();
    expect(store.getState().terminalLines.length).toBe(0);
  });
});
