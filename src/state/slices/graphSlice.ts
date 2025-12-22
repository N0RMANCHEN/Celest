/**
 * graphSlice.ts
 * ----------------
 * Step4C:
 * - Canvas edits CodeGraphModel (domain), not FSGraph.
 * - FS navigation is handled by fsIndexSlice.
 *
 * P1-1:
 * - state slice must not depend on ReactFlow/@xyflow types.
 * - Canvas UI layer translates engine events into Canvas* contracts.
 */

import type { StateCreator } from "zustand";
import { nanoid } from "nanoid";

import type {
  CanvasConnection,
  CanvasEdgeChange,
  CanvasNodeChange,
} from "../../entities/canvas/canvasEvents";

import type { AppState, GraphSlice } from "../types";
import { mapActiveProject } from "../utils/projectUtils";

import type { Vec2 } from "../../entities/graph/types";
import {
  removeEdge,
  removeNode,
  updateNodePosition,
  upsertEdge,
  upsertNode,
} from "../../entities/graph/ops";

function arrayEq(a: string[], b: string[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function sanitizeHandleId(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s || s === "undefined" || s === "null") return undefined;
  return s;
}

function normalizeSelectionIds(ids: unknown): string[] {
  const safeIds = Array.isArray(ids)
    ? ids.filter((id): id is string => typeof id === "string")
    : [];
  // Store selection is stable: unique + sorted.
  return Array.from(new Set(safeIds)).sort();
}

export const createGraphSlice: StateCreator<AppState, [], [], GraphSlice> = (
  set,
  get
) => ({
  selectAndFocusNode: (nodeId) => {
    set((s) => ({
      projects: mapActiveProject(s.projects, s.activeProjectId, (p) => ({
        ...p,
        selectedIds: [nodeId],
        focusNonce: p.focusNonce + 1,
        focusNodeId: nodeId,
      })),
    }));
  },

  createNoteNodeAt: (pos: Vec2) => {
    set((s) => ({
      projects: mapActiveProject(s.projects, s.activeProjectId, (p) => {
        const id = `n_${nanoid()}`;
        const nextGraph = upsertNode(p.graph, {
          id,
          kind: "note",
          title: "Note",
          position: { x: pos.x, y: pos.y },
          text: "",
        });
        return {
          ...p,
          graph: nextGraph,
          selectedIds: [id],
          // 不自动调整 viewport，保持用户视图不变
        };
      }),
    }));

    // Persist graph changes.
    get().markActiveProjectDirty("graph");
  },

  updateNodeTitle: (nodeId, title) => {
    set((s) => ({
      projects: mapActiveProject(s.projects, s.activeProjectId, (p) => {
        const node = p.graph.nodes[nodeId];
        if (!node || node.title === title) return p;
        const nextGraph = upsertNode(p.graph, { ...node, title });
        return { ...p, graph: nextGraph };
      }),
    }));
    get().markActiveProjectDirty("graph");
  },

  updateNoteText: (nodeId, text) => {
    set((s) => ({
      projects: mapActiveProject(s.projects, s.activeProjectId, (p) => {
        const node = p.graph.nodes[nodeId];
        if (!node || node.kind !== "note" || node.text === text) return p;
        const nextGraph = upsertNode(p.graph, { ...node, text });
        return { ...p, graph: nextGraph };
      }),
    }));
    get().markActiveProjectDirty("graph");
  },

  updateFilePath: (nodeId, path) => {
    set((s) => ({
      projects: mapActiveProject(s.projects, s.activeProjectId, (p) => {
        const node = p.graph.nodes[nodeId];
        if (!node || node.kind !== "fileRef" || node.path === path) return p;
        const nextGraph = upsertNode(p.graph, { ...node, path });
        return { ...p, graph: nextGraph };
      }),
    }));
    get().markActiveProjectDirty("graph");
  },

  onNodesChange: (changes: CanvasNodeChange[]) => {
    if (changes.length === 0) return;
    
    let didChange = false;
    set((s) => {
      const project = s.getActiveProject();
      if (!project) return {};
      
      const nextProjects = mapActiveProject(s.projects, s.activeProjectId, (p) => {
        let g = p.graph;
        for (const ch of changes) {
          if (ch.type === "position") {
            if (!ch.position) continue;
            // CRITICAL: Always update position, even if it seems the same.
            // ReactFlow needs to see the position update to stay in sync.
            g = updateNodePosition(g, ch.id, {
              x: ch.position.x,
              y: ch.position.y,
            });
          } else if (ch.type === "remove") {
            g = removeNode(g, ch.id);
          }
        }
        if (g === p.graph) return p;
        didChange = true;
        return { ...p, graph: g };
      });
      
      if (!didChange) return {};
      return { projects: nextProjects };
    });

    // CRITICAL: Always mark dirty when there are changes, even during drag.
    // The debounce in markActiveProjectDirty will handle batching.
    if (didChange) {
      get().markActiveProjectDirty("graph");
    }
  },

  onEdgesChange: (changes: CanvasEdgeChange[]) => {
    let didChange = false;
    set((s) => ({
      projects: mapActiveProject(s.projects, s.activeProjectId, (p) => {
        let g = p.graph;
        for (const ch of changes) {
          if (ch.type === "remove") {
            g = removeEdge(g, ch.id);
          }
        }
        if (g === p.graph) return p;
        didChange = true;
        return { ...p, graph: g };
      }),
    }));

    if (didChange) get().markActiveProjectDirty("graph");
  },

  onConnect: (c: CanvasConnection) => {
    let didChange = false;
    set((s) => ({
      projects: mapActiveProject(s.projects, s.activeProjectId, (p) => {
        if (!c.source || !c.target) return p;

        // Ensure both ends exist.
        if (!p.graph.nodes[c.source] || !p.graph.nodes[c.target]) return p;

        // group nodes are not wireable.
        const sNode = p.graph.nodes[c.source];
        const tNode = p.graph.nodes[c.target];
        if (sNode.kind === "group" || tNode.kind === "group") return p;

        const sh = sanitizeHandleId(c.sourceHandle);
        const th = sanitizeHandleId(c.targetHandle);

        const edgeId = `e_${nanoid()}`;
        const edge = {
          id: edgeId,
          source: c.source,
          target: c.target,
          ...(sh ? { sourceHandle: sh } : {}),
          ...(th ? { targetHandle: th } : {}),
        };

        const next = upsertEdge(p.graph, edge);
        if (next !== p.graph) didChange = true;
        return { ...p, graph: next };
      }),
    }));

    if (didChange) get().markActiveProjectDirty("graph");
  },

  onSelectionChange: (ids) => {
    const p = get().getActiveProject();
    if (!p) return;

    const next = normalizeSelectionIds(ids);

    // IMPORTANT: If selection is unchanged, do not call `set()`.
    // Zustand will still publish an update even if projects reference is unchanged,
    // which can cause ReactFlow to fall into an update loop.
    if (arrayEq(p.selectedIds, next)) return;

    set((s) => ({
      projects: mapActiveProject(s.projects, s.activeProjectId, (proj) =>
        proj === p ? { ...proj, selectedIds: next } : proj
      ),
    }));

    // Mark dirty so selection is persisted to workspace.json
    get().markActiveProjectDirty("graph");
  },
});
