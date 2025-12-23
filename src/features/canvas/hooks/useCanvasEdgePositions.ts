/**
 * features/canvas/hooks/useCanvasEdgePositions.ts
 * ----------------
 * 计算边的位置信息（包括 handle 位置）
 */

import { useMemo } from "react";
import type { CanvasViewport } from "../../../entities/canvas/canvasEvents";
import type { CanvasNode, CanvasEdge } from "../adapters/codeGraphToCanvas";

export type EdgePosition = {
  source: { x: number; y: number };
  target: { x: number; y: number };
  sourceHandle?: { x: number; y: number };
  targetHandle?: { x: number; y: number };
};

/**
 * 计算所有边的位置信息
 */
export function useCanvasEdgePositions(
  edges: CanvasEdge[],
  nodes: CanvasNode[],
  viewport: CanvasViewport,
  _svgRef: React.RefObject<SVGSVGElement | null>,
  getNodeSize: (nodeId: string) => { width: number; height: number }
): Map<string, EdgePosition> {
  return useMemo(() => {
    const positions = new Map<string, EdgePosition>();

    for (const edge of edges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (!sourceNode || !targetNode) continue;

      const sourceSize = getNodeSize(sourceNode.id);
      const targetSize = getNodeSize(targetNode.id);
      // 端点几何规则（与 NodeHandle 布局一致）：
      // - y：卡片垂直中线
      // - x：左/右边缘
      const sourceHandle: { x: number; y: number } = {
        x: sourceNode.position.x + sourceSize.width,
        y: sourceNode.position.y + sourceSize.height / 2,
      };
      const targetHandle: { x: number; y: number } = {
        x: targetNode.position.x,
        y: targetNode.position.y + targetSize.height / 2,
      };

      positions.set(edge.id, {
        source: { x: sourceNode.position.x, y: sourceNode.position.y },
        target: { x: targetNode.position.x, y: targetNode.position.y },
        sourceHandle: edge.sourceHandle ? sourceHandle : undefined,
        targetHandle: edge.targetHandle ? targetHandle : undefined,
      });
    }

    return positions;
  }, [edges, nodes, viewport, getNodeSize]);
}

