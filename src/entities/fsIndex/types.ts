/**
 * entities/fsIndex/types.ts
 * ----------------
 * FS Index domain types.
 *
 * Phase 1 context:
 * - Legacy MVP uses an FSGraph (ReactFlow nodes/edges) for both navigation and canvas.
 * - Step4A introduces FsIndexSnapshot: a pure, JSON-serializable snapshot that will
 *   drive the Left Tree (navigation) in Step4B.
 */

export type FsKind = "dir" | "file";

/**
 * Runtime metadata for FS entries.
 *
 * Legacy FSGraph builds and stores this so UI can derive names/paths quickly.
 */
export type FsMeta = {
  id: string;
  kind: FsKind;
  name: string;
  path: string;
  parentId?: string;
};

/**
 * ReactFlow node data used by the legacy FSGraph view.
 */
export type FsNodeData = {
  title: string;
  kind: "dir" | "file" | "group";
  path: string;
};

/**
 * ReactFlow edge data used by the legacy FSGraph view.
 */
export type FsEdgeData = {
  locked?: boolean;
  edgeKind: "fs" | "flow";
};

// ---------------------- Step4A: FS Index Snapshot ----------------------

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
