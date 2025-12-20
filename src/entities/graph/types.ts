/**
 * entities/graph/types.ts
 * ----------------
 * Step4C:
 * - Define the (minimal) CodeGraph domain model.
 * - This is the logical graph shown on the Canvas.
 * - FS Index remains separate and only drives navigation.
 *
 * NOTE:
 * Phase 1 keeps the model intentionally small (note + fileRef).
 * Frame/Group/Subgraph are reserved as kinds, but not fully enabled yet.
 */

export type GraphVersion = 1;

export type CodeNodeKind =
  | "note"
  | "fileRef"
  | "frame"
  | "group"
  | "subgraphInstance";

export type Vec2 = { x: number; y: number };

export type CodeGraphNodeBase = {
  id: string;
  kind: CodeNodeKind;
  title: string;
  position: Vec2;
};

export type NoteNode = CodeGraphNodeBase & {
  kind: "note";
  /**
   * Plain text content (Phase 1).
   * Later we can evolve this into rich MD or separate content assets.
   */
  text: string;
};

export type FileRefNode = CodeGraphNodeBase & {
  kind: "fileRef";
  /**
   * Workspace-relative path, e.g. "/MyProject/README.md".
   * (This is a reference only; it does not imply a 1:1 mapping.)
   */
  path: string;
};

export type FrameNode = CodeGraphNodeBase & {
  kind: "frame";
  width: number;
  height: number;
};

export type GroupNode = CodeGraphNodeBase & {
  kind: "group";
};

export type SubgraphInstanceNode = CodeGraphNodeBase & {
  kind: "subgraphInstance";
  defId: string;
};

export type CodeGraphNode =
  | NoteNode
  | FileRefNode
  | FrameNode
  | GroupNode
  | SubgraphInstanceNode;

export type CodeGraphEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export type CodeGraphModel = {
  version: GraphVersion;
  nodes: Record<string, CodeGraphNode>;
  edges: Record<string, CodeGraphEdge>;
};

/**
 * Canvas (ReactFlow) view-model data shapes.
 * Keep these small and stable; UI can derive labels/icons from them.
 */
export type CanvasNodeType = "noteNode" | "fileRefNode" | "groupNode";

export type CanvasNodeData = {
  kind: CodeNodeKind;
  title: string;
  subtitle?: string;
};

export type CanvasEdgeData = {
  edgeKind: "flow";
};
