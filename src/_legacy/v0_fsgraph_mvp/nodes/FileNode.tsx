import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import type { NodeData } from "../services/fsGraph";
import { useAppStore } from "../state/store";

export default function FileNode(props: NodeProps<NodeData>) {
  const id = props.id;

  const state = useAppStore((s) => {
    const p = s.getActiveProject();
    return p?.fileState?.[id] ?? null;
  });

  const isOpen = state?.isOpen ?? false;
  const dirty = state?.dirty ?? false;

  return (
    <div className="node file-node">
      <div className="node-title">
        <span>{props.data?.title ?? "File"}</span>
        <span style={{ marginLeft: 8, opacity: 0.7, fontSize: 12 }}>
          {isOpen ? "OPEN" : "CLOSED"}
          {dirty ? " •" : ""}
        </span>
      </div>

      {/* ✅ 显式 id，避免生成 "undefined" */}
      <Handle id="in" type="target" position={Position.Left} />
      <Handle id="out" type="source" position={Position.Right} />
    </div>
  );
}
