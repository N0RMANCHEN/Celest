/**
 * inspectorSelectors.ts
 * ----------------
 * Selectors for Inspector view-model derived state.
 * 
 * 架构原则：将领域模型（CodeGraphNode）转换为视图模型（InspectorNodeViewModel）
 */

import type { AppState } from "../types";
import type { CodeGraphNode } from "../../entities/graph/types";
import type { InspectorNodeViewModel } from "../../features/inspector/types";

/**
 * 将领域模型 CodeGraphNode 转换为 Inspector 视图模型
 */
function codeGraphNodeToInspectorViewModel(
  node: CodeGraphNode
): InspectorNodeViewModel {
  const base: InspectorNodeViewModel = {
    id: node.id,
    kind: node.kind,
    title: node.title,
  };

  // 根据节点类型添加特定字段
  if (node.kind === "note") {
    return {
      ...base,
      text: node.text,
    };
  }

  if (node.kind === "fileRef") {
    return {
      ...base,
      filePath: node.path,
    };
  }

  return base;
}

/**
 * Module-level cache for Inspector view model to prevent new object creation on every call.
 * 
 * Design rationale:
 * - Phase 1 assumes a single active project instance (single-page app).
 * - Module-level caching is safe and efficient for this use case.
 * - Prevents infinite React update loops by maintaining stable object references.
 * 
 * Note: If we later need to support multiple project instances simultaneously,
 * we should migrate to a WeakMap-based cache keyed by project ID.
 */
let cachedInspectorVM: {
  nodeId?: string;
  result: InspectorNodeViewModel | null;
} = { result: null };

/**
 * Get Inspector view model for the selected graph node in the active project.
 * Returns null if no node is selected.
 * 
 * CRITICAL: Caches result to prevent new object creation on every call,
 * which would cause infinite update loops in React.
 */
export function selectInspectorNodeViewModel(
  state: AppState
): InspectorNodeViewModel | null {
  const project = state.getActiveProject();
  if (!project) {
    if (cachedInspectorVM.result !== null) {
      cachedInspectorVM = { result: null };
    }
    return null;
  }

  const firstSelected = project.selectedIds.find(
    (id) => project.graph.nodes[id]
  );
  
  if (!firstSelected) {
    if (cachedInspectorVM.result !== null) {
      cachedInspectorVM = { result: null };
    }
    return null;
  }
  
  const node = project.graph.nodes[firstSelected];
  if (!node) {
    if (cachedInspectorVM.result !== null) {
      cachedInspectorVM = { result: null };
    }
    return null;
  }

  // Check if we can return cached result
  if (cachedInspectorVM.nodeId === node.id) {
    // Verify the node hasn't changed by checking key properties
    const cached = cachedInspectorVM.result;
    if (cached && 
        cached.id === node.id &&
        cached.kind === node.kind &&
        cached.title === node.title &&
        (node.kind === "note" ? cached.text === node.text : true) &&
        (node.kind === "fileRef" ? cached.filePath === node.path : true)) {
      return cached;
    }
  }

  // Create new result and cache it
  const result = codeGraphNodeToInspectorViewModel(node);
  cachedInspectorVM = {
    nodeId: node.id,
    result,
  };

  return result;
}

