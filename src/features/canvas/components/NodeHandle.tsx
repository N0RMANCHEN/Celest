import type { CSSProperties } from "react";
import { HANDLE_OFFSET } from "../config/constants";
import { handleLeftStyle, handleRightStyle } from "../config/styles";

type Props = {
  side: "left" | "right";
  className?: string;
  dataNodeId: string;
  dataHandleId: string;
  dataHandleType: "source" | "target";
  isValid?: boolean;
  isConnecting?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
};

/**
 * 统一的 handle 渲染组件，应用偏移与状态样式。
 */
export function NodeHandle({
  side,
  className,
  dataNodeId,
  dataHandleId,
  dataHandleType,
  isValid = false,
  isConnecting = false,
  onMouseDown,
  onContextMenu,
}: Props) {
  const baseStyle = side === "left" ? handleLeftStyle : handleRightStyle;

  const style: CSSProperties = {
    ...baseStyle,
    border: isValid ? "2px solid var(--accent)" : baseStyle.border,
    background: isValid ? "var(--accent)" : baseStyle.background,
    opacity: isConnecting ? 0.9 : 1,
  };

  return (
    <div
      style={style}
      className={`canvas-handle ${className ?? ""}`.trim()}
      data-node-id={dataNodeId}
      data-handle-id={dataHandleId}
      data-handle-type={dataHandleType}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
    />
  );
}

/**
 * 提供 handle 圆心在 canvas 坐标系中的偏移量。
 */
export const handleOffset = HANDLE_OFFSET;


