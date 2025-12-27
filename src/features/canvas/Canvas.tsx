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

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import {
  clampViewportToBounds,
  getViewportTransform,
  screenToCanvas,
} from "./core/ViewportManager";
import {
  computeBoundsFromItems,
  expandRect,
  rectFromCenterSize,
  unionRect,
} from "./core/canvasBounds";
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
import { NODE_HEIGHT, NODE_WIDTH, MIN_H_WITH_TEXT, MIN_H_NO_TEXT } from "./config/constants";

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

  // Canvas internal clipboard actions (NOT system clipboard)
  onCopySelectionToClipboard: () => void;
  onCutSelectionToClipboard: () => void;
  onPasteClipboardAt: (pos: { x: number; y: number }) => void;

  // Used by Alt/Option-drag duplicate (Figma-like)
  onDuplicateNodesForDrag: (
    nodeIds: string[]
  ) => { nodes: { id: string; position: { x: number; y: number } }[]; edgeIds: string[] };
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
    onCopySelectionToClipboard,
    onCutSelectionToClipboard,
    onPasteClipboardAt,
    onDuplicateNodesForDrag,
  } = props;

  // 状态管理
  const state = useCanvasState(nodes, edges, viewport);
  const lastPointerCanvasPosRef = useRef<{ x: number; y: number } | null>(null);

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
  // 记录节点显式尺寸变化，用于在尺寸被清理时同步清理测量缓存
  const prevExplicitSizeRef = useRef<Map<string, { width?: number; height?: number }>>(
    new Map()
  );
  // 记录每个节点的初始测量高度（第一次测量时，且没有显式 height），用于作为 MIN_H
  const initialMeasuredHeightsRef = useRef<Map<string, number>>(new Map());

  const clampDimension = useCallback(
    (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
    []
  );

  const validateSize = useCallback(
    (size: { width: number; height: number }) => {
      if (!Number.isFinite(size.width) || !Number.isFinite(size.height)) return false;
      const w = clampDimension(size.width, 1, 2000);
      const h = clampDimension(size.height, 1, 5000);
      return w === size.width && h === size.height;
    },
    [clampDimension]
  );

  const handleNodeSizeChange = useCallback(
    (nodeId: string, size: { width: number; height: number }) => {
      // Reject clearly invalid or extreme sizes to avoid runaway width/height.
      if (!validateSize(size)) return;
      // If user manually set size, do not override with DOM measurement.
      const n = nodes.find((x) => x.id === nodeId);
      if (n && (typeof n.width === "number" || typeof n.height === "number")) return;
      
      // 记录初始测量高度（第一次测量时，且没有显式 height）
      if (!initialMeasuredHeightsRef.current.has(nodeId) && typeof n?.height !== "number") {
        initialMeasuredHeightsRef.current.set(nodeId, size.height);
      }
      
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
    [nodes, validateSize]
  );

  // 动态最小高度：有文本与无文本分开处理
  // 使用实际 DOM 测量的初始高度作为 MIN_H，确保缩放最小高度与初始状态一致
  // fallback 值从 config/constants 导入，使用统一的计算方式

  const getMinHeightForNode = useCallback(
    (nodeId: string): number => {
      const node = nodes.find((n) => n.id === nodeId);
      // 优先使用初始测量高度（如果有），确保与初始状态一致
      const initialHeight = initialMeasuredHeightsRef.current.get(nodeId);
      if (initialHeight && initialHeight > 0) {
        return initialHeight;
      }
      // 如果没有初始测量高度，使用统一计算的 fallback（从 config 导入）
      const hasSubtitle = Boolean(node?.data?.subtitle);
      return hasSubtitle ? MIN_H_WITH_TEXT : MIN_H_NO_TEXT;
    },
    [nodes]
  );

  const getNodeSize = useCallback(
    (nodeId: string): { width: number; height: number } => {
      const MIN_W = 120;
      const MIN_H = getMinHeightForNode(nodeId);
      const MAX_W = 2000;
      const MAX_H = 5000;
      const node = nodes.find((n) => n.id === nodeId);
      const measured = measuredNodeSizes[nodeId];
      const rawWidth = node?.width ?? measured?.width ?? 120;

      // ✅ 关键修复：
      // 以前这里用 MIN_H * 1.1 当 fallback，会让“默认视觉最小高度 a”与“逻辑尺寸 b”不一致，
      // 进入 resize 的第一帧就会 a→b 突变。
      // 现在 fallback 直接用 MIN_H，让默认状态逻辑高度=视觉高度，拖拽放大时连续变化。
      const rawHeight = node?.height ?? measured?.height ?? MIN_H;

      const width = clampDimension(rawWidth, MIN_W, MAX_W);
      const height = clampDimension(rawHeight, MIN_H, MAX_H);
      return { width, height };
    },
    [nodes, measuredNodeSizes, clampDimension, getMinHeightForNode]
  );

  // 当节点显式 width/height 被清理时，清理对应的测量缓存，允许 DOM 重新测量
  // 同时清理已删除节点的初始高度记录
  // 使用 useLayoutEffect + requestAnimationFrame 避免在 effect 中同步调用 setState
  useLayoutEffect(() => {
    const nodesToClear: string[] = [];
    const prev = prevExplicitSizeRef.current;
    const currentNodeIds = new Set(nodes.map((n) => n.id));

    // 清理已删除节点的初始高度记录
    const deletedNodeIds: string[] = [];
    initialMeasuredHeightsRef.current.forEach((_, nodeId) => {
      if (!currentNodeIds.has(nodeId)) {
        deletedNodeIds.push(nodeId);
      }
    });
    deletedNodeIds.forEach((id) => {
      initialMeasuredHeightsRef.current.delete(id);
    });

    nodes.forEach((n) => {
      const prevEntry = prev.get(n.id);
      const currEntry = { width: n.width, height: n.height };

      const widthCleared =
        prevEntry && typeof prevEntry.width === "number" && typeof currEntry.width !== "number";
      const heightCleared =
        prevEntry && typeof prevEntry.height === "number" && typeof currEntry.height !== "number";

      if (widthCleared || heightCleared) {
        nodesToClear.push(n.id);
      }

      prev.set(n.id, currEntry);
    });

    if (nodesToClear.length > 0) {
      // 使用 requestAnimationFrame 延迟执行，避免在 effect 中同步调用 setState
      requestAnimationFrame(() => {
        setMeasuredNodeSizes((prevSizes) => {
          const next = { ...prevSizes };
          nodesToClear.forEach((id) => {
            delete next[id];
            // 注意：不清除 initialMeasuredHeightsRef，因为我们需要保留初始高度作为 MIN_H
          });
          return next;
        });
      });
    }
  }, [nodes]);

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
    state.selectionHandledInMouseDownRef,
    onDuplicateNodesForDrag
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
    handleConnectionCancel,
    onCopySelectionToClipboard,
    onCutSelectionToClipboard,
    onPasteClipboardAt,
    () => lastPointerCanvasPosRef.current
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
      onCreateNoteNodeAt,
      state.localViewportRef
    );

  // Resize (node dimensions) - drag edges/corners to resize cards
  const resizeStateRef = useRef<null | {
    nodeId: string;
    dir: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
    startMouse: { x: number; y: number };
    startPos: { x: number; y: number };
    startSize: { width: number; height: number };
  }>(null);
  const resizeRafRef = useRef<number | null>(null);
  const resizeLatestRef = useRef<
    | null
    | {
        nodeId: string;
        nextX: number;
        nextY: number;
        nextW: number;
        nextH: number;
      }
  >(null);

  const handleNodeResizeStart = useCallback(
    (
      nodeId: string,
      dir: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw",
      e: React.MouseEvent
    ) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const minH0 = getMinHeightForNode(nodeId);
      let startSize = getNodeSize(nodeId);

      // 如果节点没有显式 height，从 DOM 读取实际高度，避免 resize 开始时的突变
      // ✅ 同时钳制到 minH，避免偶发测量偏小导致 first-move 跳一下
      if (typeof node.height !== "number") {
        const svg = state.svgRef.current;
        if (svg) {
          const foreignObject = svg.querySelector(
            `foreignObject[data-node-id="${nodeId}"]`
          ) as SVGForeignObjectElement | null;
          if (foreignObject) {
            const innerDiv = foreignObject.querySelector("div") as HTMLDivElement | null;
            if (innerDiv) {
              const actualHeight = innerDiv.offsetHeight;
              if (actualHeight > 0 && Number.isFinite(actualHeight)) {
                startSize = {
                  ...startSize,
                  height: clampDimension(actualHeight, minH0, 5000),
                };
              } else {
                // fallback：至少保证 startSize 不低于 minH
                startSize = { ...startSize, height: Math.max(startSize.height, minH0) };
              }
            }
          }
        }
      } else {
        // explicit height：也保证不低于 minH（防止旧数据低于 min）
        startSize = { ...startSize, height: Math.max(startSize.height, minH0) };
      }

      resizeStateRef.current = {
        nodeId,
        dir,
        startMouse: { x: e.clientX, y: e.clientY },
        startPos: { x: node.position.x, y: node.position.y },
        startSize,
      };

      const handleMove = (ev: MouseEvent) => {
        const st = resizeStateRef.current;
        if (!st) return;
        const dx = (ev.clientX - st.startMouse.x) / viewport.zoom;
        const dy = (ev.clientY - st.startMouse.y) / viewport.zoom;

        const minW = 120;
        // 使用初始测量高度作为 MIN_H，确保缩放最小高度与初始状态一致
        const minH = getMinHeightForNode(st.nodeId);

        let nextX = st.startPos.x;
        let nextY = st.startPos.y;
        let nextW = st.startSize.width;
        let nextH = st.startSize.height;

        const affectsE = st.dir.includes("e");
        const affectsW = st.dir.includes("w");
        const affectsS = st.dir.includes("s");
        const affectsN = st.dir.includes("n");

        if (affectsE) nextW = Math.max(minW, st.startSize.width + dx);
        // 钳制到初始测量高度，确保线性变化
        if (affectsS) nextH = Math.max(minH, st.startSize.height + dy);

        if (affectsW) {
          const w = Math.max(minW, st.startSize.width - dx);
          nextX = st.startPos.x + (st.startSize.width - w);
          nextW = w;
        }
        // 钳制到初始测量高度，确保线性变化
        if (affectsN) {
          const h = Math.max(minH, st.startSize.height - dy);
          nextY = st.startPos.y + (st.startSize.height - h);
          nextH = h;
        }

        // Coalesce updates to once per frame for smooth resizing
        resizeLatestRef.current = {
          nodeId: st.nodeId,
          nextX,
          nextY,
          nextW,
          nextH,
        };
        if (resizeRafRef.current == null) {
          resizeRafRef.current = window.requestAnimationFrame(() => {
            resizeRafRef.current = null;
            const latest = resizeLatestRef.current;
            if (!latest) return;
            onNodesChange([
              {
                id: latest.nodeId,
                type: "position",
                position: { x: latest.nextX, y: latest.nextY },
              },
              {
                id: latest.nodeId,
                type: "dimensions",
                dimensions: { width: latest.nextW, height: latest.nextH },
              },
            ]);
          });
        }
      };

      const handleUp = () => {
        resizeStateRef.current = null;
        resizeLatestRef.current = null;
        if (resizeRafRef.current != null) {
          window.cancelAnimationFrame(resizeRafRef.current);
          resizeRafRef.current = null;
        }
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [nodes, getNodeSize, getMinHeightForNode, onNodesChange, viewport.zoom, clampDimension, state.svgRef]
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

  const { svgRef, containerRef, selectedIds, boxSelection } = state;
  const depth = viewport.z ?? viewport.zoom;
  const depthFactor = Math.min(2, Math.max(0.7, depth));
  const dotSpacing = 20 * depthFactor;
  const dotRadius = Math.max(0.6, Math.sqrt(depthFactor));
  const dotOffsetX = ((viewport.x % dotSpacing) + dotSpacing) % dotSpacing;
  const dotOffsetY = ((viewport.y % dotSpacing) + dotSpacing) % dotSpacing;

  // 实时跟踪鼠标位置（用于粘贴定位）
  // 使用全局 mousemove 事件，确保即使鼠标移出容器也能跟踪位置
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        // 使用最新的 viewport（通过 ref）
        const currentViewport = state.localViewportRef.current;
        lastPointerCanvasPosRef.current = screenToCanvas(
          { x: e.clientX - rect.left, y: e.clientY - rect.top },
          currentViewport
        );
      }
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, [svgRef, state.localViewportRef]);

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      data-cursor="default"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseDown={(e) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          // 使用最新的 viewport（通过 ref）
          const currentViewport = state.localViewportRef.current;
          lastPointerCanvasPosRef.current = screenToCanvas(
            { x: e.clientX - rect.left, y: e.clientY - rect.top },
            currentViewport
          );
        }
        handleMouseDown(e);
      }}
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
                  onNodeResizeStart={handleNodeResizeStart}
                  onConnectionStart={handleConnectionStart}
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
