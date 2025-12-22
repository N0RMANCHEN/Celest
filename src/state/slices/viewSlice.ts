/**
 * viewSlice.ts
 * ----------------
 * View presets (fixed 2 in Phase 1):
 * - active view id
 * - per-view viewport
 */

import type { StateCreator } from "zustand";
import type { AppState, ViewSlice } from "../types";
import type { ViewState } from "../../entities/project/types";

import { mapActiveProject } from "../utils/projectUtils";

export const createViewSlice: StateCreator<AppState, [], [], ViewSlice> = (
  set,
  get
) => ({
  getActiveView: () => {
    const p = get().getActiveProject();
    if (!p) return null;
    return p.views.find((v) => v.id === p.activeViewId) ?? null;
  },

  setActiveView: (viewId: ViewState["id"]) => {
    let didChange = false;
    set((s) => ({
      projects: mapActiveProject(s.projects, s.activeProjectId, (p) => {
        if (!p.views.some((v) => v.id === viewId)) return p;
        if (p.activeViewId === viewId) return p;
        didChange = true;
        return { ...p, activeViewId: viewId };
      }),
    }));

    if (didChange) get().markActiveProjectDirty("view");
  },

  updateActiveViewViewport: (vp) => {
    let didChange = false;
    set((s) => ({
      projects: mapActiveProject(s.projects, s.activeProjectId, (p) => {
        const cur = p.views.find((v) => v.id === p.activeViewId);
        if (!cur) return p;

        const currentZ = cur.viewport.z ?? cur.viewport.zoom;
        const nextZ = vp.z ?? vp.zoom;
        if (
          cur.viewport.x === vp.x &&
          cur.viewport.y === vp.y &&
          cur.viewport.zoom === vp.zoom &&
          currentZ === nextZ
        ) {
          return p;
        }

        const nextViewport = { ...vp, z: nextZ };
        const views = p.views.map((v) =>
          v.id === p.activeViewId ? { ...v, viewport: nextViewport } : v
        );
        didChange = true;
        return { ...p, views };
      }),
    }));

    if (didChange) get().markActiveProjectDirty("viewport");
  },
});
