/**
 * graphSlice.ts
 * ----------------
 * Step4C:
 * - Canvas edits CodeGraphModel (domain), not FSGraph.
 * - FS navigation is handled by fsIndexSlice.
 *
 * P1-1:
 * - state slice must not depend on UI engine types (uses Canvas* contracts).
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

import type { CodeGraphEdge, CodeGraphNode, Vec2 } from "../../entities/graph/types";
import {
  removeEdge,
  removeNode,
  updateNodeDimensions,
  updateNodePosition,
  upsertEdge,
  upsertNode,
} from "../../entities/graph/ops";

type GraphClipboard = {
  nodes: CodeGraphNode[];
  edges: CodeGraphEdge[];
  bboxCenter: Vec2;
  bboxSize: Vec2;
  pasteCount: number;
};

// App-internal graph clipboard (NOT the system clipboard).
// Stored outside Zustand state intentionally to avoid re-renders and to keep it UI-internal.
let graphClipboard: GraphClipboard | null = null;

function computeBbox(nodes: CodeGraphNode[]): { center: Vec2; size: Vec2 } {
  if (nodes.length === 0) return { center: { x: 0, y: 0 }, size: { x: 0, y: 0 } };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const x = n.position?.x ?? 0;
    const y = n.position?.y ?? 0;
    const w = typeof n.width === "number" ? n.width : 0;
    const h = typeof n.height === "number" ? n.height : 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }
  return {
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    size: { x: maxX - minX, y: maxY - minY },
  };
}

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
        const prevHasText = Boolean(node.text && node.text.trim().length > 0);
        const nextHasText = Boolean(text && text.trim().length > 0);
        const subtitleChanged = prevHasText !== nextHasText;

        const nextGraph = upsertNode(p.graph, {
          ...node,
          text,
          // 当文本有/无发生切换时，清理显式 height，让 UI 重新测量回到 A/C 状态
          ...(subtitleChanged ? { height: undefined } : {}),
        });
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
            // Canvas needs to see the position update to stay in sync.
            g = updateNodePosition(g, ch.id, {
              x: ch.position.x,
              y: ch.position.y,
            });
          } else if (ch.type === "dimensions") {
            if (!ch.dimensions) continue;
            const MIN_W = 80;
            const MAX_W = 2000;
            const MAX_H = 5000;
            const node = p.graph.nodes[ch.id];
            if (!node) continue;

            const hasSubtitle =
              node.kind === "note" ? Boolean(node.text) : false;
            // 与 Canvas.tsx 中的 MIN_H_WITH_TEXT 和 MIN_H_NO_TEXT 保持一致
            const MIN_H = hasSubtitle ? 73 : 56;
            const EPS = 0.5; // 允许细微误差

            const w = Math.min(MAX_W, Math.max(MIN_W, ch.dimensions.width));
            const h = Math.min(MAX_H, Math.max(MIN_H, ch.dimensions.height));

            // 如果高度被拖到接近 minH，视为回到基准态，清理显式 height
            const nearMin = h <= MIN_H + EPS;
            if (nearMin) {
              // 使用 upsertNode 更新节点，只设置 width，删除 height 属性
              // 注意：FrameNode 需要保留 height，所以只对非 frame 节点删除 height
              if (node.kind === "frame") {
                // FrameNode 必须保留 height，所以只更新 width
                g = upsertNode(g, {
                  ...node,
                  width: w,
                });
              } else {
                // 其他节点可以删除 height，让 DOM 重新测量
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { height, ...nodeWithoutHeight } = node;
                g = upsertNode(g, {
                  ...nodeWithoutHeight,
                  width: w,
                });
              }
            } else {
              // 正常情况：使用 updateNodeDimensions 更新尺寸
              g = updateNodeDimensions(g, ch.id, { width: w, height: h });
            }
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
    // which can cause Canvas to fall into an update loop.
    if (arrayEq(p.selectedIds, next)) return;

    set((s) => ({
      projects: mapActiveProject(s.projects, s.activeProjectId, (proj) =>
        proj === p ? { ...proj, selectedIds: next } : proj
      ),
    }));

    // Mark dirty so selection is persisted to workspace.json
    get().markActiveProjectDirty("graph");
  },

  copySelectionToClipboard: () => {
    const p = get().getActiveProject();
    if (!p) return;

    const selectedNodeIds = p.selectedIds.filter((id) => !!p.graph.nodes[id]);
    if (selectedNodeIds.length === 0) return;

    const nodeIdSet = new Set(selectedNodeIds);
    const nodes = selectedNodeIds
      .map((id) => p.graph.nodes[id])
      .filter((n): n is CodeGraphNode => !!n);

    // 防御：清理异常尺寸（非有限或过大）
    const sanitizeNode = (n: CodeGraphNode): CodeGraphNode => {
      const width = n.width;
      const height = n.height;
      const safeWidth =
        typeof width === "number" && Number.isFinite(width) && width > 0 && width <= 2000
          ? width
          : undefined;
      const safeHeight =
        typeof height === "number" && Number.isFinite(height) && height > 0 && height <= 5000
          ? height
          : undefined;
      return safeWidth === width && safeHeight === height
        ? n
        : ({ ...n, ...(safeWidth ? { width: safeWidth } : { width: undefined }), ...(safeHeight ? { height: safeHeight } : { height: undefined }) } as CodeGraphNode);
    };

    const sanitizedNodes = nodes.map(sanitizeNode);

    const edges = Object.values(p.graph.edges).filter(
      (e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
    );

    const bbox = computeBbox(sanitizedNodes);
    graphClipboard = {
      nodes: sanitizedNodes.map((n) => ({ ...n })),
      edges: edges.map((e) => ({ ...e })),
      bboxCenter: bbox.center,
      bboxSize: bbox.size,
      pasteCount: 0,
    };
  },

  cutSelectionToClipboard: () => {
    const p = get().getActiveProject();
    if (!p) return;

    // Copy first (clipboard uses nodes only; edges are derived between them)
    get().copySelectionToClipboard();

    // Then delete exactly what is selected (nodes/edges), consistent with current Delete behavior.
    const nodeChanges: CanvasNodeChange[] = [];
    const edgeChanges: CanvasEdgeChange[] = [];
    for (const id of p.selectedIds) {
      if (p.graph.nodes[id]) nodeChanges.push({ id, type: "remove" });
      else if (p.graph.edges[id]) edgeChanges.push({ id, type: "remove" });
    }
    if (nodeChanges.length > 0) get().onNodesChange(nodeChanges);
    if (edgeChanges.length > 0) get().onEdgesChange(edgeChanges);
    get().onSelectionChange([]);
  },

  pasteClipboardAt: (pos: Vec2) => {
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;
    const clip = graphClipboard;
    if (!clip || clip.nodes.length === 0) return;

    let didChange = false;
    set((s) => {
      const p = s.getActiveProject();
      if (!p) return {};

      // 把选中块的 bbox 中心对齐到鼠标位置，并在后续粘贴时施加固定偏移
      const pasteIndex = clip.pasteCount;
      const baseDelta = {
        x: pos.x - clip.bboxCenter.x,
        y: pos.y - clip.bboxCenter.y,
      };
      const nudgePerPaste = { x: 16, y: 16 }; // 固定偏移，不随 pasteCount 累加增长
      const delta = {
        x: baseDelta.x + nudgePerPaste.x * pasteIndex,
        y: baseDelta.y + nudgePerPaste.y * pasteIndex,
      };

      const idMap = new Map<string, string>();
      for (const n of clip.nodes) {
        idMap.set(n.id, `n_${nanoid()}`);
      }

      let g = p.graph;
      const newNodeIds: string[] = [];
      const newEdgeIds: string[] = [];

      for (const n of clip.nodes) {
        const nextId = idMap.get(n.id);
        if (!nextId) continue;
        const nextPos = {
          x: (n.position?.x ?? 0) + delta.x,
          y: (n.position?.y ?? 0) + delta.y,
        };
        const nextNode = { ...n, id: nextId, position: nextPos } as CodeGraphNode;
        g = upsertNode(g, nextNode);
        newNodeIds.push(nextId);
      }

      for (const e of clip.edges) {
        const ns = idMap.get(e.source);
        const nt = idMap.get(e.target);
        if (!ns || !nt) continue;
        const nextEid = `e_${nanoid()}`;
        const nextEdge = { ...e, id: nextEid, source: ns, target: nt } as CodeGraphEdge;
        g = upsertEdge(g, nextEdge);
        newEdgeIds.push(nextEid);
      }

      if (g === p.graph) return {};
      didChange = true;

      return {
        projects: mapActiveProject(s.projects, s.activeProjectId, (pp) =>
          pp.id !== p.id
            ? pp
            : {
                ...pp,
                graph: g,
                selectedIds: [...newNodeIds, ...newEdgeIds],
              }
        ),
      };
    });

    if (didChange) {
      graphClipboard = { ...clip, pasteCount: clip.pasteCount + 1 };
      get().markActiveProjectDirty("graph");
    }
  },

  duplicateNodesForDrag: (nodeIds: string[]) => {
    const p = get().getActiveProject();
    if (!p) return { nodes: [], edgeIds: [] };

    const baseIds = Array.from(new Set(nodeIds)).filter((id) => !!p.graph.nodes[id]);
    if (baseIds.length === 0) return { nodes: [], edgeIds: [] };

    const nodeIdSet = new Set(baseIds);
    const nodes = baseIds.map((id) => p.graph.nodes[id]).filter((n): n is CodeGraphNode => !!n);
    const edges = Object.values(p.graph.edges).filter(
      (e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
    );

    const idMap = new Map<string, string>();
    for (const n of nodes) idMap.set(n.id, `n_${nanoid()}`);

    let nextGraph = p.graph;
    const newNodes: { id: string; position: { x: number; y: number } }[] = [];
    const newEdgeIds: string[] = [];

    for (const n of nodes) {
      const nextId = idMap.get(n.id)!;
      const nextNode = { ...n, id: nextId } as CodeGraphNode;
      nextGraph = upsertNode(nextGraph, nextNode);
      newNodes.push({ id: nextId, position: { ...nextNode.position } });
    }
    for (const e of edges) {
      const ns = idMap.get(e.source);
      const nt = idMap.get(e.target);
      if (!ns || !nt) continue;
      const nextEid = `e_${nanoid()}`;
      const nextEdge = { ...e, id: nextEid, source: ns, target: nt } as CodeGraphEdge;
      nextGraph = upsertEdge(nextGraph, nextEdge);
      newEdgeIds.push(nextEid);
    }

    if (nextGraph !== p.graph) {
      set((s) => ({
        projects: mapActiveProject(s.projects, s.activeProjectId, (pp) =>
          pp.id !== p.id
            ? pp
            : {
                ...pp,
                graph: nextGraph,
                selectedIds: [...newNodes.map((n) => n.id), ...newEdgeIds],
              }
        ),
      }));
      get().markActiveProjectDirty("graph");
    }

    return { nodes: newNodes, edgeIds: newEdgeIds };
  },
});
