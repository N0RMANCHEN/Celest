/**
 * entities/graph/registry.ts
 * ----------------
 * Step6:
 * - Centralized NodeType registry for CodeGraph domain.
 * - Describes labels/icons/ports so Canvas + Inspector can share metadata.
 */

import type { CodeNodeKind } from "./types";

export type NodePortSpec = {
  id: string;
  label: string;
  direction: "in" | "out";
  accepts?: CodeNodeKind[];
};

export type NodeKindSpec = {
  kind: CodeNodeKind;
  label: string;
  icon: string;
  description?: string;
  ports: NodePortSpec[];
};

const REGISTRY: Record<CodeNodeKind, NodeKindSpec> = {
  note: {
    kind: "note",
    label: "Note",
    icon: "📝",
    description: "Markdown note card; supports links to other nodes.",
    ports: [
      { id: "in", label: "In", direction: "in" },
      { id: "out", label: "Out", direction: "out" },
    ],
  },
  fileRef: {
    kind: "fileRef",
    label: "File",
    icon: "📄",
    description: "Reference to a workspace file or folder.",
    ports: [
      { id: "in", label: "In", direction: "in" },
      { id: "out", label: "Out", direction: "out", accepts: ["note"] },
    ],
  },
  frame: {
    kind: "frame",
    label: "Frame",
    icon: "🖼️",
    description: "Visual grouping box (planned)",
    ports: [],
  },
  group: {
    kind: "group",
    label: "Group",
    icon: "🧩",
    description: "Logical grouping (non-connectable).",
    ports: [],
  },
  subgraphInstance: {
    kind: "subgraphInstance",
    label: "Subgraph",
    icon: "🪐",
    description: "Reusable graph definition placeholder.",
    ports: [
      { id: "input", label: "Input", direction: "in" },
      { id: "output", label: "Output", direction: "out" },
    ],
  },
};

export function getNodeSpec(kind: CodeNodeKind): NodeKindSpec {
  return REGISTRY[kind] ?? {
    kind,
    label: kind,
    icon: "❓",
    description: "Unknown node kind",
    ports: [],
  };
}
