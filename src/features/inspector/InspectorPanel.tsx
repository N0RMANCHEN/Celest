import type { CSSProperties, ReactElement } from "react";
import { useMemo, useRef, useEffect } from "react";

import type { NodeKindSpec } from "../../entities/graph/registry";
import { getNodeSpec } from "../../entities/graph/registry";
import type { FsMeta } from "../../entities/fsIndex/types";
import type { InspectorNodeViewModel } from "./types";
import CodeMirrorEditor from "./CodeMirrorEditor";

function isNoteViewModel(
  node: InspectorNodeViewModel | null
): node is InspectorNodeViewModel & { kind: "note"; text: string } {
  return Boolean(node && node.kind === "note" && typeof node.text === "string");
}

type Props = {
  selectedNode: InspectorNodeViewModel | null;
  selectedFsEntry: FsMeta | null;
  onChangeTitle: (nodeId: string, title: string) => void;
  onChangeNoteText: (nodeId: string, text: string) => void;
  onChangeFilePath: (nodeId: string, path: string) => void;
};

const nodeShellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  height: "100%",
  flex: 1,
  minHeight: 0,
  padding: "12px 16px 12px 11px",
  background: "var(--panel)",
};

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  height: "100%",
  flex: 1,
  minHeight: 0,
  padding: "12px 16px 12px 11px",
  background: "var(--panel)",
};

const contentStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  overflow: "hidden",
};

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <div style={{ fontSize: 14, fontWeight: 900 }}>{title}</div>
      {subtitle ? (
        <div style={{ fontSize: 11, opacity: 0.75 }} className="muted">
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function PortList({ spec }: { spec: NodeKindSpec }) {
  if (!spec.ports.length) return null;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div className="muted" style={{ fontSize: 11 }}>
        Ports
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {spec.ports.map((p) => (
          <span
            key={p.id}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 0,
              padding: "4px 8px",
              fontSize: 11,
              background: "var(--panel-2)",
            }}
          >
            {p.direction === "in" ? "⬅" : "➡"} {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

type NoteInspectorProps = {
  node: InspectorNodeViewModel & { kind: "note"; text: string };
  spec: NodeKindSpec;
  onChangeTitle: (nodeId: string, title: string) => void;
  onChangeNoteText: (nodeId: string, text: string) => void;
};

function NoteInspector({
  node,
  spec,
  onChangeTitle,
  onChangeNoteText,
}: NoteInspectorProps): ReactElement {
  const titleInputId = useMemo(() => `title-${node.id}`, [node.id]);
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 自动调整 textarea 高度以适应内容
  useEffect(() => {
    const textarea = titleTextareaRef.current;
    if (textarea) {
      // 重置高度为 auto，然后设置为 scrollHeight，确保所有内容可见
      // 使用 requestAnimationFrame 确保在 DOM 更新后计算
      requestAnimationFrame(() => {
        if (textarea) {
          textarea.style.height = "auto";
          const newHeight = textarea.scrollHeight;
          textarea.style.height = `${newHeight}px`;
        }
      });
    }
  }, [node.title]);

  return (
    <div style={nodeShellStyle}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, width: "100%" }}>
        <textarea
          ref={titleTextareaRef}
          id={titleInputId}
          className="input"
          value={node.title}
          onChange={(e) => onChangeTitle(node.id, e.target.value)}
          placeholder="无标题"
          rows={1}
          style={{
            border: "none",
            background: "transparent",
            textAlign: "left",
            fontSize: 18,
            padding: "4px 0 4px 13px",
            fontWeight: 700,
            color: "var(--text)",
            width: "100%",
            resize: "none",
            overflow: "hidden",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            minHeight: "1.4em",
            lineHeight: "1.4",
          }}
          onInput={(e) => {
            // 自动调整高度以适应内容，确保所有文字可见
            const target = e.target as HTMLTextAreaElement;
            // 使用 requestAnimationFrame 确保在 DOM 更新后计算
            requestAnimationFrame(() => {
              target.style.height = "auto";
              const newHeight = target.scrollHeight;
              target.style.height = `${newHeight}px`;
            });
          }}
        />
      </div>

      <div style={contentStyle}>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 320,
              display: "flex",
              paddingLeft: 11,
              paddingRight: 4,
              marginLeft: 0,
            }}
          >
            <CodeMirrorEditor
            value={node.text ?? ""}
              onChange={(v: string) => onChangeNoteText(node.id, v)}
            height="100%"
          />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "8px 12px 0",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ minHeight: 28 }}>
          <PortList spec={spec} />
        </div>
      </div>
    </div>
  );
}

function FileInspector({
  entry,
}: {
  entry: FsMeta;
}): ReactElement {
  return (
    <div style={sectionStyle}>
      <Header title="Inspector" subtitle={entry.id} />
      <div className="muted" style={{ fontSize: 12, lineHeight: 1.7 }}>
        <div>类型：{entry.kind}</div>
        <div>名称：{entry.name}</div>
        <div>路径：{entry.path}</div>
      </div>
    </div>
  );
}

function EmptyInspector(): ReactElement {
  return (
    <div style={sectionStyle}>
      <Header title="Inspector" />
      <div className="muted" style={{ fontSize: 12, lineHeight: 1.7 }}>
        选中 Canvas 节点或左侧文件查看详情。Note 节点支持在此直接编辑 Markdown。
      </div>
    </div>
  );
}

export default function InspectorPanel(props: Props) {
  const spec = props.selectedNode ? getNodeSpec(props.selectedNode.kind) : null;

  if (props.selectedNode && spec) {
    if (isNoteViewModel(props.selectedNode)) {
      return (
        <NoteInspector
          node={props.selectedNode}
          spec={spec}
          onChangeTitle={props.onChangeTitle}
          onChangeNoteText={props.onChangeNoteText}
        />
      );
    }
    return (
      <div style={sectionStyle}>
        <Header title={`${spec.icon} ${spec.label}`} subtitle={props.selectedNode.id} />
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.7 }}>
          <div>类型：{props.selectedNode.kind}</div>
        </div>
      </div>
    );
  }

  if (props.selectedFsEntry) {
    return <FileInspector entry={props.selectedFsEntry} />;
  }

  return <EmptyInspector />;
}
