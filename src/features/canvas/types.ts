/**
 * features/canvas/types.ts
 * ----------------
 * Canvas (ReactFlow) view-model types.
 * 
 * P1-3: These types are UI/view-model specific and should not be in entities layer.
 * They define the data shapes used by ReactFlow nodes/edges.
 */

import type { CodeNodeKind } from "../../entities/graph/types";

/**
 * ReactFlow node type identifiers.
 */
export type CanvasNodeType =
  | "noteNode"
  | "fileRefNode"
  | "groupNode"
  | "subgraphNode";

/**
 * Data shape for ReactFlow nodes.
 */
export type CanvasNodeData = {
  kind: CodeNodeKind;
  title: string;
  subtitle?: string;
};

/**
 * Data shape for ReactFlow edges.
 */
export type CanvasEdgeData = {
  edgeKind: "flow";
};
