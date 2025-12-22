/**
 * editorSlice.ts
 * ----------------
 * Phase 1 Step3A-C:
 * - Editor slice is intentionally minimal.
 * - We keep the slice boundary so later we can add CodeMirror buffers, file save, etc.
 */

import type { StateCreator } from "zustand";
import type { AppState, EditorSlice } from "../types";

export const createEditorSlice: StateCreator<AppState, [], [], EditorSlice> = (
  set
) => ({
  activeFilePath: null,

  openFile: (path) => set({ activeFilePath: path }),

  closeFile: () => set({ activeFilePath: null }),
});
