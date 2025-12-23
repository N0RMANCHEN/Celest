/**
 * entities/graph/ops.ts
 * ----------------
 * Step4C:
 * Pure helpers for updating CodeGraphModel.
 *
 * IMPORTANT:
 * - Keep this layer React-free.
 * - Do not depend on UI engine types here (pure domain logic).
 */

import type {
  CodeGraphEdge,
  CodeGraphModel,
  CodeGraphNode,
  Vec2,
} from "./types";

export function createEmptyCodeGraph(): CodeGraphModel {
  return { version: 1, nodes: {}, edges: {} };
}

export function upsertNode(graph: CodeGraphModel, node: CodeGraphNode): CodeGraphModel {
  return {
    ...graph,
    nodes: {
      ...graph.nodes,
      [node.id]: node,
    },
  };
}

export function updateNodePosition(
  graph: CodeGraphModel,
  nodeId: string,
  position: Vec2
): CodeGraphModel {
  const cur = graph.nodes[nodeId];
  if (!cur) return graph;
  if (cur.position.x === position.x && cur.position.y === position.y) return graph;
  return {
    ...graph,
    nodes: {
      ...graph.nodes,
      [nodeId]: { ...cur, position },
    },
  };
}

export function removeNode(graph: CodeGraphModel, nodeId: string): CodeGraphModel {
  if (!graph.nodes[nodeId]) return graph;

  const nextNodes = { ...graph.nodes };
  delete nextNodes[nodeId];

  // Remove edges connected to this node.
  const nextEdges: Record<string, CodeGraphEdge> = {};
  for (const e of Object.values(graph.edges)) {
    if (e.source === nodeId || e.target === nodeId) continue;
    nextEdges[e.id] = e;
  }

  return { ...graph, nodes: nextNodes, edges: nextEdges };
}

export function upsertEdge(graph: CodeGraphModel, edge: CodeGraphEdge): CodeGraphModel {
  return {
    ...graph,
    edges: {
      ...graph.edges,
      [edge.id]: edge,
    },
  };
}

export function removeEdge(graph: CodeGraphModel, edgeId: string): CodeGraphModel {
  if (!graph.edges[edgeId]) return graph;
  const next = { ...graph.edges };
  delete next[edgeId];
  return { ...graph, edges: next };
}
