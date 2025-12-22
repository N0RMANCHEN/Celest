import type { CSSProperties } from "react";

type Props = {
  depthFactor?: number;
  offsetX?: number;
  offsetY?: number;
};

export function CanvasBackground({ depthFactor = 1, offsetX = 0, offsetY = 0 }: Props) {
  const size = 40 * depthFactor;
  const patternId = "canvas-bg-pattern";
  const patternStyle: CSSProperties = {
    width: "100%",
    height: "100%",
  };

  return (
    <g>
      <pattern
        id={patternId}
        x={offsetX}
        y={offsetY}
        width={size}
        height={size}
        patternUnits="userSpaceOnUse"
      >
        <rect width={size} height={size} fill="var(--canvas-bg, #0b0f12)" />
        <path
          d={`M ${size} 0 L 0 0 0 ${size}`}
          fill="none"
          stroke="var(--canvas-grid, rgba(255,255,255,0.05))"
          strokeWidth="1"
        />
      </pattern>
      <rect width="100%" height="100%" style={patternStyle} fill={`url(#${patternId})`} />
    </g>
  );
}


