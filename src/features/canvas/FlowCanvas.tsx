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
  } = useDragHandling(onNodesChange, onSelectionChange);

  // Selection handling with de-duplication
  const {
    handleSelectionChange,
    handleNodeClick,
    handleEdgeClick,
    emitSelection,
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

  // Pane click:
  // - single click clears selection
  // - double click creates note node (if enabled)
  const handlePaneClick = useCallback(
    (evt: ReactMouseEvent) => {
      const now = Date.now();
      // Use ref.current directly - refs are stable and don't need to be in deps
      if (now - lastDragStopAt.current < 140) return;

      if (evt.detail >= 2 && onCreateNoteNodeAt) {
        const pos = rf.screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
        onCreateNoteNodeAt(pos);
        return;
      }

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
