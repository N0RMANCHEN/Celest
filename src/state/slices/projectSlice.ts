/**
 * projectSlice.ts
 * ----------------
 * Phase 1 Step3A-C:
 * - Own the "projects" tabs, active project, and recents.
 * - Encapsulate all runtime + persistence details behind usecases.
 */

import type { StateCreator } from "zustand";
import type { AppState, ProjectSlice } from "../types";

import { createBrowserAdapter } from "../../features/project/storage/browserAdapter";
import { listRecents } from "../../features/project/recentStore";
import {
  openProjectFolderUsecase,
  reopenRecentUsecase,
} from "../../features/project/usecases";



const adapter = createBrowserAdapter();

function alertError(message: string) {
  // Keep behavior consistent with legacy MVP.
  alert(message);
}

export const createProjectSlice: StateCreator<AppState, [], [], ProjectSlice> = (
  set,
  get
) => ({
  projects: [],
  activeProjectId: undefined,
  recents: [],

  hydrateRecents: async () => {
    try {
      const recents = await listRecents();
      set({ recents });
    } catch (e) {
      console.warn(`[projectSlice] hydrateRecents failed: ${String(e)}`);
    }
  },

  goHome: () => set({ activeProjectId: undefined }),

  setActiveProject: (id) => set({ activeProjectId: id }),

  closeProject: (id) => {
    const { projects, activeProjectId } = get();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx < 0) return;

    const nextProjects = projects.filter((p) => p.id !== id);

    let nextActive: string | undefined = activeProjectId;
    if (activeProjectId === id) {
      const left = projects[idx - 1]?.id;
      const right = projects[idx + 1]?.id;
      nextActive = left ?? right ?? undefined;
    }

    set({ projects: nextProjects, activeProjectId: nextActive });
    // Keep fsIndex snapshot in sync.
    get().removeFsIndexSnapshot(id);

    // Keep persistence UI state in sync.
    get().removeProjectPersistence(id);
  },

  openProjectFolder: async () => {
    const out = await openProjectFolderUsecase(adapter);
    if (out.kind === "cancel") return;
    if (out.kind === "error") {
      alertError(out.message);
      return;
    }

    const { project, recents, fsIndex } = out;
    set((s) => ({
      projects: [...s.projects, project],
      activeProjectId: project.id,
      recents,
    }));
    if (fsIndex) get().setFsIndexSnapshot(project.id, fsIndex);

    // Step5B: initialize persistence UI state for this project.
    get().initProjectPersistence(project.id, {
      lastSavedAt: project.workspaceMeta.updatedAt,
    });
  },

  reopenRecent: async (key) => {
    const out = await reopenRecentUsecase(adapter, key);
    if (out.kind === "cancel") return;
    if (out.kind === "error") {
      alertError(out.message);
      return;
    }

    const { project, recents, fsIndex } = out;
    set((s) => ({
      projects: [...s.projects, project],
      activeProjectId: project.id,
      recents,
    }));
    if (fsIndex) get().setFsIndexSnapshot(project.id, fsIndex);

    // Step5B: initialize persistence UI state for this project.
    get().initProjectPersistence(project.id, {
      lastSavedAt: project.workspaceMeta.updatedAt,
    });
  },

  saveActiveProject: async () => {
    await get().flushActiveProjectSave({ reason: "manual" });
  },

  getActiveProject: () => {
    const { projects, activeProjectId } = get();
    if (!activeProjectId) return null;
    return projects.find((p) => p.id === activeProjectId) ?? null;
  },
});
