/**
 * features/canvas/nodeTypes.ts
 * ----------------
 * ReactFlow nodeTypes registry (Canvas renderer).
 *
 * Step4C:
 * - Canvas now renders CodeGraph nodes, not FSGraph nodes.
 * - FS navigation lives in the left tree (FsIndexSnapshot).
 */

import type { NodeTypes } from "reactflow";

import NoteNode from "./nodes/NoteNode";
import FileRefNode from "./nodes/FileRefNode";
import GroupNode from "./nodes/GroupNode";

export const NODE_TYPES: NodeTypes = {
  noteNode: NoteNode,
  fileRefNode: FileRefNode,
  groupNode: GroupNode,
};

/**
 * Keep a stable accessor for nodeTypes.
 *
 * Some parts of the codebase call `getNodeTypes()` to avoid accidental
 * re-creation across renders / HMR.
 */
export function getNodeTypes(): NodeTypes {
  return NODE_TYPES;
}
