/**
 * BottomToolbar.tsx
 * ----------------
 * 用途：
 *  - 主画布底部的“悬浮工具条”（Figma-like）
 *  - 目前只做占位与基础按钮，后续可扩展 AI 输入框、节点创建等
 *
 * 对外接口：
 *  - default export BottomToolbar()
 */

export default function BottomToolbar() {
  return (
    <div className="bottomToolbar" role="toolbar" aria-label="Tools">
      <button className="bt__btn" title="Select">
        ⬚
      </button>
      <button className="bt__btn" title="Pan">
        ✋
      </button>
      <button className="bt__btn" title="Connect">
        ⇄
      </button>
      <span className="bt__sep" />
      <button className="bt__btn" title="Frame / Group">
        ☐
      </button>
    </div>
  );
}
