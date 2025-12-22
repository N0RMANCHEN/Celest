/**
 * inspectorSelectors.ts
 * 将领域模型 CodeGraphNode 转为 Inspector 视图模型
 */

import type { AppState } from "../types";
import type { CodeGraphNode } from "../../entities/graph/types";
import type { InspectorNodeViewModel } from "../../features/inspector/types";

function toInspectorViewModel(node: CodeGraphNode): InspectorNodeViewModel {
  const base: InspectorNodeViewModel = {
    id: node.id,
    kind: node.kind,
    title: node.title,
  };

  if (node.kind === "note") {
    return { ...base, text: node.text };
  }

  if (node.kind === "fileRef") {
    return { ...base, filePath: node.path };
  }

  return base;
}

/**
 * 返回当前选中节点的 Inspector 视图模型；无选中时返回 null
 */
export function selectInspectorNodeViewModel(
  state: AppState
): InspectorNodeViewModel | null {
  const project = state.getActiveProject();
  if (!project) return null;

  const firstSelected = project.selectedIds.find(
    (id) => project.graph.nodes[id]
  );
  if (!firstSelected) return null;

  const node = project.graph.nodes[firstSelected];
  if (!node) return null;

  return toInspectorViewModel(node);
}

