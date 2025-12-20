import type { NodeProps } from "reactflow";
import type { NodeData } from "../services/fsGraph";
import { Port } from "./common";

export default function DirNode(props: NodeProps<NodeData>) {
  return (
    <div className="node node-dir">
      <Port side="left" id="in" />
      <Port side="right" id="out" />

      <div className="node-head">
        <div className="node-title">{props.data.title}</div>
        <div className="node-sub">{props.data.path}</div>
      </div>

      <div className="node-io muted">IO: in(parent dir) → out(dir handle)</div>
    </div>
  );
}
