import type { CSSProperties } from "react";
import { Handle, Position } from "@xyflow/react";

import { getNodeSpec } from "../../../entities/graph/registry";
import type { CanvasNodeData } from "../types";

const boxStyle: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.04)",
  minWidth: 220,
  boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
};

const titleStyle: CSSProperties = {
  fontWeight: 900,
  fontSize: 12,
  opacity: 0.9,
};

const descStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  opacity: 0.7,
  lineHeight: 1.35,
};

type Props = {
  data: CanvasNodeData;
};

export default function SubgraphNode({ data }: Props) {
  const spec = getNodeSpec("subgraphInstance");

  return (
    <div style={boxStyle}>
      <Handle type="target" position={Position.Left} id="input" />
      <Handle type="source" position={Position.Right} id="output" />

      <div style={titleStyle}>{`${spec.icon} Subgraph — ${data.title}`}</div>
      <div style={descStyle}>
        占位：稍后接入真实子图定义（{data.subtitle ?? "未指定"}）。
      </div>
    </div>
  );
}
