import { GRID_DOT_RADIUS_BASE, GRID_DOT_SPACING_BASE } from "../config/constants";

type Props = {
  depthFactor: number;
  offsetX: number;
  offsetY: number;
};

/**
 * 背景点阵，提取为独立组件便于维护。
 */
export function CanvasBackground({ depthFactor, offsetX, offsetY }: Props) {
  const dotSpacing = GRID_DOT_SPACING_BASE * depthFactor;
  const dotRadius = Math.max(GRID_DOT_RADIUS_BASE, Math.sqrt(depthFactor));

  return (
    <defs>
      <pattern
        id="dot-pattern"
        x={offsetX}
        y={offsetY}
        width={dotSpacing}
        height={dotSpacing}
        patternUnits="userSpaceOnUse"
      >
        <circle
          cx={dotRadius}
          cy={dotRadius}
          r={dotRadius}
          fill="#d1d5db"
          opacity="0.5"
        />
      </pattern>
    </defs>
  );
}


