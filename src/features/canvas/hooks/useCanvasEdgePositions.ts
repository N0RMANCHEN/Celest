/**
 * features/canvas/hooks/useCanvasEdgePositions.ts
 * ----------------
 * 计算边的位置信息（包括 handle 位置）
 */

import { useMemo } from "react";
import type { CanvasViewport } from "../../../entities/canvas/canvasEvents";
import type { CanvasNode, CanvasEdge } from "../adapters/codeGraphToCanvas";
import { getHandleCanvasPosition } from "../utils/handlePosition";

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
  svgRef: React.RefObject<SVGSVGElement | null>,
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
      // 优先使用 DOM 真实位置（支持未来多个 handle）
      let sourceHandle: { x: number; y: number } | null = null;
      let targetHandle: { x: number; y: number } | null = null;

      if (edge.sourceHandle) {
        sourceHandle = getHandleCanvasPosition(
          svgRef,
          viewport,
          sourceNode.id,
          edge.sourceHandle
        );
      }
      if (edge.targetHandle) {
        targetHandle = getHandleCanvasPosition(
          svgRef,
          viewport,
          targetNode.id,
          edge.targetHandle
        );
      }

      // 回退：如果 DOM 未准备好，使用静态计算（与 handle 偏移一致）
      if (!sourceHandle) {
        const HANDLE_OFFSET = 6;
        sourceHandle = {
          x: sourceNode.position.x + sourceSize.width + HANDLE_OFFSET,
          y: sourceNode.position.y + sourceSize.height / 2,
        };
      }
      if (!targetHandle) {
        const HANDLE_OFFSET = 6;
        targetHandle = {
          x: targetNode.position.x - HANDLE_OFFSET,
          y: targetNode.position.y + targetSize.height / 2,
        };
      }

      positions.set(edge.id, {
        source: { x: sourceNode.position.x, y: sourceNode.position.y },
        target: { x: targetNode.position.x, y: targetNode.position.y },
        sourceHandle: edge.sourceHandle ? sourceHandle : undefined,
        targetHandle: edge.targetHandle ? targetHandle : undefined,
      });
    }

    return positions;
  }, [edges, nodes, viewport, svgRef, getNodeSize]);
}

