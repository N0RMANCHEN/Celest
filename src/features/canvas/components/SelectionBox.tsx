/**
 * features/canvas/components/SelectionBox.tsx
 * ----------------
 * Selection box component (Figma-like box selection).
 * Optimized for performance with direct canvas coordinates.
 */

type Props = {
  start: { x: number; y: number };
  end: { x: number; y: number };
  viewport: { x: number; y: number; zoom: number };
};

const boxStyle: React.CSSProperties = {
  fill: "rgba(24, 144, 255, 0.08)", // Figma-like blue with low opacity
  stroke: "rgba(24, 144, 255, 0.6)", // Brighter blue border
  strokeWidth: 1.5, // Slightly thicker for visibility
  pointerEvents: "none",
};

export function SelectionBox({ start, end }: Props) {
  // Work directly in canvas coordinates (no viewport transform needed - handled by parent <g>)
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  // Don't render if box is too small (avoid visual noise)
  if (width < 2 || height < 2) {
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

