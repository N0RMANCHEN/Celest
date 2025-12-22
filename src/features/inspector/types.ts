/**
 * features/inspector/types.ts
 * ----------------
 * Inspector 视图模型类型定义
 * 
 * 架构原则：UI 组件只消费视图模型，不直接依赖领域模型
 */

import type { CodeNodeKind } from "../../entities/graph/types";

/**
 * Inspector 节点视图模型
 * 只包含 Inspector UI 需要的字段，不包含领域模型的完整信息
 */
export type InspectorNodeViewModel = {
  id: string;
  kind: CodeNodeKind;
  title: string;
  text?: string; // note 节点的文本内容
  filePath?: string; // fileRef 节点的文件路径
};

