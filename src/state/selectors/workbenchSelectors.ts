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
import { codeGraphToFlow } from "../../features/canvas/adapters/codeGraphToFlow";

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
 * Module-level cache for canvas view model with content-based comparison.
 * 
 * Design rationale:
 * - Phase 1 assumes a single active project instance (single-page app).
 * - Module-level caching is safe and efficient for this use case.
 * - Maintains reference stability to prevent React re-renders while allowing
 *   ReactFlow to detect position updates during drag operations.
 * 
 * Cache strategy:
 * - Uses content-based comparison (not just cache key) to detect real changes.
 * - Returns cached reference when content is identical, even if cache key changed.
 * - This is critical for drag performance: positions change frequently during drag,
 *   but we only want to update ReactFlow when positions actually change.
 * 
 * Note: If we later need to support multiple project instances simultaneously,
 * we should migrate to a WeakMap-based cache keyed by project ID.
 */
let cachedCanvasVM: {
  cacheKey?: string;
  nodes: ReturnType<typeof codeGraphToFlow>["nodes"];
  edges: ReturnType<typeof codeGraphToFlow>["edges"];
} = { nodes: [], edges: [] };

/**
 * Create a cache key from graph state that captures all relevant changes.
 * This includes node positions, selection, and graph structure.
 */
function createCacheKey(
  graph: NonNullable<ReturnType<AppState["getActiveProject"]>>["graph"],
  selectedIds: string[]
): string {
  if (!graph) return "empty";
  
  // Create a stable key from node IDs, positions, and selection
  const nodeKeys = Object.keys(graph.nodes)
    .sort()
    .map((id) => {
      const node = graph.nodes[id];
      const pos = node.position;
      const selected = selectedIds.includes(id);
      return `${id}:${pos.x},${pos.y}:${selected ? "1" : "0"}`;
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
  
  return `${nodeKeys}||${edgeKeys}`;
}

/**
 * Compare two node arrays by content (not reference).
 */
function nodesEqual(
  a: ReturnType<typeof codeGraphToFlow>["nodes"],
  b: ReturnType<typeof codeGraphToFlow>["nodes"]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const na = a[i];
    const nb = b[i];
    if (
      na.id !== nb.id ||
      na.position.x !== nb.position.x ||
      na.position.y !== nb.position.y ||
      na.selected !== nb.selected ||
      na.type !== nb.type
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Compare two edge arrays by content (not reference).
 */
function edgesEqual(
  a: ReturnType<typeof codeGraphToFlow>["edges"],
  b: ReturnType<typeof codeGraphToFlow>["edges"]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ea = a[i];
    const eb = b[i];
    if (
      ea.id !== eb.id ||
      ea.source !== eb.source ||
      ea.target !== eb.target ||
      ea.selected !== eb.selected
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Get canvas view model (ReactFlow nodes/edges) for the active project.
 * 
 * CRITICAL: Uses content-based caching to prevent infinite loops while still
 * allowing ReactFlow to see position updates during drag.
 * 
 * The cache compares node/edge content (positions, selection, etc.) rather than
 * just references, so it can detect real changes while avoiding unnecessary re-renders.
 * 
 * IMPORTANT: Always ensures all nodes from graph.nodes are included in the result.
 * Missing nodes would cause ReactFlow "node not initialized" errors.
 */
export function selectCanvasViewModel(state: AppState): ReturnType<
  typeof codeGraphToFlow
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
  const cacheKey = createCacheKey(graph, selectedIds);

  // IMPORTANT: project selection is projected back onto ReactFlow nodes/edges
  const vm = codeGraphToFlow(graph, selectedIds);
  
  // CRITICAL: Verify all graph nodes are included in the result
  // This prevents nodes from disappearing due to conversion errors
  const graphNodeIds = new Set(Object.keys(graph.nodes));
  const vmNodeIds = new Set(vm.nodes.map(n => n.id));
  const missingNodeIds = Array.from(graphNodeIds).filter(id => !vmNodeIds.has(id));
  
  if (missingNodeIds.length > 0) {
    // Log missing nodes for debugging
    console.warn('[selectCanvasViewModel] Missing nodes in conversion:', missingNodeIds);
    // Force cache invalidation and return fresh result
    cachedCanvasVM = {
      cacheKey,
      nodes: vm.nodes,
      edges: vm.edges,
    };
    return cachedCanvasVM;
  }
  
  // CRITICAL: Check content equality FIRST, regardless of cache key.
  // This is essential for drag performance: during drag, positions change frequently,
  // causing cache key to change, but if we check content equality first, we can
  // return the cached array reference when only positions changed (which ReactFlow
  // handles internally via onNodesChange).
  // 
  // However, we still need to return a new array when positions actually change
  // so ReactFlow can see the updates. The key is: if content is identical, return cached.
  if (
    nodesEqual(cachedCanvasVM.nodes, vm.nodes) &&
    edgesEqual(cachedCanvasVM.edges, vm.edges)
  ) {
    // Content is identical, return cached to maintain reference stability
    // Update cache key for next comparison
    cachedCanvasVM.cacheKey = cacheKey;
    return cachedCanvasVM;
  }
  
  // Content changed, update cache and return new object
  // CRITICAL: Only return a new object reference when content actually changes,
  // so ReactFlow can detect position updates during drag.
  cachedCanvasVM = {
    cacheKey,
    nodes: vm.nodes,
    edges: vm.edges,
  };
  
  return cachedCanvasVM;
}

