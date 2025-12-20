/**
 * features/fsIndex/scanFsMeta.ts
 * ----------------
 * Step4C:
 * - Scan a directory handle to produce runtime FS metadata + handles.
 * - NO ReactFlow nodes/edges are created here.
 * - This data powers:
 *   - FsIndexSnapshot (left tree navigation)
 *   - file open operations (via handle lookup)
 */

import { nanoid } from "nanoid";

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

/**
 * Phase 1:
 * Hide Celest internal workspace folder from the FS index.
 *
 * NOTE:
 * We intentionally only hide `/.nodeide` for now to avoid surprising users
 * by hiding their own directories.
 */
const HIDDEN_DIR_NAMES = new Set([".nodeide"]);

export async function scanFsMeta(
  root: FileSystemDirectoryHandle,
  rootName: string
): Promise<ScanFsResult> {
  const handles: Record<string, FileSystemHandle> = {};
  const meta: Record<string, FsMeta> = {};

  const rootId = nanoid();
  handles[rootId] = root;
  meta[rootId] = {
    id: rootId,
    kind: "dir",
    name: rootName,
    path: `/${rootName}`,
  };

  async function walk(
    dir: FileSystemDirectoryHandle,
    parentId: string,
    parentPath: string
  ) {
    const entries: Array<[string, FileSystemHandle]> = [];

    // TS lib types may lag. Cast to any to avoid friction.
    const iter = (dir as unknown as { entries: () => AsyncIterable<[string, FileSystemHandle]> }).entries();
    for await (const [name, handle] of iter) {
      entries.push([name, handle]);
    }

    sortEntries(entries);

    for (const [name, handle] of entries) {
      // Hide Celest internal folder.
      if (handle.kind === "directory" && HIDDEN_DIR_NAMES.has(name)) continue;

      const kind: FsKind = handle.kind === "directory" ? "dir" : "file";
      const id = nanoid();
      const path = `${parentPath}/${name}`;

      handles[id] = handle;
      meta[id] = { id, kind, name, path, parentId };

      if (handle.kind === "directory") {
        await walk(handle as FileSystemDirectoryHandle, id, path);
      }
    }
  }

  await walk(root, rootId, `/${rootName}`);

  return { rootId, handles, meta };
}
