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

export type ViewportTransform = {
  x: number;
  y: number;
  zoom: number;
  z: number;
};

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

