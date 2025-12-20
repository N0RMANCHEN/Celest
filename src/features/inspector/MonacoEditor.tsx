import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { CSSProperties } from "react";

const wrapperStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  overflow: "hidden",
  background: "var(--panel)",
};

const DEFAULT_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 13,
  wordWrap: "on",
  lineNumbers: "off",
  smoothScrolling: true,
  tabSize: 2,
  padding: { top: 8, bottom: 8 },
  automaticLayout: true,
};

type Props = {
  value: string;
  language?: string;
  height?: number | string;
  onChange: (value: string) => void;
};

export default function MonacoEditor({
  value,
  language = "markdown",
  height = 220,
  onChange,
}: Props) {
  return (
    <div style={{ ...wrapperStyle, height }}>
      <Editor
        height="100%"
        defaultLanguage={language}
        value={value}
        onChange={(next) => onChange(next ?? "")}
        options={DEFAULT_OPTIONS}
        theme="vs-dark"
      />
    </div>
  );
}
