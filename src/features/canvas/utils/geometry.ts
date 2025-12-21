/**
 * features/canvas/utils/geometry.ts
 * ----------------
 * Geometry utilities for canvas operations.
 */

export type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type Point = {
  x: number;
  y: number;
};

/**
 * Check if point is inside bounds
 */
export function pointInBounds(point: Point, bounds: Bounds): boolean {
  return (
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom
  );
}

/**
 * Check if two bounds overlap (partial overlap)
 */
export function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

/**
 * Get bounds from points
 */
export function boundsFromPoints(points: Point[]): Bounds | null {
  if (points.length === 0) return null;
  
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  
  return {
    left: minX,
    top: minY,
    right: maxX,
    bottom: maxY,
  };
}

/**
 * Calculate distance between two points
 */
export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

