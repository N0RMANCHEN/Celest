/**
 * state/store.ts
 * ----------------
 * Phase 1 Step3A-C:
 * - Replace legacy "monolith store" with a real slice-based Zustand store.
 * - Keep names stable (useAppStore) so UI modules can depend on it.
 */

import { create } from "zustand";
import type { AppState } from "./types";

import { createShellSlice } from "./slices/shellSlice";
import { createProjectSlice } from "./slices/projectSlice";
import { createViewSlice } from "./slices/viewSlice";
import { createGraphSlice } from "./slices/graphSlice";
import { createFsIndexSlice } from "./slices/fsIndexSlice";
import { createEditorSlice } from "./slices/editorSlice";
import { createTerminalSlice } from "./slices/terminalSlice";
import { createPersistenceSlice } from "./slices/persistenceSlice";

export const useAppStore = create<AppState>()((...a) => ({
  ...createShellSlice(...a),
  ...createProjectSlice(...a),
  ...createViewSlice(...a),
  ...createGraphSlice(...a),
  ...createFsIndexSlice(...a),
  ...createEditorSlice(...a),
  ...createTerminalSlice(...a),
  ...createPersistenceSlice(...a),
}));

/**
 * Phase 1: keep an alias for potential future split stores.
 * (Legacy used `useGraphStore`, so we reserve the name.)
 */
export const useGraphStore = useAppStore;
