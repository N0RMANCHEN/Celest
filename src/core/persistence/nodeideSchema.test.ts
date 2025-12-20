import { describe, expect, it } from "vitest";

import {
  GRAPH_SCHEMA_VERSION,
  WORKSPACE_SCHEMA_VERSION,
  defaultWorkspaceFile,
  wrapGraphFile,
} from "./nodeideSchema";

import type { CodeGraphModel } from "../../entities/graph/types";

describe("nodeide schema", () => {
  it("defaultWorkspaceFile is versioned and stable", () => {
    const ws = defaultWorkspaceFile();
    expect(ws.version).toBe(WORKSPACE_SCHEMA_VERSION);
    expect(ws.graphs.activeGraphId).toBe("main");
    expect(ws.graphs.files.main).toContain("graphs/");
    expect(ws.views.viewports.main.zoom).toBe(1);
  });

  it("wrapGraphFile sets versions and meta timestamps", () => {
    const g: CodeGraphModel = { version: 1, nodes: {}, edges: {} };
    const wrapped = wrapGraphFile(g);
    expect(wrapped.version).toBe(GRAPH_SCHEMA_VERSION);
    expect(wrapped.meta.createdAt).toBeTruthy();
    expect(wrapped.meta.updatedAt).toBeTruthy();
  });
});
