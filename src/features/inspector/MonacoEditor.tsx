import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { CSSProperties } from "react";

const wrapperStyle: CSSProperties = {
  border: "none",
  borderRadius: 0,
  overflow: "hidden",
  background: "#f5f5f5",
  width: "100%",
  display: "flex",
};

const DEFAULT_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 13,
  fontFamily:
    '"MiSans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  wordWrap: "on",
  lineNumbers: "off",
  smoothScrolling: true,
  tabSize: 2,
  padding: { top: 8, bottom: 8 },
  automaticLayout: true,
  glyphMargin: false,
  renderLineHighlight: "none",
  renderLineHighlightOnlyWhenFocus: true,
  guides: { indentation: false },
  lineDecorationsWidth: 0,
  scrollbar: {
    vertical: "hidden",
    horizontal: "hidden",
    useShadows: false,
    alwaysConsumeMouseWheel: false,
    verticalScrollbarSize: 0,
    horizontalScrollbarSize: 0,
  },
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
        width="100%"
        defaultLanguage={language}
        value={value}
        onChange={(next) => onChange(next ?? "")}
        options={DEFAULT_OPTIONS}
        theme="vs"
      />
    </div>
  );
}
