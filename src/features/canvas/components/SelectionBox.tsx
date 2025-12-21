/**
 * features/canvas/components/SelectionBox.tsx
 * ----------------
 * Selection box component (Figma-like box selection).
 */

type Props = {
  start: { x: number; y: number };
  end: { x: number; y: number };
  viewport: { x: number; y: number; zoom: number };
};

const boxStyle: React.CSSProperties = {
  fill: "rgba(0, 100, 255, 0.1)",
  stroke: "rgba(0, 100, 255, 0.5)",
  strokeWidth: 1,
  strokeDasharray: "4,4",
  pointerEvents: "none",
};

export function SelectionBox({ start, end, viewport }: Props) {
  // Apply viewport transform
  const screenStart = {
    x: start.x * viewport.zoom + viewport.x,
    y: start.y * viewport.zoom + viewport.y,
  };
  const screenEnd = {
    x: end.x * viewport.zoom + viewport.x,
    y: end.y * viewport.zoom + viewport.y,
  };

  const left = Math.min(screenStart.x, screenEnd.x);
  const top = Math.min(screenStart.y, screenEnd.y);
  const width = Math.abs(screenEnd.x - screenStart.x);
  const height = Math.abs(screenEnd.y - screenStart.y);

  if (width < 1 || height < 1) {
    return null;
  }

  return (
    <rect
      x={left}
      y={top}
      width={width}
      height={height}
      style={boxStyle}
      className="canvas-selection-box"
    />
  );
}

