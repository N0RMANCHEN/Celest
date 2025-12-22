/**
 * features/project/openProject.ts
 * ----------------
 * Project open / reopen usecases.
 *
 * Step4C:
 * - Open project builds FS runtime metadata (handles/meta) ONLY.
 * - Canvas no longer renders FSGraph. It renders CodeGraph.
 */

import { nanoid } from "nanoid";

import { scanFsMeta } from "../fsIndex/scanFsMeta";
import type { CodeGraphModel, Vec2 } from "../../entities/graph/types";
import { createEmptyCodeGraph, upsertNode } from "../../entities/graph/ops";

import type { CanvasViewport } from "../../entities/canvas/canvasEvents";
import type { ProjectState, ViewState } from "../../entities/project/types";
import type { ViewportV1 } from "../../core/persistence/nodeideSchema";

import {
  ensureWorkspaceFile,
  loadMainGraph,
  saveMainGraph,
} from "../../core/persistence/loadSave";
import type { PersistenceError } from "../../core/persistence/errors";
import { logger } from "../../shared/utils/logger";

function normalizeViewport(vp: ViewportV1): CanvasViewport {
  return { ...vp, z: vp.z ?? vp.zoom };
}

function viewsFromWorkspace(ws: {
  views: { viewports: { main: ViewportV1; view2: ViewportV1 } };
}): ViewState[] {
  return [
    { id: "main", name: "Main", viewport: normalizeViewport(ws.views.viewports.main) },
    { id: "view2", name: "View 2", viewport: normalizeViewport(ws.views.viewports.view2) },
  ];
}

function seedGraph(): CodeGraphModel {
  // A small starting node so users can see the canvas is alive.
  const g0 = createEmptyCodeGraph();
  const id = `n_${nanoid()}`;
  const pos: Vec2 = { x: 0, y: 0 };
  return upsertNode(g0, {
    id,
    kind: "note",
    title: "Canvas (CodeGraph)",
    position: pos,
    text: "Double-click empty space to create a note node.",
  });
}

function sanitizeSelectedNodeIds(
  graph: CodeGraphModel,
  ids: unknown
): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of ids) {
    if (typeof v !== "string") continue;
    if (!graph.nodes[v]) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  out.sort();
  return out;
}

/**
 * Check if an error indicates that data was restored from backup.
 */
function isRestoredFromBackup(error: PersistenceError | null): boolean {
  if (!error) return false;
  return (
    error.filePath.includes("restored from backup") ||
    error.message.includes("restored from backup")
  );
}

export async function buildProjectFromDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  opts?: { fixedId?: string; fixedName?: string }
): Promise<ProjectState> {
  const id = opts?.fixedId ?? `p_${nanoid()}`;
  const name = opts?.fixedName ?? dirHandle.name;

  const scanned = await scanFsMeta(dirHandle, name);

  // Step5A: load (or create) /.celest/workspace.json and graphs/main.json
  // Non-fatal: if the browser denies write access, project still opens.
  const { file: ws } = await ensureWorkspaceFile(dirHandle);

  let graph: CodeGraphModel = seedGraph();
  try {
    const loaded = await loadMainGraph(dirHandle);
    if (loaded.graph) {
      graph = loaded.graph;
    } else {
      // First run: persist the seeded graph as a convenience.
      await saveMainGraph(dirHandle, graph);
    }
    // Log errors if any (non-fatal)
    if (loaded.error) {
      if (isRestoredFromBackup(loaded.error)) {
        logger.warn(
          `[openProject] Graph file restored from backup. Original file may be corrupted: ${loaded.error.filePath}`
        );
      } else {
        logger.warn(`[openProject] loadMainGraph error: ${loaded.error.message}`);
      }
    }
  } catch (e) {
    logger.warn(`[openProject] loadMainGraph failed: ${String(e)}`);
  }

  // Phase 1 UI restore: Canvas selection (FS tree UI restore is handled by fsIndexSlice).
  const selectedIds = sanitizeSelectedNodeIds(
    graph,
    ws.ui?.canvas?.selectedNodeIds
  );

  return {
    id,
    name,
    workspaceMeta: ws.meta,
    dirHandle,

    handles: scanned.handles,
    rootDirId: scanned.rootId,
    meta: scanned.meta,

    graph,

    selectedIds,
    focusNodeId: undefined,
    focusNonce: 0,

    activeViewId: ws.views.activeViewId,
    views: viewsFromWorkspace(ws),

    treeExpanded: {},
  };
}

