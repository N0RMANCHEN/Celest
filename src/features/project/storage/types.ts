/**
 * storage/types.ts
 * ----------------
 * Phase 1 Step3A-B:
 * A tiny "storage adapter" interface to decouple project opening from the
 * concrete runtime (Web File System Access API vs future Electron/Tauri).
 *
 * Notes:
 * - For Phase 1 we still use FileSystemDirectoryHandle as the directory type.
 * - In Phase 2 we can widen this to a generic handle or path-based adapter.
 */

export type DirectoryHandle = FileSystemDirectoryHandle;

export type PickDirectoryResult =
  | { kind: "picked"; handle: DirectoryHandle }
  | { kind: "cancel" };

export interface StorageAdapter {
  pickProjectDirectory(): Promise<PickDirectoryResult>;
  ensureReadWritePermission(handle: DirectoryHandle): Promise<boolean>;
}
