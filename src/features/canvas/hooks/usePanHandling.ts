/**
 * features/canvas/hooks/usePanHandling.ts
 * ----------------
 * Handles panning (viewport movement) with Figma-like behavior:
 * - Touchpad two-finger panning
 * - Mouse middle button panning
 * - Space + left button panning (handled by ReactFlow panActivationKeyCode)
 * 
 * This hook provides manual panning for touchpad gestures that ReactFlow
 * doesn't handle natively.
 */

import { useEffect, useRef } from "react";
import { useReactFlow, type Viewport as RFViewport } from "@xyflow/react";
import type { CanvasNodeData, CanvasEdgeData } from "../types";
import type { Node, Edge } from "@xyflow/react";

export function usePanHandling() {
  const rf = useReactFlow<Node<CanvasNodeData>, Edge<CanvasEdgeData>>();
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  const panStartViewportRef = useRef<RFViewport | null>(null);

  useEffect(() => {
    // Find the ReactFlow pane element
    const paneElement = document.querySelector(".react-flow__pane") as HTMLElement;
    if (!paneElement) return;

    // Handle mouse middle button panning
    const handleMouseDown = (e: MouseEvent) => {
      // Middle button (button 1) or right button with modifier
      if (e.button === 1 || (e.button === 2 && e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        isPanningRef.current = true;
        lastPanPointRef.current = { x: e.clientX, y: e.clientY };
        // Get current viewport from ReactFlow
        const currentViewport = rf.getViewport();
        panStartViewportRef.current = currentViewport;
        paneElement.style.cursor = "grabbing";
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current || !lastPanPointRef.current || !panStartViewportRef.current) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const deltaX = e.clientX - lastPanPointRef.current.x;
      const deltaY = e.clientY - lastPanPointRef.current.y;

      // Convert screen delta to flow coordinates
      const zoom = panStartViewportRef.current.zoom;
      const newViewport: RFViewport = {
        x: panStartViewportRef.current.x + deltaX / zoom,
        y: panStartViewportRef.current.y + deltaY / zoom,
        zoom: zoom,
      };

      rf.setViewport(newViewport, { duration: 0 });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isPanningRef.current && (e.button === 1 || e.button === 2)) {
        e.preventDefault();
        e.stopPropagation();
        isPanningRef.current = false;
        lastPanPointRef.current = null;
        panStartViewportRef.current = null;
        paneElement.style.cursor = "default";
      }
    };

    // Handle touchpad two-finger panning (gesture events)
    // Note: This is a simplified implementation. Full touchpad support
    // may require more sophisticated gesture detection.
    const handleWheel = (e: WheelEvent) => {
      // Detect two-finger panning on touchpad
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
        e.preventDefault();
        e.stopPropagation();

        const currentViewport = rf.getViewport();
        const zoom = currentViewport.zoom;
        const newViewport: RFViewport = {
          x: currentViewport.x - e.deltaX / zoom,
          y: currentViewport.y - e.deltaY / zoom,
          zoom: zoom,
        };

        rf.setViewport(newViewport, { duration: 0 });
      }
    };

    // Prevent context menu when panning with middle button
    const handleContextMenu = (e: MouseEvent) => {
      if (isPanningRef.current) {
        e.preventDefault();
      }
    };

    paneElement.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    paneElement.addEventListener("wheel", handleWheel, { passive: false });
    paneElement.addEventListener("contextmenu", handleContextMenu);

    return () => {
      paneElement.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      paneElement.removeEventListener("wheel", handleWheel);
      paneElement.removeEventListener("contextmenu", handleContextMenu);
      paneElement.style.cursor = "default";
    };
  }, [rf]);
}

