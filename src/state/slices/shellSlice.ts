/**
 * state/slices/shellSlice.ts
 * ----------------
 * Shell UI state: panel visibility, etc.
 */

import type { StateCreator } from "zustand";
import type { AppState, Panels, ShellSlice } from "../types";

const DEFAULT_PANELS: Panels = {
  left: true,
  inspector: true,
  terminal: true,
};

export const createShellSlice: StateCreator<AppState, [], [], ShellSlice> = (
  set
) => ({
  panels: DEFAULT_PANELS,
  togglePanel: (k) =>
    set((s) => ({
      ...s,
      panels: { ...s.panels, [k]: !s.panels[k] },
    })),
});
