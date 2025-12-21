/**
 * features/canvas/hooks/useCanvasState.ts
 * ----------------
 * Canvas 核心状态管理
 * 管理选择、拖动、平移、框选等状态
 */

import { useRef, useState, useEffect, useMemo } from "react";
import type { CanvasViewport } from "../../../entities/canvas/canvasEvents";
import type { CanvasNode, CanvasEdge } from "../adapters/codeGraphToCanvas";

export type BoxSelectionState = {
  start: { x: number; y: number };
  end: { x: number; y: number };
} | null;

export type DragState = {
  draggedNodeIds: Set<string>;
  dragStartPositions: Map<string, { x: number; y: number }>;
  dragStartMouse: { x: number; y: number };
} | null;

export type PanState = {
  x: number;
  y: number;
  viewport: CanvasViewport;
} | null;

export function useCanvasState(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  viewport: CanvasViewport
) {
  // DOM refs
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedIdsRef = useRef<Set<string>>(new Set());

  // Box selection state
  const [boxSelection, setBoxSelection] = useState<BoxSelectionState>(null);
  const isBoxSelectingRef = useRef(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<DragState>(null);
  const localNodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const dragAnimationFrameRef = useRef<number | null>(null);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<PanState>(null);
  const localViewportRef = useRef<CanvasViewport>(viewport);
  const panAnimationFrameRef = useRef<number | null>(null);

  // Space key state
  const spaceKeyPressedRef = useRef(false);

  // Sync viewport to local ref
  useEffect(() => {
    localViewportRef.current = viewport;
  }, [viewport]);

  // Sync node positions to local ref
  useEffect(() => {
    const newPositions = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
      newPositions.set(node.id, { ...node.position });
    }
    localNodePositionsRef.current = newPositions;
  }, [nodes]);

  // Cleanup animation frames on unmount
  useEffect(() => {
    return () => {
      if (dragAnimationFrameRef.current !== null) {
        cancelAnimationFrame(dragAnimationFrameRef.current);
      }
      if (panAnimationFrameRef.current !== null) {
        cancelAnimationFrame(panAnimationFrameRef.current);
      }
    };
  }, []);

  // Derive selection from props
  const propsSelection = useMemo(() => {
    return new Set(
      nodes.filter((n) => n.selected).map((n) => n.id).concat(
        edges.filter((e) => e.selected).map((e) => e.id)
      )
    );
  }, [nodes, edges]);

  // Sync propsSelection to state only when it actually changes
  useEffect(() => {
    if (
      propsSelection.size !== selectedIds.size ||
      !Array.from(propsSelection).every((id) => selectedIds.has(id))
    ) {
      setSelectedIds(propsSelection);
      selectedIdsRef.current = propsSelection;
    }
  }, [propsSelection, selectedIds]);

  return {
    // DOM refs
    svgRef,
    containerRef,

    // Selection state
    selectedIds,
    setSelectedIds,
    selectedIdsRef,

    // Box selection state
    boxSelection,
    setBoxSelection,
    isBoxSelectingRef,

    // Drag state
    isDragging,
    setIsDragging,
    dragStateRef,
    localNodePositionsRef,
    dragAnimationFrameRef,

    // Pan state
    isPanning,
    setIsPanning,
    panStartRef,
    localViewportRef,
    panAnimationFrameRef,

    // Space key state
    spaceKeyPressedRef,
  };
}

