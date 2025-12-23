/**
 * features/canvas/Canvas.tsx
 * ----------------
 * Canvas 主组件（重构版）
 * 
 * 架构改进：
 * - 从 972 行重构为 ~200 行
 * - 将逻辑拆分到专门的 hooks
 * - 更清晰的职责分离
 * - 更易于维护和测试
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CanvasConnection,
  CanvasEdgeChange,
  CanvasNodeChange,
  CanvasViewport,
} from "../../entities/canvas/canvasEvents";
import type { CanvasNode, CanvasEdge } from "./adapters/codeGraphToCanvas";
import { CanvasNode as CanvasNodeComponent } from "./components/CanvasNode";
import { CanvasEdge as CanvasEdgeComponent } from "./components/CanvasEdge";
import { SelectionBox } from "./components/SelectionBox";
import { ConnectionLine } from "./components/ConnectionLine";
import { clampViewportToBounds, getViewportTransform } from "./core/ViewportManager";
import {
  computeBoundsFromItems,
  expandRect,
  rectFromCenterSize,
  unionRect,
} from "./core/canvasBounds";
import { getHandleCanvasPosition } from "./utils/handlePosition";
import { useCanvasState } from "./hooks/useCanvasState";
import { useCanvasDrag } from "./hooks/useCanvasDrag";
import { useCanvasPanZoom } from "./hooks/useCanvasPanZoom";
import { useCanvasSelection } from "./hooks/useCanvasSelection";
import { useCanvasKeyboard } from "./hooks/useCanvasKeyboard";
import { useCanvasConnection } from "./hooks/useCanvasConnection";
import { useCanvasEdgePositions } from "./hooks/useCanvasEdgePositions";
import { useCanvasFocus } from "./hooks/useCanvasFocus";
import { useCanvasWheel } from "./hooks/useCanvasWheel";
import { useCanvasMouseEvents } from "./hooks/useCanvasMouseEvents";
import {
  CANVAS_CONTENT_BOUNDS_PADDING,
  CANVAS_FIXED_HEIGHT,
  CANVAS_FIXED_WIDTH,
} from "../../config/canvas";
import { NODE_HEIGHT, NODE_WIDTH } from "./config/constants";

export type Props = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];

  onNodesChange: (changes: CanvasNodeChange[]) => void;
  onEdgesChange: (changes: CanvasEdgeChange[]) => void;
  onConnect: (conn: CanvasConnection) => void;
  onSelectionChange: (ids: string[]) => void;

  activeViewId: string;
  viewport: CanvasViewport;
  onViewportChange: (viewport: CanvasViewport) => void;
  focusRequest?: { nodeId: string; nonce: number } | null;

  onCreateNoteNodeAt?: (pos: { x: number; y: number }) => void;
};

export function Canvas(props: Props) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectionChange,
    viewport,
    onViewportChange,
    focusRequest,
    onCreateNoteNodeAt,
  } = props;

  // 状态管理
  const state = useCanvasState(nodes, edges, viewport);

  // Compute canvas bounds in world coords:
  // - base fixed bounds (configurable)
  // - auto expand to include all existing nodes (safety for old projects)
  const boundsRect = useMemo(() => {
    const fixed = rectFromCenterSize(
      { x: 0, y: 0 },
      { width: CANVAS_FIXED_WIDTH, height: CANVAS_FIXED_HEIGHT }
    );

    const items = nodes.map((n) => ({
      x: n.position.x,
      y: n.position.y,
      width: n.width ?? NODE_WIDTH,
      height: n.height ?? NODE_HEIGHT,
    }));
    const content = computeBoundsFromItems(items);
    if (!content) return fixed;
    return unionRect(fixed, expandRect(content, CANVAS_CONTENT_BOUNDS_PADDING));
  }, [nodes]);

  // Ensure loaded/initial viewport is inside bounds once container size is known.
  // This prevents users from starting "lost" after we introduced finite bounds.
  useEffect(() => {
    const el = state.containerRef.current;
    if (!el) return;
    const clamped = clampViewportToBounds(
      viewport,
      { width: el.clientWidth, height: el.clientHeight },
      boundsRect
    );
    if (clamped !== viewport) {
      onViewportChange(clamped);
    }
  }, [viewport, boundsRect, onViewportChange, state.containerRef]);
  
  // Get node size helper
  const [measuredNodeSizes, setMeasuredNodeSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});

  const handleNodeSizeChange = useCallback(
    (nodeId: string, size: { width: number; height: number }) => {
      setMeasuredNodeSizes((prev) => {
        const cur = prev[nodeId];
        if (
          cur &&
          Math.abs(cur.width - size.width) < 0.5 &&
          Math.abs(cur.height - size.height) < 0.5
        ) {
          return prev;
        }
        return { ...prev, [nodeId]: size };
      });
    },
    []
  );

  const getNodeSize = useCallback(
    (nodeId: string): { width: number; height: number } => {
      const measured = measuredNodeSizes[nodeId];
      if (measured) return measured;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return { width: 180, height: 100 };
      return node.width && node.height
        ? { width: node.width, height: node.height }
        : { width: 180, height: 100 };
    },
    [nodes, measuredNodeSizes]
  );

  // 拖动逻辑
  const { handleNodeMouseDown, handleDragEnd } = useCanvasDrag(
    nodes,
    viewport,
    state.svgRef,
    state.isDragging,
    state.setIsDragging,
    state.dragStateRef,
    state.localNodePositionsRef,
    state.localViewportRef,
    state.dragAnimationFrameRef,
    state.selectedIdsRef,
    state.setSelectedIds,
    onNodesChange,
    onSelectionChange,
    state.selectionHandledInMouseDownRef
  );

  // 平移和缩放逻辑
  const { startPan, handlePanEnd } = useCanvasPanZoom(
    viewport,
    state.containerRef,
    state.isPanning,
    state.setIsPanning,
    state.panStartRef,
    state.localViewportRef,
    state.panAnimationFrameRef,
    state.spaceKeyPressedRef,
    onViewportChange,
    boundsRect
  );

  // 选择逻辑
  const {
    handleNodeClick,
    handleEdgeClick,
    handlePaneClick,
    startBoxSelection,
    clearBoxSelection,
  } = useCanvasSelection(
    nodes,
    viewport,
    state.svgRef,
    state.boxSelection,
    state.setBoxSelection,
    state.isBoxSelectingRef,
    state.localViewportRef,
    state.selectedIdsRef,
    state.setSelectedIds,
    getNodeSize,
    onSelectionChange,
    state.selectionHandledInMouseDownRef,
    state.doubleClickWasDragRef,
    state.boxSelectionJustFinishedRef
  );

  // 连线逻辑（必须在 useCanvasKeyboard 之前定义）
  const {
    connectionState,
    handleConnectionStart,
    handleConnectionMove,
    handleConnectionEnd,
    handleConnectionCancel,
  } = useCanvasConnection(edges, nodes, state.svgRef, viewport, onConnect);

  // 键盘处理
  useCanvasKeyboard(
    nodes,
    edges,
    state.isDragging,
    connectionState.isConnecting,
    state.selectedIdsRef,
    state.dragStateRef,
    state.setSelectedIds,
    onNodesChange,
    onEdgesChange,
    onSelectionChange,
    handleConnectionCancel
  );

  // 计算边的位置信息
  const edgePositions = useCanvasEdgePositions(
    edges,
    nodes,
    viewport,
    state.svgRef,
    getNodeSize
  );

  // 鼠标事件处理
  const { handleMouseDown, handleMouseUp, handlePaneClickInternal } =
    useCanvasMouseEvents(
      viewport,
      state.svgRef,
      state.isDragging,
      state.isPanning,
      connectionState.isConnecting,
      state.spaceKeyPressedRef,
      state.doubleClickWasDragRef,
      state.boxSelectionJustFinishedRef,
      startPan,
      handlePanEnd,
      handleDragEnd,
      handleConnectionEnd,
      handleConnectionCancel,
      startBoxSelection,
      clearBoxSelection,
      handlePaneClick,
      onCreateNoteNodeAt
    );

  // 连接时全局监听鼠标移动/抬起
  useEffect(() => {
    if (connectionState.isConnecting) {
      const move = (e: MouseEvent) => handleConnectionMove(e);
      const up = (e: MouseEvent) => handleConnectionEnd(e);
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      return () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
    }
  }, [connectionState.isConnecting, handleConnectionMove, handleConnectionEnd]);

  // Focus 请求处理
  useCanvasFocus(
    focusRequest,
    nodes,
    viewport,
    state.containerRef,
    state.isDragging,
    state.isPanning,
    connectionState.isConnecting,
    onViewportChange,
    boundsRect
  );

  // 全局 wheel 事件处理
  useCanvasWheel(state.containerRef);

  const { svgRef, containerRef, selectedIds, boxSelection, isPanning } = state;
  const depth = viewport.z ?? viewport.zoom;
  const depthFactor = Math.min(2, Math.max(0.7, depth));
  const dotSpacing = 20 * depthFactor;
  const dotRadius = Math.max(0.6, Math.sqrt(depthFactor));
  const dotOffsetX = ((viewport.x % dotSpacing) + dotSpacing) % dotSpacing;
  const dotOffsetY = ((viewport.y % dotSpacing) + dotSpacing) % dotSpacing;

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        cursor: isPanning ? "grabbing" : "default",
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const isOnNode = target.closest(".canvas-node") || target.closest("foreignObject");
        const isOnEdge = target.closest(".canvas-edge");
        if (!isOnNode && !isOnEdge) {
          handlePaneClickInternal(e);
        }
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "all",
        }}
      >
        {/* Background pattern */}
        <defs>
          <pattern
            id="dot-pattern"
            x={dotOffsetX}
            y={dotOffsetY}
            width={dotSpacing}
            height={dotSpacing}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={dotRadius} cy={dotRadius} r={dotRadius} fill="#d1d5db" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#ffffff" />
        <rect width="100%" height="100%" fill="url(#dot-pattern)" />

        {/* Apply viewport transform */}
        <g transform={getViewportTransform(viewport)}>
          {/* Temporary connection line */}
          {connectionState.isConnecting &&
            connectionState.sourcePosition &&
            connectionState.currentPosition && (
              <ConnectionLine
                start={connectionState.sourcePosition}
                end={connectionState.currentPosition}
                isValid={connectionState.isValidTarget}
              />
            )}

          {/* Edges (render first, behind nodes) */}
          {edges.map((edge) => {
            const pos = edgePositions.get(edge.id);
            if (!pos) return null;
            const isSelected = selectedIds.has(edge.id);
            const edgeWithSelection = { ...edge, selected: isSelected };
            return (
              <CanvasEdgeComponent
                key={edge.id}
                edge={edgeWithSelection}
                sourcePos={pos.source}
                targetPos={pos.target}
                sourceHandlePos={pos.sourceHandle}
                targetHandlePos={pos.targetHandle}
                onEdgeClick={handleEdgeClick}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedIds.has(node.id);
            const nodeWithSelection = { ...node, selected: isSelected };
            return (
              <g key={node.id} className="canvas-node" data-node-id={node.id}>
                <CanvasNodeComponent
                  node={nodeWithSelection}
                  onNodeClick={handleNodeClick}
                  onNodeMouseDown={handleNodeMouseDown}
                onConnectionStart={handleConnectionStart}
                getHandleCanvasPosition={(nId, hId) =>
                  getHandleCanvasPosition(state.svgRef, viewport, nId, hId)
                }
                  onNodeSizeChange={handleNodeSizeChange}
                isConnecting={connectionState.isConnecting}
                isValidConnectionTarget={
                  connectionState.isConnecting &&
                  connectionState.targetNodeId === node.id &&
                  connectionState.isValidTarget
                }
                  getNodeSize={getNodeSize}
                />
              </g>
            );
          })}

          {/* Selection box */}
          {boxSelection && (
            <SelectionBox start={boxSelection.start} end={boxSelection.end} />
          )}
        </g>
      </svg>
    </div>
  );
}
