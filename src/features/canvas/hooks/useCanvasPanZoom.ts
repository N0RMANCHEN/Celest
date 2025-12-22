/**
 * features/canvas/hooks/useCanvasPanZoom.ts
 * ----------------
 * 画布平移和缩放逻辑
 * 支持 Space+拖拽、中键拖拽、双指滑动、滚轮缩放、触控板缩放
 */

import { useCallback, useEffect } from "react";
import type { CanvasViewport } from "../../../entities/canvas/canvasEvents";

const PINCH_DELTA_MULTIPLIER = 0.03; // 提升缩放灵敏度
const PINCH_BASE = 1.18;

export function useCanvasPanZoom(
  viewport: CanvasViewport,
  containerRef: React.RefObject<HTMLDivElement | null>,
  isPanning: boolean,
  setIsPanning: (value: boolean) => void,
  panStartRef: React.MutableRefObject<{
    x: number;
    y: number;
    viewport: CanvasViewport;
  } | null>,
  localViewportRef: React.MutableRefObject<CanvasViewport>,
  panAnimationFrameRef: React.MutableRefObject<number | null>,
  spaceKeyPressedRef: React.MutableRefObject<boolean>,
  onViewportChange: (viewport: CanvasViewport) => void
) {
  // 开始平移
  const startPan = useCallback(
    (e: React.MouseEvent) => {
      // 防止重复启动
      if (isPanning) {
        console.warn("[useCanvasPanZoom] Already panning, ignoring");
        return;
      }
      
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        viewport: { ...viewport },
      };
    },
    [viewport, isPanning, setIsPanning, panStartRef]
  );

  // 平移过程中更新（使用 RAF）
  const handlePanMove = useCallback(
    (e: MouseEvent) => {
      if (!isPanning || !panStartRef.current) return;

      e.preventDefault();

      if (panAnimationFrameRef.current !== null) {
        cancelAnimationFrame(panAnimationFrameRef.current);
      }

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      panAnimationFrameRef.current = requestAnimationFrame(() => {
        if (!panStartRef.current) return;

        const deltaX = mouseX - panStartRef.current.x;
        const deltaY = mouseY - panStartRef.current.y;
        const newViewport = {
          x: panStartRef.current.viewport.x + deltaX,
          y: panStartRef.current.viewport.y + deltaY,
          zoom: panStartRef.current.viewport.zoom,
          z: panStartRef.current.viewport.z,
        };

        // Update local ref immediately for rendering
        localViewportRef.current = newViewport;
        onViewportChange(newViewport);
        panAnimationFrameRef.current = null;
      });
    },
    [isPanning, panStartRef, panAnimationFrameRef, localViewportRef, onViewportChange]
  );

  // 结束平移
  const handlePanEnd = useCallback(() => {
    if (!isPanning) return;

    // Cancel any pending pan animation
    if (panAnimationFrameRef.current !== null) {
      cancelAnimationFrame(panAnimationFrameRef.current);
      panAnimationFrameRef.current = null;
    }
    setIsPanning(false);
    panStartRef.current = null;
  }, [isPanning, panAnimationFrameRef, setIsPanning, panStartRef]);

  // 全局鼠标移动监听（平移过程中）
  useEffect(() => {
    if (isPanning) {
      window.addEventListener("mousemove", handlePanMove);
      window.addEventListener("mouseup", handlePanEnd);
      return () => {
        window.removeEventListener("mousemove", handlePanMove);
        window.removeEventListener("mouseup", handlePanEnd);
      };
    }
  }, [isPanning, handlePanMove, handlePanEnd]);

  // Space 键监听（用于 Space + 拖拽）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        spaceKeyPressedRef.current = true;
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
          handlePanEnd();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPanning, handlePanEnd, spaceKeyPressedRef]);

  // 滚轮和触控板事件（缩放 + 平移）
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
        const zoomDelta = -e.deltaY * PINCH_DELTA_MULTIPLIER;
        const zoomFactor = Math.pow(PINCH_BASE, zoomDelta);
        const currentViewport = localViewportRef.current;
        const newZoom = Math.max(0.1, Math.min(5, currentViewport.zoom * zoomFactor));

        // Zoom towards mouse position (Figma behavior)
        const scale = newZoom / currentViewport.zoom;
        const newViewport: CanvasViewport = {
          x: mouseX - (mouseX - currentViewport.x) * scale,
          y: mouseY - (mouseY - currentViewport.y) * scale,
          zoom: newZoom,
          z: newZoom,
        };

        localViewportRef.current = newViewport;
        onViewportChange(newViewport);

        return false;
      }

      // Handle touchpad two-finger panning
      const isTwoFingerPan =
        (e.deltaX !== 0 || e.deltaY !== 0) &&
        Math.abs(e.deltaZ) < 0.1 &&
        !e.ctrlKey &&
        e.buttons === 0 &&
        e.deltaMode === 0;

      if (isTwoFingerPan) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const currentViewport = localViewportRef.current;
        const newViewport: CanvasViewport = {
          x: currentViewport.x - e.deltaX,
          y: currentViewport.y - e.deltaY,
          zoom: currentViewport.zoom,
          z: currentViewport.z,
        };

        localViewportRef.current = newViewport;
        onViewportChange(newViewport);

        return false;
      }

      // Prevent horizontal scrolling that triggers browser navigation
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 10) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const element = containerRef.current;
    if (element) {
      element.addEventListener("wheel", handleWheel, {
        passive: false,
        capture: true,
      });

      return () => {
        element.removeEventListener("wheel", handleWheel, { capture: true });
      };
    }
  }, [containerRef, localViewportRef, onViewportChange]);

  return {
    startPan,
    handlePanEnd,
  };
}

