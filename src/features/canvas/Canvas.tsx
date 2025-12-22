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

import { useCallback, useEffect, useMemo } from "react";
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
import { screenToCanvas, getViewportTransform } from "./core/ViewportManager";
import { useCanvasState } from "./hooks/useCanvasState";
import { useCanvasDrag } from "./hooks/useCanvasDrag";
import { useCanvasPanZoom } from "./hooks/useCanvasPanZoom";
import { useCanvasSelection } from "./hooks/useCanvasSelection";
import { useCanvasKeyboard } from "./hooks/useCanvasKeyboard";
import { useCanvasConnection } from "./hooks/useCanvasConnection";

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
  
  // Get node size helper
  const getNodeSize = useCallback(
    (nodeId: string): { width: number; height: number } => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return { width: 180, height: 100 };
      return node.width && node.height
        ? { width: node.width, height: node.height }
        : { width: 180, height: 100 };
    },
    [nodes]
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
    onSelectionChange
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
    onViewportChange
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
    onSelectionChange
  );

  // 连线逻辑（必须在 useCanvasKeyboard 之前定义）
  const {
    connectionState,
    handleConnectionStart,
    handleConnectionMove,
    handleConnectionEnd,
    handleConnectionCancel,
  } = useCanvasConnection(edges, state.svgRef, viewport, onConnect);

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

  // Focus request handling
  useEffect(() => {
    // 交互中不执行 focus，防止干扰
    if (state.isDragging || state.isPanning || connectionState.isConnecting) {
      return;
    }

    if (focusRequest) {
      const node = nodes.find((n) => n.id === focusRequest.nodeId);
      if (node) {
        const container = state.containerRef.current;
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
  }, [focusRequest, nodes, viewport, onViewportChange, state.containerRef]);

  // 全局阻止非 Canvas 区域的触控板缩放（Ctrl/Cmd + 双指）
  useEffect(() => {
    const container = state.containerRef.current;
    if (!container) return;

    const handleGlobalWheel = (e: WheelEvent) => {
      const isPinch = e.ctrlKey || e.metaKey;
      if (!isPinch) return;

      const target = e.target as HTMLElement | null;
      const insideCanvas =
        target && (target === container || container.contains(target));

      if (!insideCanvas) {
        // 阻止浏览器在非 Canvas 区域的缩放
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("wheel", handleGlobalWheel, {
      passive: false,
      capture: true,
    });

    return () => {
      window.removeEventListener("wheel", handleGlobalWheel, { capture: true });
    };
  }, [state.containerRef]);

  // Handle mousedown on canvas
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if clicking on node or edge
    const isOnNode = target.closest(".canvas-node") || target.closest("foreignObject");
    const isOnEdge = target.closest(".canvas-edge");
    const isOnHandle = target.closest(".canvas-handle");
    
    if (isOnNode || isOnEdge || isOnHandle) {
      return;
    }

    // 防止多个交互状态冲突
    if (state.isDragging || state.isPanning || connectionState.isConnecting) {
      console.warn("[Canvas] Interaction conflict detected, ignoring mouseDown");
      return;
    }

    // Check for panning: Space + left button, or middle button
      const isSpacePan = e.button === 0 && state.spaceKeyPressedRef.current;
    const isMiddleButton = e.button === 1;
    
    if (isSpacePan || isMiddleButton) {
        clearBoxSelection();
        startPan(e);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

      // Left click on pane: start box selection (but not on double-click)
      if (e.button === 0 && e.detail === 1) {
        startBoxSelection(e);
      }
    },
    [
      state.spaceKeyPressedRef,
      state.isDragging,
      state.isPanning,
      connectionState.isConnecting,
      clearBoxSelection,
      startPan,
      startBoxSelection,
    ]
  );

  // Handle mouseup on canvas
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // If this is part of a double-click, clear all interaction states
      if (e.detail >= 2) {
        clearBoxSelection();
        // 确保清除所有交互状态，防止状态污染
        if (state.isPanning) {
          handlePanEnd();
        }
        if (state.isDragging) {
          handleDragEnd();
        }
        if (connectionState.isConnecting) {
          handleConnectionCancel();
        }
        return;
      }

      if (state.isPanning) {
        handlePanEnd();
      }

      if (state.isDragging) {
        handleDragEnd();
      }

      if (connectionState.isConnecting) {
        handleConnectionEnd(e.nativeEvent);
      }
    },
    [
      state.isPanning,
      state.isDragging,
      connectionState.isConnecting,
      clearBoxSelection,
      handlePanEnd,
      handleDragEnd,
      handleConnectionEnd,
      handleConnectionCancel,
    ]
          );
          
  // Handle pane click (clear selection or create node)
  const handlePaneClickInternal = useCallback(
    (e: React.MouseEvent) => {
      if (!e || typeof e.detail !== "number") {
        return;
      }

      // Double-click creates note node
      if (e.detail >= 2 && onCreateNoteNodeAt) {
        e.preventDefault();
        e.stopPropagation();

        clearBoxSelection();
        if (connectionState.isConnecting) {
          handleConnectionCancel();
        }

        const rect = state.svgRef.current?.getBoundingClientRect();
        if (rect) {
          const canvasPos = screenToCanvas(
            { x: e.clientX - rect.left, y: e.clientY - rect.top },
            viewport
          );
          onCreateNoteNodeAt(canvasPos);
      }
      return;
    }

      // Single click clears selection
      const target = e.target as HTMLElement;
      const isOnNode = target.closest(".canvas-node") || target.closest("foreignObject");
      const isOnEdge = target.closest(".canvas-edge");

      if (!isOnNode && !isOnEdge) {
        handlePaneClick();
      }
    },
    [
      onCreateNoteNodeAt,
      viewport,
      state.svgRef,
      clearBoxSelection,
      handlePaneClick,
      connectionState.isConnecting,
      handleConnectionCancel,
    ]
  );

  // Calculate edge positions
  const edgePositions = useMemo(() => {
    const positions = new Map<
      string,
      {
      source: { x: number; y: number };
      target: { x: number; y: number };
      sourceHandle?: { x: number; y: number };
      targetHandle?: { x: number; y: number };
      }
    >();
    
    for (const edge of edges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      
      if (!sourceNode || !targetNode) continue;
      
      const sourceSize = getNodeSize(sourceNode.id);
      const targetSize = getNodeSize(targetNode.id);
      
      const sourceHandle = {
        x: sourceNode.position.x + sourceSize.width,
        y: sourceNode.position.y + sourceSize.height / 2,
      };
      const targetHandle = {
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
  }, [edges, nodes, getNodeSize]);

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
