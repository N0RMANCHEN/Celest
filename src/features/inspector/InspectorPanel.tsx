import type { CSSProperties, ReactElement } from "react";
import { useMemo } from "react";

import type { NodeKindSpec } from "../../entities/graph/registry";
import { getNodeSpec } from "../../entities/graph/registry";
import type { CodeGraphNode } from "../../entities/graph/types";
import type { FsMeta } from "../../entities/fsIndex/types";
import type { SaveUiState } from "../../state/types";
import MonacoEditor from "./MonacoEditor";

type Props = {
  selectedNode: CodeGraphNode | null;
  selectedFsEntry: FsMeta | null;
  saveUi: SaveUiState | null;
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

function SaveStatus({ ui }: { ui: SaveUiState | null }) {
  if (!ui) return null;
  const badge = ui.status === "saving" ? "Saving…" : ui.lastSavedAt ? "Saved" : "Idle";
  const color = ui.status === "saving" ? "var(--accent)" : "var(--border)";
  return (
    <div style={{ fontSize: 11, display: "flex", gap: 10, alignItems: "center" }}>
      <span
        style={{
          padding: "2px 8px",
          borderRadius: 0,
          border: `1px solid ${color}`,
          color,
        }}
      >
        {badge}
      </span>
      {ui.lastSavedAt ? (
        <span className="muted">Last saved: {new Date(ui.lastSavedAt).toLocaleTimeString()}</span>
      ) : null}
      {ui.status === "error" && ui.lastError ? (
        <span style={{ color: "#f87171" }}>Save failed: {ui.lastError}</span>
      ) : null}
    </div>
  );
}

function NoteInspector({
  node,
  spec,
  saveUi,
  onChangeTitle,
  onChangeNoteText,
}: {
  node: Extract<CodeGraphNode, { kind: "note" }>;
  spec: NodeKindSpec;
  saveUi: SaveUiState | null;
  onChangeTitle: (nodeId: string, title: string) => void;
  onChangeNoteText: (nodeId: string, text: string) => void;
}): ReactElement {
  const titleInputId = useMemo(() => `title-${node.id}`, [node.id]);

  return (
    <div style={nodeShellStyle}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
        <input
          id={titleInputId}
          className="input"
          value={node.title}
          onChange={(e) => onChangeTitle(node.id, e.target.value)}
          placeholder="无标题"
          style={{
            border: "none",
            background: "transparent",
            textAlign: "left",
            fontSize: 18,
            padding: "4px 0 4px 13px",
            fontWeight: 700,
            color: "var(--text)",
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
            <MonacoEditor value={node.text} onChange={(v) => onChangeNoteText(node.id, v)} height="100%" />
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
        <SaveStatus ui={saveUi} />
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
    if (props.selectedNode.kind === "note") {
      return (
        <NoteInspector
          node={props.selectedNode}
          spec={spec}
          saveUi={props.saveUi}
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
