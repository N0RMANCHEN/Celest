/**
 * features/canvas/core/canvasBounds.ts
 * -----------------------------------
 * Pure geometry helpers for canvas bounds.
 *
 * Coordinate system:
 * - All rects are in CANVAS (world) coordinates.
 * - Node positions are treated as top-left (x,y) with width/height.
 */

export type Rect = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function rectFromCenterSize(
  center: { x: number; y: number },
  size: { width: number; height: number }
): Rect {
  const halfW = size.width / 2;
  const halfH = size.height / 2;
  return {
    minX: center.x - halfW,
    minY: center.y - halfH,
    maxX: center.x + halfW,
    maxY: center.y + halfH,
  };
}

export function rectCenter(r: Rect): { x: number; y: number } {
  return { x: (r.minX + r.maxX) / 2, y: (r.minY + r.maxY) / 2 };
}

export function unionRect(a: Rect, b: Rect): Rect {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function expandRect(r: Rect, padding: number): Rect {
  return {
    minX: r.minX - padding,
    minY: r.minY - padding,
    maxX: r.maxX + padding,
    maxY: r.maxY + padding,
  };
}

export function rectWidth(r: Rect): number {
  return r.maxX - r.minX;
}

export function rectHeight(r: Rect): number {
  return r.maxY - r.minY;
}

export function computeBoundsFromItems(
  items: Array<{ x: number; y: number; width: number; height: number }>
): Rect | null {
  if (items.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const it of items) {
    minX = Math.min(minX, it.x);
    minY = Math.min(minY, it.y);
    maxX = Math.max(maxX, it.x + it.width);
    maxY = Math.max(maxY, it.y + it.height);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}


