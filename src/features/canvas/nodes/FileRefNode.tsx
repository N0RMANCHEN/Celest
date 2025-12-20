import type { CSSProperties } from "react";
import { Handle, Position } from "@xyflow/react";

import { getNodeSpec } from "../../../entities/graph/registry";
import type { CanvasNodeData } from "../../../entities/graph/types";

type Props = {
  data: CanvasNodeData;
};

const cardStyle: CSSProperties = {
  padding: 10,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--panel)",
  minWidth: 220,
  boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
  position: "relative",
};

const titleStyle: CSSProperties = {
  fontWeight: 800,
  fontSize: 13,
  lineHeight: 1.2,
};

const pathStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  opacity: 0.75,
  lineHeight: 1.35,
  wordBreak: "break-word",
  maxWidth: 320,
  maxHeight: 42,
  overflow: "hidden",
};

const portRowStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  marginTop: 8,
  flexWrap: "wrap",
};

const portBadgeStyle: CSSProperties = {
  fontSize: 10,
  padding: "3px 6px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "rgba(255,255,255,0.06)",
};

export default function FileRefNode({ data }: Props) {
  const spec = getNodeSpec("fileRef");

  return (
    <div style={cardStyle}>
      <Handle
        type="target"
        position={Position.Left}
        id={spec.ports[0]?.id ?? "in"}
      />

      <div style={titleStyle}>📄 {data.title}</div>
      {data.subtitle ? <div style={pathStyle}>{data.subtitle}</div> : null}

      <div style={portRowStyle}>
        {spec.ports.map((p) => (
          <span key={p.id} style={portBadgeStyle}>
            {p.direction === "in" ? "⬅" : "➡"} {p.label}
          </span>
        ))}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id={spec.ports[1]?.id ?? "out"}
      />
    </div>
  );
}
