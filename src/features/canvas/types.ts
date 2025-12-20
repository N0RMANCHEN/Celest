/**
 * features/canvas/types.ts
 * ----------------
 * Canvas (ReactFlow) view-model data shapes.
 *
 * P1-3:
 * - Keep `entities/graph/*` free of Canvas* naming.
 * - Move UI view-model types into `features/canvas/*`.
 */

import type { CodeNodeKind } from "../../entities/graph/types";

/**
 * ReactFlow node type strings used by the Canvas renderer.
 * These map to entries in `features/canvas/nodeTypes.ts`.
 */
export type CanvasNodeType =
  | "noteNode"
  | "fileRefNode"
  | "groupNode"
  | "subgraphNode";

/**
 * Minimal per-node UI data derived from the domain graph.
 * UI can render labels/icons based on `kind`.
 */
export type CanvasNodeData = {
  kind: CodeNodeKind;
  title: string;
  subtitle?: string;
};

export type CanvasEdgeData = {
  edgeKind: "flow";
};
