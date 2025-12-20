/**
 * core/persistence/loadSave.ts
 * ----------------
 * Step5A:
 * Minimal JSON persistence under `projectRoot/.nodeide/` using File System Access API.
 *
 * Notes:
 * - We deliberately keep this module "core" (no React dependency).
 * - We still rely on Web File System Access API types in Phase 1.
 */

import type { CodeGraphModel } from "../../entities/graph/types";
import {
  GRAPH_SCHEMA_VERSION,
  GRAPHS_DIRNAME,
  MAIN_GRAPH_FILENAME,
  NODEIDE_DIRNAME,
  WORKSPACE_FILENAME,
  WORKSPACE_SCHEMA_VERSION,
  defaultWorkspaceFile,
  nowIso,
  wrapGraphFile,
  type GraphFileV1,
  type WorkspaceFileV1,
} from "./nodeideSchema";

function isNotFoundError(e: unknown): boolean {
  // Browsers typically throw DOMException with name "NotFoundError".
  if (typeof e !== "object" || e === null) return false;
  if (!("name" in e)) return false;
  const name = (e as { name?: unknown }).name;
  return typeof name === "string" && name === "NotFoundError";
}

async function ensureDir(
  parent: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemDirectoryHandle> {
  return await parent.getDirectoryHandle(name, { create: true });
}

async function getFile(
  dir: FileSystemDirectoryHandle,
  name: string
): Promise<File | null> {
  try {
    const h = await dir.getFileHandle(name);
    return await h.getFile();
  } catch (e) {
    if (isNotFoundError(e)) return null;
    throw e;
  }
}

async function writeText(
  dir: FileSystemDirectoryHandle,
  name: string,
  text: string
): Promise<void> {
  const h = await dir.getFileHandle(name, { create: true });
  const writable = await h.createWritable();
  await writable.write(text);
  await writable.close();
}

async function readJson<T>(
  dir: FileSystemDirectoryHandle,
  name: string
): Promise<T | null> {
  const file = await getFile(dir, name);
  if (!file) return null;
  const text = await file.text();
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.warn(`[persistence] invalid JSON in ${name}: ${String(e)}`);
    return null;
  }
}

function validateWorkspaceFile(v: unknown): v is WorkspaceFileV1 {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.version !== WORKSPACE_SCHEMA_VERSION) return false;
  if (!o.views || !o.graphs || !o.meta) return false;

  const graphs = o.graphs as Record<string, unknown>;
  if (graphs.activeGraphId !== "main") return false;
  const files = graphs.files as Record<string, unknown> | undefined;
  if (!files || typeof files.main !== "string") return false;

  return true;
}

function validateGraphFile(v: unknown): v is GraphFileV1 {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.version !== GRAPH_SCHEMA_VERSION) return false;
  if (!o.graph || typeof o.graph !== "object") return false;
  return true;
}

export type EnsureNodeideResult = {
  nodeideDir: FileSystemDirectoryHandle;
  graphsDir: FileSystemDirectoryHandle;
};

export async function ensureNodeideDirs(
  projectDir: FileSystemDirectoryHandle
): Promise<EnsureNodeideResult> {
  const nodeideDir = await ensureDir(projectDir, NODEIDE_DIRNAME);
  const graphsDir = await ensureDir(nodeideDir, GRAPHS_DIRNAME);
  return { nodeideDir, graphsDir };
}

export async function loadWorkspaceFile(
  projectDir: FileSystemDirectoryHandle
): Promise<WorkspaceFileV1 | null> {
  const { nodeideDir } = await ensureNodeideDirs(projectDir);
  const raw = await readJson<unknown>(nodeideDir, WORKSPACE_FILENAME);
  if (!raw) return null;
  if (!validateWorkspaceFile(raw)) {
    console.warn(
      `[persistence] workspace.json has unexpected shape/version; ignoring`
    );
    return null;
  }
  return raw;
}

export async function saveWorkspaceFile(
  projectDir: FileSystemDirectoryHandle,
  file: WorkspaceFileV1
): Promise<void> {
  const { nodeideDir } = await ensureNodeideDirs(projectDir);
  const next: WorkspaceFileV1 = {
    ...file,
    meta: { ...file.meta, updatedAt: nowIso() },
  };
  await writeText(
    nodeideDir,
    WORKSPACE_FILENAME,
    JSON.stringify(next, null, 2)
  );
}

export async function ensureWorkspaceFile(
  projectDir: FileSystemDirectoryHandle
): Promise<WorkspaceFileV1> {
  const existing = await loadWorkspaceFile(projectDir);
  if (existing) return existing;

  const created = defaultWorkspaceFile();
  try {
    await saveWorkspaceFile(projectDir, created);
  } catch (e) {
    // Non-fatal: project can still run without persistence.
    console.warn(`[persistence] failed to create workspace.json: ${String(e)}`);
  }
  return created;
}

export async function loadMainGraph(
  projectDir: FileSystemDirectoryHandle
): Promise<{ graph: CodeGraphModel; createdAt?: string } | null> {
  const ws = await ensureWorkspaceFile(projectDir);
  const rel = ws.graphs.files.main; // e.g. graphs/main.json

  const { nodeideDir } = await ensureNodeideDirs(projectDir);
  // Resolve `graphs/main.json` -> directory + filename.
  const parts = rel.split("/").filter(Boolean);
  const filename = parts.pop();
  if (!filename) return null;

  let dir = nodeideDir;
  for (const p of parts) {
    dir = await ensureDir(dir, p);
  }

  const raw = await readJson<unknown>(dir, filename);
  if (!raw) return null;
  if (!validateGraphFile(raw)) {
    console.warn(
      `[persistence] graph file has unexpected shape/version; ignoring`
    );
    return null;
  }

  return { graph: raw.graph, createdAt: raw.meta?.createdAt };
}

export async function saveMainGraph(
  projectDir: FileSystemDirectoryHandle,
  graph: CodeGraphModel
): Promise<void> {
  // Ensure workspace exists so the file location is stable.
  const ws = await ensureWorkspaceFile(projectDir);
  const rel = ws.graphs.files.main;

  const { nodeideDir } = await ensureNodeideDirs(projectDir);
  const parts = rel.split("/").filter(Boolean);
  const filename = parts.pop() ?? MAIN_GRAPH_FILENAME;

  let dir = nodeideDir;
  for (const p of parts) {
    dir = await ensureDir(dir, p);
  }

  // Preserve createdAt if present.
  const existing = await readJson<unknown>(dir, filename);
  const createdAt = validateGraphFile(existing)
    ? existing.meta?.createdAt
    : undefined;
  const wrapped = wrapGraphFile(graph, createdAt);

  await writeText(dir, filename, JSON.stringify(wrapped, null, 2));
}
