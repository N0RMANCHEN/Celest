/**
 * features/canvas/adapters/codeGraphToCanvas.ts
 * ----------------
 * Convert CodeGraphModel (domain) -> Canvas view model.
 * 
 * This replaces codeGraphToFlow.ts and converts to our custom canvas format.
 * 
 * IMPORTANT:
 * - This is the boundary between domain model and Canvas renderer
 * - We project selection state (selectedIds) onto nodes/edges
 * - Returns canvas-specific view model (not ReactFlow types)
 */

import type { CodeGraphModel, CodeGraphNode } from "../../../entities/graph/types";
import type { CanvasNodeData } from "../types";

export type CanvasNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: CanvasNodeData;
  selected: boolean;
  width?: number;
  height?: number;
};

export type CanvasEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  selected: boolean;
};

function mapNodeType(kind: CodeGraphNode["kind"]): string {
  switch (kind) {
    case "fileRef":
      return "fileRefNode";
    case "group":
      return "groupNode";
    case "subgraphInstance":
      return "subgraphNode";
    case "frame":
      return "frameNode";
    case "note":
    default:
      return "noteNode";
  }
}

function mapNodeData(n: CodeGraphNode): CanvasNodeData {
  switch (n.kind) {
    case "fileRef":
      return { kind: n.kind, title: n.title, subtitle: n.path };
    case "note":
      return { kind: n.kind, title: n.title, subtitle: n.text };
    case "subgraphInstance":
      return { kind: n.kind, title: n.title, subtitle: `uses: ${n.defId}` };
    default:
      return { kind: n.kind, title: n.title };
  }
}

function sanitizeHandle(handle: unknown): string | undefined {
  if (handle === null || handle === undefined) return undefined;
  const s = String(handle).trim();
  if (!s || s === "undefined" || s === "null") return undefined;
  return s;
}

export function codeGraphToCanvas(
  graph: CodeGraphModel,
  selectedIds: string[] = []
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const selected = new Set(selectedIds);

  const seenNodeIds = new Set<string>();
  const nodes: CanvasNode[] = [];

  // CRITICAL: Sort node keys to ensure stable order
  const nodeKeys = Object.keys(graph.nodes).sort();
  
  for (const key of nodeKeys) {
    const n = graph.nodes[key];
    if (!n) {
      console.warn(
        "[codeGraphToCanvas] Node key exists but node is null/undefined:",
        key
      );
      continue;
    }
    
    const id = key || n.id;
    if (!id || seenNodeIds.has(id)) {
      if (seenNodeIds.has(id)) {
        console.warn("[codeGraphToCanvas] Duplicate node ID:", id);
      }
      continue;
    }
    seenNodeIds.add(id);

    const position = n.position ?? { x: 0, y: 0 };
    const node: CanvasNode = {
      id,
      type: mapNodeType(n.kind),
      position: { x: position.x ?? 0, y: position.y ?? 0 },
      data: mapNodeData(n),
      selected: selected.has(id),
    };

    // Add size for frame nodes
    if (n.kind === "frame") {
      node.width = n.width ?? 200;
      node.height = n.height ?? 150;
    }

    nodes.push(node);
  }

  const seenEdgeIds = new Set<string>();
  const edges: CanvasEdge[] = [];

  // CRITICAL: Sort edge keys to ensure stable order
  const edgeKeys = Object.keys(graph.edges).sort();
  
  for (const key of edgeKeys) {
    const e = graph.edges[key];
    if (!e) continue;
    
    const id = key || e.id;
    if (!id || seenEdgeIds.has(id)) continue;
    if (!e.source || !e.target) continue;

    seenEdgeIds.add(id);

    const sourceHandle = sanitizeHandle(e.sourceHandle);
    const targetHandle = sanitizeHandle(e.targetHandle);

    edges.push({
      id,
      source: e.source,
      target: e.target,
      ...(sourceHandle ? { sourceHandle } : {}),
      ...(targetHandle ? { targetHandle } : {}),
      selected: selected.has(id),
    });
  }

  return { nodes, edges };
}

