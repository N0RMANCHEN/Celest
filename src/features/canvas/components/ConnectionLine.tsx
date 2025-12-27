/**
 * features/canvas/components/ConnectionLine.tsx
 * ----------------
 * 临时连线预览组件（拖拽过程中显示）
 */

import { calculateBezierPath } from "../utils/edgeRouting";

type Props = {
  start: { x: number; y: number };
  end: { x: number; y: number };
  isValid: boolean;
};

const baseStyle: React.CSSProperties = {
  fill: "none",
  strokeWidth: 2,
  strokeDasharray: "5,5",
  opacity: 0.7,
  pointerEvents: "none",
};

export function ConnectionLine({ start, end, isValid }: Props) {
  const path = calculateBezierPath(start, end);

  return (
    <path
      d={path.d}
      style={{
        ...baseStyle,
        stroke: isValid ? "#60a5fa" : "var(--danger, #e53935)",
      }}
      data-testid="connection-preview"
    />
  );
}


