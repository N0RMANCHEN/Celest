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

import { ensureWorkspaceFile } from "../../core/persistence/loadSave";
import type { PersistenceError } from "../../core/persistence/errors";
import { getUndoHistory } from "../../features/canvas/core/UndoHistory";

const adapter = createBrowserAdapter();

function alertError(message: string) {
  // Keep behavior consistent with legacy MVP.
  alert(message);
}

/**
 * Check if an error indicates that data was restored from backup.
 */
function isRestoredFromBackup(error: PersistenceError | null): boolean {
  if (!error) return false;
  return (
    error.filePath.includes("restored from backup") ||
    error.message.includes("restored from backup")
  );
}

export const createProjectSlice: StateCreator<
  AppState,
  [],
  [],
  ProjectSlice
> = (set, get) => ({
  projects: [],
  activeProjectId: undefined,
  recents: [],
  openStatus: { state: "idle" },

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
      set({
        openStatus: {
          state: "error",
          message: out.message,
        },
      });
      get().terminalLog("error", `Open project failed: ${out.message}`);
      return;
    }

    get().terminalLog("info", `Opening project: ${out.project.name}`);

    const { project, recents, fsIndex } = out;
    set((s) => ({
      projects: [...s.projects, project],
      activeProjectId: project.id,
      recents,
    }));
    if (fsIndex) {
      // CRITICAL TIMING: setFsIndexSnapshot must be called BEFORE hydrateFsTreeUi.
      // setFsIndexSnapshot is synchronous and sets the snapshot immediately.
      // hydrateFsTreeUi depends on the snapshot existing to sanitize persisted IDs.
      get().setFsIndexSnapshot(project.id, fsIndex);

      // Step4B: hydrate FS tree expanded/selected state from persisted workspace.json
      // NOTE: ensureWorkspaceFile is async, but setFsIndexSnapshot above is synchronous,
      // so the snapshot is guaranteed to exist when hydrateFsTreeUi is called.
      try {
        const { file: ws, migrated, error } = await ensureWorkspaceFile(project.dirHandle);
        if (migrated) {
          get().terminalLog(
            "info",
            `Migrated workspace from .nodeide to .celest for project: ${project.name}`
          );
        }
        if (error) {
          if (isRestoredFromBackup(error)) {
            get().terminalLog(
              "warn",
              `Workspace file restored from backup for project: ${project.name}. Original file may be corrupted.`
            );
          } else {
            get().terminalLog("warn", `Workspace load warning: ${error.message}`);
          }
        }
        const fsTree = ws.ui?.fsTree;
        // Always call hydrateFsTreeUi to initialize state (even if fsTree is undefined).
        // It will default to root expanded if no persisted state exists.
        get().hydrateFsTreeUi(project.id, {
          expanded: fsTree?.expanded,
          selectedId: fsTree?.selectedId,
        });
      } catch (e) {
        console.warn(`[projectSlice] hydrate fsTree ui failed: ${String(e)}`);
      }
    }

    // Step5B: initialize persistence UI state for this project.
    get().initProjectPersistence(project.id, {
      lastSavedAt: project.workspaceMeta.updatedAt,
    });

    // Step5C: 保存初始状态到撤销历史（在项目打开时）
    // 这确保了 undo 可以回到项目打开时的初始状态
    const undoHistory = getUndoHistory(project.id);
    // 保存初始状态，不跳过（即使与空状态相同也要保存，作为基准点）
    undoHistory.saveSnapshot(project.graph.nodes, project.graph.edges, false);

    set({ openStatus: { state: "idle" } });
  },

  reopenRecent: async (key) => {
    // 检查项目是否已经打开（通过 id === key 判断）
    const { projects } = get();
    const existingProject = projects.find((p) => p.id === key);
    
    if (existingProject) {
      // 项目已经打开，直接切换到该项目
      get().terminalLog("info", `Switching to already open project: ${existingProject.name}`);
      set({ activeProjectId: key });
      return;
    }

    const out = await reopenRecentUsecase(adapter, key);
    if (out.kind === "cancel") return;
    if (out.kind === "error") {
      alertError(out.message);
      set({
        openStatus: {
          state: "error",
          message: out.message,
        },
      });
      get().terminalLog("error", `Reopen project failed: ${out.message}`);
      return;
    }

    get().terminalLog("info", `Reopening project: ${out.project.name}`);

    const { project, recents, fsIndex } = out;
    set((s) => ({
      projects: [...s.projects, project],
      activeProjectId: project.id,
      recents,
    }));
    if (fsIndex) {
      // CRITICAL TIMING: setFsIndexSnapshot must be called BEFORE hydrateFsTreeUi.
      // setFsIndexSnapshot is synchronous and sets the snapshot immediately.
      // hydrateFsTreeUi depends on the snapshot existing to sanitize persisted IDs.
      get().setFsIndexSnapshot(project.id, fsIndex);

      // Step4B: hydrate FS tree expanded/selected state from persisted workspace.json
      // NOTE: ensureWorkspaceFile is async, but setFsIndexSnapshot above is synchronous,
      // so the snapshot is guaranteed to exist when hydrateFsTreeUi is called.
      try {
        const { file: ws, migrated, error } = await ensureWorkspaceFile(project.dirHandle);
        if (migrated) {
          get().terminalLog(
            "info",
            `Migrated workspace from .nodeide to .celest for project: ${project.name}`
          );
        }
        if (error) {
          if (isRestoredFromBackup(error)) {
            get().terminalLog(
              "warn",
              `Workspace file restored from backup for project: ${project.name}. Original file may be corrupted.`
            );
          } else {
            get().terminalLog("warn", `Workspace load warning: ${error.message}`);
          }
        }
        const fsTree = ws.ui?.fsTree;
        // Always call hydrateFsTreeUi to initialize state (even if fsTree is undefined).
        // It will default to root expanded if no persisted state exists.
        get().hydrateFsTreeUi(project.id, {
          expanded: fsTree?.expanded,
          selectedId: fsTree?.selectedId,
        });
      } catch (e) {
        console.warn(`[projectSlice] hydrate fsTree ui failed: ${String(e)}`);
      }
    }

    // Step5B: initialize persistence UI state for this project.
    get().initProjectPersistence(project.id, {
      lastSavedAt: project.workspaceMeta.updatedAt,
    });

    // Step5C: 保存初始状态到撤销历史（在项目打开时）
    // 这确保了 undo 可以回到项目打开时的初始状态
    const undoHistory = getUndoHistory(project.id);
    // 保存初始状态，不跳过（即使与空状态相同也要保存，作为基准点）
    undoHistory.saveSnapshot(project.graph.nodes, project.graph.edges, false);

    set({ openStatus: { state: "idle" } });
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
