/**
 * state/slices/fsIndexSlice.ts
 * ----------------
 * Step4A:
 * Store FS Index snapshots (JSON-serializable) per opened project.
 *
 * Why a slice?
 * - Left Tree is navigation; it should not depend on Canvas renderer state.
 * - In Step4B we'll drive Left Tree from this snapshot.
 */

import type { StateCreator } from "zustand";
import type { AppState, FsIndexSlice } from "../types";

export const createFsIndexSlice: StateCreator<
  AppState,
  [],
  [],
  FsIndexSlice
> = (set, get) => ({
  fsIndexByProjectId: {},

  // Step4B UI state
  fsExpandedByProjectId: {},
  fsSelectedIdByProjectId: {},

  setFsIndexSnapshot: (projectId, snapshot) =>
    set((s) => {
      // IMPORTANT: Do not initialize expanded/selected here.
      // Let hydrateFsTreeUi handle the initial state from workspace.json.
      // Only preserve existing state if it exists (e.g., during same session).
      const prevExpanded = s.fsExpandedByProjectId[projectId];
      const prevSelected = s.fsSelectedIdByProjectId[projectId];

      // If no previous state exists, leave it undefined so hydrateFsTreeUi can initialize.
      // If previous state exists (same session), preserve it.
      const expanded = prevExpanded ? { ...prevExpanded } : undefined;
      const selectedId = prevSelected ?? undefined;

      return {
        fsIndexByProjectId: {
          ...s.fsIndexByProjectId,
          [projectId]: snapshot,
        },
        ...(expanded !== undefined
          ? {
              fsExpandedByProjectId: {
                ...s.fsExpandedByProjectId,
                [projectId]: expanded,
              },
            }
          : {}),
        ...(selectedId !== undefined
          ? {
              fsSelectedIdByProjectId: {
                ...s.fsSelectedIdByProjectId,
                [projectId]: selectedId,
              },
            }
          : {}),
      };
    }),

  hydrateFsTreeUi: (projectId, state) =>
    set((s) => {
      const snapshot = s.fsIndexByProjectId[projectId];
      if (!snapshot) return {};

      const nodes = snapshot.nodes;
      const rootId = snapshot.rootId;

      // Initialize expanded state from persisted data or default to root only.
      const nextExpanded: Record<string, boolean> = {};

      if (state.expanded) {
        // Restore from persisted workspace.json: sanitize and only keep valid dir ids.
        for (const [id, expanded] of Object.entries(state.expanded)) {
          if (!expanded) continue;
          const n = nodes[id];
          if (!n) continue;
          if (n.kind !== "dir") continue;
          nextExpanded[id] = true;
        }
      }

      // Ensure root is always visible (even if not in persisted state).
      nextExpanded[rootId] = true;

      // Restore selected id from persisted data, or keep existing if not provided.
      const candidateSelected =
        state.selectedId === undefined
          ? s.fsSelectedIdByProjectId[projectId]
          : state.selectedId;

      const nextSelected =
        candidateSelected && nodes[candidateSelected]
          ? candidateSelected
          : null;

      return {
        fsExpandedByProjectId: {
          ...s.fsExpandedByProjectId,
          [projectId]: nextExpanded,
        },
        fsSelectedIdByProjectId: {
          ...s.fsSelectedIdByProjectId,
          [projectId]: nextSelected,
        },
      };
    }),

  removeFsIndexSnapshot: (projectId) =>
    set((s) => {
      const nextIndex = { ...s.fsIndexByProjectId };
      delete nextIndex[projectId];

      const nextExpanded = { ...s.fsExpandedByProjectId };
      delete nextExpanded[projectId];

      const nextSelected = { ...s.fsSelectedIdByProjectId };
      delete nextSelected[projectId];

      return {
        fsIndexByProjectId: nextIndex,
        fsExpandedByProjectId: nextExpanded,
        fsSelectedIdByProjectId: nextSelected,
      };
    }),

  getFsIndexForProject: (projectId) =>
    get().fsIndexByProjectId[projectId] ?? null,

  getActiveFsIndex: () => {
    const p = get().getActiveProject();
    if (!p) return null;
    return get().fsIndexByProjectId[p.id] ?? null;
  },

  toggleFsExpanded: (projectId, dirId) => {
    set((s) => {
      const cur = s.fsExpandedByProjectId[projectId] ?? {};
      const prev = cur[dirId];
      const next = !(prev ?? false);
      return {
        fsExpandedByProjectId: {
          ...s.fsExpandedByProjectId,
          [projectId]: { ...cur, [dirId]: next },
        },
      };
    });

    const active = get().getActiveProject();
    if (active?.id === projectId) get().markActiveProjectDirty("fsTree");
  },

  selectFsEntry: (projectId, entryId) => {
    set((s) => ({
      fsSelectedIdByProjectId: {
        ...s.fsSelectedIdByProjectId,
        [projectId]: entryId,
      },
    }));

    const active = get().getActiveProject();
    if (active?.id === projectId) get().markActiveProjectDirty("fsTree");
  },

  clearFsSelection: (projectId) => {
    set((s) => ({
      fsSelectedIdByProjectId: {
        ...s.fsSelectedIdByProjectId,
        [projectId]: null,
      },
    }));

    const active = get().getActiveProject();
    if (active?.id === projectId) get().markActiveProjectDirty("fsTree");
  },

  getActiveFsExpanded: () => {
    const p = get().getActiveProject();
    if (!p) return {};
    return get().fsExpandedByProjectId[p.id] ?? {};
  },

  getActiveFsSelectedId: () => {
    const p = get().getActiveProject();
    if (!p) return null;
    return get().fsSelectedIdByProjectId[p.id] ?? null;
  },
});
