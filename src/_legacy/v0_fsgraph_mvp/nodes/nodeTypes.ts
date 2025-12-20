/**
 * nodeTypes.ts
 * ----------------
 * 用途：
 *  - ReactFlow 的 nodeTypes 注册表（必须是稳定引用）
 *
 * 对外接口：
 *  - export const NODE_TYPES
 */

import type { NodeTypes } from "reactflow";

import DirNode from "./DirNode";
import FileNode from "./FileNode";
import GroupNode from "./GroupNode";

/**
 * ✅ 必须是模块级常量，保证引用稳定，避免 ReactFlow #002
 * ✅ key 必须和 node.type 完全一致（dirNode/fileNode/groupNode），避免 ReactFlow #003
 */
export const NODE_TYPES: NodeTypes = {
  dirNode: DirNode,
  fileNode: FileNode,
  groupNode: GroupNode,
};
