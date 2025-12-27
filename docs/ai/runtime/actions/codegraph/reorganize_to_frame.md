# Action Prompt — CodeGraph / Reorganize into a Frame

你将收到一个 Context Pack（JSON），包含 selection、nodes、可选 bbox。

任务（最小可行）：
- 新增一个 `frame` 节点作为容器（title 自拟，例如 “Draft Structure”）
- 将选中节点的位置调整到 frame 区域内（仅做几何整理，不改节点内容）
- 不创建/删除边（除非 `constraints.allowEdges=true` 且用户明确要求）

位置规则（确定性）：
- 若提供 bbox：frame 放在 bbox 左上角偏移 `(-80, -80)`，宽高 = bbox + 160 margin
- 若 bbox 缺失：在 `questions` 请求 bbox/placer；不要猜

输出严格为 GraphPatch JSON。

ID 规则：
- frame id: `ai_frame_<primaryId|hash>_1`
