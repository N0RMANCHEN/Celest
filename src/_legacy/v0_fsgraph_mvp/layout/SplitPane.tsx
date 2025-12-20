/**
 * SplitPane.tsx
 * ----------------
 * 用途：
 *  - 两栏分割布局：左侧自适应，右侧固定宽度，可拖拽调整。
 *  - 右栏宽度持久化到 localStorage（可选）。
 *  - 提供 is-dragging class 给 CSS 做 OKX-ish 的“克制 hover / 手柄”。
 *
 * 对外接口：
 *  - default export SplitPane(props)
 *  - Props:
 *    - left/right: ReactNode
 *    - defaultRightWidth/minRightWidth/maxRightWidth
 *    - storageKey: 用于持久化右栏宽度
 */

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultRightWidth: number;
  minRightWidth: number;
  maxRightWidth: number;
  storageKey: string;
};

export default function SplitPane(props: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const initial = useMemo(() => {
    const raw = localStorage.getItem(props.storageKey);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n))
      return clamp(n, props.minRightWidth, props.maxRightWidth);
    return clamp(
      props.defaultRightWidth,
      props.minRightWidth,
      props.maxRightWidth
    );
  }, [
    props.storageKey,
    props.defaultRightWidth,
    props.minRightWidth,
    props.maxRightWidth,
  ]);

  const [rightWidth, setRightWidth] = useState<number>(initial);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    localStorage.setItem(props.storageKey, String(rightWidth));
  }, [props.storageKey, rightWidth]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const root = rootRef.current;
      if (!root) return;

      // 用 rAF 避免 pointermove 太频繁导致卡顿
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = root.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newRight = clamp(
          rect.width - x,
          props.minRightWidth,
          props.maxRightWidth
        );
        setRightWidth(newRight);
      });
    };

    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [props.minRightWidth, props.maxRightWidth]);

  return (
    <div
      ref={rootRef}
      className={`split-root${dragging ? " is-dragging" : ""}`}
    >
      <div className="split-left">{props.left}</div>

      <div
        className="split-divider"
        onPointerDown={(e) => {
          draggingRef.current = true;
          setDragging(true);

          // 避免选中文本/拖拽图片 + 保证持续接收事件
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          e.preventDefault();
        }}
        aria-label="Resize panels"
        role="separator"
      />

      <div className="split-right" style={{ width: rightWidth }}>
        {props.right}
      </div>
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
