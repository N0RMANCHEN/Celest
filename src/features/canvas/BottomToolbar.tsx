/**
 * features/canvas/BottomToolbar.tsx
 * ----------------
 * Floating bottom toolbar (Figma-like).
 * - Anchored to the canvas container (not the whole center stack), so Terminal won't overlap it.
 * - Default placement: bottom-center.
 *
 * NOTE:
 * - Tool behaviors will be wired in later P1 tasks (select/hand/connect/frame).
 */

import type { CSSProperties } from "react";

type ToolId = "select" | "hand" | "connect" | "frame";

type Props = {
  activeTool?: ToolId;
  onSelectTool?: (tool: ToolId) => void;
};

function ToolButton(props: {
  id: ToolId;
  title: string;
  active?: boolean;
  onClick?: (id: ToolId) => void;
  children: React.ReactNode;
}) {
  const { id, title, active, onClick, children } = props;
  return (
    <button
      type="button"
      className="bt__btn"
      title={title}
      aria-label={title}
      aria-pressed={active ? "true" : "false"}
      onClick={() => onClick?.(id)}
      style={{
        height: 30,
        width: 34,
        borderRadius: 10,
        border: active
          ? "1px solid rgba(17, 24, 39, 0.16)"
          : "1px solid transparent",
        background: active ? "rgba(17, 24, 39, 0.06)" : "transparent",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text)",
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return (
    <div
      className="bt__sep"
      aria-hidden="true"
      style={{
        width: 1,
        height: 18,
        background: "var(--border)",
        margin: "0 2px",
      }}
    />
  );
}

export default function BottomToolbar(props: Props) {
  const { activeTool, onSelectTool } = props;

  const rootStyle: CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: 14,
    height: 40,
    padding: "0 10px",
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "rgba(255, 255, 255, 0.92)",
    backdropFilter: "blur(10px)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    zIndex: 50,
    pointerEvents: "auto",
  };

  return (
    <div className="bottomToolbar" style={rootStyle}>
      {/* Select (dashed square) */}
      <ToolButton
        id="select"
        title="Select"
        active={activeTool === "select"}
        onClick={onSelectTool}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <rect
            x="3"
            y="3"
            width="12"
            height="12"
            rx="2.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeDasharray="2.2 1.8"
            opacity="0.9"
          />
        </svg>
      </ToolButton>

      {/* Hand */}
      <ToolButton
        id="hand"
        title="Hand (Pan)"
        active={activeTool === "hand"}
        onClick={onSelectTool}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>✋</span>
      </ToolButton>

      {/* Connect */}
      <ToolButton
        id="connect"
        title="Connect"
        active={activeTool === "connect"}
        onClick={onSelectTool}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>⇄</span>
      </ToolButton>

      <Sep />

      {/* Frame */}
      <ToolButton
        id="frame"
        title="Frame / Section"
        active={activeTool === "frame"}
        onClick={onSelectTool}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <rect
            x="3.2"
            y="3.2"
            width="11.6"
            height="11.6"
            rx="2.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            opacity="0.9"
          />
        </svg>
      </ToolButton>
    </div>
  );
}
