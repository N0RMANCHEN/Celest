/**
 * features/canvas/utils/edgeRouting.ts
 * ----------------
 * Edge routing algorithms (Bezier curves, smooth paths).
 */

export type Point = {
  x: number;
  y: number;
};

export type EdgePath = {
  d: string; // SVG path data
  points: Point[]; // Control points for rendering
};

/**
 * Calculate Bezier curve path for edge
 * Similar to ReactFlow's SmoothStep (reference implementation)
 */
export function calculateBezierPath(
  source: Point,
  target: Point,
  sourceHandle?: Point,
  targetHandle?: Point
): EdgePath {
  const start = sourceHandle || source;
  const end = targetHandle || target;
  
  // Calculate control points for smooth curve
  const dx = end.x - start.x;
  
  // Horizontal distance threshold for curve
  const curveDistance = Math.min(Math.abs(dx) * 0.5, 100);
  
  const cp1 = {
    x: start.x + curveDistance,
    y: start.y,
  };
  
  const cp2 = {
    x: end.x - curveDistance,
    y: end.y,
  };
  
  // Create smooth Bezier curve
  const d = `M ${start.x},${start.y} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${end.x},${end.y}`;
  
  return {
    d,
    points: [start, cp1, cp2, end],
  };
}

/**
 * Calculate straight line path (fallback)
 */
export function calculateStraightPath(
  source: Point,
  target: Point
): EdgePath {
  const d = `M ${source.x},${source.y} L ${target.x},${target.y}`;
  return {
    d,
    points: [source, target],
  };
}

