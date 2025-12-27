/**
 * features/canvas/components/CanvasNode.tsx
 * ----------------
 * Canvas node component (SVG-based).
 */

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import type { CanvasNode as CanvasNodeType } from "../adapters/codeGraphToCanvas";
import { getNodeSpec } from "../../../entities/graph/registry";
import { NodeHandle } from "./NodeHandle";

type Props = {
  node: CanvasNodeType;
  onNodeClick: (nodeId: string, shiftKey: boolean) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onNodeMouseDown?: (nodeId: string, e: React.MouseEvent) => void;
  onNodeResizeStart?: (
    nodeId: string,
    dir: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw",
    e: React.MouseEvent
  ) => void;
  onConnectionStart?: (
    nodeId: string,
    handleId: string,
    handleType: "source" | "target",
    screenPosition: { x: number; y: number }
  ) => void;
  getHandleCanvasPosition?: (nodeId: string, handleId: string) => { x: number; y: number } | null;
  onNodeSizeChange?: (nodeId: string, size: { width: number; height: number }) => void;
  isConnecting?: boolean;
  isValidConnectionTarget?: boolean;
  getNodeSize: (nodeId: string) => { width: number; height: number } | null;
};

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: 10,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--panel-2)",
  // 允许更小的收缩，防止“只能在两个尺寸间突变”
  minWidth: 120,
  maxWidth: 2000,
  boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
  position: "relative",
  boxSizing: "border-box",
  userSelect: "none",
  transition: "box-shadow 0.15s ease, border-color 0.15s ease",
  willChange: "transform", // Performance hint for GPU acceleration
  overflow: "visible",
};

const SELECT_COLOR = "#B8C0C3";

const selectedCardStyle: CSSProperties = {
  ...cardStyle,
  background: "var(--panel)",
  border: "0.7px solid " + SELECT_COLOR,
  boxShadow: "0 6px 20px rgba(0,0,0,0.16), 0 0 0 0.7px " + SELECT_COLOR,
  cursor: "grab",
};

const titleStyle: CSSProperties = {
  fontWeight: 800,
  fontSize: 13,
  lineHeight: 1.2,
  // 单行显示，超过宽度显示省略号
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%",
};

const subtitleStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  opacity: 0.75,
  lineHeight: "15px", // 固定行高，避免半行泄漏
  wordBreak: "break-word",
  paddingBottom: 10, // 与卡片 padding 一致的底部间距
  flex: 1,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
};

export function CanvasNode({
  node,
  onNodeClick,
  onNodeDoubleClick,
  onNodeMouseDown,
  onNodeResizeStart,
  onConnectionStart,
  onNodeSizeChange,
  isConnecting,
  isValidConnectionTarget,
  getNodeSize,
}: Props) {
  const spec = getNodeSpec(node.data.kind);
  const size = getNodeSize(node.id) || { width: 180, height: 100 };
  const rootRef = useRef<HTMLDivElement | null>(null);
  const lastReportedRef = useRef<{ width: number; height: number } | null>(null);
  const hoverResizeDirRef = useRef<
    null | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"
  >(null);
  const lastCursorRef = useRef<string>("default");
  const [subtitleClamp, setSubtitleClamp] = useState(5);
  const [subtitleMaxHeight, setSubtitleMaxHeight] = useState<number | undefined>(undefined);

  useNodeSizeReporter(node.id, rootRef, onNodeSizeChange, lastReportedRef);
  // 根据卡片高度估算可展示的整行数，避免底部半行被截断
  useEffect(() => {
    const paddingY = 10 * 2; // card padding top + bottom
    const titleH = 13 * 1.2; // title font-size * line-height
    const subtitleMarginTop = 6;
    const subtitlePaddingBottom = 10;
    const available =
      size.height - paddingY - titleH - subtitleMarginTop - subtitlePaddingBottom;
    const lineH = 15; // 与 subtitleStyle 的 lineHeight 保持一致
    const clamp = Math.max(1, Math.floor(available / lineH));
    const nextMaxH = clamp * lineH;
    // 仅在数值变化时 setState，避免同步触发
    if (subtitleClamp !== clamp || subtitleMaxHeight !== nextMaxH) {
      requestAnimationFrame(() => {
        setSubtitleClamp((prev) => (prev === clamp ? prev : clamp));
        setSubtitleMaxHeight((prev) => (prev === nextMaxH ? prev : nextMaxH));
      });
    }
  }, [size.height, subtitleClamp, subtitleMaxHeight]);
  
  // 根据 NodeSpec 动态查找端口（Frame/Group 的 ports 为空，不会渲染 handles）
  const inPort = spec.ports.find((p) => p.direction === "in");
  const outPort = spec.ports.find((p) => p.direction === "out");
  
  // No viewport transform needed here - parent <g> already has transform
  // Use canvas coordinates directly

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onNodeClick(node.id, e.shiftKey);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNodeDoubleClick) {
      onNodeDoubleClick(node.id);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // 如果点击的是 handle，不触发节点拖动
    const target = e.target as HTMLElement;
    if (target.closest(".canvas-handle")) {
      return;
    }

    // 如果鼠标在边缘/角落缩放区域，优先触发 resize（不触发拖动）
    if (onNodeResizeStart && hoverResizeDirRef.current) {
      e.preventDefault();
      e.stopPropagation();
      onNodeResizeStart(node.id, hoverResizeDirRef.current, e);
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    if (onNodeMouseDown) {
      onNodeMouseDown(node.id, e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!onNodeResizeStart) return;
    const el = rootRef.current;
    if (!el) return;

    // 如果鼠标在连接点上，让连接点自己处理（不显示 resize 光标）
    const target = e.target as HTMLElement;
    if (target.closest(".canvas-handle")) {
      hoverResizeDirRef.current = null;
      if (lastCursorRef.current !== "default") {
        el.dataset.cursor = "default";
        lastCursorRef.current = "default";
      }
      return;
    }

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 动态阈值：随节点屏幕尺寸变化，避免过大/过小
    const minSide = Math.max(1, Math.min(rect.width, rect.height));
    const EDGE_T = Math.max(6, Math.min(13, minSide * 0.08)); // 6px-13px 之间，约占短边 8%
    const HANDLE_AVOID_R = Math.max(10, Math.min(24, rect.height * 0.2)); // 随高度调整，10-24px
    const midY = rect.height / 2;

    const nearLeft = x <= EDGE_T;
    const nearRight = x >= rect.width - EDGE_T;
    const nearTop = y <= EDGE_T;
    const nearBottom = y >= rect.height - EDGE_T;

    // 避开 in/out 圆点所在的左右中线区域，避免抢连线交互
    if ((nearLeft || nearRight) && Math.abs(y - midY) <= HANDLE_AVOID_R) {
      hoverResizeDirRef.current = null;
      if (lastCursorRef.current !== "default") {
        el.dataset.cursor = "default";
        lastCursorRef.current = "default";
      }
      return;
    }

    let dir: typeof hoverResizeDirRef.current = null;
    if (nearTop && nearLeft) dir = "nw";
    else if (nearTop && nearRight) dir = "ne";
    else if (nearBottom && nearLeft) dir = "sw";
    else if (nearBottom && nearRight) dir = "se";
    else if (nearTop) dir = "n";
    else if (nearBottom) dir = "s";
    else if (nearLeft) dir = "w";
    else if (nearRight) dir = "e";

    hoverResizeDirRef.current = dir;

    const cursor =
      dir === "nw" || dir === "se"
        ? "nwse-resize"
        : dir === "ne" || dir === "sw"
          ? "nesw-resize"
          : dir === "n" || dir === "s"
            ? "ns-resize"
            : dir === "e" || dir === "w"
              ? "ew-resize"
              : "default";

    if (cursor !== lastCursorRef.current) {
      el.dataset.cursor = cursor;
      lastCursorRef.current = cursor;
    }
  };

  const handleMouseLeave = () => {
    const el = rootRef.current;
    if (!el) return;
    hoverResizeDirRef.current = null;
    if (lastCursorRef.current !== "default") {
      el.dataset.cursor = "default";
      lastCursorRef.current = "default";
    }
  };

  const getTitle = () => {
    switch (node.data.kind) {
      case "note":
        return "📝";
      case "fileRef":
        return "📄";
      case "subgraphInstance":
        return "🔷";
      case "group":
        return "📦";
      default:
        return "•";
    }
  };

  return (
    <foreignObject
      x={node.position.x}
      y={node.position.y}
      width={size.width}
      height={size.height}
      style={{ overflow: "visible" }}
      data-node-id={node.id}
    >
      <div
        ref={rootRef}
        style={{
          ...(node.selected ? selectedCardStyle : cardStyle),
          // Keep width stable; height should be content-driven (dynamic).
          width: size.width,
          ...(typeof node.height === "number"
            ? { height: size.height }
            : {}),
        }}
        data-cursor="default"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
      >
        {/* Left handle (input) */}
        {inPort && (
          <NodeHandle
            side="left"
            className="canvas-handle-left"
            dataNodeId={node.id}
            dataHandleId={inPort.id}
            dataHandleType="target"
            isValid={isValidConnectionTarget}
            isConnecting={isConnecting}
          />
        )}

        <div style={titleStyle}>
          {getTitle()} {node.data.title}
        </div>
        {/* 有 subtitle 时才渲染内容区域；无 subtitle 时不占高度，由最小高度控制 */}
        {node.data.subtitle ? (
          <div
            style={{
              ...subtitleStyle,
              WebkitLineClamp: subtitleClamp,
              maxHeight: subtitleMaxHeight,
            }}
          >
            {node.data.subtitle}
          </div>
        ) : null}

        {/* Right handle (output) */}
        {outPort && (
          <NodeHandle
            side="right"
            className="canvas-handle-right"
            dataNodeId={node.id}
            dataHandleId={outPort.id}
            dataHandleType="source"
            isConnecting={isConnecting}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!onConnectionStart) return;
              
              // 纯几何计算 handle 圆心（已与 NodeHandle 布局一致）
              const handleCanvasPos = {
                x: node.position.x + size.width,
                y: node.position.y + size.height / 2,
              };

              onConnectionStart(node.id, outPort.id, "source", handleCanvasPos);
            }}
          />
        )}
      </div>
    </foreignObject>
  );
}

// Observe dynamic DOM size and report to Canvas so edges can use accurate midline.
// Note: ResizeObserver may be unavailable in some test envs; we guard accordingly.
function useNodeSizeReporter(
  nodeId: string,
  ref: React.RefObject<HTMLDivElement | null>,
  onNodeSizeChange?: (nodeId: string, size: { width: number; height: number }) => void,
  lastReportedRef?: React.MutableRefObject<{ width: number; height: number } | null>
) {
  const MAX_W = 2000;
  const MAX_H = 5000;
  useEffect(() => {
    if (!onNodeSizeChange) return;
    const el = ref.current;
    if (!el) return;

    const report = () => {
      // 使用 offsetWidth/offsetHeight 避免 zoom 影响测量值
      let width = el.offsetWidth;
      let height = el.offsetHeight;

      if (!Number.isFinite(width) || width <= 0 || width > MAX_W) width = 0;
      if (!Number.isFinite(height) || height <= 0 || height > MAX_H) height = 0;

      const next = {
        width: Math.min(MAX_W, Math.max(1, width)),
        height: Math.min(MAX_H, Math.max(1, height)),
      };
      if (next.width < 1 || next.height < 1) return;
      const prev = lastReportedRef?.current;
      if (prev && Math.abs(prev.width - next.width) < 0.5 && Math.abs(prev.height - next.height) < 0.5) {
        return;
      }
      if (lastReportedRef) lastReportedRef.current = next;
      onNodeSizeChange(nodeId, next);
    };

    report();

    const RO = (globalThis as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    if (!RO) return;

    const ro = new RO(() => report());
    ro.observe(el);
    return () => ro.disconnect();
  }, [nodeId, ref, onNodeSizeChange, lastReportedRef]);
}

