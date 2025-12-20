import type { NodeProps } from "reactflow";
import type { NodeData } from "../services/fsGraph";

export default function GroupNode(props: NodeProps<NodeData>) {
  return (
    <div className="group-node">
      <div className="group-title">{props.data.title}</div>
    </div>
  );
}
