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

function isAbortError(e: unknown): boolean {
  const msg = String(e);
  return (
    msg.includes("AbortError") ||
    msg.includes("The user aborted") ||
    msg.includes("User aborted")
  );
}

export class BrowserAdapter implements StorageAdapter {
  async pickProjectDirectory(): Promise<PickDirectoryResult> {
    const picker = window.showDirectoryPicker;
    if (!picker) {
      throw new Error("File System Access API not supported");
    }

    try {
      const handle: DirectoryHandle = await picker({ mode: "readwrite" });
      return { kind: "picked", handle };
    } catch (e) {
      if (isAbortError(e)) return { kind: "cancel" };
      throw e;
    }
  }

  async ensureReadWritePermission(handle: DirectoryHandle): Promise<boolean> {
    try {
      const opts: FileSystemHandlePermissionDescriptor = { mode: "readwrite" };

      const q = await handle.queryPermission?.(opts);
      if (q === "granted") return true;

      const r = await handle.requestPermission?.(opts);
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
