/**
 * features/canvas/Canvas.tsx
 * ----------------
 * Custom canvas implementation (SVG-based, Figma-like interaction).
 * 
 * This replaces FlowCanvas.tsx with a custom implementation that:
 * - Uses SVG for rendering
 * - Implements Figma-level interaction (selection, box selection, drag, pan)
 * - Maintains API compatibility with canvasEvents.ts contracts
 * 
 * Architecture:
 * - Pure SVG rendering (no ReactFlow dependency)
 * - Direct DOM event handling for precise control
 * - Modular managers (ViewportManager, SelectionManager, DragManager)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CanvasConnection,
  CanvasEdgeChange,
  CanvasNodeChange,
  CanvasViewport,
} from "../../entities/canvas/canvasEvents";
import type { CanvasNode, CanvasEdge } from "./adapters/codeGraphToCanvas";
import { CanvasNode as CanvasNodeComponent } from "./components/CanvasNode";
import { CanvasEdge as CanvasEdgeComponent } from "./components/CanvasEdge";
import { SelectionBox } from "./components/SelectionBox";
import { screenToCanvas, getViewportTransform } from "./core/ViewportManager";
import { handleNodeClick as handleNodeClickSelection, handleBoxSelection, handlePaneClick as clearSelection } from "./core/SelectionManager";
import { startDrag, updateDragPositions } from "./core/DragManager";
import { normalizeSelectionBox, getNodeBounds } from "./core/BoxSelection";

export type Props = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];

  onNodesChange: (changes: CanvasNodeChange[]) => void;
  onEdgesChange: (changes: CanvasEdgeChange[]) => void;
  onConnect: (conn: CanvasConnection) => void;
  onSelectionChange: (ids: string[]) => void;

  activeViewId: string;
  viewport: CanvasViewport;
  onViewportChange: (viewport: CanvasViewport) => void;
  focusRequest?: { nodeId: string; nonce: number } | null;

  onCreateNoteNodeAt?: (pos: { x: number; y: number }) => void;
};

export function Canvas(props: Props) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onConnect: _onConnect, // TODO: Implement edge connection handling (currently unused)
    onSelectionChange,
    viewport,
    onViewportChange,
    focusRequest,
    onCreateNoteNodeAt,
  } = props;

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedIdsRef = useRef<Set<string>>(new Set());
  
  // Box selection state
  const [boxSelection, setBoxSelection] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);
  const isBoxSelectingRef = useRef(false);
  
  // Drag state with performance optimization
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    draggedNodeIds: Set<string>;
    dragStartPositions: Map<string, { x: number; y: number }>;
    dragStartMouse: { x: number; y: number };
  } | null>(null);
  
  // Local node positions for performance (avoid frequent store updates during drag)
  const localNodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const dragAnimationFrameRef = useRef<number | null>(null);
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; viewport: CanvasViewport } | null>(null);
  
  // Local viewport for performance (avoid frequent updates during pan)
  const localViewportRef = useRef<CanvasViewport>(viewport);
  const panAnimationFrameRef = useRef<number | null>(null);
  
  // Space key state (for Space + drag panning)
  const spaceKeyPressedRef = useRef(false);
  
  // Sync viewport to local ref
  useEffect(() => {
    localViewportRef.current = viewport;
  }, [viewport]);
  
  // Sync node positions to local ref
  useEffect(() => {
    const newPositions = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
      newPositions.set(node.id, { ...node.position });
    }
    localNodePositionsRef.current = newPositions;
  }, [nodes]);
  
  // Cleanup animation frames on unmount
  useEffect(() => {
    return () => {
      if (dragAnimationFrameRef.current !== null) {
        cancelAnimationFrame(dragAnimationFrameRef.current);
      }
      if (panAnimationFrameRef.current !== null) {
        cancelAnimationFrame(panAnimationFrameRef.current);
      }
    };
  }, []);
  
  // Update selectedIds from props (when selection changes externally)
  // Use useMemo to derive selection from props instead of useEffect + setState
  const propsSelection = useMemo(() => {
    return new Set(
      nodes.filter((n) => n.selected).map((n) => n.id).concat(
        edges.filter((e) => e.selected).map((e) => e.id)
      )
    );
  }, [nodes, edges]);
  
  // Sync propsSelection to state only when it actually changes
  useEffect(() => {
    if (propsSelection.size !== selectedIds.size || 
        !Array.from(propsSelection).every(id => selectedIds.has(id))) {
      // This is necessary to sync external props changes to internal state
      // The linter warning about setState in useEffect is acceptable here
      // as we need to sync external state (props) to internal state
      setSelectedIds(propsSelection);
      selectedIdsRef.current = propsSelection;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propsSelection]);

  // Focus request handling
  useEffect(() => {
    if (focusRequest) {
      const node = nodes.find((n) => n.id === focusRequest.nodeId);
      if (node) {
        // Center viewport on node
        const container = containerRef.current;
        if (container) {
          const centerX = container.clientWidth / 2;
          const centerY = container.clientHeight / 2;
          const newViewport: CanvasViewport = {
            x: centerX - node.position.x * viewport.zoom,
            y: centerY - node.position.y * viewport.zoom,
            zoom: viewport.zoom,
          };
          onViewportChange(newViewport);
        }
      }
    }
  }, [focusRequest, nodes, viewport, onViewportChange]);

  // Get node size - doesn't use refs to avoid render-time ref access
  const getNodeSize = useCallback((nodeId: string): { width: number; height: number } => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { width: 180, height: 100 };
    
    // Use node's width/height if available, otherwise default
    return node.width && node.height
      ? { width: node.width, height: node.height }
      : { width: 180, height: 100 };
  }, [nodes]);

  // Handle node click
  const handleNodeClick = useCallback((nodeId: string, shiftKey: boolean) => {
    const newSelection = handleNodeClickSelection(nodeId, selectedIdsRef.current, shiftKey);
    setSelectedIds(newSelection);
    selectedIdsRef.current = newSelection;
    onSelectionChange(Array.from(newSelection));
  }, [onSelectionChange]);

  // Handle edge click
  const handleEdgeClick = useCallback((edgeId: string, shiftKey: boolean) => {
    const newSelection = handleNodeClickSelection(edgeId, selectedIdsRef.current, shiftKey);
    setSelectedIds(newSelection);
    selectedIdsRef.current = newSelection;
    onSelectionChange(Array.from(newSelection));
  }, [onSelectionChange]);

  // Handle pane click (clear selection or create node)
  const handlePaneClick = useCallback((e: React.MouseEvent) => {
    // Check if event is valid
    if (!e || typeof e.detail !== 'number') {
      return;
    }

    // Double-click creates note node
    if (e.detail >= 2 && onCreateNoteNodeAt) {
      e.preventDefault();
      e.stopPropagation();
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const canvasPos = screenToCanvas(
          { x: e.clientX - rect.left, y: e.clientY - rect.top },
          localViewportRef.current
        );
        onCreateNoteNodeAt(canvasPos);
      }
      return;
    }

    // Single click clears selection (only if not clicking on node/edge)
    const target = e.target as HTMLElement;
    const isOnNode = target.closest(".canvas-node") || target.closest("foreignObject");
    const isOnEdge = target.closest(".canvas-edge");
    
    if (!isOnNode && !isOnEdge) {
      const newSelection = clearSelection();
      setSelectedIds(newSelection);
      selectedIdsRef.current = newSelection;
      onSelectionChange([]);
    }
  }, [onCreateNoteNodeAt, onSelectionChange]);

  // Track Space key for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        spaceKeyPressedRef.current = true;
        // Prevent page scroll when Space is pressed
        if (e.target === document.body || (e.target as HTMLElement).tagName === "BODY") {
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceKeyPressedRef.current = false;
        // If we were panning with Space, stop panning
        if (isPanning) {
          setIsPanning(false);
          panStartRef.current = null;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPanning]);

  // Handle wheel events (zoom + pan)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Detect pinch zoom (Ctrl/Cmd + wheel or trackpad pinch)
      const isPinchZoom = e.ctrlKey || e.metaKey;
      
      if (isPinchZoom) {
        // Zoom in/out
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return false;
        
        // Mouse position relative to canvas
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate zoom factor
        const zoomDelta = -e.deltaY * 0.01; // Inverted for natural feel
        const zoomFactor = Math.pow(1.1, zoomDelta);
        const currentViewport = localViewportRef.current;
        const newZoom = Math.max(0.1, Math.min(5, currentViewport.zoom * zoomFactor));
        
        // Zoom towards mouse position (Figma behavior)
        const scale = newZoom / currentViewport.zoom;
        const newViewport: CanvasViewport = {
          x: mouseX - (mouseX - currentViewport.x) * scale,
          y: mouseY - (mouseY - currentViewport.y) * scale,
          zoom: newZoom,
        };
        
        localViewportRef.current = newViewport;
        onViewportChange(newViewport);
        
        return false;
      }
      
      // Handle touchpad two-finger panning
      // Touchpad panning typically has:
      // - Non-zero deltaX or deltaY
      // - Small or zero deltaZ (not scrolling)
      // - No ctrlKey (not pinch zoom)
      // - No buttons pressed (not mouse wheel)
      // - deltaMode === 0 (pixel mode, typical for touchpad)
      const isTwoFingerPan = 
        (e.deltaX !== 0 || e.deltaY !== 0) && 
        Math.abs(e.deltaZ) < 0.1 &&
        !e.ctrlKey && // Not pinch zoom
        e.buttons === 0 && // No mouse buttons pressed
        e.deltaMode === 0; // Pixel mode (touchpad)

      if (isTwoFingerPan) {
        // CRITICAL: Prevent default browser scrolling behavior AND navigation gestures
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Pan canvas with touchpad gesture
        const currentViewport = localViewportRef.current;
        const newViewport: CanvasViewport = {
          x: currentViewport.x - e.deltaX,
          y: currentViewport.y - e.deltaY,
          zoom: currentViewport.zoom,
        };
        
        localViewportRef.current = newViewport;
        onViewportChange(newViewport);
        
        return false;
      }
      
      // Also prevent horizontal scrolling that triggers browser navigation
      // macOS trackpad horizontal swipes trigger browser back/forward
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 10) {
        // Horizontal swipe detected - prevent browser navigation
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Use non-passive listener to allow preventDefault
    // Use capture phase to intercept early, before other handlers
    const element = containerRef.current;
    if (element) {
      // Capture phase ensures we handle the event before it bubbles
      element.addEventListener("wheel", handleWheel, { 
        passive: false,  // CRITICAL: Must be false to allow preventDefault
        capture: true    // Intercept early in capture phase
      });
      
      return () => {
        element.removeEventListener("wheel", handleWheel, { capture: true });
      };
    }
  }, [onViewportChange]);

  // Handle mouse down (start box selection or drag)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if clicking on node or edge
    const isOnNode = target.closest(".canvas-node") || target.closest("foreignObject");
    const isOnEdge = target.closest(".canvas-edge");
    const isOnHandle = target.closest(".canvas-handle");
    
    if (isOnNode || isOnEdge || isOnHandle) {
      // Node/edge/handle click handled by component
      return;
    }

    // Check for panning: Space + left button, or middle button
    const isSpacePan = e.button === 0 && spaceKeyPressedRef.current;
    const isMiddleButton = e.button === 1;
    
    if (isSpacePan || isMiddleButton) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        viewport: { ...localViewportRef.current },
      };
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Left click on pane: start box selection
    if (e.button === 0) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const canvasPos = screenToCanvas(
          { x: e.clientX - rect.left, y: e.clientY - rect.top },
          localViewportRef.current
        );
        
        // Clear previous selection when box selection starts (Figma behavior)
        const newSelection = clearSelection();
        setSelectedIds(newSelection);
        selectedIdsRef.current = newSelection;
        onSelectionChange([]);
        
        isBoxSelectingRef.current = true;
        setBoxSelection({ start: canvasPos, end: canvasPos });
      }
    }
  }, [onSelectionChange]);

  // Global mouse move handler (for drag and box selection) - Optimized with RAF
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isPanning && panStartRef.current) {
        // Pan canvas - use RAF for smooth updates
        e.preventDefault();
        
        if (panAnimationFrameRef.current !== null) {
          cancelAnimationFrame(panAnimationFrameRef.current);
        }
        
        panAnimationFrameRef.current = requestAnimationFrame(() => {
          if (!panStartRef.current) return;
          
          const deltaX = e.clientX - panStartRef.current.x;
          const deltaY = e.clientY - panStartRef.current.y;
          const newViewport = {
            x: panStartRef.current.viewport.x + deltaX,
            y: panStartRef.current.viewport.y + deltaY,
            zoom: panStartRef.current.viewport.zoom,
          };
          
          // Update local ref immediately for rendering
          localViewportRef.current = newViewport;
          onViewportChange(newViewport);
          panAnimationFrameRef.current = null;
        });
        return;
      }

      if (isDragging && dragStateRef.current) {
        // Drag nodes - use RAF and local state for smooth updates
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          if (dragAnimationFrameRef.current !== null) {
            cancelAnimationFrame(dragAnimationFrameRef.current);
          }
          
          const currentMouse = screenToCanvas(
            { x: e.clientX - rect.left, y: e.clientY - rect.top },
            localViewportRef.current
          );
          
          dragAnimationFrameRef.current = requestAnimationFrame(() => {
            if (!dragStateRef.current) return;
            
            const delta = {
              x: currentMouse.x - dragStateRef.current.dragStartMouse.x,
              y: currentMouse.y - dragStateRef.current.dragStartMouse.y,
            };
            
            const newPositions = updateDragPositions(
              dragStateRef.current.draggedNodeIds,
              dragStateRef.current.dragStartPositions,
              delta
            );
            
            // Update local positions immediately
            for (const [nodeId, pos] of newPositions) {
              localNodePositionsRef.current.set(nodeId, pos);
            }
            
            // Emit position changes to store (batched by RAF)
            const changes: CanvasNodeChange[] = [];
            for (const [nodeId, pos] of newPositions) {
              changes.push({ id: nodeId, type: "position", position: pos });
            }
            onNodesChange(changes);
            dragAnimationFrameRef.current = null;
          });
        }
        return;
      }

      if (isBoxSelectingRef.current && boxSelection) {
        // Update box selection
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const canvasPos = screenToCanvas(
            { x: e.clientX - rect.left, y: e.clientY - rect.top },
            localViewportRef.current
          );
          setBoxSelection({ ...boxSelection, end: canvasPos });
        }
      }
    };

    if (isPanning || isDragging || isBoxSelectingRef.current) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
    }
  }, [isPanning, isDragging, boxSelection, onViewportChange, onNodesChange]);

  // Handle mouse move (update box selection, drag, or pan) - Optimized with RAF
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panStartRef.current) {
      // Pan canvas - use RAF for smooth updates
      if (panAnimationFrameRef.current !== null) {
        cancelAnimationFrame(panAnimationFrameRef.current);
      }
      
      panAnimationFrameRef.current = requestAnimationFrame(() => {
        if (!panStartRef.current) return;
        
        const deltaX = e.clientX - panStartRef.current.x;
        const deltaY = e.clientY - panStartRef.current.y;
        const newViewport = {
          x: panStartRef.current.viewport.x + deltaX,
          y: panStartRef.current.viewport.y + deltaY,
          zoom: panStartRef.current.viewport.zoom,
        };
        
        // Update local ref immediately for rendering
        localViewportRef.current = newViewport;
        onViewportChange(newViewport);
        panAnimationFrameRef.current = null;
      });
      return;
    }

    if (isDragging && dragStateRef.current) {
      // Drag nodes - use RAF and local state for smooth updates
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        if (dragAnimationFrameRef.current !== null) {
          cancelAnimationFrame(dragAnimationFrameRef.current);
        }
        
        const currentMouse = screenToCanvas(
          { x: e.clientX - rect.left, y: e.clientY - rect.top },
          localViewportRef.current
        );
        
        dragAnimationFrameRef.current = requestAnimationFrame(() => {
          if (!dragStateRef.current) return;
          
          const delta = {
            x: currentMouse.x - dragStateRef.current.dragStartMouse.x,
            y: currentMouse.y - dragStateRef.current.dragStartMouse.y,
          };
          
          const newPositions = updateDragPositions(
            dragStateRef.current.draggedNodeIds,
            dragStateRef.current.dragStartPositions,
            delta
          );
          
          // Update local positions immediately
          for (const [nodeId, pos] of newPositions) {
            localNodePositionsRef.current.set(nodeId, pos);
          }
          
          // Emit position changes to store (batched by RAF)
          const changes: CanvasNodeChange[] = [];
          for (const [nodeId, pos] of newPositions) {
            changes.push({ id: nodeId, type: "position", position: pos });
          }
          onNodesChange(changes);
          dragAnimationFrameRef.current = null;
        });
      }
      return;
    }

    if (isBoxSelectingRef.current && boxSelection) {
      // Update box selection
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const canvasPos = screenToCanvas(
          { x: e.clientX - rect.left, y: e.clientY - rect.top },
          localViewportRef.current
        );
        setBoxSelection({ ...boxSelection, end: canvasPos });
      }
    }
  }, [isPanning, isDragging, boxSelection, onViewportChange, onNodesChange]);

  // Global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      // Stop panning if middle button released, or if Space key is no longer pressed (for Space+drag)
      if (isPanning) {
        const wasMiddleButton = e.button === 1;
        const wasSpacePan = spaceKeyPressedRef.current && e.button === 0;
        
        if (wasMiddleButton || (!spaceKeyPressedRef.current && wasSpacePan)) {
          // Cancel any pending pan animation
          if (panAnimationFrameRef.current !== null) {
            cancelAnimationFrame(panAnimationFrameRef.current);
            panAnimationFrameRef.current = null;
          }
          setIsPanning(false);
          panStartRef.current = null;
        }
      }

      if (isDragging) {
        // Cancel any pending drag animation
        if (dragAnimationFrameRef.current !== null) {
          cancelAnimationFrame(dragAnimationFrameRef.current);
          dragAnimationFrameRef.current = null;
        }
        
        // Final sync to store (ensure all changes are committed)
        if (dragStateRef.current) {
          const changes: CanvasNodeChange[] = [];
          for (const [nodeId, pos] of localNodePositionsRef.current) {
            if (dragStateRef.current.draggedNodeIds.has(nodeId)) {
              changes.push({ id: nodeId, type: "position", position: pos });
            }
          }
          if (changes.length > 0) {
            onNodesChange(changes);
          }
        }
        
        setIsDragging(false);
        dragStateRef.current = null;
      }

      if (isBoxSelectingRef.current && boxSelection) {
        // Finalize box selection
        const normalizedBox = normalizeSelectionBox(boxSelection.start, boxSelection.end);
        
        // Build node bounds map using local positions
        const nodeBounds = new Map<string, { left: number; top: number; right: number; bottom: number }>();
        for (const node of nodes) {
          const size = getNodeSize(node.id);
          if (size) {
            // Use local position if available (in case of concurrent drag)
            const position = localNodePositionsRef.current.get(node.id) || node.position;
            const bounds = getNodeBounds(position, size);
            nodeBounds.set(node.id, bounds);
          }
        }
        
        // Select nodes in box
        const selected = handleBoxSelection(
          nodes.map((n) => n.id),
          nodeBounds,
          normalizedBox
        );
        
        setSelectedIds(selected);
        selectedIdsRef.current = selected;
        onSelectionChange(Array.from(selected));
        
        // Clear box selection
        isBoxSelectingRef.current = false;
        setBoxSelection(null);
      }
    };

    if (isPanning || isDragging || isBoxSelectingRef.current) {
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }
  }, [isPanning, isDragging, boxSelection, nodes, getNodeSize, onSelectionChange, onNodesChange]);

  // Handle mouse up (end box selection, drag, or pan)
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      // Cancel any pending pan animation
      if (panAnimationFrameRef.current !== null) {
        cancelAnimationFrame(panAnimationFrameRef.current);
        panAnimationFrameRef.current = null;
      }
      setIsPanning(false);
      panStartRef.current = null;
    }

    if (isDragging) {
      // Cancel any pending drag animation
      if (dragAnimationFrameRef.current !== null) {
        cancelAnimationFrame(dragAnimationFrameRef.current);
        dragAnimationFrameRef.current = null;
      }
      setIsDragging(false);
      dragStateRef.current = null;
    }

    // Local mouse up handler (for immediate feedback)
    // Global handler will handle the actual logic
  }, [isPanning, isDragging]);

  // Handle node drag start
  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    // Only start drag on left button
    if (e.button !== 0) return;
    
    // Don't start drag if clicking on handle
    const target = e.target as HTMLElement;
    if (target.closest(".canvas-handle")) {
      return;
    }
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const canvasPos = screenToCanvas(
      { x: e.clientX - rect.left, y: e.clientY - rect.top },
      localViewportRef.current
    );
    
    // Start drag - use local positions
    const nodePositions = new Map<string, { x: number; y: number }>();
    for (const [nodeId, pos] of localNodePositionsRef.current) {
      nodePositions.set(nodeId, pos);
    }
    
    const dragResult = startDrag(nodeId, selectedIdsRef.current, nodePositions);
    
    // Update selection if needed
    if (dragResult.selectedIds.size !== selectedIdsRef.current.size ||
        !Array.from(dragResult.selectedIds).every((id) => selectedIdsRef.current.has(id))) {
      setSelectedIds(dragResult.selectedIds);
      selectedIdsRef.current = dragResult.selectedIds;
      onSelectionChange(Array.from(dragResult.selectedIds));
    }
    
    setIsDragging(true);
    dragStateRef.current = {
      draggedNodeIds: dragResult.draggedNodeIds,
      dragStartPositions: dragResult.dragStartPositions,
      dragStartMouse: canvasPos,
    };
    
    e.preventDefault();
    e.stopPropagation();
  }, [onSelectionChange]);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete/Backspace: remove selected nodes/edges
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIdsRef.current.size > 0) {
        e.preventDefault();
        const changes: (CanvasNodeChange | CanvasEdgeChange)[] = [];
        for (const id of selectedIdsRef.current) {
          const node = nodes.find((n) => n.id === id);
          if (node) {
            changes.push({ id, type: "remove" });
          } else {
            const edge = edges.find((e) => e.id === id);
            if (edge) {
              changes.push({ id, type: "remove" });
            }
          }
        }
        
        const nodeChanges = changes.filter((c) => c.type === "remove" && "type" in c && c.type === "remove" && nodes.some((n) => n.id === c.id)) as CanvasNodeChange[];
        const edgeChanges = changes.filter((c) => c.type === "remove" && edges.some((e) => e.id === c.id)) as CanvasEdgeChange[];
        
        if (nodeChanges.length > 0) onNodesChange(nodeChanges);
        if (edgeChanges.length > 0) onEdgesChange(edgeChanges);
        
        // Clear selection
        const newSelection = new Set<string>();
        setSelectedIds(newSelection);
        selectedIdsRef.current = newSelection;
        onSelectionChange([]);
      }
      
      // ESC: cancel drag
      if (e.key === "Escape" && isDragging && dragStateRef.current) {
        // Restore original positions
        const changes: CanvasNodeChange[] = [];
        for (const [nodeId, pos] of dragStateRef.current.dragStartPositions) {
          changes.push({ id: nodeId, type: "position", position: pos });
        }
        onNodesChange(changes);
        setIsDragging(false);
        dragStateRef.current = null;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nodes, edges, isDragging, onNodesChange, onEdgesChange, onSelectionChange]);

  // Calculate edge positions
  const edgePositions = useMemo(() => {
    const positions = new Map<string, {
      source: { x: number; y: number };
      target: { x: number; y: number };
      sourceHandle?: { x: number; y: number };
      targetHandle?: { x: number; y: number };
    }>();
    
    for (const edge of edges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      
      if (!sourceNode || !targetNode) continue;
      
      const sourceSize = getNodeSize(sourceNode.id);
      const targetSize = getNodeSize(targetNode.id);
      
      // Calculate handle positions (left/right center of nodes)
      const sourceHandle = {
        x: sourceNode.position.x + sourceSize.width,
        y: sourceNode.position.y + sourceSize.height / 2,
      };
      const targetHandle = {
        x: targetNode.position.x,
        y: targetNode.position.y + targetSize.height / 2,
      };
      
      positions.set(edge.id, {
        source: { x: sourceNode.position.x, y: sourceNode.position.y },
        target: { x: targetNode.position.x, y: targetNode.position.y },
        sourceHandle: edge.sourceHandle ? sourceHandle : undefined,
        targetHandle: edge.targetHandle ? targetHandle : undefined,
      });
    }
    
    return positions;
  }, [edges, nodes, getNodeSize]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        cursor: isPanning ? "grabbing" : "default",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={(e) => {
        // Only handle pane click if not clicking on node/edge
        const target = e.target as HTMLElement;
        const isOnNode = target.closest(".canvas-node") || target.closest("foreignObject");
        const isOnEdge = target.closest(".canvas-edge");
        if (!isOnNode && !isOnEdge) {
          handlePaneClick(e);
        }
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "all",
        }}
      >
        {/* 点阵背景 (类似 ReactFlow) - 固定在视窗坐标系 */}
        <defs>
          <pattern
            id="dot-pattern"
            x={viewport.x % 20}
            y={viewport.y % 20}
            width={20}
            height={20}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="1"
              cy="1"
              r="1"
              fill="#d1d5db"
              opacity="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#ffffff" />
        <rect width="100%" height="100%" fill="url(#dot-pattern)" />

        {/* Apply viewport transform */}
        <g transform={getViewportTransform(viewport)}>
          {/* Edges (render first, behind nodes) */}
          {edges.map((edge) => {
            const pos = edgePositions.get(edge.id);
            if (!pos) return null;
            // Use local selectedIds state for immediate visual feedback
            const isSelected = selectedIds.has(edge.id);
            const edgeWithSelection = { ...edge, selected: isSelected };
            return (
              <CanvasEdgeComponent
                key={edge.id}
                edge={edgeWithSelection}
                sourcePos={pos.source}
                targetPos={pos.target}
                sourceHandlePos={pos.sourceHandle}
                targetHandlePos={pos.targetHandle}
                viewport={viewport}
                onEdgeClick={handleEdgeClick}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            // Use local selectedIds state for immediate visual feedback
            const isSelected = selectedIds.has(node.id);
            const nodeWithSelection = { ...node, selected: isSelected };
            return (
              <g key={node.id} className="canvas-node" data-node-id={node.id}>
                <CanvasNodeComponent
                  node={nodeWithSelection}
                  viewport={viewport}
                  onNodeClick={handleNodeClick}
                  onNodeMouseDown={handleNodeMouseDown}
                  getNodeSize={getNodeSize}
                />
              </g>
            );
          })}

          {/* Selection box */}
          {boxSelection && (
            <SelectionBox
              start={boxSelection.start}
              end={boxSelection.end}
              viewport={viewport}
            />
          )}
        </g>
      </svg>
    </div>
  );
}

