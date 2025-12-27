/**
 * features/inspector/CodeMirrorEditor.tsx
 * ----------------
 * CodeMirror-based editor component for Inspector panel.
 * 
 * Uses @uiw/react-codemirror with markdown support.
 */

import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorView, keymap } from "@codemirror/view";
import type { CSSProperties } from "react";
import type { Extension } from "@codemirror/state";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { indentMore, indentLess } from "@codemirror/commands";
import { history, historyKeymap } from "@codemirror/commands";

const ACCENT_COLOR = "#24414E";

const wrapperStyle: CSSProperties = {
  border: "none",
  borderRadius: 0,
  overflow: "hidden",
  background: "transparent",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  minWidth: 0,
};

const editorContainerStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  width: "100%",
  height: "100%",
};

function handleEnter(): (view: EditorView) => boolean {
  return (view: EditorView) => {
    const sel = view.state.selection.main;
    if (!sel.empty) return false;
    const line = view.state.doc.lineAt(sel.from);
    const col = sel.from - line.from;
    const before = line.text.slice(0, col);
    const after = line.text.slice(col);

    // code fence completion when line is ``` and cursor at end
    if (/^\s*```/.test(line.text) && after.length === 0) {
      const insert = "\n\n```";
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert },
        selection: { anchor: sel.from + 1 },
      });
      return true;
    }

    const listMatch = before.match(/^(\s*(?:[-*+]\s+|\d+[.)]\s+|\[ \]\s+|\[x\]\s+|>\s+))/i);
    if (listMatch) {
      const prefix = listMatch[1];
      const rest = before.slice(prefix.length) + after;
      const isEmpty = rest.trim().length === 0;
      const insert = isEmpty ? "\n" : "\n" + prefix;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert },
        selection: { anchor: sel.from + insert.length },
      });
      return true;
    }
    return false;
  };
}

function toggleTask(view: EditorView, event: MouseEvent): boolean {
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
  if (pos == null) return false;
  const line = view.state.doc.lineAt(pos);
  const m = line.text.match(/^(\s*(?:[-*+]\s+|\d+[.)]\s+)?)(\[( |x|X)\])\s/);
  if (!m) return false;
  const from = line.from + m[1].length;
  const to = from + m[2].length;
  const rep = m[3].toLowerCase() === "x" ? "[ ]" : "[x]";
  view.dispatch({ changes: { from, to, insert: rep } });
  return true;
}

const editorExtensions: Extension[] = [
  markdown({ base: markdownLanguage }),
  EditorView.lineWrapping,
  // 启用历史记录功能（撤销/重做）
  history(),
  // 文本配色与基础布局
  EditorView.theme(
    {
      "&": {
        color: ACCENT_COLOR,
        backgroundColor: "transparent",
        fontFamily:
          '"MiSans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: "13px",
        lineHeight: "20px",
      },
      ".cm-editor": {
        cursor: "text",
      },
      ".cm-editor *": {
        cursor: "text",
      },
      ".cm-scroller": {
        overflow: "auto",
        overscrollBehavior: "contain",
        scrollbarGutter: "stable",
        width: "100%",
        maxWidth: "100%",
      },
      ".cm-content": {
        padding: "6px 2px 10px 2px",
        fontWeight: 400,
        fontFamily:
          '"MiSans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        backgroundColor: "transparent",
        borderLeft: "none",
        backgroundImage: "none",
        width: "100%",
        maxWidth: "100%",
        caretColor: ACCENT_COLOR,
      },
      ".cm-line": {
        paddingLeft: "0px",
        paddingRight: "0px",
        color: ACCENT_COLOR,
        fontFamily:
          '"MiSans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        width: "100%",
        maxWidth: "100%",
      },
      ".cm-placeholder": {
        color: "var(--muted)",
        opacity: 0.85,
        pointerEvents: "none",
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
  // Markdown 结构样式（基于实际类名 cm-heading / cm-quote / cm-list / cm-hr / cm-inline-code / cm-code）
  EditorView.baseTheme({
    ".cm-header.cm-header-1": {
      fontSize: "19px",
      fontWeight: 800,
      lineHeight: "1.3",
      margin: "14px 0 10px 0",
    },
    ".cm-header.cm-header-2": {
      fontSize: "18px",
      fontWeight: 760,
      lineHeight: "1.32",
      margin: "12px 0 8px 0",
    },
    ".cm-header.cm-header-3": {
      fontSize: "16px",
      fontWeight: 700,
      lineHeight: "1.34",
      margin: "10px 0 6px 0",
    },
    ".cm-header.cm-header-4": {
      fontSize: "15px",
      fontWeight: 700,
      lineHeight: "1.36",
      margin: "8px 0 4px 0",
    },
    ".cm-header.cm-header-5, .cm-header.cm-header-6": {
      fontSize: "13px",
      fontWeight: 700,
      lineHeight: "1.4",
      margin: "6px 0 4px 0",
    },
    ".cm-quote": {
      position: "relative",
      paddingLeft: "12px",
    },
    ".cm-quote:before": {
      content: '""',
      position: "absolute",
      left: "0",
      top: "0",
      bottom: "0",
      width: "3px",
      borderRadius: "2px",
      background: "rgba(36, 65, 78, 0.3)",
    },
    ".cm-list": {
      paddingLeft: "6px",
      lineHeight: "1.5",
    },
    ".cm-line.cm-list + .cm-line.cm-list": {
      marginTop: "2px",
    },
    ".cm-taskMarker": {
      border: `1px solid ${ACCENT_COLOR}`,
      width: "14px",
      height: "14px",
      borderRadius: "3px",
      marginRight: "6px",
      marginLeft: "2px",
    },
    ".cm-taskMarker-checked": {
      background: ACCENT_COLOR,
    },
    ".cm-line.cm-hr": {
      color: "transparent",
      position: "relative",
    },
    ".cm-line.cm-hr:after": {
      content: '""',
      position: "absolute",
      left: 0,
      right: 0,
      top: "50%",
      height: "1px",
      background: "rgba(36, 65, 78, 0.25)",
    },
    ".cm-inline-code": {
      background: "rgba(36, 65, 78, 0.08)",
      borderRadius: "4px",
      padding: "2px 4px",
      fontFamily: '"JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, "Courier New", monospace',
      fontSize: "12px",
    },
    ".cm-line.cm-code": {
      fontFamily: '"JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, "Courier New", monospace',
      background: "rgba(36, 65, 78, 0.04)",
      borderRadius: "4px",
      padding: "6px 10px",
      fontSize: "12px",
      margin: "2px 0",
    },
  }),
  // 语法高亮（基础颜色与 Obsidian 接近）
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: t.heading1, fontWeight: "800", fontSize: "19px" },
      { tag: t.heading2, fontWeight: "760", fontSize: "18px" },
      { tag: t.heading3, fontWeight: "700", fontSize: "16px" },
      { tag: t.heading4, fontWeight: "700", fontSize: "15px" },
      { tag: t.heading5, fontWeight: "700", fontSize: "13px" },
      { tag: t.heading6, fontWeight: "700", fontSize: "13px" },
      { tag: t.strong, fontWeight: "800" },
      { tag: t.emphasis, fontStyle: "italic" },
      { tag: t.quote, color: ACCENT_COLOR },
      { tag: t.link, color: "#1f6feb" },
      { tag: t.url, color: "#1f6feb" },
      { tag: t.keyword, color: ACCENT_COLOR },
      { tag: t.atom, color: ACCENT_COLOR },
      { tag: t.string, color: ACCENT_COLOR },
      { tag: t.comment, color: "rgba(36,65,78,0.7)" },
      { tag: t.monospace, fontFamily: '"JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, "Courier New", monospace' },
    ])
  ),
  keymap.of([
    { key: "Enter", run: handleEnter() },
    { key: "Tab", run: indentMore },
    { key: "Shift-Tab", run: indentLess },
  ]),
  // historyKeymap 包含撤销/重做的快捷键（Cmd+Z / Ctrl+Z 和 Cmd+Shift+Z / Ctrl+Shift+Z）
  keymap.of(historyKeymap),
  EditorView.domEventHandlers({
    mousedown: (event, view) => toggleTask(view, event as MouseEvent),
  }),
];

type Props = {
  value: string;
  language?: string;
  height?: number | string;
  onChange: (value: string) => void;
};

export default function CodeMirrorEditor({
  value,
  height = 220,
  onChange,
}: Props) {
  return (
    <div style={{ ...wrapperStyle, height }}>
      <style>
        {`
        .cm-editor,
        .cm-editor * {
          cursor: text !important;
        }
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
      <div style={editorContainerStyle}>
        <CodeMirror
          value={value}
          height="100%"
          style={{ width: "100%", height: "100%" }}
          extensions={editorExtensions}
          placeholder="在这里输入 Markdown…"
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
    </div>
  );
}

