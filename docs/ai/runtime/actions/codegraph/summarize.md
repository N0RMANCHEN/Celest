# Action Prompt — CodeGraph / Summarize Selection

你将收到一个 Context Pack（JSON），其中包含 `graphKind="codegraph"` 与选中节点摘要/片段。

任务（最小可行）：
- 为选中内容生成一个新的 `note` 节点作为 Summary：
  - `kind: "note"`
  - `title: "Summary"`
  - `text`: 150–300 字中文摘要（必要时用项目术语）
- 若提供 `primaryId`：用一条 edge 连接 `primaryId -> summaryNode`
- 位置：
  - 若提供 primary position：summary 放在 primary 右侧 `(+360, 0)`
  - 若没有 position：在 `questions` 请求 bbox/placer（不要猜）

尊重 `constraints.maxNewNodes`（本 action 默认只新增 1 个节点）。

输出严格为 GraphPatch JSON（JSON only，无多余文字）。

ID 规则（稳定）：
- node id: `ai_summarize_<primaryId|hash>_1`
- edge id: `ai_e_summarize_<primaryId|hash>_1`
