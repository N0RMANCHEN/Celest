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
    default:
      return { kind: n.kind, title: n.title };
  }
}

export function codeGraphToFlow(
  graph: CodeGraphModel
): { nodes: Node<CanvasNodeData>[]; edges: Edge<CanvasEdgeData>[] } {
  const nodes: Node<CanvasNodeData>[] = Object.values(graph.nodes).map((n) => ({
    id: n.id,
    type: mapNodeType(n.kind),
    position: { x: n.position.x, y: n.position.y },
    data: mapNodeData(n),
  }));

  const edges: Edge<CanvasEdgeData>[] = Object.values(graph.edges).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
    ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
    type: "smoothstep",
    data: { edgeKind: "flow" },
  }));

  return { nodes, edges };
}
