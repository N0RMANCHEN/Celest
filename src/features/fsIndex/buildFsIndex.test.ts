import { describe, expect, it } from "vitest";

import { buildFsIndexSnapshot } from "./buildFsIndex";

import type { FsMeta } from "../../entities/fsIndex/types";

describe("buildFsIndexSnapshot", () => {
  it("builds a stable snapshot with a root and sorted children", () => {
    const meta = {
      root: { id: "root", kind: "dir", name: "Project", path: "/Project" },
      dirA: {
        id: "dirA",
        kind: "dir",
        name: "A",
        path: "/Project/A",
        parentId: "root",
      },
      fileZ: {
        id: "fileZ",
        kind: "file",
        name: "z.txt",
        path: "/Project/z.txt",
        parentId: "root",
      },
      fileB: {
        id: "fileB",
        kind: "file",
        name: "b.txt",
        path: "/Project/b.txt",
        parentId: "root",
      },
    } as const;

    const snap = buildFsIndexSnapshot(meta, "root");
    expect(snap).not.toBeNull();
    if (!snap) return;

    expect(snap.version).toBe(1);
    expect(snap.rootId).toBe("root");

    // Directories first, then files, then alphabetical.
    expect(snap.nodes.root.children).toEqual(["dirA", "fileB", "fileZ"]);
  });

  it("returns null if no root can be inferred", () => {
    const empty: Record<string, FsMeta> = {};
    const snap = buildFsIndexSnapshot(empty);
    expect(snap).toBeNull();
  });
});
