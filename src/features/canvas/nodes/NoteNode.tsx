import type { CSSProperties } from "react";
import { Handle, Position } from "reactflow";

import type { CanvasNodeData } from "../../../entities/graph/types";

type Props = {
  data: CanvasNodeData;
};

const cardStyle: CSSProperties = {
  padding: 10,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--panel-2)",
  minWidth: 180,
  boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
};

const titleStyle: CSSProperties = {
  fontWeight: 800,
  fontSize: 13,
  lineHeight: 1.2,
};

const subtitleStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  opacity: 0.75,
  lineHeight: 1.35,
  wordBreak: "break-word",
  maxWidth: 260,
  maxHeight: 42,
  overflow: "hidden",
};

export default function NoteNode({ data }: Props) {
  return (
    <div style={cardStyle}>
      <Handle type="target" position={Position.Left} id="in" />

      <div style={titleStyle}>📝 {data.title}</div>
      {data.subtitle ? <div style={subtitleStyle}>{data.subtitle}</div> : null}

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
