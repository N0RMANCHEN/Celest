import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import type { CSSProperties } from "react";
import type { Extension } from "@codemirror/state";

const ACCENT_COLOR = "#24414E";

const wrapperStyle: CSSProperties = {
  border: "none",
  borderRadius: 0,
  overflow: "hidden",
  background: "#f5f5f5",
  width: "100%",
  display: "flex",
};

const editorExtensions: Extension[] = [
  markdown(),
  EditorView.lineWrapping,
  EditorView.theme(
    {
      "&": {
        color: ACCENT_COLOR,
        backgroundColor: "#f5f5f5",
        fontFamily:
          '"MiSans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: "13px",
        lineHeight: "20px",
      },
      ".cm-scroller": {
        overflow: "auto",
        overscrollBehavior: "contain",
        scrollbarGutter: "stable",
      },
      ".cm-content": {
        padding: "6px 0 10px 0",
        fontWeight: 400,
        fontFamily:
          '"MiSans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      },
      ".cm-line": {
        paddingLeft: "0px",
        paddingRight: "0px",
        color: ACCENT_COLOR,
        fontFamily:
          '"MiSans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      },
      ".cm-selectionBackground": {
        backgroundColor: "rgba(36, 65, 78, 0.08)",
      },
      ".cm-selectionMatch": {
        backgroundColor: "transparent",
        outline: "none",
      },
      ".cm-activeLine": {
        backgroundColor: "transparent",
      },
      ".cm-matchingBracket, .cm-nonmatchingBracket": {
        backgroundColor: "transparent",
        outline: "none",
      },
      ".cm-cursor": {
        borderLeft: "1px solid " + ACCENT_COLOR,
      },
      ".cm-gutters": {
        display: "none",
      },
    },
    { dark: false }
  ),
];

type Props = {
  value: string;
  language?: string;
  height?: number | string;
  onChange: (value: string) => void;
};

export default function MonacoEditor({
  value,
  height = 220,
  onChange,
}: Props) {
  return (
    <div style={{ ...wrapperStyle, height }}>
      <style>
        {`
        .cm-scroller::-webkit-scrollbar {
          width: 8px;
          height: 8px;
          background: transparent;
        }
        .cm-scroller::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.8);
          border-radius: 6px;
        }
        .cm-scroller::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.91);
        }
        .cm-scroller {
          scrollbar-width: thin;
        }
        `}
      </style>
      <CodeMirror
        value={value}
        height="100%"
        extensions={editorExtensions}
        basicSetup={{
          lineNumbers: false,
          highlightActiveLine: false,
          foldGutter: false,
          bracketMatching: false,
          autocompletion: false,
        }}
        onChange={(next) => onChange(next)}
      />
    </div>
  );
}
