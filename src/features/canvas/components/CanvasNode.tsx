/**
 * features/canvas/components/CanvasNode.tsx
 * ----------------
 * Canvas node component (SVG-based).
 */

import type { CanvasNode as CanvasNodeType } from "../adapters/codeGraphToCanvas";
import { getNodeSpec } from "../../../entities/graph/registry";
import { NODE_HEIGHT, NODE_WIDTH, HANDLE_OFFSET } from "../config/constants";
import {
  cardStyle,
  selectedCardStyle,
  titleStyle,
  subtitleStyle,
  portRowStyle,
  portBadgeStyle,
} from "../config/styles";
import { NodeHandle } from "./NodeHandle";

type Props = {
  node: CanvasNodeType;
  onNodeClick: (nodeId: string, shiftKey: boolean) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onNodeMouseDown?: (nodeId: string, e: React.MouseEvent) => void;
  onConnectionStart?: (
    nodeId: string,
    handleId: string,
    handleType: "source" | "target",
    screenPosition: { x: number; y: number },
    mode?: "create" | "delete"
  ) => void;
  isConnecting?: boolean;
  isValidConnectionTarget?: boolean;
  getNodeSize: (nodeId: string) => { width: number; height: number } | null;
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
  const size =
    getNodeSize(node.id) || { width: NODE_WIDTH, height: NODE_HEIGHT };
  
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
        <NodeHandle
          side="left"
          className="canvas-handle-left"
          dataNodeId={node.id}
          dataHandleId={spec.ports[0]?.id ?? "in"}
          dataHandleType="target"
          isValid={isValidConnectionTarget}
          isConnecting={isConnecting}
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
        <NodeHandle
          side="right"
          className="canvas-handle-right"
          dataNodeId={node.id}
          dataHandleId={spec.ports[1]?.id ?? "out"}
          dataHandleType="source"
          isConnecting={isConnecting}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!onConnectionStart) return;
            const isDeleteMode = e.ctrlKey || e.button === 2;

            const handleCanvasPos = {
              x: node.position.x + size.width + HANDLE_OFFSET,
              y: node.position.y + size.height / 2,
            };

            onConnectionStart(
              node.id,
              spec.ports[1]?.id ?? "out",
              "source",
              handleCanvasPos,
              isDeleteMode ? "delete" : "create"
            );
          }}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </foreignObject>
  );
}

