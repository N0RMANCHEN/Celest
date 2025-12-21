/**
 * features/canvas/types.ts
 * ----------------
 * Canvas view-model types.
 * 
 * P1-3: These types are UI/view-model specific and should not be in entities layer.
 * They define the data shapes used by the custom Canvas implementation.
 */

import type { CodeNodeKind } from "../../entities/graph/types";

/**
 * Canvas node type identifiers.
 */
export type CanvasNodeType =
  | "noteNode"
  | "fileRefNode"
  | "groupNode"
  | "subgraphNode";

/**
 * Data shape for Canvas nodes.
 */
export type CanvasNodeData = {
  kind: CodeNodeKind;
  title: string;
  subtitle?: string;
};

/**
 * Data shape for Canvas edges.
 */
export type CanvasEdgeData = {
  edgeKind: "flow";
};
