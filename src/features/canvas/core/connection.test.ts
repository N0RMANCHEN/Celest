import { describe, expect, it } from "vitest";

import { findExistingEdge, isValidConnection } from "./connection";
import type { CanvasEdge } from "../adapters/codeGraphToCanvas";

const edges: CanvasEdge[] = [
  {
    id: "e1",
    source: "a",
    target: "b",
    sourceHandle: "out",
    targetHandle: "in",
    selected: false,
  },
];

describe("connection", () => {
  it("valid connection: source->target with correct handles", () => {
    const res = isValidConnection("a", "out", "source", "b", "in", "target", []);
    expect(res.valid).toBe(true);
  });

  it("rejects self connection", () => {
    const res = isValidConnection("a", "out", "source", "a", "in", "target", []);
    expect(res.valid).toBe(false);
  });

  it("rejects duplicate connection", () => {
    const res = isValidConnection("a", "out", "source", "b", "in", "target", edges);
    expect(res.valid).toBe(false);
  });

  it("rejects wrong handle direction", () => {
    const res = isValidConnection("a", "out", "target", "b", "in", "source", []);
    expect(res.valid).toBe(false);
  });

  it("findExistingEdge matches handles with defaults", () => {
    const match = findExistingEdge(edges, "a", "b", "out", "in");
    expect(match?.id).toBe("e1");

    const miss = findExistingEdge(edges, "a", "b", "out", "other");
    expect(miss).toBeUndefined();
  });
});


