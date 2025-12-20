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
  type OnSelectionChangeParams,
  type Viewport,
} from "reactflow";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from "react";

import type { CanvasEdgeData, CanvasNodeData } from "../../entities/graph/types";
import { NODE_TYPES } from "./nodeTypes";

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
    viewport,
    onViewportChange,
    focusRequest,
    onCreateNoteNodeAt,
  } = props;

  const lastCommitRef = useRef<{ viewId: string; v: Viewport } | null>(null);
  const lastViewportRef = useRef<Viewport | null>(null);
  const didFitRef = useRef(false);

  const nodeTypes = useMemo(() => NODE_TYPES, []);

  const rf = useReactFlow<CanvasNodeData, CanvasEdgeData>();
  const nodeTypes = useMemo(() => NODE_TYPES, []);

  // Restore viewport when switching views.
  useEffect(() => {
    if (
      lastViewportRef.current &&
      Math.abs(lastViewportRef.current.x - viewport.x) < 0.0001 &&
      Math.abs(lastViewportRef.current.y - viewport.y) < 0.0001 &&
      Math.abs(lastViewportRef.current.zoom - viewport.zoom) < 0.0001
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

  const handlePaneClick = useCallback(
    (evt: ReactMouseEvent) => {
      if (!onCreateNoteNodeAt || evt.detail < 2) return;

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
      // ignore focus errors
    }
  }, [focusRequest, rf]);

  return (
    <ReactFlow<CanvasNodeData, CanvasEdgeData>
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleConnect}
      onMoveEnd={handleMoveEnd}
      onSelectionChange={handleSelectionChange}
      onPaneClick={handlePaneClick}
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
      <Background
        variant="dots"
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
  // Keep wrapper so layout styles can target the .react-flow container.
  return (
    <div className="reactflow-wrap" style={{ height: "100%", width: "100%" }}>
      <ReactFlowProvider>
        <FlowCanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
