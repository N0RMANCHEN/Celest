/**
 * features/fsIndex/scanFsMeta.ts
 * ----------------
 * Step4C:
 * - Scan a directory handle to produce runtime FS metadata + handles.
 * - NO ReactFlow nodes/edges are created here.
 * - This data powers:
 *   - FsIndexSnapshot (left tree navigation)
 *   - file open operations (via handle lookup)
 *
 * P0-Task-5:
 * - Add a default ignore list to avoid scanning huge folders (node_modules/.git/dist...)
 *   preventing UI freezes when opening common frontend projects.
 *
 * P1-4 (critical):
 * - FS entry IDs must be STABLE across reopen.
 *   Otherwise workspace.json can't persist tree expanded/selected state.
 */

import type { FsKind, FsMeta } from "../../entities/fsIndex/types";

export type ScanFsResult = {
  rootId: string;
  handles: Record<string, FileSystemHandle>;
  meta: Record<string, FsMeta>;
};

function sortEntries(entries: Array<[string, FileSystemHandle]>) {
  entries.sort((a, b) => {
    if (a[1].kind !== b[1].kind) return a[1].kind === "directory" ? -1 : 1;
    return a[0].localeCompare(b[0]);
  });
}

function normalizePath(p: string): string {
  if (!p) return "/";
  return p.startsWith("/") ? p : `/${p}`;
}

function joinPath(parentPath: string, name: string): string {
  const base = normalizePath(parentPath);
  if (base === "/") return `/${name}`;
  return `${base}/${name}`;
}

/**
 * Stable, readable ids that do NOT depend on random nanoid().
 *
 * NOTE:
 * - We intentionally keep ids derived from the *relative path from project root*.
 * - This keeps ids stable even if the project folder is renamed.
 */
function idForPath(relPath: string): string {
  return `fs:${normalizePath(relPath)}`;
}

/**
 * Phase 1 / P0:
 * Default ignored directories to prevent scanning large, generated, or irrelevant folders.
 *
 * Notes:
 * - This is a performance safeguard, not a "security" feature.
 * - We keep it intentionally conservative and easy to tweak later.
 * - `.celest` must be ignored to avoid indexing Celest's own workspace assets.
 * - `.nodeide` is also ignored for backward compatibility (old projects).
 */
const DEFAULT_IGNORED_DIR_NAMES = new Set<string>([
  ".celest",
  ".nodeide",

  // package / deps
  "node_modules",
  ".pnpm-store",

  // VCS
  ".git",

  // build outputs
  "dist",
  "build",
  "out",
  "coverage",

  // framework caches
  ".next",
  ".cache",
  ".turbo",
  ".vite",
]);

function shouldIgnoreDir(name: string) {
  return DEFAULT_IGNORED_DIR_NAMES.has(name);
}

export async function scanFsMeta(
  root: FileSystemDirectoryHandle,
  rootName: string
): Promise<ScanFsResult> {
  const handles: Record<string, FileSystemHandle> = {};
  const meta: Record<string, FsMeta> = {};

  // Root is always the project root ("/")
  const rootPath = "/";
  const rootId = idForPath(rootPath);

  handles[rootId] = root;
  meta[rootId] = {
    id: rootId,
    kind: "dir",
    name: rootName,
    path: rootPath,
  };

  async function walk(
    dir: FileSystemDirectoryHandle,
    parentId: string,
    parentPath: string
  ) {
    const entries: Array<[string, FileSystemHandle]> = [];

    for await (const [name, handle] of dir.entries()) {
      entries.push([name, handle]);
    }

    sortEntries(entries);

    for (const [name, handle] of entries) {
      // P0 safeguard: ignore huge / generated directories
      if (handle.kind === "directory" && shouldIgnoreDir(name)) continue;

      const kind: FsKind = handle.kind === "directory" ? "dir" : "file";
      const path = joinPath(parentPath, name);
      const id = idForPath(path);

      handles[id] = handle;
      meta[id] = { id, kind, name, path, parentId };

      if (handle.kind === "directory") {
        await walk(handle as FileSystemDirectoryHandle, id, path);
      }
    }
  }

  await walk(root, rootId, rootPath);

  return { rootId, handles, meta };
}
