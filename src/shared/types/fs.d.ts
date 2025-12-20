export {};

/**
 * shared/types/fs.d.ts
 * -----------------
 * Minimal File System Access API typings.
 *
 * Why:
 * - TypeScript's built-in DOM lib typings may lag behind browser implementations.
 * - We want `strict: true` without sprinkling `any`/unsafe casts around.
 *
 * Scope:
 * - Only what Celest Phase 1 needs: directory picking, directory traversal, file read/write,
 *   and optional permission helpers.
 */

declare global {
  type FileSystemHandleKind = "file" | "directory";

  /** WICG File System Access permission modes. */
  type FileSystemPermissionMode = "read" | "readwrite";

  /** Permission descriptor used by `queryPermission` / `requestPermission`. */
  interface FileSystemHandlePermissionDescriptor {
    mode?: FileSystemPermissionMode;
  }

  interface FileSystemHandle {
    kind: FileSystemHandleKind;
    name: string;

    /** Optional, browser-dependent permission APIs. */
    queryPermission?: (
      desc?: FileSystemHandlePermissionDescriptor
    ) => Promise<PermissionState>;
    requestPermission?: (
      desc?: FileSystemHandlePermissionDescriptor
    ) => Promise<PermissionState>;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    kind: "file";
    getFile(): Promise<File>;
    createWritable(options?: {
      keepExistingData?: boolean;
    }): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    kind: "directory";

    /** Async iterator of `[name, handle]` entries. */
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;

    getDirectoryHandle(
      name: string,
      options?: { create?: boolean }
    ): Promise<FileSystemDirectoryHandle>;

    getFileHandle(
      name: string,
      options?: { create?: boolean }
    ): Promise<FileSystemFileHandle>;
  }

  interface FileSystemWritableFileStream {
    write(data: string | BufferSource | Blob): Promise<void>;
    close(): Promise<void>;
  }

  interface Window {
    showDirectoryPicker?: (options?: {
      mode?: FileSystemPermissionMode;
      id?: string;
      startIn?: FileSystemHandle | string;
    }) => Promise<FileSystemDirectoryHandle>;
  }
}
