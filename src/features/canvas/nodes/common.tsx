import { Handle, Position } from "@xyflow/react";

export function Port(props: {
  side: "left" | "right";
  id?: string;
  className?: string;
}) {
  const isLeft = props.side === "left";
  const id = props.id ?? (isLeft ? "in" : "out");

  return (
    <Handle
      id={id}
      type={isLeft ? "target" : "source"}
      position={isLeft ? Position.Left : Position.Right}
      className={`port ${isLeft ? "port-left" : "port-right"} ${
        props.className ?? ""
      }`}
    />
  );
}
