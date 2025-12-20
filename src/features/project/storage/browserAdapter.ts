/**
 * storage/browserAdapter.ts
 * ----------------
 * Phase 1 Step3A-B:
 * Web implementation of StorageAdapter using File System Access API.
 */

import type {
  DirectoryHandle,
  PickDirectoryResult,
  StorageAdapter,
} from "./types";

type PermissionMode = "read" | "readwrite";
type FsPermissionDescriptor = { mode: PermissionMode };

type HandleWithPermissions = DirectoryHandle & {
  queryPermission?: (desc: FsPermissionDescriptor) => Promise<PermissionState>;
  requestPermission?: (desc: FsPermissionDescriptor) => Promise<PermissionState>;
};

type ShowDirectoryPicker = (options?: {
  mode?: PermissionMode;
}) => Promise<DirectoryHandle>;

function isAbortError(e: unknown): boolean {
  const msg = String(e);
  return msg.includes("AbortError") || msg.includes("The user aborted") || msg.includes("User aborted");
}

export class BrowserAdapter implements StorageAdapter {
  async pickProjectDirectory(): Promise<PickDirectoryResult> {
    const showDirectoryPicker = (window as unknown as {
      showDirectoryPicker?: ShowDirectoryPicker;
    }).showDirectoryPicker;

    if (!showDirectoryPicker) {
      throw new Error("File System Access API not supported");
    }

    try {
      const handle: DirectoryHandle = await showDirectoryPicker({
        mode: "readwrite",
      });
      return { kind: "picked", handle };
    } catch (e) {
      if (isAbortError(e)) return { kind: "cancel" };
      throw e;
    }
  }

  async ensureReadWritePermission(handle: DirectoryHandle): Promise<boolean> {
    try {
      const h = handle as HandleWithPermissions;
      const opts: FsPermissionDescriptor = { mode: "readwrite" };

      const q = await h.queryPermission?.(opts);
      if (q === "granted") return true;

      const r = await h.requestPermission?.(opts);
      return r === "granted";
    } catch {
      // If permission APIs are missing, assume best effort.
      return true;
    }
  }
}

export function createBrowserAdapter(): BrowserAdapter {
  return new BrowserAdapter();
}
