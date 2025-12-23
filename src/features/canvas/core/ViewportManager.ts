/**
 * features/canvas/core/ViewportManager.ts
 * ----------------
 * Manages canvas viewport (pan, zoom, fitView).
 * 
 * Architecture:
 * - Pure logic, no React dependencies
 * - Uses transform-based viewport (translate + scale)
 * - Provides utilities for coordinate conversion
 */

import type { CanvasViewport } from "../../../entities/canvas/canvasEvents";
import { rectCenter, type Rect } from "./canvasBounds";

export type ViewportTransform = {
  x: number;
  y: number;
  zoom: number;
  z: number;
};

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Clamp viewport translation so the visible rect (in canvas coords) stays within bounds.
 *
 * Notes:
 * - Bounds are in CANVAS coords (world space), independent of zoom.
 * - viewport.x/y are SCREEN-space translate (pixels) applied before scale in SVG.
 */
export function clampViewportToBounds(
  viewport: CanvasViewport,
  containerSize: { width: number; height: number },
  bounds: Rect
): CanvasViewport {
  const zoom = viewport.zoom > 0 ? viewport.zoom : 1;
  const W = Math.max(1, containerSize.width);
  const H = Math.max(1, containerSize.height);
  const normalizedZ = viewport.z ?? viewport.zoom;

  // Allowed viewport translate range derived from:
  // left = (0 - vx)/zoom  >= minX   => vx <= -minX*zoom
  // right = (W - vx)/zoom <= maxX  => vx >= W - maxX*zoom
  const minVx = W - bounds.maxX * zoom;
  const maxVx = -bounds.minX * zoom;
  const minVy = H - bounds.maxY * zoom;
  const maxVy = -bounds.minY * zoom;

  // If visible area is larger than bounds, lock to center (Figma-like).
  const tooWide = minVx > maxVx;
  const tooTall = minVy > maxVy;
  const c = rectCenter(bounds);
  const centeredX = W / 2 - c.x * zoom;
  const centeredY = H / 2 - c.y * zoom;

  const nextX = tooWide ? centeredX : clamp(viewport.x, minVx, maxVx);
  const nextY = tooTall ? centeredY : clamp(viewport.y, minVy, maxVy);

  if (nextX === viewport.x && nextY === viewport.y) {
    return viewport;
  }
  return { ...viewport, x: nextX, y: nextY, z: normalizedZ };
}

/**
 * Convert screen coordinates to canvas coordinates
 */
export function screenToCanvas(
  screen: { x: number; y: number },
  viewport: CanvasViewport
): { x: number; y: number } {
  const scale = viewport.zoom;
  return {
    x: (screen.x - viewport.x) / scale,
    y: (screen.y - viewport.y) / scale,
  };
}

/**
 * Convert canvas coordinates to screen coordinates
 */
export function canvasToScreen(
  canvas: { x: number; y: number },
  viewport: CanvasViewport
): { x: number; y: number } {
  const scale = viewport.zoom;
  return {
    x: canvas.x * scale + viewport.x,
    y: canvas.y * scale + viewport.y,
  };
}

/**
 * Apply viewport transform to a point
 */
export function applyViewport(
  point: { x: number; y: number },
  viewport: CanvasViewport
): { x: number; y: number } {
  const scale = viewport.zoom;
  return {
    x: point.x * scale + viewport.x,
    y: point.y * scale + viewport.y,
  };
}

/**
 * Get viewport transform string for SVG
 */
export function getViewportTransform(viewport: CanvasViewport): string {
  return `translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`;
}

