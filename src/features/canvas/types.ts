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
 * 
 * These correspond to CodeNodeKind types mapped by codeGraphToCanvas:
 * - note -> noteNode
 * - fileRef -> fileRefNode
 * - group -> groupNode
 * - subgraphInstance -> subgraphNode
 * - frame -> frameNode
 */
export type CanvasNodeType =
  | "noteNode"
  | "fileRefNode"
  | "groupNode"
  | "subgraphNode"
  | "frameNode";

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
