/**
 * core/persistence/loadSave.ts
 * ----------------
 * Step5A:
 * Minimal JSON persistence under `projectRoot/.celest/` using File System Access API.
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
  CELEST_DIRNAME,
  WORKSPACE_FILENAME,
  WORKSPACE_SCHEMA_VERSION,
  defaultWorkspaceFile,
  nowIso,
  wrapGraphFile,
  type GraphFileV1,
  type WorkspaceFileV1,
} from "./nodeideSchema";
import { createBackup, loadBackupFile } from "./backup";
import { PersistenceErrors, type PersistenceError } from "./errors";
import {
  migrateWorkspaceFile,
  migrateGraphFile,
} from "./migration";

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

type ReadJsonResult<T> = {
  data: T | null;
  error: PersistenceError | null;
};

async function readJson<T>(
  dir: FileSystemDirectoryHandle,
  name: string,
  filePath: string = name
): Promise<ReadJsonResult<T>> {
  const file = await getFile(dir, name);
  if (!file) {
    // Try to load from backup
    const backupData = await loadBackupFile<T>(dir, name);
    if (backupData) {
      return {
        data: backupData,
        error: PersistenceErrors.fileNotFound(
          filePath + " (restored from backup)"
        ),
      };
    }
    return {
      data: null,
      error: PersistenceErrors.fileNotFound(filePath),
    };
  }

  let text: string;
  try {
    text = await file.text();
  } catch (e) {
    // Try to load from backup
    const backupData = await loadBackupFile<T>(dir, name);
    if (backupData) {
      return {
        data: backupData,
        error: PersistenceErrors.readError(
          filePath + " (restored from backup)",
          String(e),
          e
        ),
      };
    }
    return {
      data: null,
      error: PersistenceErrors.readError(filePath, String(e), e),
    };
  }

  try {
    const data = JSON.parse(text) as T;
    return { data, error: null };
  } catch (e) {
    // JSON parse failed, try to load from backup
    const backupData = await loadBackupFile<T>(dir, name);
    if (backupData) {
      return {
        data: backupData,
        error: PersistenceErrors.parseError(
          filePath + " (restored from backup)",
          e
        ),
      };
    }
    return {
      data: null,
      error: PersistenceErrors.parseError(filePath, e),
    };
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

export type EnsureCelestResult = {
  celestDir: FileSystemDirectoryHandle;
  graphsDir: FileSystemDirectoryHandle;
  migrated: boolean;
};

/**
 * Migrate from .nodeide to .celest directory.
 * Returns true if migration was performed, false otherwise.
 */
async function migrateNodeideToCelest(
  projectDir: FileSystemDirectoryHandle
): Promise<boolean> {
  // Check if .celest already exists
  try {
    await projectDir.getDirectoryHandle(CELEST_DIRNAME);
    // .celest exists, no migration needed
    return false;
  } catch (e) {
    if (!isNotFoundError(e)) throw e;
  }

  // Check if .nodeide exists
  let nodeideDir: FileSystemDirectoryHandle;
  try {
    nodeideDir = await projectDir.getDirectoryHandle(".nodeide");
  } catch (e) {
    if (isNotFoundError(e)) return false; // No .nodeide, nothing to migrate
    throw e;
  }

  // Create .celest directory
  const celestDir = await ensureDir(projectDir, CELEST_DIRNAME);

  // Copy all files and subdirectories from .nodeide to .celest
  async function copyDirectory(
    source: FileSystemDirectoryHandle,
    target: FileSystemDirectoryHandle
  ): Promise<void> {
    for await (const [name, handle] of source.entries()) {
      if (handle.kind === "file") {
        const fileHandle = handle as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const text = await file.text();
        await writeText(target, name, text);
      } else if (handle.kind === "directory") {
        const targetSubdir = await ensureDir(target, name);
        await copyDirectory(handle as FileSystemDirectoryHandle, targetSubdir);
      }
    }
  }

  await copyDirectory(nodeideDir, celestDir);

  // Rename .nodeide to .nodeide.backup as a safety measure
  // Note: File System Access API doesn't support rename directly,
  // so we'll leave .nodeide in place. Users can manually delete it later.
  // The migration is complete once .celest is created with all files.

  return true;
}

export async function ensureCelestDirs(
  projectDir: FileSystemDirectoryHandle
): Promise<EnsureCelestResult> {
  // Check and migrate from .nodeide if needed
  const migrated = await migrateNodeideToCelest(projectDir);

  const celestDir = await ensureDir(projectDir, CELEST_DIRNAME);
  const graphsDir = await ensureDir(celestDir, GRAPHS_DIRNAME);
  return { celestDir, graphsDir, migrated };
}

export async function loadWorkspaceFile(
  projectDir: FileSystemDirectoryHandle
): Promise<{
  file: WorkspaceFileV1 | null;
  migrated: boolean;
  error: PersistenceError | null;
}> {
  const { celestDir, migrated } = await ensureCelestDirs(projectDir);
  const filePath = `${CELEST_DIRNAME}/${WORKSPACE_FILENAME}`;
  const { data: raw, error: readError } = await readJson<unknown>(
    celestDir,
    WORKSPACE_FILENAME,
    filePath
  );

  if (readError) {
    return { file: null, migrated, error: readError };
  }

  if (!raw) {
    return { file: null, migrated, error: null };
  }

  // Check version and migrate if needed
  const migrationResult = migrateWorkspaceFile(raw, filePath);
  if (migrationResult.error) {
    // If migration failed, try validation as fallback
    if (validateWorkspaceFile(raw)) {
      // File is valid v1, return it
      return { file: raw, migrated, error: null };
    }
    // Migration failed and validation failed
    console.warn(`[persistence] ${migrationResult.error.message}`);
    return { file: null, migrated, error: migrationResult.error };
  }

  // Migration succeeded or no migration needed
  if (migrationResult.data === null) {
    // This shouldn't happen if error is null, but handle it defensively
    return { file: null, migrated, error: null };
  }
  return { file: migrationResult.data, migrated, error: null };
}

export async function saveWorkspaceFile(
  projectDir: FileSystemDirectoryHandle,
  file: WorkspaceFileV1
): Promise<void> {
  const { celestDir } = await ensureCelestDirs(projectDir);
  
  // Create backup before saving (non-fatal if backup fails)
  try {
    await createBackup(celestDir, WORKSPACE_FILENAME);
  } catch (e) {
    // Backup failure is non-fatal, log and continue
    console.warn(
      `[persistence] Failed to create backup for ${WORKSPACE_FILENAME}: ${String(e)}`
    );
  }

  const next: WorkspaceFileV1 = {
    ...file,
    meta: { ...file.meta, updatedAt: nowIso() },
  };
  await writeText(
    celestDir,
    WORKSPACE_FILENAME,
    JSON.stringify(next, null, 2)
  );
}

export async function ensureWorkspaceFile(
  projectDir: FileSystemDirectoryHandle
): Promise<{ file: WorkspaceFileV1; migrated: boolean; error: PersistenceError | null }> {
  const { file: existing, migrated, error } = await loadWorkspaceFile(projectDir);
  if (existing) return { file: existing, migrated, error };

  const created = defaultWorkspaceFile();
  try {
    await saveWorkspaceFile(projectDir, created);
  } catch (e) {
    // Non-fatal: project can still run without persistence.
    const writeError = PersistenceErrors.writeError(
      `${CELEST_DIRNAME}/${WORKSPACE_FILENAME}`,
      String(e),
      e
    );
    console.warn(`[persistence] ${writeError.message}`);
    return { file: created, migrated, error: writeError };
  }
  return { file: created, migrated, error: null };
}

export async function loadMainGraph(
  projectDir: FileSystemDirectoryHandle
): Promise<{
  graph: CodeGraphModel | null;
  createdAt?: string;
  error: PersistenceError | null;
}> {
  const { file: ws } = await ensureWorkspaceFile(projectDir);
  const rel = ws.graphs.files.main; // e.g. graphs/main.json

  const { celestDir } = await ensureCelestDirs(projectDir);
  // Resolve `graphs/main.json` -> directory + filename.
  const parts = rel.split("/").filter(Boolean);
  const filename = parts.pop();
  if (!filename) {
    return {
      graph: null,
      error: PersistenceErrors.readError(
        `${CELEST_DIRNAME}/${rel}`,
        "Invalid file path in workspace.json"
      ),
    };
  }

  let dir = celestDir;
  for (const p of parts) {
    dir = await ensureDir(dir, p);
  }

  const filePath = `${CELEST_DIRNAME}/${rel}`;
  const { data: raw, error: readError } = await readJson<unknown>(
    dir,
    filename,
    filePath
  );

  if (readError) {
    return { graph: null, error: readError };
  }

  if (!raw) {
    return { graph: null, error: null };
  }

  // Check version and migrate if needed
  const migrationResult = migrateGraphFile(raw, filePath);
  if (migrationResult.error) {
    // If migration failed, try validation as fallback
    if (validateGraphFile(raw)) {
      // File is valid v1, return it
      return { graph: raw.graph, createdAt: raw.meta?.createdAt, error: null };
    }
    // Migration failed and validation failed
    console.warn(`[persistence] ${migrationResult.error.message}`);
    return { graph: null, error: migrationResult.error };
  }

  // Migration succeeded or no migration needed
  if (migrationResult.data === null) {
    // This shouldn't happen if error is null, but handle it defensively
    return { graph: null, error: null };
  }
  return {
    graph: migrationResult.data.graph,
    createdAt: migrationResult.data.meta?.createdAt,
    error: null,
  };
}

export async function saveMainGraph(
  projectDir: FileSystemDirectoryHandle,
  graph: CodeGraphModel
): Promise<void> {
  // Ensure workspace exists so the file location is stable.
  const { file: ws } = await ensureWorkspaceFile(projectDir);
  const rel = ws.graphs.files.main;

  const { celestDir } = await ensureCelestDirs(projectDir);
  const parts = rel.split("/").filter(Boolean);
  const filename = parts.pop() ?? MAIN_GRAPH_FILENAME;

  let dir = celestDir;
  for (const p of parts) {
    dir = await ensureDir(dir, p);
  }

  // Create backup before saving (non-fatal if backup fails)
  try {
    await createBackup(dir, filename);
  } catch (e) {
    // Backup failure is non-fatal, log and continue
    console.warn(
      `[persistence] Failed to create backup for ${filename}: ${String(e)}`
    );
  }

  // Preserve createdAt if present.
  const { data: existing } = await readJson<unknown>(dir, filename, `${CELEST_DIRNAME}/${rel}`);
  const createdAt = existing && validateGraphFile(existing)
    ? existing.meta?.createdAt
    : undefined;
  const wrapped = wrapGraphFile(graph, createdAt);

  await writeText(dir, filename, JSON.stringify(wrapped, null, 2));
}

/**
 * Reset workspace.json to default values.
 * Useful when file is corrupted and cannot be recovered from backup.
 */
export async function resetWorkspaceFileToDefault(
  projectDir: FileSystemDirectoryHandle
): Promise<WorkspaceFileV1> {
  const { celestDir } = await ensureCelestDirs(projectDir);
  const defaultFile = defaultWorkspaceFile();
  await writeText(
    celestDir,
    WORKSPACE_FILENAME,
    JSON.stringify(defaultFile, null, 2)
  );
  return defaultFile;
}

/**
 * Reset graph file to default (empty graph).
 * Useful when file is corrupted and cannot be recovered from backup.
 */
export async function resetGraphFileToDefault(
  projectDir: FileSystemDirectoryHandle
): Promise<CodeGraphModel> {
  const { file: ws } = await ensureWorkspaceFile(projectDir);
  const rel = ws.graphs.files.main;

  const { celestDir } = await ensureCelestDirs(projectDir);
  const parts = rel.split("/").filter(Boolean);
  const filename = parts.pop() ?? MAIN_GRAPH_FILENAME;

  let dir = celestDir;
  for (const p of parts) {
    dir = await ensureDir(dir, p);
  }

  const emptyGraph: CodeGraphModel = {
    version: 1,
    nodes: {},
    edges: {},
  };

  const wrapped = wrapGraphFile(emptyGraph);
  await writeText(dir, filename, JSON.stringify(wrapped, null, 2));

  return emptyGraph;
}
