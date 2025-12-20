/**
 * entities/project/types.ts
 * ----------------
 * Stable Project domain types.
 *
 * P1-2 goals:
 * - Move ProjectState / ViewState out of feature usecases.
 * - Make the split between serializable snapshot vs runtime-only handles explicit.
 */

import type { CanvasViewport } from "../canvas/canvasEvents";
import type { FsMeta } from "../fsIndex/types";
import type { CodeGraphModel } from "../graph/types";

export type ViewId = "main" | "view2";

export type ViewState = {
  id: ViewId;
  name: string;
  viewport: CanvasViewport;
};

export type WorkspaceMeta = {
  createdAt: string;
  updatedAt: string;
};

/**
 * JSON-serializable portion of a project.
 *
 * NOTE: This does not mean we currently persist all of these fields;
 * it simply documents what is safe to persist.
 */
export type ProjectSnapshot = {
  id: string;
  name: string;
  workspaceMeta: WorkspaceMeta;

  graph: CodeGraphModel;

  // Selection / focus (canvas)
  selectedIds: string[];
  focusNodeId?: string;
  focusNonce: number;

  // Views (fixed 2 in Phase 1)
  activeViewId: ViewId;
  views: ViewState[];

  // Legacy UI state kept only when needed; do not rely on it.
  treeExpanded: Record<string, boolean>;
};

/**
 * Runtime-only portion of a project.
 *
 * - Contains File System Access API handles which cannot be serialized.
 */
export type ProjectRuntime = {
  dirHandle: FileSystemDirectoryHandle;
  handles: Record<string, FileSystemHandle>;

  // FS runtime meta (used for FsIndexSnapshot + file open)
  rootDirId: string;
  meta: Record<string, FsMeta>;
};

export type ProjectState = ProjectSnapshot & ProjectRuntime;
