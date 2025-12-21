/**
 * features/canvas/components/CanvasEdge.tsx
 * ----------------
 * Canvas edge component (SVG path).
 */

import type { CanvasEdge as CanvasEdgeType } from "../adapters/codeGraphToCanvas";
import { calculateBezierPath } from "../utils/edgeRouting";

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
  strokeWidth: 2,
  pointerEvents: "stroke",
  cursor: "pointer",
  transition: "stroke 0.15s ease, stroke-width 0.15s ease",
  willChange: "auto", // Let browser optimize
};

const selectedEdgeStyle: React.CSSProperties = {
  ...edgeStyle,
  stroke: "var(--accent)",
  strokeWidth: 3,
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
    <path
      d={path.d}
      style={edge.selected ? selectedEdgeStyle : edgeStyle}
      onClick={handleClick}
      data-edge-id={edge.id}
      className="canvas-edge"
    />
  );
}

