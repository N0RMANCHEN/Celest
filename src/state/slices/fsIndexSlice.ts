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

export const createFsIndexSlice: StateCreator<AppState, [], [], FsIndexSlice> = (
  set,
  get
) => ({
  fsIndexByProjectId: {},

  // Step4B UI state
  fsExpandedByProjectId: {},
  fsSelectedIdByProjectId: {},

  setFsIndexSnapshot: (projectId, snapshot) =>
    set((s) => {
      const prevExpanded = s.fsExpandedByProjectId[projectId];
      const prevSelected = s.fsSelectedIdByProjectId[projectId];

      const expanded = prevExpanded
        ? { ...prevExpanded }
        : { [snapshot.rootId]: true };
      // Ensure root is always visible.
      expanded[snapshot.rootId] = expanded[snapshot.rootId] ?? true;

      const selectedId = prevSelected ?? null;

      return {
        fsIndexByProjectId: {
          ...s.fsIndexByProjectId,
          [projectId]: snapshot,
        },
        fsExpandedByProjectId: {
          ...s.fsExpandedByProjectId,
          [projectId]: expanded,
        },
        fsSelectedIdByProjectId: {
          ...s.fsSelectedIdByProjectId,
          [projectId]: selectedId,
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

  getFsIndexForProject: (projectId) => get().fsIndexByProjectId[projectId] ?? null,

  getActiveFsIndex: () => {
    const p = get().getActiveProject();
    if (!p) return null;
    return get().fsIndexByProjectId[p.id] ?? null;
  },

  toggleFsExpanded: (projectId, dirId) =>
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
    }),

  selectFsEntry: (projectId, entryId) =>
    set((s) => ({
      fsSelectedIdByProjectId: {
        ...s.fsSelectedIdByProjectId,
        [projectId]: entryId,
      },
    })),

  clearFsSelection: (projectId) =>
    set((s) => ({
      fsSelectedIdByProjectId: {
        ...s.fsSelectedIdByProjectId,
        [projectId]: null,
      },
    })),

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
