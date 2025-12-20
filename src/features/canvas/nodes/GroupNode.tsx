import type { CSSProperties } from "react";

import { getNodeSpec } from "../../../entities/graph/registry";
import type { CanvasNodeData } from "../types";

type Props = {
  data: CanvasNodeData;
};

const boxStyle: CSSProperties = {
  padding: 10,
  borderRadius: 12,
  border: "1px dashed var(--border)",
  background: "rgba(255,255,255,0.02)",
  minWidth: 200,
};

const titleStyle: CSSProperties = {
  fontWeight: 900,
  fontSize: 12,
  opacity: 0.85,
};

export default function GroupNode({ data }: Props) {
  const spec = getNodeSpec("group");

  return (
    <div style={boxStyle}>
      <div style={titleStyle}>{`${spec.icon} Group — ${data.title}`}</div>
    </div>
  );
}
