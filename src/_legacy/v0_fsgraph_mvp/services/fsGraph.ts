import type { Edge, Node } from "reactflow";
import { nanoid } from "nanoid";

export type FsKind = "dir" | "file";

export type FsMeta = {
  id: string;
  kind: FsKind;
  name: string;
  path: string;
  parentId?: string;
};

export type NodeData = {
  title: string;
  kind: "dir" | "file" | "group";
  path: string;
};

export type EdgeData = {
  locked?: boolean;
  edgeKind: "fs" | "flow";
};

export type FsBuildResult = {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  handles: Record<string, FileSystemHandle>;
  meta: Record<string, FsMeta>;
};

function icon(kind: FsKind) {
  return kind === "dir" ? "📁" : "📄";
}

function layout(items: Array<{ id: string; depth: number }>) {
  const yCount: Record<number, number> = {};
  const pos: Record<string, { x: number; y: number }> = {};
  for (const it of items) {
    const c = (yCount[it.depth] ?? 0) + 1;
    yCount[it.depth] = c;
    pos[it.id] = { x: it.depth * 280, y: (c - 1) * 120 };
  }
  return pos;
}

/**
 * Build a ReactFlow graph from a folder handle.
 * Requires File System Access API (Chrome/Edge).
 */
export async function buildFsGraph(
  root: FileSystemDirectoryHandle,
  rootName = "Root"
): Promise<FsBuildResult> {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge<EdgeData>[] = [];
  const handles: Record<string, FileSystemHandle> = {};
  const meta: Record<string, FsMeta> = {};
  const order: Array<{ id: string; depth: number }> = [];

  const rootId = nanoid();
  handles[rootId] = root;
  meta[rootId] = {
    id: rootId,
    kind: "dir",
    name: rootName,
    path: `/${rootName}`,
  };
  order.push({ id: rootId, depth: 0 });

  async function walk(
    dir: FileSystemDirectoryHandle,
    parentId: string,
    parentPath: string,
    depth: number
  ) {
    const entries: Array<[string, FileSystemHandle]> = [];

    // Note: FileSystemDirectoryHandle.entries() exists in modern Chrome,
    // but TS lib types sometimes lag—if your TS complains, we can add a d.ts patch.
    for await (const [name, handle] of dir.entries()) {
      entries.push([name, handle]);
    }

    entries.sort((a, b) => {
      if (a[1].kind !== b[1].kind) return a[1].kind === "directory" ? -1 : 1;
      return a[0].localeCompare(b[0]);
    });

    for (const [name, handle] of entries) {
      const kind: FsKind = handle.kind === "directory" ? "dir" : "file";
      const id = nanoid();
      const path = `${parentPath}/${name}`;

      handles[id] = handle;
      meta[id] = { id, kind, name, path, parentId };
      order.push({ id, depth });

      edges.push({
        id: `e_${parentId}_${id}`,
        source: parentId,
        target: id,
        type: "smoothstep",
        deletable: false,
        data: { locked: true, edgeKind: "fs" },
      });

      if (handle.kind === "directory") {
        await walk(handle as FileSystemDirectoryHandle, id, path, depth + 1);
      }
    }
  }

  await walk(root, rootId, `/${rootName}`, 1);

  const pos = layout(order);

  for (const { id } of order) {
    const m = meta[id];
    nodes.push({
      id,
      position: pos[id] ?? { x: 0, y: 0 },
      type: m.kind === "dir" ? "dirNode" : "fileNode",
      data: {
        title: `${icon(m.kind)} ${m.name}`,
        kind: m.kind,
        path: m.path,
      },
    });
  }

  return { nodes, edges, handles, meta };
}
