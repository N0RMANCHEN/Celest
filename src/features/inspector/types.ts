/**
 * Inspector 视图模型类型定义
 * UI 组件只消费视图模型，不直接依赖领域模型
 */

import type { CodeNodeKind } from "../../entities/graph/types";

export type InspectorNodeViewModel = {
  id: string;
  kind: CodeNodeKind;
  title: string;
  text?: string; // note 节点内容
  filePath?: string; // fileRef 节点路径
};

