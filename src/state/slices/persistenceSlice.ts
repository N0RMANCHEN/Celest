/**
 * state/slices/persistenceSlice.ts
 * ----------------
 * Step5B:
 * - Centralize persistence UI state (dirty/saving/error) per project.
 * - Provide debounced autosave for CodeGraph + Viewports.
 *
 * Notes:
 * - This slice is intentionally "thin" and delegates actual file IO to
 *   core/persistence/loadSave.
 */

import type { StateCreator } from "zustand";

import type { AppState, PersistenceSlice, SaveUiState } from "../types";

import {
  ensureWorkspaceFile,
  saveMainGraph,
  saveWorkspaceFile,
} from "../../core/persistence/loadSave";
import { PersistenceErrors, formatErrorForUser, type PersistenceError } from "../../core/persistence/errors";

const AUTOSAVE_DEBOUNCE_MS = 900;

type Timer = ReturnType<typeof setTimeout>;

// Runtime-only (not stored in Zustand): per project debounce timers.
const autosaveTimerByProjectId = new Map<string, Timer>();

function clearAutosaveTimer(projectId: string) {
  const t = autosaveTimerByProjectId.get(projectId);
  if (t) clearTimeout(t);
  autosaveTimerByProjectId.delete(projectId);
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultUi(opts?: { lastSavedAt?: string }): SaveUiState {
  return {
    dirty: false,
    status: "idle",
    seq: 0,
    lastSavedAt: opts?.lastSavedAt,
    lastError: undefined,
  };
}

export const createPersistenceSlice: StateCreator<
  AppState,
  [],
  [],
  PersistenceSlice
> = (set, get) => ({
  saveUiByProjectId: {},

  initProjectPersistence: (projectId, opts) => {
    set((s) => {
      if (s.saveUiByProjectId[projectId]) return {};
      return {
        saveUiByProjectId: {
          ...s.saveUiByProjectId,
          [projectId]: defaultUi({ lastSavedAt: opts?.lastSavedAt }),
        },
      };
    });
  },

  removeProjectPersistence: (projectId) => {
    clearAutosaveTimer(projectId);
    set((s) => {
      if (!s.saveUiByProjectId[projectId]) return {};
      const next = { ...s.saveUiByProjectId };
      delete next[projectId];
      return { saveUiByProjectId: next };
    });
  },

  markActiveProjectDirty: (source) => {
    const p = get().getActiveProject();
    if (!p) return;

    const projectId = p.id;
    // Ensure ui state exists.
    if (!get().saveUiByProjectId[projectId]) {
      get().initProjectPersistence(projectId);
    }

    set((s) => {
      const prev = s.saveUiByProjectId[projectId] ?? defaultUi();
      const next: SaveUiState = {
        ...prev,
        dirty: true,
        status: prev.status === "saving" ? "saving" : "idle",
        seq: prev.seq + 1,
        // user edited after an error -> clear lastError so UI isn't stuck
        ...(prev.lastError ? { lastError: undefined } : {}),
      };
      return {
        saveUiByProjectId: { ...s.saveUiByProjectId, [projectId]: next },
      };
    });

    // Debounced autosave
    clearAutosaveTimer(projectId);
    const timer = setTimeout(() => {
      // Do not await in timer.
      void get().flushActiveProjectSave({ reason: `autosave:${source}` });
    }, AUTOSAVE_DEBOUNCE_MS);
    autosaveTimerByProjectId.set(projectId, timer);
  },

  flushActiveProjectSave: async ({ reason }) => {
    const p = get().getActiveProject();
    if (!p) return;

    const projectId = p.id;
    // Ensure ui state exists.
    if (!get().saveUiByProjectId[projectId]) {
      get().initProjectPersistence(projectId);
    }

    // We snapshot seq at save start; if new edits happen while saving,
    // we'll immediately schedule another autosave after this one finishes.
    const seqAtStart = get().saveUiByProjectId[projectId]?.seq ?? 0;

    // If already saving, skip; the currently-running save will handle rescheduling.
    if (get().saveUiByProjectId[projectId]?.status === "saving") return;

    clearAutosaveTimer(projectId);

    set((s) => {
      const prev = s.saveUiByProjectId[projectId] ?? defaultUi();
      return {
        saveUiByProjectId: {
          ...s.saveUiByProjectId,
          [projectId]: { ...prev, status: "saving" },
        },
      };
    });

    try {
      // 1) Graph
      await saveMainGraph(p.dirHandle, p.graph);

      // 2) Views + UI
      const { file: ws } = await ensureWorkspaceFile(p.dirHandle);
      const mainVp =
        p.views.find((v) => v.id === "main")?.viewport ??
        ws.views.viewports.main;
      const view2Vp =
        p.views.find((v) => v.id === "view2")?.viewport ??
        ws.views.viewports.view2;

      // 3) FS Tree UI (expanded/selected) -> persisted into workspace.json
      const expanded = get().fsExpandedByProjectId[projectId] ?? {};
      const selectedFsId = get().fsSelectedIdByProjectId[projectId] ?? null;

      // 4) Canvas UI (selection)
      const selectedNodeIds = Array.isArray(p.selectedIds) ? p.selectedIds : [];

      const prevUi = ws.ui ?? {};
      const prevCanvas = prevUi.canvas ?? {};

      await saveWorkspaceFile(p.dirHandle, {
        ...ws,
        views: {
          activeViewId: p.activeViewId,
          viewports: { main: mainVp, view2: view2Vp },
        },
        ui: {
          ...prevUi,
          fsTree: {
            expanded,
            selectedId: selectedFsId,
          },
          canvas: {
            ...prevCanvas,
            selectedNodeIds,
          },
        },
      });

      const savedAt = nowIso();
      set((s) => {
        const prev = s.saveUiByProjectId[projectId] ?? defaultUi();
        const currentSeq = prev.seq;
        const stillDirty = currentSeq !== seqAtStart;
        return {
          saveUiByProjectId: {
            ...s.saveUiByProjectId,
            [projectId]: {
              ...prev,
              status: "idle",
              dirty: stillDirty,
              lastSavedAt: savedAt,
              lastError: undefined,
            },
          },
        };
      });

      // Only log explicit saves to keep terminal quiet.
      if (reason === "manual" || reason === "hotkey") {
        get().terminalLog("info", `Saved: ${p.name}`);
      }

      // If edits happened during save, schedule a follow-up autosave.
      const latest = get().saveUiByProjectId[projectId];
      if (latest?.dirty) {
        clearAutosaveTimer(projectId);
        const timer = setTimeout(() => {
          void get().flushActiveProjectSave({ reason: "autosave:catchup" });
        }, 0);
        autosaveTimerByProjectId.set(projectId, timer);
      }
    } catch (e) {
      // Convert error to PersistenceError if it isn't already
      let error: PersistenceError;
      if (e && typeof e === "object" && "type" in e && "filePath" in e) {
        error = e as PersistenceError;
      } else {
        // Generic error, create a PersistenceError
        error = PersistenceErrors.writeError(
          "unknown",
          String(e),
          e
        );
      }

      const errorMessage = formatErrorForUser(error);
      set((s) => {
        const prev = s.saveUiByProjectId[projectId] ?? defaultUi();
        return {
          saveUiByProjectId: {
            ...s.saveUiByProjectId,
            [projectId]: {
              ...prev,
              status: "error",
              dirty: true,
              lastError: errorMessage,
            },
          },
        };
      });
      get().terminalLog("error", `Save failed: ${errorMessage}`);
    }
  },

  getActiveSaveUi: () => {
    const p = get().getActiveProject();
    if (!p) return null;
    return get().saveUiByProjectId[p.id] ?? null;
  },
});
