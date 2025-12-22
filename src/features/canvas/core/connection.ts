import type { CanvasEdge } from "../adapters/codeGraphToCanvas";

export function isValidConnection(
  sourceNode: string,
  sourceHandle: string,
  sourceType: "source" | "target",
  targetNode: string,
  targetHandle: string,
  targetType: "source" | "target",
  existingEdges: CanvasEdge[]
): { valid: boolean; reason?: string } {
  if (sourceType !== "source") {
    return { valid: false, reason: "必须从输出端口开始连线" };
  }

  if (targetType !== "target") {
    return { valid: false, reason: "只能连接到输入端口" };
  }

  if (sourceNode === targetNode) {
    return { valid: false, reason: "不能连接到同一节点" };
  }

  const isDuplicate = existingEdges.some(
    (e) =>
      e.source === sourceNode &&
      e.target === targetNode &&
      e.sourceHandle === sourceHandle &&
      e.targetHandle === targetHandle
  );
  if (isDuplicate) {
    return { valid: false, reason: "连接已存在" };
  }

  return { valid: true };
}

export function findExistingEdge(
  edges: CanvasEdge[],
  sourceNodeId: string,
  targetNodeId: string,
  sourceHandleId: string,
  targetHandleId: string
): CanvasEdge | undefined {
  return edges.find(
    (e) =>
      e.source === sourceNodeId &&
      e.target === targetNodeId &&
      (e.sourceHandle ?? "out") === sourceHandleId &&
      (e.targetHandle ?? "in") === targetHandleId
  );
}


