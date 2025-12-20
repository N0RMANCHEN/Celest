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

import type { ProjectState, ViewState } from "../../entities/project/types";

import {
  ensureWorkspaceFile,
  loadMainGraph,
  saveMainGraph,
} from "../../core/persistence/loadSave";

function viewsFromWorkspace(
  ws: Awaited<ReturnType<typeof ensureWorkspaceFile>>
): ViewState[] {
  return [
    { id: "main", name: "Main", viewport: ws.views.viewports.main },
    { id: "view2", name: "View 2", viewport: ws.views.viewports.view2 },
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

export async function buildProjectFromDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  opts?: { fixedId?: string; fixedName?: string }
): Promise<ProjectState> {
  const id = opts?.fixedId ?? `p_${nanoid()}`;
  const name = opts?.fixedName ?? dirHandle.name;

  const scanned = await scanFsMeta(dirHandle, name);

  // Step5A: load (or create) /.nodeide/workspace.json and graphs/main.json
  // Non-fatal: if the browser denies write access, project still opens.
  const ws = await ensureWorkspaceFile(dirHandle);

  let graph: CodeGraphModel = seedGraph();
  try {
    const loaded = await loadMainGraph(dirHandle);
    if (loaded?.graph) graph = loaded.graph;
    else {
      // First run: persist the seeded graph as a convenience.
      await saveMainGraph(dirHandle, graph);
    }
  } catch (e) {
    console.warn(`[openProject] loadMainGraph failed: ${String(e)}`);
  }

  return {
    id,
    name,
    workspaceMeta: ws.meta,
    dirHandle,

    handles: scanned.handles,
    rootDirId: scanned.rootId,
    meta: scanned.meta,

    graph,

    selectedIds: [],
    focusNodeId: undefined,
    focusNonce: 0,

    activeViewId: ws.views.activeViewId,
    views: viewsFromWorkspace(ws),

    treeExpanded: {},
  };
}
