/**
 * workbenchSelectors.ts
 * ----------------
 * P1-5: Selectors for workbench view-model derived state.
 *
 * Cache strategy:
 * - Uses module-level caching for performance optimization.
 * - Cache logic is kept inline (not extracted to utils) because:
 *   1. Each cache has specific business logic tied to its selector.
 *   2. Phase 1 is single-instance, so module-level caching is safe.
 *   3. Extracting would add abstraction without clear benefit.
 * - If we later need multi-instance support, we should refactor to WeakMap-based
 *   caching keyed by project ID, rather than extracting generic cache utilities.
 */

import type { AppState } from "../types";
import type { CodeGraphNode } from "../../entities/graph/types";
import { codeGraphToCanvas } from "../../features/canvas/adapters/codeGraphToCanvas";
import { logger } from "../../shared/utils/logger";

export type FocusRequest = { nodeId: string; nonce: number };

/**
 * Get the first selected graph node in the active project.
 */
export function selectSelectedGraphNode(
  state: AppState
): CodeGraphNode | null {
  const project = state.getActiveProject();
  if (!project) return null;

  const firstSelected = project.selectedIds.find(
    (id) => project.graph.nodes[id]
  );
  return firstSelected ? project.graph.nodes[firstSelected] ?? null : null;
}

/**
 * Module-level cache for focusRequest to prevent new object creation on every call.
 * 
 * Design rationale:
 * - Phase 1 assumes a single active project instance (single-page app).
 * - Module-level caching is safe and efficient for this use case.
 * - Prevents infinite React update loops by maintaining stable object references.
 * 
 * Note: If we later need to support multiple project instances simultaneously,
 * we should migrate to a WeakMap-based cache keyed by project ID.
 */
let cachedFocusRequest: {
  nodeId?: string;
  nonce?: number;
  result: FocusRequest | null;
} = { result: null };

/**
 * Get focus request for the active project.
 * 
 * CRITICAL: Caches result to prevent new object creation on every call,
 * which would cause infinite update loops in React.
 */
export function selectFocusRequest(state: AppState): FocusRequest | null {
  const project = state.getActiveProject();
  if (!project?.focusNodeId) {
    if (cachedFocusRequest.result !== null) {
      cachedFocusRequest = { result: null };
    }
    return null;
  }
  
  // Check if we can return cached result
  if (
    cachedFocusRequest.nodeId === project.focusNodeId &&
    cachedFocusRequest.nonce === project.focusNonce
  ) {
    return cachedFocusRequest.result;
  }
  
  // Create new result and cache it
  const result: FocusRequest = {
    nodeId: project.focusNodeId,
    nonce: project.focusNonce,
  };
  
  cachedFocusRequest = {
    nodeId: project.focusNodeId,
    nonce: project.focusNonce,
    result,
  };
  
  return result;
}

/**
 * Create a cache key from graph state that captures all relevant changes.
 * This includes node positions, selection, and graph structure.
 */
function createCacheKey(
  graph: NonNullable<ReturnType<AppState["getActiveProject"]>>["graph"],
  selectedIds: string[],
  viewId: string
): string {
  if (!graph) return "empty";
  
  // Create a stable key from node IDs, positions, and selection
  const nodeKeys = Object.keys(graph.nodes)
    .sort()
    .map((id) => {
      const node = graph.nodes[id];
      const pos = node.position;
      const size = {
        w: typeof (node as any).width === "number" ? (node as any).width : "na",
        h: typeof (node as any).height === "number" ? (node as any).height : "na",
      };
      const selected = selectedIds.includes(id);
      return `${id}:${pos.x},${pos.y}:${size.w}x${size.h}:${selected ? "1" : "0"}`;
    })
    .join("|");
  
  const edgeKeys = Object.keys(graph.edges)
    .sort()
    .map((id) => {
      const edge = graph.edges[id];
      const selected = selectedIds.includes(id);
      return `${id}:${edge.source}->${edge.target}:${selected ? "1" : "0"}`;
    })
    .join("|");
  
  return `${nodeKeys}||${edgeKeys}||view:${viewId}`;
}

/**
 * Module-level cache for canvas view model (custom Canvas implementation).
 * 
 * Design rationale:
 * - Phase 1 assumes a single active project instance (single-page app).
 * - Module-level caching is safe and efficient for this use case.
 * - Maintains reference stability to prevent React re-renders while allowing
 *   Canvas to detect position updates during drag operations.
 * 
 * Cache strategy:
 * - Uses content-based comparison (not just cache key) to detect real changes.
 * - Returns cached reference when content is identical, even if cache key changed.
 * - This is critical for drag performance: positions change frequently during drag,
 *   but we only want to update Canvas when positions actually change.
 * 
 * Note: If we later need to support multiple project instances simultaneously,
 * we should migrate to a WeakMap-based cache keyed by project ID.
 */
let cachedCanvasVM: {
  cacheKey?: string;
  nodes: ReturnType<typeof codeGraphToCanvas>["nodes"];
  edges: ReturnType<typeof codeGraphToCanvas>["edges"];
} = { nodes: [], edges: [] };

/**
 * Get canvas view model (custom Canvas nodes/edges) for the active project.
 * Converts CodeGraphModel to custom Canvas view model.
 */
export function selectCanvasViewModel(state: AppState): ReturnType<
  typeof codeGraphToCanvas
> {
  const project = state.getActiveProject();
  const graph = project?.graph;
  if (!graph) {
    if (cachedCanvasVM.nodes.length > 0 || cachedCanvasVM.edges.length > 0) {
      cachedCanvasVM = { nodes: [], edges: [] };
    }
    return cachedCanvasVM;
  }

  const selectedIds = project?.selectedIds ?? [];
  const activeViewId = state.activeViewId ?? "default";
  const cacheKey = createCacheKey(graph, selectedIds, activeViewId);

  // IMPORTANT: project selection is projected back onto Canvas nodes/edges
  const vm = codeGraphToCanvas(graph, selectedIds);
  
  // CRITICAL: Verify all graph nodes are included in the result
  const graphNodeIds = new Set(Object.keys(graph.nodes));
  const vmNodeIds = new Set(vm.nodes.map((n) => n.id));
  const missingNodeIds = Array.from(graphNodeIds).filter(
    (id) => !vmNodeIds.has(id)
  );

  if (missingNodeIds.length > 0) {
    logger.warn(
      "[selectCanvasViewModel] Missing nodes in conversion:",
      missingNodeIds
    );
    // For now, just log - we can add recovery logic later if needed
  }
  
  // Check content equality
  const contentEqual = 
    cachedCanvasVM.nodes.length === vm.nodes.length &&
    cachedCanvasVM.edges.length === vm.edges.length &&
    cachedCanvasVM.nodes.every((n, i) => {
      const other = vm.nodes[i];
      return other && n.id === other.id && 
        n.position.x === other.position.x &&
        n.position.y === other.position.y &&
        n.selected === other.selected &&
        (n as any).width === (other as any).width &&
        (n as any).height === (other as any).height;
    }) &&
    cachedCanvasVM.edges.every((e, i) => {
      const other = vm.edges[i];
      return other && e.id === other.id && e.selected === other.selected;
    });
  
  if (contentEqual && cachedCanvasVM.cacheKey === cacheKey) {
    return cachedCanvasVM;
  }
  
  // Content changed, update cache
  cachedCanvasVM = {
    cacheKey,
    nodes: vm.nodes,
    edges: vm.edges,
  };
  
  return cachedCanvasVM;
}

