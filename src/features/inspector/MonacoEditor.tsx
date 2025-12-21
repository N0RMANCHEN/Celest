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
  fontWeight: "400",
  lineHeight: 20,
  wordWrap: "on",
  lineNumbers: "off",
  smoothScrolling: true,
  tabSize: 2,
  padding: { top: 6, bottom: 10 },
  automaticLayout: true,
  glyphMargin: false,
  renderLineHighlight: "none",
  renderLineHighlightOnlyWhenFocus: true,
  guides: { indentation: false },
  lineDecorationsWidth: 0,
  renderWhitespace: "none",
  matchBrackets: "never",
  selectionHighlight: false,
  occurrencesHighlight: "off",
  scrollbar: {
    vertical: "hidden",
    horizontal: "hidden",
    useShadows: false,
    alwaysConsumeMouseWheel: false,
    verticalScrollbarSize: 0,
    horizontalScrollbarSize: 0,
  },
};

const ACCENT_COLOR = "#24414E";

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
      <style>
        {`
        .monaco-editor,
        .monaco-editor .margin,
        .monaco-editor .mtk1,
        .monaco-editor .mtk2,
        .monaco-editor .mtk3,
        .monaco-editor .mtk4,
        .monaco-editor .mtk5,
        .monaco-editor .mtk6,
        .monaco-editor .mtk7,
        .monaco-editor .mtk8,
        .monaco-editor .mtk9 {
          color: ${ACCENT_COLOR};
        }
        .monaco-editor .view-line > span {
          color: ${ACCENT_COLOR};
        }
        /* 柔和的选区效果，避免深灰大片 */
        .monaco-editor .selected-text {
          background: rgba(36, 65, 78, 0.08) !important;
        }
        .monaco-editor .view-lines span::selection {
          background: rgba(36, 65, 78, 0.08) !important;
          color: ${ACCENT_COLOR};
        }
        .monaco-editor .selectionHighlight {
          background: transparent !important;
        }
        /* 去掉括号匹配的方框 */
        .monaco-editor .bracket-match {
          background: transparent !important;
          border: none !important;
        }
        `}
      </style>
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
