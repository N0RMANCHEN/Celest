/**
 * entities/canvas/canvasEvents.ts
 * ----------------
 * UI-engine-agnostic event / payload contracts for the Canvas.
 *
 * Why:
 * - State/store should not depend on ReactFlow/@xyflow types.
 * - Features can translate UI-engine events into these contracts.
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
