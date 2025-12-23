/**
 * features/canvas/hooks/useCanvasFocus.ts
 * ----------------
 * 处理 Canvas 的 focus 请求（将节点居中显示）
 */

import { useEffect } from "react";
import type { CanvasViewport } from "../../../entities/canvas/canvasEvents";
import type { CanvasNode } from "../adapters/codeGraphToCanvas";

type FocusRequest = { nodeId: string; nonce: number } | null | undefined;

export function useCanvasFocus(
  focusRequest: FocusRequest,
  nodes: CanvasNode[],
  viewport: CanvasViewport,
  containerRef: React.RefObject<HTMLDivElement | null>,
  isDragging: boolean,
  isPanning: boolean,
  isConnecting: boolean,
  onViewportChange: (viewport: CanvasViewport) => void
) {
  useEffect(() => {
    // 交互中不执行 focus，防止干扰
    if (isDragging || isPanning || isConnecting) {
      return;
    }

    if (focusRequest) {
      const node = nodes.find((n) => n.id === focusRequest.nodeId);
      if (node) {
        const container = containerRef.current;
        if (container) {
          const centerX = container.clientWidth / 2;
          const centerY = container.clientHeight / 2;
          const newViewport: CanvasViewport = {
            x: centerX - node.position.x * viewport.zoom,
            y: centerY - node.position.y * viewport.zoom,
            zoom: viewport.zoom,
            z: viewport.z,
          };
          onViewportChange(newViewport);
        }
      }
    }
  }, [
    focusRequest,
    nodes,
    viewport,
    containerRef,
    isDragging,
    isPanning,
    isConnecting,
    onViewportChange,
  ]);
}

