/**
 * core/persistence/nodeideSchema.ts
 * ----------------
 * Step5A:
 * Define the on-disk layout under `/.celest/` and the versioned JSON shapes.
 *
 * Notes:
 * - Phase 1 keeps the location fixed: projectRoot/.celest/
 * - FS Index is NOT persisted (rebuild by scanning the folder).
 * - CodeGraph and viewports ARE persisted.
 */

import type { CodeGraphModel } from "../../entities/graph/types";

export const CELEST_DIRNAME = ".celest";
export const GRAPHS_DIRNAME = "graphs";

export const WORKSPACE_FILENAME = "workspace.json";
export const MAIN_GRAPH_FILENAME = "main.json";

/** Schema version for workspace.json */
export const WORKSPACE_SCHEMA_VERSION = 1 as const;
/** Schema version for graph files */
export const GRAPH_SCHEMA_VERSION = 1 as const;

export type ViewportV1 = { x: number; y: number; zoom: number; z?: number };

/**
 * Phase 1 UI state persisted in workspace.json.
 *
 * IMPORTANT:
 * - This is project-local UI state (per folder), not global app settings.
 * - Keep optional to preserve backward compatibility without bumping schema version.
 */
export type FsTreeUiV1 = {
  /** Directory expansion map: dirId -> expanded? */
  expanded?: Record<string, boolean>;
  /** Selected entry id in the left tree. */
  selectedId?: string | null;
};

/**
 * Canvas UI state (Phase 1 minimal).
 *
 * NOTE:
 * - We only persist selection for now.
 * - This is NOT the domain graph; graph content lives in graphs/*.json.
 */
export type CanvasUiV1 = {
  selectedNodeIds?: string[];
};

export type WorkspaceUiV1 = {
  fsTree?: FsTreeUiV1;
  canvas?: CanvasUiV1;
};

export type WorkspaceFileV1 = {
  version: typeof WORKSPACE_SCHEMA_VERSION;
  /** Phase 1 fixed views */
  views: {
    activeViewId: "main" | "view2";
    viewports: Record<"main" | "view2", ViewportV1>;
  };
  /** Phase 1 fixed graph */
  graphs: {
    activeGraphId: "main";
    files: Record<"main", string>; // relative to .celest/
  };
  meta: {
    createdAt: string; // ISO
    updatedAt: string; // ISO
  };

  /** Optional UI state (Phase 1: FS Tree + Canvas selection) */
  ui?: WorkspaceUiV1;
};

export type GraphFileV1 = {
  version: typeof GRAPH_SCHEMA_VERSION;
  graph: CodeGraphModel;
  meta: {
    createdAt: string; // ISO
    updatedAt: string; // ISO
  };
};

export function nowIso(): string {
  return new Date().toISOString();
}

export function defaultWorkspaceFile(): WorkspaceFileV1 {
  const t = nowIso();
  return {
    version: WORKSPACE_SCHEMA_VERSION,
    views: {
      activeViewId: "main",
      viewports: {
        main: { x: 400, y: 300, zoom: 1, z: 1 },
        view2: { x: 400, y: 300, zoom: 1, z: 1 },
      },
    },
    graphs: {
      activeGraphId: "main",
      files: { main: `${GRAPHS_DIRNAME}/${MAIN_GRAPH_FILENAME}` },
    },
    meta: { createdAt: t, updatedAt: t },
  };
}

export function wrapGraphFile(
  graph: CodeGraphModel,
  createdAt?: string
): GraphFileV1 {
  const now = nowIso();
  return {
    version: GRAPH_SCHEMA_VERSION,
    graph,
    meta: { createdAt: createdAt ?? now, updatedAt: now },
  };
}
