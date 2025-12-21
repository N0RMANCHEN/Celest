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
};

/**
 * Convert screen coordinates to canvas coordinates
 */
export function screenToCanvas(
  screen: { x: number; y: number },
  viewport: CanvasViewport
): { x: number; y: number } {
  return {
    x: (screen.x - viewport.x) / viewport.zoom,
    y: (screen.y - viewport.y) / viewport.zoom,
  };
}

/**
 * Convert canvas coordinates to screen coordinates
 */
export function canvasToScreen(
  canvas: { x: number; y: number },
  viewport: CanvasViewport
): { x: number; y: number } {
  return {
    x: canvas.x * viewport.zoom + viewport.x,
    y: canvas.y * viewport.zoom + viewport.y,
  };
}

/**
 * Apply viewport transform to a point
 */
export function applyViewport(
  point: { x: number; y: number },
  viewport: CanvasViewport
): { x: number; y: number } {
  return {
    x: point.x * viewport.zoom + viewport.x,
    y: point.y * viewport.zoom + viewport.y,
  };
}

/**
 * Get viewport transform string for SVG
 */
export function getViewportTransform(viewport: CanvasViewport): string {
  return `translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`;
}

