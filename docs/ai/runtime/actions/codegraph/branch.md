# Action Prompt — CodeGraph / Branch Next Steps

你将收到一个 Context Pack（JSON），其中包含 `graphKind="codegraph"` 与选中节点摘要。

任务：
- 从 `primaryId` 生成 2–4 个分支节点（`note`）：
  - `title`: 分支标题（短）
  - `text`: 该分支要做什么/要回答什么（1–3 行）
- 用 edge 逐个连接 `primaryId -> branchNode`
- 位置：在 primary 右侧竖排：x = primary.x + 360；y = primary.y + i*160
- 尊重 `constraints.maxNewNodes`

如果缺少 `primaryId` 或 primary position：在 `questions` 请求补全，不要猜。

输出严格为 GraphPatch JSON。

ID 规则（稳定）：
- node id: `ai_branch_<primaryId|hash>_<i>`
- edge id: `ai_e_branch_<primaryId|hash>_<i>`
