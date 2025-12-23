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
import { logger } from "../../shared/utils/logger";
import { NODE_HEIGHT, NODE_WIDTH } from "./config/constants";
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

// 计算 handle 的中心点（canvas 坐标）
function getHandleCanvasPosition(
  svgRef: React.RefObject<SVGSVGElement | null>,
  viewport: CanvasViewport,
  nodeId: string,
  handleId: string
): { x: number; y: number } | null {
  const svgEl = svgRef.current;
  if (!svgEl) return null;

  const svgRect = svgEl.getBoundingClientRect();
  // 选择器：匹配当前 nodeId 和 handleId 的 handle 元素
  // 未来有多个端口时，依靠 data-handle-id 精确匹配
  const selector = `.canvas-handle[data-node-id="${nodeId}"][data-handle-id="${handleId}"]`;
  const handleEl = svgEl.querySelector(selector) as HTMLElement | null;
  if (!handleEl) return null;

  const rect = handleEl.getBoundingClientRect();
  const centerScreen = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };

  // 转换为相对 svg 的坐标，再转换为 canvas 坐标
  const relativeToSvg = {
    x: centerScreen.x - svgRect.left,
    y: centerScreen.y - svgRect.top,
  };

  return screenToCanvas(relativeToSvg, viewport);
}

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
  }, [
    focusRequest,
    nodes,
    viewport,
    onViewportChange,
    state.containerRef,
    state.isDragging,
    state.isPanning,
    connectionState.isConnecting,
  ]);

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
      logger.warn("[Canvas] Interaction conflict detected, ignoring mouseDown");
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

      // Left click on pane: start box selection
      // 即使是双击的第二下（e.detail === 2），如果是拖动，也应该启动框选
      if (e.button === 0) {
        // 如果是双击的第二下，重置拖动标志
        if (e.detail === 2) {
          state.doubleClickWasDragRef.current = false;
        }
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
      // 但不立即清除框选，让 handlePaneClickInternal 检查框选框大小来判断是点击还是拖动
      if (e.detail >= 2) {
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
        // 不在这里清除框选，让 handlePaneClickInternal 处理
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
      // 但如果双击的第二下是拖动，则不创建 node
      if (e.detail >= 2 && onCreateNoteNodeAt) {
        // 检查是否发生了拖动（通过 finishBoxSelection 设置的标志）
        if (state.doubleClickWasDragRef.current) {
          // 如果是拖动，不创建 node（框选已经在 finishBoxSelection 中处理了）
          state.doubleClickWasDragRef.current = false; // 重置标志
          return;
        }
        
        // 如果是点击（没有拖动），创建 node
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
          onCreateNoteNodeAt({
            x: canvasPos.x - NODE_WIDTH / 2,
            y: canvasPos.y - NODE_HEIGHT / 2,
          });
        }
        return;
      }

      // Single click clears selection
      // 但如果框选刚刚完成，不清除选择（因为框选完成后，click 事件会触发，但此时选择应该保持）
      if (state.boxSelectionJustFinishedRef.current) {
        // 框选刚刚完成，不清除选择
        return;
      }
      
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
      state.doubleClickWasDragRef,
      state.boxSelectionJustFinishedRef,
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
      // 优先使用 DOM 真实位置（支持未来多个 handle）
      let sourceHandle = null as { x: number; y: number } | null;
      let targetHandle = null as { x: number; y: number } | null;

      if (edge.sourceHandle) {
        sourceHandle = getHandleCanvasPosition(
          state.svgRef,
          viewport,
          sourceNode.id,
          edge.sourceHandle
        );
      }
      if (edge.targetHandle) {
        targetHandle = getHandleCanvasPosition(
          state.svgRef,
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
  }, [edges, nodes, getNodeSize, viewport]);

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
