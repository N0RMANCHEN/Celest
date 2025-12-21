/**
 * entities/canvas/canvasEvents.ts
 * ----------------
 * UI-engine-agnostic event / payload contracts for the Canvas.
 *
 * Why this file is in entities/:
 * - These types serve as cross-layer contracts between features/ and state/.
 * - They are stable domain concepts (viewport, connection, node/edge changes)
 *   that are independent of any specific UI engine implementation.
 * - Placing them in entities/ ensures they can be imported by state/ without
 *   creating a dependency on features/ (which would violate layer boundaries).
 *
 * Architecture:
 * - State/store should not depend on ReactFlow/@xyflow types.
 * - Features (e.g., features/canvas/FlowCanvas.tsx) translate UI-engine events
 *   (ReactFlow) into these contracts before calling store actions.
 * - This isolation allows us to swap Canvas engines in the future without
 *   modifying state/ or entities/ layers.
 */

export type CanvasViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type CanvasConnection = {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export type CanvasNodeChange =
  | {
      id: string;
      type: "position";
      position?: { x: number; y: number };
    }
  | {
      id: string;
      type: "remove";
    };

export type CanvasEdgeChange = {
  id: string;
  type: "remove";
};
