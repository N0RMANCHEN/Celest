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
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeTypes,
  type OnNodeDrag,
  type OnSelectionChangeParams,
  type Viewport,
} from "@xyflow/react";
import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from "react";

import type {
  CanvasEdgeData,
  CanvasNodeData,
} from "../../entities/graph/types";
import { getNodeTypes } from "./nodeTypes";

export type Props = {
  nodes: Node<CanvasNodeData>[];
  edges: Edge<CanvasEdgeData>[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (conn: Connection) => void;
  onSelectionChange: (ids: string[]) => void;

  activeViewId: string;
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
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

function isTypingTarget(t: EventTarget | null) {
  if (!t || !(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (t.isContentEditable) return true;
  if (typeof t.closest === "function") {
    if (t.closest(".monaco-editor")) return true;
  }
  return false;
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

  const lastCommitRef = useRef<{ viewId: string; v: Viewport } | null>(null);
  const lastViewportRef = useRef<Viewport | null>(null);
  const didFitRef = useRef(false);

  // Pane click can sometimes fire after a node drag ends (mouseup on pane).
  // If we clear selection there, it causes a visible "selected tint" flash.
  // We ignore pane clicks that happen immediately after drag-stop.
  const lastDragStopAtRef = useRef(0);

  // Controlled selection ids, updated from props.
  const selectedIdsRef = useRef<string[]>([]);
  useEffect(() => {
    selectedIdsRef.current = [
      ...nodes.filter((n) => n.selected).map((n) => n.id),
      ...edges.filter((e) => e.selected).map((e) => e.id),
    ];
  }, [nodes, edges]);

  const rf = useReactFlow<Node<CanvasNodeData>, Edge<CanvasEdgeData>>();

  // Restore viewport when switching views.
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
    rf.setViewport(viewport, { duration: 220 });
  }, [activeViewId, viewport, rf]);

  // Fit view once when nodes appear.
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
    (viewId: string, v: Viewport) => {
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
    (_: unknown, v: Viewport) => {
      commitViewportIfChanged(activeViewId, v);
    },
    [activeViewId, commitViewportIfChanged]
  );

  const handleConnect = useCallback(
    (conn: Connection) => {
      const cleaned: Connection = {
        ...conn,
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
      // Ignore the synthetic pane click that sometimes appears right after dragging a node.
      const now = performance.now();
      if (lastDragStopAtRef.current && now - lastDragStopAtRef.current < 80) {
        lastDragStopAtRef.current = 0;
        return;
      }

      if (evt.detail >= 2 && onCreateNoteNodeAt) {
        const pos = rf.screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
        onCreateNoteNodeAt(pos);
        return;
      }

      onSelectionChange([]);
    },
    [onCreateNoteNodeAt, onSelectionChange, rf]
  );

  // Dragging a node should not clear selection on mouseup (pane click).
  // Also, select the node immediately when drag starts (so it stays tinted while dragging).
  const handleNodeDragStart = useCallback<OnNodeDrag<Node<CanvasNodeData>>>(
    (evt, node) => {
      // If the dragged node is already selected, keep current selection.
      if (selectedIdsRef.current.includes(node.id)) return;

      // If Shift is held, extend selection; otherwise select only this node.
      if (evt.shiftKey) {
        const next = new Set(selectedIdsRef.current);
        next.add(node.id);
        onSelectionChange(Array.from(next));
        return;
      }

      onSelectionChange([node.id]);
    },
    [onSelectionChange]
  );

  const handleNodeDragStop = useCallback<
    OnNodeDrag<Node<CanvasNodeData>>
  >(() => {
    // Some versions fire a pane click on mouseup after drag-stop.
    // Record time so pane clicks right after drag-stop can be ignored.
    lastDragStopAtRef.current = performance.now();
  }, []);

  // Immediate click selection → update store now (no need to click empty space)
  const handleNodeClick = useCallback(
    (evt: ReactMouseEvent, node: Node<CanvasNodeData>) => {
      if (evt.shiftKey) {
        const current = new Set(selectedIdsRef.current);
        if (current.has(node.id)) current.delete(node.id);
        else current.add(node.id);
        onSelectionChange(Array.from(current));
        return;
      }

      onSelectionChange([node.id]);
    },
    [onSelectionChange]
  );

  const handleEdgeClick = useCallback(
    (evt: ReactMouseEvent, edge: Edge<CanvasEdgeData>) => {
      if (evt.shiftKey) {
        const current = new Set(selectedIdsRef.current);
        if (current.has(edge.id)) current.delete(edge.id);
        else current.add(edge.id);
        onSelectionChange(Array.from(current));
        return;
      }

      onSelectionChange([edge.id]);
    },
    [onSelectionChange]
  );

  // Keep ReactFlow's selection change for box-select etc.
  const handleSelectionChange = useCallback(
    (sel: OnSelectionChangeParams) => {
      const nodeIds = sel?.nodes?.map((n) => n.id) ?? [];
      const edgeIds = sel?.edges?.map((e) => e.id) ?? [];
      onSelectionChange([...nodeIds, ...edgeIds]);
    },
    [onSelectionChange]
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

  // Keyboard delete (controlled selection)
  useEffect(() => {
    const opts: AddEventListenerOptions = { capture: true };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const nodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
      const edgeIds = edges.filter((ed) => ed.selected).map((ed) => ed.id);

      if (nodeIds.length === 0 && edgeIds.length === 0) return;

      e.preventDefault();

      if (edgeIds.length > 0) {
        onEdgesChange(
          edgeIds.map((id) => ({ id, type: "remove" } as EdgeChange))
        );
      }
      if (nodeIds.length > 0) {
        onNodesChange(
          nodeIds.map((id) => ({ id, type: "remove" } as NodeChange))
        );
      }
    };

    window.addEventListener("keydown", onKeyDown, opts);
    return () => {
      window.removeEventListener("keydown", onKeyDown, opts);
    };
  }, [edges, nodes, onEdgesChange, onNodesChange]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={STABLE_NODE_TYPES}
      edgeTypes={STABLE_EDGE_TYPES}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleConnect}
      onMoveEnd={handleMoveEnd}
      onSelectionChange={handleSelectionChange}
      onPaneClick={handlePaneClick}
      onNodeClick={handleNodeClick}
      onEdgeClick={handleEdgeClick}
      onNodeDragStart={handleNodeDragStart}
      onNodeDragStop={handleNodeDragStop}
      connectionLineType={ConnectionLineType.SmoothStep}
      fitView={false}
      proOptions={{ hideAttribution: true }}
      // we manage deletion ourselves
      deleteKeyCode={null}
      isValidConnection={(conn) => {
        const sNode = conn.source ? rf.getNode(conn.source) : null;
        const tNode = conn.target ? rf.getNode(conn.target) : null;
        const isBlocked =
          sNode?.type === "groupNode" ||
          tNode?.type === "groupNode" ||
          sNode?.type === "frameNode" ||
          tNode?.type === "frameNode";
        return !isBlocked;
      }}
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
