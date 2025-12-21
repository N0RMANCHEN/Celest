/**
 * fsIndexSelectors.ts
 * ----------------
 * P1-5: Selectors for FS Index derived state.
 */

import type { AppState } from "../types";
import type { FsIndexSnapshot } from "../../entities/fsIndex/types";
import type { FsMeta } from "../../entities/fsIndex/types";

// Stable empty object to prevent new references on every call
const EMPTY_EXPANDED: Record<string, boolean> = Object.freeze({});

/**
 * Get FS Index snapshot for the active project.
 */
export function selectActiveFsIndex(state: AppState): FsIndexSnapshot | null {
  const project = state.getActiveProject();
  if (!project) return null;
  return state.getFsIndexForProject(project.id);
}

/**
 * Get expanded directories for the active project.
 * 
 * CRITICAL: Returns stable empty object reference to prevent infinite loops.
 */
export function selectActiveFsExpanded(
  state: AppState
): Record<string, boolean> {
  const project = state.getActiveProject();
  if (!project) return EMPTY_EXPANDED;
  const expanded = state.fsExpandedByProjectId[project.id];
  return expanded ?? EMPTY_EXPANDED;
}

/**
 * Get selected FS entry ID for the active project.
 */
export function selectActiveFsSelectedId(state: AppState): string | null {
  const project = state.getActiveProject();
  if (!project) return null;
  return state.fsSelectedIdByProjectId[project.id] ?? null;
}

// Cache for selectedFsInfo to prevent new object creation on every call
let cachedSelectedFsInfo: {
  fsNodeId?: string;
  fsNode?: FsIndexSnapshot["nodes"][string];
  result: FsMeta | null;
} = { result: null };

/**
 * Get FsMeta for the selected FS entry in the active project.
 * 
 * CRITICAL: Caches result to prevent new object creation on every call,
 * which would cause infinite update loops in React.
 */
export function selectSelectedFsInfo(state: AppState): FsMeta | null {
  const fsIndex = selectActiveFsIndex(state);
  const fsSelectedId = selectActiveFsSelectedId(state);
  if (!fsIndex || !fsSelectedId) {
    if (cachedSelectedFsInfo.result !== null) {
      cachedSelectedFsInfo = { result: null };
    }
    return null;
  }

  const fsNode = fsIndex.nodes[fsSelectedId];
  if (!fsNode) {
    if (cachedSelectedFsInfo.result !== null) {
      cachedSelectedFsInfo = { result: null };
    }
    return null;
  }

  // Check if we can return cached result
  if (
    cachedSelectedFsInfo.fsNodeId === fsSelectedId &&
    cachedSelectedFsInfo.fsNode === fsNode
  ) {
    return cachedSelectedFsInfo.result;
  }

  // Create new result and cache it
  const result: FsMeta = {
    id: fsNode.id,
    kind: fsNode.kind,
    name: fsNode.name,
    path: fsNode.path,
    ...(fsNode.parentId ? { parentId: fsNode.parentId } : {}),
  };
  
  cachedSelectedFsInfo = {
    fsNodeId: fsSelectedId,
    fsNode,
    result,
  };
  
  return result;
}

