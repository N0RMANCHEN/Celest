/**
 * features/canvas/components/CanvasEdge.tsx
 * ----------------
 * Canvas edge component (SVG path).
 */

import type { CanvasEdge as CanvasEdgeType } from "../adapters/codeGraphToCanvas";
import { calculateBezierPath } from "../utils/edgeRouting";
import {
  EDGE_HIT_STROKE_WIDTH,
  EDGE_SELECTED_STROKE_WIDTH,
  EDGE_STROKE_WIDTH,
} from "../config/constants";

type Props = {
  edge: CanvasEdgeType;
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
  sourceHandlePos?: { x: number; y: number };
  targetHandlePos?: { x: number; y: number };
  onEdgeClick?: (edgeId: string, shiftKey: boolean) => void;
};

const edgeStyle: React.CSSProperties = {
  fill: "none",
  stroke: "var(--border)",
  strokeWidth: EDGE_STROKE_WIDTH,
  pointerEvents: "stroke",
  cursor: "pointer",
  transition: "stroke 0.15s ease, stroke-width 0.15s ease",
  willChange: "auto", // Let browser optimize
};

const selectedEdgeStyle: React.CSSProperties = {
  ...edgeStyle,
  stroke: "var(--accent)",
  strokeWidth: EDGE_SELECTED_STROKE_WIDTH,
};

export function CanvasEdge({
  edge,
  sourcePos,
  targetPos,
  sourceHandlePos,
  targetHandlePos,
  onEdgeClick,
}: Props) {
  // No viewport transform needed here - parent <g> already has transform
  // Use canvas coordinates directly
  const canvasSource = sourceHandlePos || sourcePos;
  const canvasTarget = targetHandlePos || targetPos;

  const path = calculateBezierPath(
    canvasSource,
    canvasTarget,
    sourceHandlePos,
    targetHandlePos
  );

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdgeClick) {
      onEdgeClick(edge.id, e.shiftKey);
    }
  };

  return (
    <g className="canvas-edge" data-edge-id={edge.id}>
      {/* 扩大的透明点击区域，提升命中率 */}
      <path
        d={path.d}
        style={{
          fill: "none",
          stroke: "transparent",
          strokeWidth: EDGE_HIT_STROKE_WIDTH,
          pointerEvents: "stroke",
          cursor: "pointer",
        }}
        onClick={handleClick}
      />
      {/* 可见的边 */}
      <path
        d={path.d}
        style={edge.selected ? selectedEdgeStyle : edgeStyle}
        pointerEvents="none"
      />
    </g>
  );
}

