/**
 * features/canvas/nodeTypes.ts
 * ----------------
 * ReactFlow nodeTypes registry (Canvas renderer).
 *
 * React Flow #002 hard fix:
 * - Keep ONE stable NodeTypes object on globalThis (via typed cast).
 * - On every module eval (incl. HMR), refresh properties so hot reload still works.
 */

import type { NodeTypes } from "@xyflow/react";

import NoteNode from "./nodes/NoteNode";
import FileRefNode from "./nodes/FileRefNode";
import GroupNode from "./nodes/GroupNode";
import SubgraphNode from "./nodes/SubgraphNode";

type NodeTypesCache = {
  __CELEST_NODE_TYPES__?: NodeTypes;
};

const g = globalThis as typeof globalThis & NodeTypesCache;

// Stable identity across HMR + re-mounts.
const stable: NodeTypes =
  g.__CELEST_NODE_TYPES__ ?? (g.__CELEST_NODE_TYPES__ = {} as NodeTypes);

// Refresh values each time the module is evaluated.
const mutable = stable as unknown as Record<string, unknown>;
mutable.noteNode = NoteNode;
mutable.fileRefNode = FileRefNode;
mutable.groupNode = GroupNode;
mutable.subgraphNode = SubgraphNode;

export const NODE_TYPES: NodeTypes = stable;

export function getNodeTypes(): NodeTypes {
  return NODE_TYPES;
}
