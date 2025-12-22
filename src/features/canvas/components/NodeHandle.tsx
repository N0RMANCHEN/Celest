import type { CSSProperties } from "react";

type Props = {
  side: "left" | "right";
  className?: string;
  dataNodeId?: string;
  dataHandleId?: string;
  dataHandleType?: "source" | "target";
  isValid?: boolean;
  isConnecting?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
};

export function NodeHandle({
  side,
  className = "",
  dataNodeId,
  dataHandleId,
  dataHandleType,
  isValid,
  isConnecting,
  onMouseDown,
}: Props) {
  const base: CSSProperties = {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: "50%",
    border: "2px solid var(--border)",
    background: "var(--panel)",
    cursor: "crosshair",
    zIndex: 10,
    transition: "transform 0.15s ease, border-color 0.15s ease",
    willChange: "transform",
    opacity: isConnecting ? 0.9 : 1,
  };

  const positionStyle: CSSProperties =
    side === "left"
      ? { left: -6, top: "50%", transform: "translateY(-50%)" }
      : { right: -6, top: "50%", transform: "translateY(-50%)" };

  const visual: CSSProperties = isValid
    ? { border: "2px solid var(--accent)", background: "var(--accent)" }
    : {};

  return (
    <div
      className={`canvas-handle ${className}`.trim()}
      style={{ ...base, ...positionStyle, ...visual }}
      data-node-id={dataNodeId}
      data-handle-id={dataHandleId}
      data-handle-type={dataHandleType}
      onMouseDown={onMouseDown}
    />
  );
}


