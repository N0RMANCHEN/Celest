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
  if (sourceType !== "source") return { valid: false, reason: "必须从输出端口开始连线" };
  if (targetType !== "target") return { valid: false, reason: "只能连接到输入端口" };
  if (sourceNode === targetNode) return { valid: false, reason: "不能连接到同一节点" };

  const duplicate = existingEdges.some(
    (e) =>
      e.source === sourceNode &&
      e.target === targetNode &&
      e.sourceHandle === sourceHandle &&
      e.targetHandle === targetHandle
  );
  if (duplicate) return { valid: false, reason: "连接已存在" };

  return { valid: true };
}

export function findExistingEdge(
  edges: CanvasEdge[],
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string
) {
  return edges.find(
    (e) =>
      e.source === source &&
      e.target === target &&
      (sourceHandle ? e.sourceHandle === sourceHandle : true) &&
      (targetHandle ? e.targetHandle === targetHandle : true)
  );
}


