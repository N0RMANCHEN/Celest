/**
 * features/canvas/hooks/useCanvasConnection.ts
 * ----------------
 * 连线逻辑：开始/预览/验证/完成/取消
 */

import { useCallback, useState } from "react";
import type {
  CanvasConnection,
  CanvasViewport,
} from "../../../entities/canvas/canvasEvents";
import type { CanvasEdge } from "../adapters/codeGraphToCanvas";
import { screenToCanvas } from "../core/ViewportManager";

export type ConnectionState = {
  isConnecting: boolean;
  mode: "create" | "delete";
  sourceNodeId: string | null;
  sourceHandleId: string | null;
  sourceHandleType: "source" | "target" | null;
  sourcePosition: { x: number; y: number } | null;
  currentPosition: { x: number; y: number } | null;
  targetNodeId: string | null;
  targetHandleId: string | null;
  targetHandleType: "source" | "target" | null;
  isValidTarget: boolean;
};

const initialState: ConnectionState = {
  isConnecting: false,
  mode: "create",
  sourceNodeId: null,
  sourceHandleId: null,
  sourceHandleType: null,
  sourcePosition: null,
  currentPosition: null,
  targetNodeId: null,
  targetHandleId: null,
  targetHandleType: null,
  isValidTarget: false,
};

type HandleMeta = {
  nodeId: string | null;
  handleId: string | null;
  handleType: "source" | "target" | null;
};

function isValidConnection(
  sourceNode: string,
  sourceHandle: string,
  sourceType: "source" | "target",
  targetNode: string,
  targetHandle: string,
  targetType: "source" | "target",
  existingEdges: CanvasEdge[]
): { valid: boolean; reason?: string } {
  // 1. 必须从输出端口开始
  if (sourceType !== "source") {
    return { valid: false, reason: "必须从输出端口开始连线" };
  }

  // 2. 必须连接到输入端口
  if (targetType !== "target") {
    return { valid: false, reason: "只能连接到输入端口" };
  }

  // 3. 不能自连接
  if (sourceNode === targetNode) {
    return { valid: false, reason: "不能连接到同一节点" };
  }

  // 4. 不能重复连接
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

type Mode = "create" | "delete";

export function useCanvasConnection(
  edges: CanvasEdge[],
  svgRef: React.RefObject<SVGSVGElement | null>,
  viewport: CanvasViewport,
  onConnect: (conn: CanvasConnection) => void,
  onEdgesChange?: (changes: { id: string; type: "remove" }[]) => void
) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>(initialState);

  const resetConnection = useCallback(() => {
    setConnectionState(initialState);
  }, []);

  const screenPointToCanvas = useCallback(
    (point: { x: number; y: number }) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return null;
      return screenToCanvas(
        {
          x: point.x - rect.left,
          y: point.y - rect.top,
        },
        viewport
      );
    },
    [svgRef, viewport]
  );

  const getHandleMetaFromEvent = useCallback((e: MouseEvent | React.MouseEvent): HandleMeta => {
    const target = e.target as HTMLElement | null;
    const handleEl = target?.closest(".canvas-handle") as HTMLElement | null;
    if (!handleEl) {
      return { nodeId: null, handleId: null, handleType: null };
    }
    return {
      nodeId: handleEl.dataset.nodeId ?? handleEl.getAttribute("data-node-id"),
      handleId: handleEl.dataset.handleId ?? handleEl.getAttribute("data-handle-id"),
      handleType:
        (handleEl.dataset.handleType as "source" | "target") ||
        (handleEl.getAttribute("data-handle-type") as "source" | "target") ||
        null,
    };
  }, []);

  // 开始连线：只能从输出端口开始
  const handleConnectionStart = useCallback(
    (
      nodeId: string,
      handleId: string,
      handleType: "source" | "target",
      canvasPosition: { x: number; y: number }, // 直接接收 canvas 坐标
      mode: Mode = "create"
    ) => {
      // 只允许从输出端口开始
      if (handleType !== "source") {
        return;
      }

      setConnectionState({
        isConnecting: true,
        sourceNodeId: nodeId,
        sourceHandleId: handleId,
        sourceHandleType: handleType,
        sourcePosition: canvasPosition,  // 直接使用 canvas 坐标
        currentPosition: canvasPosition,
        targetNodeId: null,
        targetHandleId: null,
        targetHandleType: null,
        isValidTarget: false,
        mode,
      });
    },
    []
  );

  // 更新连线（鼠标移动）
  const handleConnectionMove = useCallback(
    (e: MouseEvent) => {
      if (!connectionState.isConnecting || !connectionState.sourcePosition) {
        return;
      }

      const canvasPos = screenPointToCanvas({ x: e.clientX, y: e.clientY });
      if (!canvasPos) return;

      const meta = getHandleMetaFromEvent(e);
      const hasTarget =
        meta.nodeId &&
        meta.handleId &&
        meta.handleType &&
        meta.handleType === "target";

      let isValidTarget = false;
      if (hasTarget && connectionState.sourceHandleType === "source") {
        const res = isValidConnection(
          connectionState.sourceNodeId!,
          connectionState.sourceHandleId!,
          connectionState.sourceHandleType!,
          meta.nodeId!,
          meta.handleId!,
          meta.handleType!,
          edges
        );
        isValidTarget = res.valid;
      }

      setConnectionState((prev) => ({
        ...prev,
        currentPosition: canvasPos,
        targetNodeId: hasTarget ? meta.nodeId : null,
        targetHandleId: hasTarget ? meta.handleId : null,
        targetHandleType: hasTarget ? meta.handleType : null,
        isValidTarget: hasTarget ? isValidTarget : false,
      }));
    },
    [connectionState.isConnecting, connectionState.sourcePosition, connectionState.sourceHandleType, connectionState.sourceHandleId, connectionState.sourceNodeId, screenPointToCanvas, getHandleMetaFromEvent, edges]
  );

  // 完成连线（鼠标松开）
  const handleConnectionEnd = useCallback(
    (e?: MouseEvent) => {
      if (!connectionState.isConnecting) {
        return;
      }

      // 如果有事件，优先用事件中的目标
      const meta = e ? getHandleMetaFromEvent(e) : { nodeId: null, handleId: null, handleType: null };
      const targetNodeId = meta.nodeId ?? connectionState.targetNodeId;
      const targetHandleId = meta.handleId ?? connectionState.targetHandleId;
      const targetHandleType = meta.handleType ?? connectionState.targetHandleType;

      const isDeleteMode = connectionState.mode === "delete";

      if (
        connectionState.sourceNodeId &&
        connectionState.sourceHandleId &&
        connectionState.sourceHandleType === "source" &&
        targetNodeId &&
        targetHandleId &&
        targetHandleType === "target"
      ) {
        if (isDeleteMode) {
          // 删除模式：查找并删除既有边
          const existing = edges.find(
            (e) =>
              e.source === connectionState.sourceNodeId &&
              e.target === targetNodeId &&
              e.sourceHandle === connectionState.sourceHandleId &&
              e.targetHandle === targetHandleId
          );
          if (existing && onEdgesChange) {
            onEdgesChange([{ id: existing.id, type: "remove" }]);
          }
        } else {
          const res = isValidConnection(
            connectionState.sourceNodeId,
            connectionState.sourceHandleId,
            connectionState.sourceHandleType,
            targetNodeId,
            targetHandleId,
            targetHandleType,
            edges
          );

          if (res.valid) {
            onConnect({
              source: connectionState.sourceNodeId,
              target: targetNodeId,
              sourceHandle: connectionState.sourceHandleId,
              targetHandle: targetHandleId,
            });
          }
        }
      }

      resetConnection();
    },
    [connectionState, edges, onConnect, resetConnection, getHandleMetaFromEvent, onEdgesChange]
  );

  // 取消连线（ESC 或释放到空白）
  const handleConnectionCancel = useCallback(() => {
    resetConnection();
  }, [resetConnection]);

  return {
    connectionState,
    handleConnectionStart,
    handleConnectionMove,
    handleConnectionEnd,
    handleConnectionCancel,
  };
}


