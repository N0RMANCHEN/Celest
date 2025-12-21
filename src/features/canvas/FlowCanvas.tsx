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
 * CRITICAL (fix max update depth):
 * - ReactFlow will emit `onSelectionChange` when it syncs props -> internal store.
 * - If we echo the SAME selection back into Zustand, it can create an infinite loop
 *   (StoreUpdater -> setNodes -> rerender -> StoreUpdater...).
 * - Therefore, we must de-duplicate selection events at the adapter boundary.
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
  type OnSelectionChangeParams,
  type Viewport as RFViewport,
} from "@xyflow/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

function normalizeIds(ids: string[]): string[] {
  const out = new Set<string>();
  for (const id of ids) {
    if (typeof id !== "string") continue;
    const s = id.trim();
    if (!s) continue;
    out.add(s);
  }
  return Array.from(out).sort();
}

function arrayEq(a: string[], b: string[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
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

  const lastCommitRef = useRef<{ viewId: string; v: CanvasViewport } | null>(
    null
  );
  const lastViewportRef = useRef<CanvasViewport | null>(null);
  const didFitRef = useRef(false);

  // When releasing a drag, ReactFlow may still dispatch a trailing pane click.
  // We use this to avoid "drag -> selection flash -> clear" artifacts.
  const lastDragStopAtRef = useRef<number>(0);

  // Controlled selection ids, updated from props.
  // We keep it normalized so we can de-dupe adapter events.
  const selectedIdsRef = useRef<string[]>([]);
  useEffect(() => {
    const next = normalizeIds([
      ...nodes.filter((n) => n.selected).map((n) => n.id),
      ...edges.filter((e) => e.selected).map((e) => e.id),
    ]);
    selectedIdsRef.current = next;
  }, [nodes, edges]);

  // Emit selection only when it actually differs from the selection already projected on props.
  const emitSelection = useCallback(
    (ids: string[]) => {
      const next = normalizeIds(ids);
      const cur = selectedIdsRef.current;
      if (arrayEq(next, cur)) return; // CRITICAL: break ReactFlow StoreUpdater feedback loop
      onSelectionChange(next);
    },
    [onSelectionChange]
  );

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
    // CanvasViewport is structurally compatible with XYFlow Viewport.
    rf.setViewport(viewport as RFViewport, { duration: 220 });
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

  const handleNodesChange = useCallback(
    (changes: RFNodeChange[]) => {
      const mapped = toCanvasNodeChanges(changes);
      if (mapped.length > 0) onNodesChange(mapped);
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: RFEdgeChange[]) => {
      const mapped = toCanvasEdgeChanges(changes);
      if (mapped.length > 0) onEdgesChange(mapped);
    },
    [onEdgesChange]
  );

  const handleNodeDragStart = useCallback(
    (_: ReactMouseEvent, node: Node<CanvasNodeData>) => {
      // Select on drag start so the selection tint + Inspector stay in sync during drag.
      emitSelection([node.id]);
    },
    [emitSelection]
  );

  const handleNodeDragStop = useCallback(() => {
    lastDragStopAtRef.current = Date.now();
  }, []);

  // Pane click:
  // - single click clears selection
  // - double click creates note node (if enabled)
  const handlePaneClick = useCallback(
    (evt: ReactMouseEvent) => {
      const now = Date.now();
      if (now - lastDragStopAtRef.current < 140) return;

      if (evt.detail >= 2 && onCreateNoteNodeAt) {
        const pos = rf.screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
        onCreateNoteNodeAt(pos);
        return;
      }

      emitSelection([]);
    },
    [onCreateNoteNodeAt, emitSelection, rf]
  );

  // Immediate click selection → update store now (no need to click empty space)
  const handleNodeClick = useCallback(
    (evt: ReactMouseEvent, node: Node<CanvasNodeData>) => {
      if (evt.shiftKey) {
        const current = new Set(selectedIdsRef.current);
        if (current.has(node.id)) current.delete(node.id);
        else current.add(node.id);
        emitSelection(Array.from(current));
        return;
      }

      emitSelection([node.id]);
    },
    [emitSelection]
  );

  const handleEdgeClick = useCallback(
    (evt: ReactMouseEvent, edge: Edge<CanvasEdgeData>) => {
      if (evt.shiftKey) {
        const current = new Set(selectedIdsRef.current);
        if (current.has(edge.id)) current.delete(edge.id);
        else current.add(edge.id);
        emitSelection(Array.from(current));
        return;
      }

      emitSelection([edge.id]);
    },
    [emitSelection]
  );

  // Keep ReactFlow's selection change for box-select etc.
  // IMPORTANT: de-dupe to avoid StoreUpdater feedback loop.
  const handleSelectionChange = useCallback(
    (sel: OnSelectionChangeParams) => {
      const nodeIds = sel?.nodes?.map((n) => n.id) ?? [];
      const edgeIds = sel?.edges?.map((e) => e.id) ?? [];
      emitSelection([...nodeIds, ...edgeIds]);
    },
    [emitSelection]
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
        onEdgesChange(edgeIds.map((id) => ({ id, type: "remove" })));
      }
      if (nodeIds.length > 0) {
        onNodesChange(nodeIds.map((id) => ({ id, type: "remove" })));
      }
    };

    window.addEventListener("keydown", onKeyDown, opts);
    return () => {
      window.removeEventListener("keydown", onKeyDown, opts);
    };
  }, [edges, nodes, onEdgesChange, onNodesChange]);

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
