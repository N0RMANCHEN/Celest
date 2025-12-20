/**
 * graphSlice.ts
 * ----------------
 * Step4C:
 * - Canvas edits CodeGraphModel (domain), not FSGraph.
 * - FS navigation is handled by fsIndexSlice.
 */

import type { StateCreator } from "zustand";
import type { Connection, EdgeChange, NodeChange } from "reactflow";
import { nanoid } from "nanoid";

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

export const createGraphSlice: StateCreator<AppState, [], [], GraphSlice> = (set, get) => ({
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
          focusNonce: p.focusNonce + 1,
          focusNodeId: id,
        };
      }),
    }));

    // Persist graph changes.
    get().markActiveProjectDirty("graph");
  },

  onNodesChange: (changes: NodeChange[]) => {
    let didChange = false;
    set((s) => ({
      projects: mapActiveProject(s.projects, s.activeProjectId, (p) => {
        let g = p.graph;
        for (const ch of changes) {
          if (ch.type === "position" && (ch as any).position) {
            const position = (ch as any).position as { x: number; y: number };
            g = updateNodePosition(g, ch.id, { x: position.x, y: position.y });
          } else if (ch.type === "remove") {
            g = removeNode(g, ch.id);
          }
        }
        if (g === p.graph) return p;
        didChange = true;
        return { ...p, graph: g };
      }),
    }));

    if (didChange) get().markActiveProjectDirty("graph");
  },

  onEdgesChange: (changes: EdgeChange[]) => {
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

  onConnect: (c: Connection) => {
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
    set((s) => ({
      projects: mapActiveProject(s.projects, s.activeProjectId, (p) => {
        const safeIds = Array.isArray(ids)
          ? ids.filter((id): id is string => typeof id === "string")
          : [];
        const next = Array.from(new Set(safeIds)).sort();
        if (arrayEq(p.selectedIds, next)) return p;
        return { ...p, selectedIds: next };
      }),
    }));
  },
});
