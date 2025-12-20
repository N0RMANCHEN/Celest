/**
 * FlowCanvas.tsx
 * ----------------
 * 修复：
 *  - ReactFlow #002：nodeTypes/edgeTypes 绝对稳定（globalThis 缓存，抗 HMR/重挂载）
 *  - ReactFlow #008：清洗 edge handle（去掉 null/"undefined"/""）
 *  - 容器尺寸兜底：避免 #004
 *  - 视口：defaultViewport + viewId 切换时 programmatic setViewport，避免循环
 *  - selection：本地去抖
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeTypes,
  type Viewport,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

// ⚠️ 必须直接从 nodeTypes.ts 引入，别从 ../nodes barrel 引入（避免 HMR/循环导出干扰）
import { NODE_TYPES } from "../nodes/nodeTypes";
import type { NodeData, EdgeData } from "../services/fsGraph";

type FocusRequest = { nodeId: string; nonce: number };

type Props = {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (c: Connection) => void;
  onSelectionChange: (ids: string[]) => void;

  activeViewId: string;
  viewport: Viewport;
  onViewportChange: (vp: Viewport) => void;

  focusRequest: FocusRequest | null;
};

const PRO_OPTIONS = { hideAttribution: true } as const;

/** -------- #002 核弹：globalThis 缓存，跨 HMR / remount 也稳定 -------- */
declare global {
  var __NODE_IDE_NODE_TYPES__: NodeTypes | undefined;

  var __NODE_IDE_EDGE_TYPES__: EdgeTypes | undefined;
}

const STABLE_NODE_TYPES: NodeTypes = (globalThis.__NODE_IDE_NODE_TYPES__ ??=
  NODE_TYPES);

const STABLE_EDGE_TYPES: EdgeTypes = (globalThis.__NODE_IDE_EDGE_TYPES__ ??=
  {});
/** -------------------------------------------------------------------- */

function sameIds(a: string[], b: string[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function normalizeHandleId(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s || s === "undefined" || s === "null") return undefined;
  return s;
}

function shouldStripHandle(v: unknown) {
  return v === null || v === "" || v === "undefined" || v === "null";
}

function normalizeEdgeHandles(e: Edge<EdgeData>): Edge<EdgeData> {
  const rawSH = e.sourceHandle;
  const rawTH = e.targetHandle;

  const needStrip = shouldStripHandle(rawSH) || shouldStripHandle(rawTH);
  if (!needStrip) return e;

  const sh = normalizeHandleId(rawSH);
  const th = normalizeHandleId(rawTH);

  const next: Edge<EdgeData> = { ...e };

  if (shouldStripHandle(rawSH)) {
    delete (next as { sourceHandle?: unknown }).sourceHandle;
  }
  if (shouldStripHandle(rawTH)) {
    delete (next as { targetHandle?: unknown }).targetHandle;
  }

  if (sh) next.sourceHandle = sh;
  if (th) next.targetHandle = th;

  return next;
}

function InnerFlow(props: Props) {
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
  } = props;

  const rf = useReactFlow<NodeData, EdgeData>();

  const safeEdges = useMemo(() => edges.map(normalizeEdgeHandles), [edges]);

  const ignoreMoveEndRef = useRef(false);
  const defaultViewportRef = useRef<Viewport>(viewport);

  // 初次有节点 fit 一次
  const didInitialFitRef = useRef(false);
  useEffect(() => {
    if (didInitialFitRef.current) return;
    if (!nodes || nodes.length === 0) return;

    didInitialFitRef.current = true;
    ignoreMoveEndRef.current = true;
    rf.fitView({ duration: 0, padding: 0.2 });

    const t = window.setTimeout(() => {
      ignoreMoveEndRef.current = false;
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  // 切 view：恢复 viewport
  useEffect(() => {
    ignoreMoveEndRef.current = true;
    rf.setViewport(viewport, { duration: 0 });

    const t = window.setTimeout(() => {
      ignoreMoveEndRef.current = false;
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewId]);

  // focus
  useEffect(() => {
    if (!focusRequest) return;
    const n = rf.getNode(focusRequest.nodeId);
    if (!n) return;

    ignoreMoveEndRef.current = true;
    rf.setCenter(
      n.position.x + (n.width ?? 0) / 2,
      n.position.y + (n.height ?? 0) / 2,
      { zoom: Math.max(0.6, viewport.zoom), duration: 180 }
    );

    const t = window.setTimeout(() => {
      ignoreMoveEndRef.current = false;
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce]);

  // selection 去抖
  const lastSelRef = useRef<string[]>([]);
  const handleSelectionChange = useCallback(
    (p: { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] }) => {
      void p.edges;
      const ids = p.nodes.map((n) => n.id);
      if (sameIds(lastSelRef.current, ids)) return;
      lastSelRef.current = ids;
      onSelectionChange(ids);
    },
    [onSelectionChange]
  );

  const onMoveEnd = useCallback(
    (_evt: unknown, vp: Viewport) => {
      void _evt;
      if (ignoreMoveEndRef.current) return;
      onViewportChange(vp);
    },
    [onViewportChange]
  );

  // 禁掉 groupNode 连线（它没 handles，不应该连）
  const isValidConnection = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return false;
      const sNode = rf.getNode(c.source);
      const tNode = rf.getNode(c.target);
      if (!sNode || !tNode) return false;
      if (sNode.type === "groupNode" || tNode.type === "groupNode")
        return false;
      return true;
    },
    [rf]
  );

  const handleConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return;
      onConnect(c);
    },
    [onConnect]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={safeEdges}
      nodeTypes={STABLE_NODE_TYPES}
      edgeTypes={STABLE_EDGE_TYPES}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleConnect}
      isValidConnection={isValidConnection}
      onSelectionChange={handleSelectionChange}
      onMoveEnd={onMoveEnd}
      defaultViewport={defaultViewportRef.current}
      proOptions={PRO_OPTIONS}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}

export default function FlowCanvas(props: Props) {
  return (
    <div className="canvas-inner" style={{ width: "100%", height: "100%" }}>
      <ReactFlowProvider>
        <InnerFlow {...props} />
      </ReactFlowProvider>
    </div>
  );
}
