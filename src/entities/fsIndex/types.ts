/**
 * entities/fsIndex/types.ts
 * ----------------
 * FS Index domain types.
 *
 * Phase 1:
 * - FS Index is a pure, JSON-serializable snapshot of the file system structure.
 * - It drives the Left Tree (navigation) and is separate from CodeGraph.
 * - FsIndexSnapshot is built from FsMeta during project scanning.
 */

export type FsKind = "dir" | "file";

/**
 * Runtime metadata for FS entries.
 *
 * Used during project scanning to build FsIndexSnapshot.
 * Contains path-based stable IDs for consistent tree expansion/selection.
 */
export type FsMeta = {
  id: string;
  kind: FsKind;
  name: string;
  path: string;
  parentId?: string;
};

// ---------------------- FS Index Snapshot ----------------------

/**
 * A pure node entry inside FsIndexSnapshot.
 *
 * - JSON-serializable.
 * - Stable enough to drive the Left Tree.
 * - Does NOT contain FileSystemHandle (runtime-only).
 */
export type FsIndexNode = {
  id: string;
  kind: FsKind;
  name: string;
  path: string;
  parentId?: string;
  /**
   * For directory nodes only.
   * Kept as an array to preserve stable ordering in the left tree.
   */
  children: string[];
};

/**
 * JSON-serializable snapshot of a folder's structure.
 */
export type FsIndexSnapshot = {
  version: 1;
  rootId: string;
  nodes: Record<string, FsIndexNode>;
};
