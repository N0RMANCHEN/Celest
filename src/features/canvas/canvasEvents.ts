/**
 * features/canvas/canvasEvents.ts
 * ----------------
 * Re-export the canvas event contracts from `entities/`.
 *
 * - Features should import from here for convenience.
 * - State should import from `entities/` (not from features).
 */

export type {
  CanvasConnection,
  CanvasEdgeChange,
  CanvasNodeChange,
  CanvasViewport,
} from "../../entities/canvas/canvasEvents";
