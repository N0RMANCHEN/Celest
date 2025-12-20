/**
 * usecases.ts
 * ----------------
 * Phase 1 Step3A-B:
 * Move "open project" flows out of bootstrap so the runtime details are
 * encapsulated behind a StorageAdapter.
 *
 * Step4A:
 * - Also build FsIndexSnapshot (serializable) for Left Tree navigation.
 */

import type { StorageAdapter } from "./storage/types";
import { buildProjectFromDirectoryHandle } from "./openProject";
import type { ProjectState } from "../../entities/project/types";
import {
  getRecentHandle,
  listRecents,
  touchRecent,
  upsertRecent,
} from "./recentStore";

import type { FsIndexSnapshot } from "../../entities/fsIndex/types";
import { buildFsIndexSnapshot } from "../fsIndex/buildFsIndex";

export type OpenProjectOutcome =
  | {
      kind: "ok";
      project: ProjectState;
      recents: Awaited<ReturnType<typeof listRecents>>;
      fsIndex: FsIndexSnapshot | null;
    }
  | { kind: "cancel" }
  | { kind: "error"; message: string };

export async function openProjectFolderUsecase(
  adapter: StorageAdapter
): Promise<OpenProjectOutcome> {
  try {
    const picked = await adapter.pickProjectDirectory();
    if (picked.kind === "cancel") return { kind: "cancel" };

    const ok = await adapter.ensureReadWritePermission(picked.handle);
    if (!ok)
      return { kind: "error", message: "未获得文件夹读写权限，无法打开项目。" };

    const recentKey = await upsertRecent(picked.handle, "Local folder");

    // IMPORTANT:
    // Use the recent key as the stable project id so that per-project UI state
    // (tabs/views/tree expansion) remains consistent across reopen.
    const project = await buildProjectFromDirectoryHandle(picked.handle, {
      fixedId: recentKey,
    });
    const fsIndex = buildFsIndexSnapshot(project.meta, project.rootDirId);

    const recents = await listRecents();
    return { kind: "ok", project, recents, fsIndex };
  } catch (e) {
    // If browser doesn't support, provide a friendly message
    const msg = String(e);
    if (msg.includes("not supported") || msg.includes("File System Access")) {
      return {
        kind: "error",
        message: "浏览器不支持 File System Access API（建议 Chrome/Edge）。",
      };
    }
    return { kind: "error", message: `打开项目失败：${msg}` };
  }
}

export async function reopenRecentUsecase(
  adapter: StorageAdapter,
  key: string
): Promise<OpenProjectOutcome> {
  try {
    const dir = await getRecentHandle(key);
    if (!dir) {
      return {
        kind: "error",
        message:
          "找不到该 Recent 项目（可能已被清理或浏览器不再保存 handle）。",
      };
    }

    const ok = await adapter.ensureReadWritePermission(dir);
    if (!ok)
      return {
        kind: "error",
        message: "未获得文件夹读写权限，无法重新打开项目。",
      };

    await touchRecent(key, dir);
    const project = await buildProjectFromDirectoryHandle(dir, {
      fixedId: key,
    });
    const fsIndex = buildFsIndexSnapshot(project.meta, project.rootDirId);

    const recents = await listRecents();
    return { kind: "ok", project, recents, fsIndex };
  } catch (e) {
    return { kind: "error", message: `重新打开失败：${String(e)}` };
  }
}
