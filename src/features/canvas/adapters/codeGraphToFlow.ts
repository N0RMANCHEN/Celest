/**
 * features/canvas/adapters/codeGraphToFlow.ts
 * ----------------
 * Step4C:
 * Convert CodeGraphModel (domain) -> ReactFlow nodes/edges (view model).
 *
 * This file is the boundary between the stable graph model and the
 * ReactFlow renderer. Later, if we replace ReactFlow, we only replace
 * adapters + renderer, not the domain model.
 */

import type { Edge, Node } from "reactflow";

import type {
  CanvasEdgeData,
  CanvasNodeData,
  CanvasNodeType,
  CodeGraphModel,
  CodeGraphNode,
} from "../../../entities/graph/types";

function mapNodeType(kind: CodeGraphNode["kind"]): CanvasNodeType {
  switch (kind) {
    case "fileRef":
      return "fileRefNode";
    case "group":
      return "groupNode";
    case "subgraphInstance":
      return "subgraphNode";
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

export function codeGraphToFlow(
  graph: CodeGraphModel
): { nodes: Node<CanvasNodeData>[]; edges: Edge<CanvasEdgeData>[] } {
  const seenNodeIds = new Set<string>();
  const nodes: Node<CanvasNodeData>[] = [];

  for (const [key, n] of Object.entries(graph.nodes)) {
    const id = key || n.id;
    if (!id || seenNodeIds.has(id)) continue;
    seenNodeIds.add(id);

    const position = n.position ?? { x: 0, y: 0 };
    nodes.push({
      id,
      type: mapNodeType(n.kind),
      position: { x: position.x ?? 0, y: position.y ?? 0 },
      data: mapNodeData(n),
    });
  }

  const seenEdgeIds = new Set<string>();
  const edges: Edge<CanvasEdgeData>[] = [];

  for (const [key, e] of Object.entries(graph.edges)) {
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
      type: "smoothstep",
      data: { edgeKind: "flow" },
    });
  }

  return { nodes, edges };
}
