/**
 * features/fsIndex/buildFsIndex.ts
 * ----------------
 * Step4A:
 * Build a JSON-serializable FS Index snapshot from an FsMeta map.
 *
 * IMPORTANT:
 * - The snapshot is meant for navigation (Left Tree), NOT for Canvas.
 * - It must be serializable (no FileSystemHandle).
 */

import type { FsIndexNode, FsIndexSnapshot, FsMeta } from "../../entities/fsIndex/types";

function inferRootId(meta: Record<string, FsMeta>): string | null {
  const roots = Object.values(meta).filter((m) => !m.parentId);
  if (roots.length === 0) return null;
  const dir = roots.find((m) => m.kind === "dir");
  return (dir ?? roots[0]).id;
}

function compareByKindThenName(a: FsIndexNode, b: FsIndexNode): number {
  // Directories first, then files; then alphabetical by name.
  if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
  return a.name.localeCompare(b.name);
}

/**
 * Build a stable snapshot from an FsMeta map.
 */
export function buildFsIndexSnapshot(
  meta: Record<string, FsMeta>,
  rootId?: string
): FsIndexSnapshot | null {
  const resolvedRootId = rootId ?? inferRootId(meta);
  if (!resolvedRootId) return null;

  const nodes: Record<string, FsIndexNode> = {};

  // 1) Create nodes.
  for (const m of Object.values(meta)) {
    nodes[m.id] = {
      id: m.id,
      kind: m.kind,
      name: m.name,
      path: m.path,
      parentId: m.parentId,
      children: [],
    };
  }

  // 2) Build children arrays.
  for (const n of Object.values(nodes)) {
    if (!n.parentId) continue;
    const parent = nodes[n.parentId];
    if (!parent) continue;
    parent.children.push(n.id);
  }

  // 3) Sort children for stable ordering.
  for (const n of Object.values(nodes)) {
    if (n.children.length === 0) continue;
    n.children.sort((aId, bId) => {
      const a = nodes[aId];
      const b = nodes[bId];
      if (!a || !b) return 0;
      return compareByKindThenName(a, b);
    });
  }

  return { version: 1, rootId: resolvedRootId, nodes };
}
