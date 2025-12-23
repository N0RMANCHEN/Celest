/**
 * features/canvas/hooks/useCanvasWheel.ts
 * ----------------
 * 处理全局 wheel 事件，阻止非 Canvas 区域的触控板缩放
 */

import { useEffect } from "react";

export function useCanvasWheel(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleGlobalWheel = (e: WheelEvent) => {
      const isPinch = e.ctrlKey || e.metaKey;
      if (!isPinch) return;

      const target = e.target as HTMLElement | null;
      const insideCanvas =
        target && (target === container || container.contains(target));

      if (!insideCanvas) {
        // 阻止浏览器在非 Canvas 区域的缩放
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("wheel", handleGlobalWheel, {
      passive: false,
      capture: true,
    });

    return () => {
      window.removeEventListener("wheel", handleGlobalWheel, { capture: true });
    };
  }, [containerRef]);
}

