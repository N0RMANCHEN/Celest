import { useState } from "react";
import type { CSSProperties } from "react";

type Props = {
  side: "left" | "right";
  className?: string;
  dataNodeId?: string;
  dataHandleId?: string;
  dataHandleType?: "source" | "target";
  isValid?: boolean;
  isConnecting?: boolean;
  isNodeSelected?: boolean;
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
  isNodeSelected,
  onMouseDown,
}: Props) {
  const [isHovered, setIsHovered] = useState(false);

  const base: CSSProperties = {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: "50%",
    border: "2px solid var(--border)",
    background: "var(--panel)",
    cursor: "crosshair",
    zIndex: 10,
    transition: "border-color 0.15s ease, background-color 0.15s ease",
    willChange: "transform",
    opacity: isConnecting ? 0.9 : 1,
  };

  const positionStyle: CSSProperties =
    side === "left"
      ? { left: -6, top: "50%", transform: "translateY(-50%)" }
      : { right: -6, top: "50%", transform: "translateY(-50%)" };

  // 连接时的端点：描边 #60a5fa，填充 #b3d5ff（和初始端点一致）
  const visual: CSSProperties = isValid
    ? { border: "2px solid #60a5fa", background: "#b3d5ff" }
    : {};

  // Hover 效果：改变颜色为淡蓝色（不放大，无阴影）
  // 选中时端点的 hover：边框和填充都使用 #60a5fa
  // 未选中时端点的 hover：边框使用 #60a5fa，填充使用 #b3d5ff
  // 连接时的端点 hover：保持描边 #60a5fa，填充 #b3d5ff
  const hoverStyle: CSSProperties = isHovered
    ? {
        border: isValid
          ? "2px solid #60a5fa"
          : "2px solid #60a5fa",
        background: isValid
          ? "#b3d5ff"
          : isNodeSelected
            ? "#60a5fa"
            : "#b3d5ff",
      }
    : {};

  return (
    <div
      className={`canvas-handle ${className}`.trim()}
      style={{ ...base, ...positionStyle, ...visual, ...hoverStyle }}
      data-node-id={dataNodeId}
      data-handle-id={dataHandleId}
      data-handle-type={dataHandleType}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    />
  );
}


