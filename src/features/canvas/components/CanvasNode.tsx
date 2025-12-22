/**
 * features/canvas/components/CanvasNode.tsx
 * ----------------
 * Canvas node component (SVG-based).
 */

import type { CSSProperties } from "react";
import type { CanvasNode as CanvasNodeType } from "../adapters/codeGraphToCanvas";
import { getNodeSpec } from "../../../entities/graph/registry";

type Props = {
  node: CanvasNodeType;
  onNodeClick: (nodeId: string, shiftKey: boolean) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onNodeMouseDown?: (nodeId: string, e: React.MouseEvent) => void;
  onConnectionStart?: (
    nodeId: string,
    handleId: string,
    handleType: "source" | "target",
    screenPosition: { x: number; y: number }
  ) => void;
  isConnecting?: boolean;
  isValidConnectionTarget?: boolean;
  getNodeSize: (nodeId: string) => { width: number; height: number } | null;
};

const cardStyle: CSSProperties = {
  padding: 10,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--panel-2)",
  minWidth: 180,
  boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
  position: "relative",
  cursor: "grab",
  userSelect: "none",
  transition: "box-shadow 0.15s ease, border-color 0.15s ease",
  willChange: "transform", // Performance hint for GPU acceleration
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
};

const subtitleStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  opacity: 0.75,
  lineHeight: 1.35,
  wordBreak: "break-word",
  maxWidth: 260,
  maxHeight: 42,
  overflow: "hidden",
};

const portRowStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  marginTop: 8,
  flexWrap: "wrap",
};

const portBadgeStyle: CSSProperties = {
  fontSize: 10,
  padding: "3px 6px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "rgba(255,255,255,0.06)",
};

const handleStyle: CSSProperties = {
  position: "absolute",
  width: 12,
  height: 12,
  borderRadius: "50%",
  border: "2px solid var(--border)",
  background: "var(--panel)",
  cursor: "crosshair",
  zIndex: 10,
  transition: "transform 0.15s ease, border-color 0.15s ease",
  willChange: "transform", // Performance hint
};

const handleLeftStyle: CSSProperties = {
  ...handleStyle,
  left: -6,
  top: "50%",
  transform: "translateY(-50%)",
};

const handleRightStyle: CSSProperties = {
  ...handleStyle,
  right: -6,
  top: "50%",
  transform: "translateY(-50%)",
};

export function CanvasNode({
  node,
  onNodeClick,
  onNodeDoubleClick,
  onNodeMouseDown,
  onConnectionStart,
  isConnecting,
  isValidConnectionTarget,
  getNodeSize,
}: Props) {
  const spec = getNodeSpec(node.data.kind);
  const size = getNodeSize(node.id) || { width: 180, height: 100 };
  
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
    
    e.preventDefault();
    e.stopPropagation();
    if (onNodeMouseDown) {
      onNodeMouseDown(node.id, e);
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
    >
      <div
        style={node.selected ? selectedCardStyle : cardStyle}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
      >
        {/* Left handle (input) */}
        <div
          style={{
            ...handleLeftStyle,
            border: isValidConnectionTarget
              ? "2px solid var(--accent)"
              : handleLeftStyle.border,
            background: isValidConnectionTarget
              ? "var(--accent)"
              : handleLeftStyle.background,
            opacity: isConnecting ? 0.9 : 1,
          }}
          className="canvas-handle canvas-handle-left"
          data-node-id={node.id}
          data-handle-id={spec.ports[0]?.id ?? "in"}
          data-handle-type="target"
        />

        <div style={titleStyle}>
          {getTitle()} {node.data.title}
        </div>
        {node.data.subtitle ? (
          <div style={subtitleStyle}>{node.data.subtitle}</div>
        ) : null}

        <div style={portRowStyle}>
          {spec.ports.map((p) => (
            <span key={p.id} style={portBadgeStyle}>
              {p.direction === "in" ? "⬅" : "➡"} {p.label}
            </span>
          ))}
        </div>

        {/* Right handle (output) */}
        <div
          style={{
            ...handleRightStyle,
            cursor: "crosshair",
            opacity: isConnecting ? 0.9 : 1,
          }}
          className="canvas-handle canvas-handle-right"
          data-node-id={node.id}
          data-handle-id={spec.ports[1]?.id ?? "out"}
          data-handle-type="source"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!onConnectionStart) return;
            
            // 计算 handle 在 canvas 坐标系中的位置（与边的计算一致）
            const handleCanvasPos = {
              x: node.position.x + size.width,
              y: node.position.y + size.height / 2,
            };
            
            onConnectionStart(
              node.id,
              spec.ports[1]?.id ?? "out",
              "source",
              handleCanvasPos
            );
          }}
        />
      </div>
    </foreignObject>
  );
}

