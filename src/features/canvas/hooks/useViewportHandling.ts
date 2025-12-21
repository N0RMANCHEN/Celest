/**
 * features/canvas/hooks/useViewportHandling.ts
 * ----------------
 * Handles viewport restoration, changes, and initial fitView logic.
 */

import { useCallback, useEffect, useRef } from "react";
import { useReactFlow, type Viewport as RFViewport } from "@xyflow/react";
import type { CanvasViewport } from "../canvasEvents";
import type { CanvasNodeData, CanvasEdgeData } from "../types";
import type { Node, Edge } from "@xyflow/react";

export function useViewportHandling(
  activeViewId: string,
  viewport: CanvasViewport,
  nodes: Node<CanvasNodeData>[],
  onViewportChange: (viewport: CanvasViewport) => void
) {
  const rf = useReactFlow<Node<CanvasNodeData>, Edge<CanvasEdgeData>>();
  const lastCommitRef = useRef<{ viewId: string; v: CanvasViewport } | null>(null);
  const lastViewportRef = useRef<CanvasViewport | null>(null);
  const didFitRef = useRef(false);

  // Restore viewport when switching views
  useEffect(() => {
    const last = lastViewportRef.current;
    if (
      last &&
      Math.abs(last.x - viewport.x) < 0.0001 &&
      Math.abs(last.y - viewport.y) < 0.0001 &&
      Math.abs(last.zoom - viewport.zoom) < 0.0001
    ) {
      return;
    }

    lastViewportRef.current = viewport;
    // CanvasViewport is structurally compatible with XYFlow Viewport
    rf.setViewport(viewport as RFViewport, { duration: 220 });
  }, [activeViewId, viewport, rf]);

  // Fit view once when nodes appear
  useEffect(() => {
    if (didFitRef.current) return;
    if (nodes.length === 0) return;
    didFitRef.current = true;

    const t = window.setTimeout(() => {
      try {
        rf.fitView({ padding: 0.2, duration: 250 });
      } catch {
        // ignore
      }
    }, 30);

    return () => window.clearTimeout(t);
  }, [nodes.length, rf]);

  const commitViewportIfChanged = useCallback(
    (viewId: string, v: CanvasViewport) => {
      const last = lastCommitRef.current;
      if (
        last &&
        last.viewId === viewId &&
        Math.abs(last.v.x - v.x) < 0.0001 &&
        Math.abs(last.v.y - v.y) < 0.0001 &&
        Math.abs(last.v.zoom - v.zoom) < 0.0001
      ) {
        return;
      }
      lastCommitRef.current = { viewId, v };
      onViewportChange(v);
    },
    [onViewportChange]
  );

  const handleMoveEnd = useCallback(
    (_: unknown, v: RFViewport) => {
      commitViewportIfChanged(activeViewId, v);
    },
    [activeViewId, commitViewportIfChanged]
  );

  return {
    handleMoveEnd,
  };
}

