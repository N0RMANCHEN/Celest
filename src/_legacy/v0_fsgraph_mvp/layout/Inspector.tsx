/**
 * Inspector.tsx
 * ----------------
 * 用途：
 *  - 右侧信息面板：展示选中节点的 meta 信息
 *
 * 对外接口：
 *  - default export Inspector(props)
 *  - Props:
 *    - selectedInfo: FsMeta | null
 *    - onClose: () => void
 */

import type { FsMeta } from "../services/fsGraph";

type Props = {
  selectedInfo: FsMeta | null;
  onClose: () => void;
};

export default function Inspector(props: Props) {
  return (
    <>
      <div className="inspector-head">
        <div className="inspector-title">Inspector</div>
        <button className="btn btn-ghost btn-sm" onClick={props.onClose}>
          Close
        </button>
      </div>

      <div className="inspector-body">
        <div
          className="card"
          style={{ padding: 12, background: "var(--panel-2)" }}
        >
          {props.selectedInfo ? (
            <div style={{ display: "grid", gap: 10 }}>
              <KV k="Type" v={props.selectedInfo.kind} />
              <KV k="Name" v={props.selectedInfo.name} />
              <KV k="Path" v={props.selectedInfo.path} multiline />
              <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                后续这里会升级成 Blender/Grasshopper
                风格：Inputs/Outputs、参数、帮助文档、错误与 AI 建议。
              </div>
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
              选中一个节点查看信息。
              <br />
              推荐流程：Open Folder → 文件节点 → Expand → 改代码 → Save
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: 12, padding: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 13 }}>当前区域说明</div>
          <ul style={{ margin: "8px 0 0 18px", padding: 0 }} className="muted">
            <li style={{ fontSize: 12, lineHeight: 1.8 }}>
              <b>Topbar</b>：工程动作（打开目录 / 新建 / Group / 面板开关）。
            </li>
            <li style={{ fontSize: 12, lineHeight: 1.8 }}>
              <b>Canvas</b>：节点编辑器（中键平移、滚轮缩放、左键框选）。
            </li>
            <li style={{ fontSize: 12, lineHeight: 1.8 }}>
              <b>Inspector</b>：节点属性与说明（后续放 IO/参数/文档/AI）。
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}

function KV(props: { k: string; v: string; multiline?: boolean }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 11 }}>
        {props.k}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          wordBreak: props.multiline ? "break-word" : "normal",
        }}
      >
        {props.v}
      </div>
    </div>
  );
}
