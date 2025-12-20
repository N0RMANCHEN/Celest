/**
 * TerminalPanel.tsx
 * ----------------
 * 用途：
 *  - 主画布底部的 Terminal 面板占位（未来可对接 dev server/任务/日志）
 *  - 现在只提供 UI 容器与基本样式
 *
 * 对外接口：
 *  - default export TerminalPanel()
 */

export default function TerminalPanel() {
  return (
    <div className="terminal">
      <div className="terminal__head">Terminal</div>
      <div className="terminal__body">
        <div className="terminal__line">$ (placeholder) future logs...</div>
      </div>
    </div>
  );
}
