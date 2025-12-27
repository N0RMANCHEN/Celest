# Action Prompt — Knowledge / Summarize Node

目标：为选中知识节点生成/更新 `summary` 字段（或创建一个 summary note 节点，取决于 app 的知识模型）。

要求：
- 严格输出 GraphPatch JSON
- 尊重 constraints（最大新增节点数、是否允许删除等）
- 若知识模型字段不明：在 questions 里请求 app 提供字段说明
