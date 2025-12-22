import type { CSSProperties } from "react";
import { HANDLE_OFFSET } from "./constants";

/** 节点卡片基础样式 */
export const cardStyle: CSSProperties = {
  padding: 10,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--panel-2)",
  minWidth: 180,
  boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
  position: "relative",
  cursor: "grab",
  userSelect: "none",
  transition: "box-shadow 0.15s ease, border-color 0.15s ease",
  willChange: "transform",
};

const SELECT_COLOR = "#B8C0C3";

export const selectedCardStyle: CSSProperties = {
  ...cardStyle,
  background: "var(--panel)",
  border: "0.7px solid " + SELECT_COLOR,
  boxShadow: "0 6px 20px rgba(0,0,0,0.16), 0 0 0 0.7px " + SELECT_COLOR,
  cursor: "grab",
};

export const titleStyle: CSSProperties = {
  fontWeight: 800,
  fontSize: 13,
  lineHeight: 1.2,
};

export const subtitleStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  opacity: 0.75,
  lineHeight: 1.35,
  wordBreak: "break-word",
  maxWidth: 260,
  maxHeight: 42,
  overflow: "hidden",
};

export const portRowStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  marginTop: 8,
  flexWrap: "wrap",
};

export const portBadgeStyle: CSSProperties = {
  fontSize: 10,
  padding: "3px 6px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "rgba(255,255,255,0.06)",
};

export const handleBaseStyle: CSSProperties = {
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
};

export const handleLeftStyle: CSSProperties = {
  ...handleBaseStyle,
  left: -HANDLE_OFFSET,
  top: "50%",
  transform: "translateY(-50%)",
};

export const handleRightStyle: CSSProperties = {
  ...handleBaseStyle,
  right: -HANDLE_OFFSET,
  top: "50%",
  transform: "translateY(-50%)",
};


