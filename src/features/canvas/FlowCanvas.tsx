/**
 * features/canvas/FlowCanvas.tsx
 * ----------------
 * ReactFlow wrapper:
 * - Stable nodeTypes reference across HMR.
 * - Sanitize edge handle ids (avoid null/"undefined"/"").
 * - View presets: restore viewport per activeViewId; update viewport on move-end.
 * - Step4C: Canvas renders CodeGraph view-model.
 */

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type Viewport,
} from "reactflow";
import { useCallback, useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from "react";

import type { CanvasEdgeData, CanvasNodeData } from "../../entities/graph/types";
import { getNodeTypes } from "./nodeTypes";

export type Props = {
  nodes: Node<CanvasNodeData>[];
  edges: Edge<CanvasEdgeData>[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (conn: Connection) => void;
  onSelectionChange: (sel: { nodes: Node[]; edges: Edge[] }) => void;

  activeViewId: string;
  views: Array<{ id: string; viewport: Viewport }>; // fixed 2 in Phase 1
  onViewportCommit: (viewId: string, viewport: Viewport) => void;

  onCreateNoteNodeAt?: (pos: { x: number; y: number }) => void;
};

function sanitizeHandleId(handle: unknown): string | undefined {
  if (handle === null || handle === undefined) return undefined;
  const s = String(handle).trim();
  if (!s) return undefined;
  if (s === "undefined" || s === "null") return undefined;
  return s;
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
    views,
    onViewportCommit,
    onCreateNoteNodeAt,
  } = props;

  const nodeTypes = useMemo(() => getNodeTypes(), []);
  const lastCommitRef = useRef<{ viewId: string; v: Viewport } | null>(null);
  const didFitRef = useRef(false);

  const rf = useReactFlow<CanvasNodeData, CanvasEdgeData>();

  // Restore viewport when switching views.
  useEffect(() => {
    const v = views.find((vv) => vv.id === activeViewId)?.viewport;
    if (!v) return;
    rf.setViewport(v, { duration: 220 });
  }, [activeViewId, views, rf]);

  // Fit view once when nodes appear.
  useEffect(() => {
    if (didFitRef.current) return;
    if (nodes.length === 0) return;
    didFitRef.current = true;
    // Small delay to ensure DOM is ready.
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
      onViewportCommit(viewId, v);
    },
    [onViewportCommit]
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

  const handlePaneDoubleClick = useCallback(
    (evt: ReactMouseEvent) => {
      if (!onCreateNoteNodeAt) return;

      // Prefer modern API if available.
      const anyRf = rf as any;
      if (typeof anyRf.screenToFlowPosition === "function") {
        const pos = anyRf.screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
        onCreateNoteNodeAt(pos);
        return;
      }

      // Fallback: approximate by using current viewport.
      const v = rf.getViewport();
      const pos = {
        x: (evt.clientX - v.x) / v.zoom,
        y: (evt.clientY - v.y) / v.zoom,
      };
      onCreateNoteNodeAt(pos);
    },
    [onCreateNoteNodeAt, rf]
  );

  return (
    <ReactFlow<CanvasNodeData, CanvasEdgeData>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleConnect}
      onMoveEnd={handleMoveEnd}
      onSelectionChange={onSelectionChange}
      onPaneDoubleClick={handlePaneDoubleClick}
      connectionLineType="smoothstep"
      fitView={false}
      proOptions={{ hideAttribution: true }}
      isValidConnection={(conn) => {
        // Prevent wiring to non-wirable node types.
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
      <Background />
      <MiniMap />
      <Controls />
    </ReactFlow>
  );
}

export default function FlowCanvas(props: Props) {
  // Keep wrapper so layout styles can target the .react-flow container.
  return (
    <div className="reactflow-wrap" style={{ height: "100%", width: "100%" }}>
      <ReactFlowProvider>
        <FlowCanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
