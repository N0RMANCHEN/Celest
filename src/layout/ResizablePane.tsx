/**
 * ResizablePane.tsx
 * ----------------
 * 用途：
 *  - 可拖动分割线的容器组件，类似 Cursor 的分割线布局
 *  - 支持水平和垂直方向
 *  - 支持最小/最大尺寸限制
 *  - 持久化到 localStorage
 *
 * 对外接口：
 *  - HorizontalPane: 水平方向分割（left | divider | right）
 *  - VerticalPane: 垂直方向分割（top | divider | bottom）
 */

import { useEffect, useRef, useState } from "react";

// ==================== 水平分割面板 ====================

type HorizontalPaneProps = {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  defaultRightWidth?: number;
  minRightWidth?: number;
  maxRightWidth?: number;
  storageKey?: string;
  mode?: "left-fixed" | "right-fixed";
};

export function HorizontalPane({
  left,
  right,
  defaultLeftWidth = 280,
  minLeftWidth = 200,
  maxLeftWidth = 500,
  defaultRightWidth = 360,
  minRightWidth = 200,
  maxRightWidth = 800,
  storageKey,
  mode = "left-fixed",
}: HorizontalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const [panelSize, setPanelSize] = useState<number>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = Number(saved);
        if (Number.isFinite(parsed)) {
          const minSize = mode === "left-fixed" ? minLeftWidth : minRightWidth;
          const maxSize = mode === "left-fixed" ? maxLeftWidth : maxRightWidth;
          const defaultSize = mode === "left-fixed" ? defaultLeftWidth : defaultRightWidth;
          
          // 如果保存的值超出了新的限制范围，使用默认值
          if (parsed < minSize || parsed > maxSize) {
            localStorage.removeItem(storageKey); // 清除无效值
            return defaultSize;
          }
          return clamp(parsed, minSize, maxSize);
        }
      }
    }
    return mode === "left-fixed" ? defaultLeftWidth : defaultRightWidth;
  });

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(panelSize));
    }
  }, [panelSize, storageKey]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current || !containerRef.current) return;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        let newSize: number;
        if (mode === "left-fixed") {
          newSize = clamp(e.clientX - rect.left, minLeftWidth, maxLeftWidth);
        } else {
          const rightSize = rect.width - (e.clientX - rect.left);
          // 仅对右侧宽度做 clamp，左侧最小宽度由 CSS min-width 保障，避免跳变
          newSize = clamp(rightSize, minRightWidth, maxRightWidth);
        }
        setPanelSize(newSize);
      });
    };

    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setIsDragging(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mode, minLeftWidth, maxLeftWidth, minRightWidth, maxRightWidth]);

  return (
    <div
      ref={containerRef}
      className={`resizable-pane resizable-pane--horizontal ${
        isDragging ? "is-dragging" : ""
      }`}
    >
      {mode === "left-fixed" ? (
        <>
          <div
            className="resizable-pane__panel resizable-pane__left"
            style={{ width: panelSize }}
          >
            {left}
          </div>

          <div
            className="resizable-pane__divider resizable-pane__divider--vertical"
            onPointerDown={(e) => {
              draggingRef.current = true;
              setIsDragging(true);
              (e.currentTarget as HTMLDivElement).setPointerCapture(
                e.pointerId
              );
              e.preventDefault();
            }}
            role="separator"
            aria-orientation="vertical"
            aria-label="调整左右面板大小"
          />

          <div className="resizable-pane__panel resizable-pane__right">
            {right}
          </div>
        </>
      ) : (
        <>
          <div
            className="resizable-pane__panel resizable-pane__left"
            style={{
              flex: "1 1 auto",
              width: `calc(100% - ${panelSize}px)`,
              minWidth: minLeftWidth,
            }}
          >
            {left}
          </div>

          <div
            className="resizable-pane__divider resizable-pane__divider--vertical"
            onPointerDown={(e) => {
              draggingRef.current = true;
              setIsDragging(true);
              (e.currentTarget as HTMLDivElement).setPointerCapture(
                e.pointerId
              );
              e.preventDefault();
            }}
            role="separator"
            aria-orientation="vertical"
            aria-label="调整左右面板大小"
          />

          <div
            className="resizable-pane__panel resizable-pane__right"
            style={{ width: panelSize, minWidth: minRightWidth, maxWidth: maxRightWidth }}
          >
            {right}
          </div>
        </>
      )}
    </div>
  );
}

// ==================== 垂直分割面板 ====================

type VerticalPaneProps = {
  top: React.ReactNode;
  bottom: React.ReactNode;
  defaultTopHeight?: number;
  minTopHeight?: number;
  maxTopHeight?: number;
  storageKey?: string;
};

export function VerticalPane({
  top,
  bottom,
  defaultTopHeight = 600,
  minTopHeight = 300,
  maxTopHeight = 2000,
  storageKey,
}: VerticalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const [topHeight, setTopHeight] = useState<number>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = Number(saved);
        if (Number.isFinite(parsed)) {
          return clamp(parsed, minTopHeight, maxTopHeight);
        }
      }
    }
    return defaultTopHeight;
  });

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(topHeight));
    }
  }, [topHeight, storageKey]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current || !containerRef.current) return;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        // 确保底部面板（Terminal）也有最小高度
        const minBottomHeight = 150;
        const maxAllowedTopHeight = rect.height - minBottomHeight;
        const newHeight = clamp(
          e.clientY - rect.top,
          minTopHeight,
          Math.min(maxTopHeight, maxAllowedTopHeight)
        );
        setTopHeight(newHeight);
      });
    };

    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setIsDragging(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [minTopHeight, maxTopHeight]);

  return (
    <div
      ref={containerRef}
      className={`resizable-pane resizable-pane--vertical ${
        isDragging ? "is-dragging" : ""
      }`}
    >
      <div
        className="resizable-pane__panel resizable-pane__top"
        style={{ height: topHeight }}
      >
        {top}
      </div>

      <div
        className="resizable-pane__divider resizable-pane__divider--horizontal"
        onPointerDown={(e) => {
          draggingRef.current = true;
          setIsDragging(true);
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          e.preventDefault();
        }}
        role="separator"
        aria-orientation="horizontal"
        aria-label="调整上下面板大小"
      />

      <div className="resizable-pane__panel resizable-pane__bottom">
        {bottom}
      </div>
    </div>
  );
}

// ==================== 工具函数 ====================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

