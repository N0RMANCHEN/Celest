/**
 * features/canvas/FlowCanvas.tsx
 * ----------------
 * ReactFlow wrapper:
 * - nodeTypes/edgeTypes stable singletons
 * - sanitize edge handle ids
 * - view presets restore/commit viewport
 *
 * Selection model:
 * - Store is source of truth for selection (project.selectedIds)
 * - We project selection onto nodes/edges in adapter (selected: true)
 * - Clicking node/edge updates store immediately (Inspector + tint instant)
 *
 * Keyboard delete:
 * - Explicit Delete/Backspace removal using props-selected nodes/edges
 * - Disable ReactFlow built-in deleteKeyCode to avoid conflicts
 *
 * P1-1:
 * - Props accept UI-engine-agnostic Canvas* event contracts.
 * - This component translates ReactFlow events into Canvas* contracts.
 *
 * Architecture:
 * - Uses modular hooks for separation of concerns:
 *   - useDragHandling: Drag logic with store isolation during drag
 *   - useSelectionHandling: Selection logic with de-duplication
 *   - useViewportHandling: Viewport restoration and changes
 *   - useKeyboardHandling: Keyboard shortcuts
 *   - usePanHandling: Figma-like panning (touchpad two-finger, middle button)
 * 
 * Interaction model (Figma-like):
 * - Left click: Selection and box selection (not panning)
 * - Space + left drag: Pan canvas
 * - Middle button drag: Pan canvas
 * - Touchpad two-finger drag: Pan canvas
 */

import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection as RFConnection,
  type Edge,
  type EdgeChange as RFEdgeChange,
  type EdgeTypes,
  type Node,
  type NodeChange as RFNodeChange,
  type NodeTypes,
} from "@xyflow/react";
import {
  useCallback,
  useEffect,
  useMemo,
  type MouseEvent as ReactMouseEvent,
} from "react";

import type {
  CanvasConnection,
  CanvasEdgeChange,
  CanvasNodeChange,
  CanvasViewport,
} from "./canvasEvents";

import type { CanvasEdgeData, CanvasNodeData } from "./types";
import { getNodeTypes } from "./nodeTypes";
import { useDragHandling } from "./hooks/useDragHandling";
import { useSelectionHandling } from "./hooks/useSelectionHandling";
import { useViewportHandling } from "./hooks/useViewportHandling";
import { useKeyboardHandling } from "./hooks/useKeyboardHandling";
import { usePanHandling } from "./hooks/usePanHandling";

export type Props = {
  nodes: Node<CanvasNodeData>[];
  edges: Edge<CanvasEdgeData>[];

  onNodesChange: (changes: CanvasNodeChange[]) => void;
  onEdgesChange: (changes: CanvasEdgeChange[]) => void;
  onConnect: (conn: CanvasConnection) => void;
  onSelectionChange: (ids: string[]) => void;

  activeViewId: string;
  viewport: CanvasViewport;
  onViewportChange: (viewport: CanvasViewport) => void;
  focusRequest?: { nodeId: string; nonce: number } | null;

  onCreateNoteNodeAt?: (pos: { x: number; y: number }) => void;
};

type EdgeTypesCache = {
  __CELEST_EDGE_TYPES__?: EdgeTypes;
};

const g = globalThis as typeof globalThis & EdgeTypesCache;

// stable singletons (module scope)
const STABLE_NODE_TYPES: NodeTypes = getNodeTypes();
const STABLE_EDGE_TYPES: EdgeTypes =
  g.__CELEST_EDGE_TYPES__ ?? (g.__CELEST_EDGE_TYPES__ = {} as EdgeTypes);

function sanitizeHandleId(handle: unknown): string | null {
  if (handle === null || handle === undefined) return null;
  const s = String(handle).trim();
  if (!s) return null;
  if (s === "undefined" || s === "null") return null;
  return s;
}

function toCanvasNodeChanges(changes: RFNodeChange[]): CanvasNodeChange[] {
  const out: CanvasNodeChange[] = [];
  for (const ch of changes) {
    if (ch.type === "remove") {
      out.push({ id: ch.id, type: "remove" });
      continue;
    }

    if (ch.type === "position") {
      // XYFlow uses `position` for the new node position.
      const pos = (ch as unknown as { position?: { x: number; y: number } })
        .position;
      out.push({
        id: ch.id,
        type: "position",
        ...(pos ? { position: pos } : {}),
      });
      continue;
    }

    // Ignore other change types for now (dimensions, select, etc.).
  }
  return out;
}

function toCanvasEdgeChanges(changes: RFEdgeChange[]): CanvasEdgeChange[] {
  const out: CanvasEdgeChange[] = [];
  for (const ch of changes) {
    if (ch.type === "remove") out.push({ id: ch.id, type: "remove" });
  }
  return out;
}

function FlowCanvasInner(props: Props) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectionChange,
    activeViewId,
    viewport,
    onViewportChange,
    focusRequest,
    onCreateNoteNodeAt,
  } = props;

  const rf = useReactFlow<Node<CanvasNodeData>, Edge<CanvasEdgeData>>();

  // Drag handling with store isolation during drag
  const {
    isDragging,
    handleNodesChangeDuringDrag,
    handleNodeDragStart,
    handleNodeDragStop,
    cancelDrag,
    lastDragStopAt,
  } = useDragHandling(nodes, onNodesChange, onSelectionChange);

  // Selection handling with de-duplication
  const {
    handleSelectionChange,
    handleNodeClick,
    handleEdgeClick,
    emitSelection,
    handleBoxSelectionStart,
  } = useSelectionHandling(nodes, edges, onSelectionChange);

  // Viewport handling
  const { handleMoveEnd } = useViewportHandling(
    activeViewId,
    viewport,
    nodes,
    onViewportChange
  );

  // Keyboard handling
  useKeyboardHandling(
    nodes,
    edges,
    isDragging,
    cancelDrag,
    onNodesChange,
    onEdgesChange
  );

  // Pan handling (Figma-like: touchpad two-finger, middle button)
  usePanHandling();

  // Handle box selection and ensure selection box disappears (Figma-like behavior)
  useEffect(() => {
    let isBoxSelecting = false;
    
    const handleMouseDown = (e: Event) => {
      // Detect if this is a box selection start (clicking on pane, not on node/edge)
      const target = e.target as HTMLElement;
      const isOnPane = target?.closest?.(".react-flow__pane");
      const isOnNode = target?.closest?.(".react-flow__node");
      const isOnEdge = target?.closest?.(".react-flow__edge");
      
      if (isOnPane && !isOnNode && !isOnEdge) {
        isBoxSelecting = true;
        // CRITICAL: Clear previous selection when box selection starts (Figma behavior)
        handleBoxSelectionStart();
      }
    };

    const handleMouseUp = () => {
      if (isBoxSelecting) {
        // Box selection ended - ensure selection box is removed
        const removeSelectionBox = () => {
          const selectionBox = document.querySelector(".react-flow__selection") as HTMLElement;
          if (selectionBox) {
            selectionBox.remove();
          }
        };

        // Remove immediately and in next frame to ensure it's gone
        removeSelectionBox();
        requestAnimationFrame(() => {
          removeSelectionBox();
          // Final check after a short delay
          setTimeout(removeSelectionBox, 16);
        });
      }
      isBoxSelecting = false;
    };

    // Listen on the ReactFlow pane element for reliable detection
    const setupListeners = () => {
      const paneElement = document.querySelector(".react-flow__pane");
      if (paneElement) {
        paneElement.addEventListener("mousedown", handleMouseDown, true);
        document.addEventListener("mouseup", handleMouseUp, true);
        return () => {
          paneElement.removeEventListener("mousedown", handleMouseDown, true);
          document.removeEventListener("mouseup", handleMouseUp, true);
        };
      }
      return () => {};
    };

    // Setup with a small delay to ensure pane element exists
    const timeoutId = setTimeout(() => {
      setupListeners();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [handleBoxSelectionStart]);

  // Handle node changes when NOT dragging (immediate store update)
  const handleNodesChangeNormal = useCallback(
    (changes: RFNodeChange[]) => {
      const mapped = toCanvasNodeChanges(changes);
      if (mapped.length > 0) onNodesChange(mapped);
    },
    [onNodesChange]
  );

  // Main handler - routes to drag or normal handler based on state
  const handleNodesChange = useCallback(
    (changes: RFNodeChange[]) => {
      if (isDragging) {
        handleNodesChangeDuringDrag(changes);
      } else {
        handleNodesChangeNormal(changes);
      }
    },
    [isDragging, handleNodesChangeDuringDrag, handleNodesChangeNormal]
  );

  const handleEdgesChange = useCallback(
    (changes: RFEdgeChange[]) => {
      const mapped = toCanvasEdgeChanges(changes);
      if (mapped.length > 0) onEdgesChange(mapped);
    },
    [onEdgesChange]
  );

  const handleConnect = useCallback(
    (conn: RFConnection) => {
      const cleaned: CanvasConnection = {
        source: conn.source ?? "",
        target: conn.target ?? "",
        sourceHandle: sanitizeHandleId(conn.sourceHandle),
        targetHandle: sanitizeHandleId(conn.targetHandle),
      };
      onConnect(cleaned);
    },
    [onConnect]
  );

  // Pane click handler
  // - Double click creates note node (REQUIREMENT #1)
  // - Single click on blank area clears selection (Figma behavior)
  // Note: This only fires when clicking on the pane (not on nodes/edges)
  const handlePaneClick = useCallback(
    (evt: ReactMouseEvent) => {
      const now = Date.now();
      // Prevent clearing selection immediately after drag ends
      if (now - lastDragStopAt.current < 140) return;

      // REQUIREMENT #1: Double click creates note node
      // CRITICAL: Check detail >= 2 for double click, and ensure onCreateNoteNodeAt is available
      if (evt.detail >= 2 && onCreateNoteNodeAt) {
        evt.preventDefault();
        evt.stopPropagation();
        const pos = rf.screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
        onCreateNoteNodeAt(pos);
        return;
      }

      // Single click on blank area: clear all selections (Figma behavior)
      // CRITICAL: Handle immediately, no setTimeout - this ensures reliable clearing
      emitSelection([]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onCreateNoteNodeAt, emitSelection, rf]
  );

  // Optional: focus a node when requested by the store.
  useEffect(() => {
    if (!focusRequest) return;
    const node = rf.getNode(focusRequest.nodeId);
    if (!node) return;

    try {
      rf.fitView({ nodes: [node], padding: 0.2, duration: 220 });
    } catch {
      // ignore
    }
  }, [focusRequest, rf]);

  // Memoize isValidConnection to avoid re-creating the function every render.
  const isValidConnection = useMemo(() => {
    return (edgeOrConn: RFConnection | Edge<CanvasEdgeData>) => {
      const source = edgeOrConn.source ?? null;
      const target = edgeOrConn.target ?? null;
      const sNode = source ? rf.getNode(source) : null;
      const tNode = target ? rf.getNode(target) : null;
      const isBlocked =
        sNode?.type === "groupNode" ||
        tNode?.type === "groupNode" ||
        sNode?.type === "frameNode" ||
        tNode?.type === "frameNode";
      return !isBlocked;
    };
  }, [rf]);

  // CRITICAL: Always use props.nodes/props.edges to maintain reference stability.
  // During drag, we don't update store, so selector doesn't recalculate,
  // keeping array references stable (fixing React Flow error #015).
  
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/235ef1dd-c85c-4ef1-9b5d-11ecf4cd6583',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FlowCanvas.tsx:285',message:'ReactFlow render',data:{nodesCount:nodes.length,nodeIds:nodes.map(n=>n.id),nodesRef:Object.prototype.toString.call(nodes),edgesCount:edges.length,isDragging},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  }, [nodes, edges, isDragging]);
  // #endregion

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={STABLE_NODE_TYPES}
      edgeTypes={STABLE_EDGE_TYPES}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
      onMoveEnd={handleMoveEnd}
      onSelectionChange={handleSelectionChange}
      onPaneClick={handlePaneClick}
      onNodeDragStart={handleNodeDragStart}
      onNodeDragStop={handleNodeDragStop}
      onNodeClick={handleNodeClick}
      onEdgeClick={handleEdgeClick}
      connectionLineType={ConnectionLineType.SmoothStep}
      fitView={false}
      proOptions={{ hideAttribution: true }}
      // we manage deletion ourselves
      deleteKeyCode={null}
      isValidConnection={isValidConnection}
      // CRITICAL: Ensure nodes are draggable and prevent drag issues
      nodesDraggable={true}
      nodesConnectable={true}
      elementsSelectable={true}
      // Figma-like interaction: left click for selection, not panning
      panOnDrag={false}
      selectionOnDrag={true}
      panActivationKeyCode="Space"
      // Performance: Only update on drag end for viewport
      onlyRenderVisibleElements={false}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={28}
        size={1.6}
        color="rgba(15,23,42,0.12)"
      />
      <MiniMap />
      <Controls />
    </ReactFlow>
  );
}

export default function FlowCanvas(props: Props) {
  return (
    <div className="reactflow-wrap" style={{ height: "100%", width: "100%" }}>
      <ReactFlowProvider>
        <FlowCanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
