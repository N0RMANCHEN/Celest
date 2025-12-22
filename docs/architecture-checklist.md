# 架构检查清单

> 目标：保证分层边界、模型分离、UI↔Domain 解耦与依赖方向正确。每次变更前后对照本清单。

## 1. 分层边界
- `entities/`：领域模型，无 React/UI 依赖
- `core/`：纯逻辑/持久化，无 React/UI 依赖
- `state/`：Zustand，不依赖 UI 引擎类型
- `features/`：用户能力，通过 adapter 连接领域与 UI
- `shell/`：壳与布局，不写领域逻辑

检查项：
- [ ] 上层未导入下层 UI 引擎类型（如 ReactFlow/Monaco）
- [ ] `entities/`、`core/` 未出现 React/DOM 依赖
- [ ] `state/` 只用契约类型（如 canvasEvents），不用 UI 引擎类型

## 2. 模型分离
- FS Index ≠ CodeGraph ≠ Knowledge Tree
- 互不直接引用坐标或路径

检查项：
- [ ] FS Index 不含画布坐标
- [ ] CodeGraph 不直接存文件系统路径（除 fileRef.path）
- [ ] Knowledge Tree 独立存储与 schema

## 3. UI ↔ Domain 解耦
- UI 只消费视图模型/事件契约
- 领域→视图转换放在 adapter 或 selector
- 交互逻辑放在纯函数（`features/canvas/core|utils`）
- 副作用集中在 `core/persistence` 或 usecase

检查项：
- [ ] UI 组件未直接导入领域模型类型
- [ ] 复杂逻辑不写在组件内
- [ ] 副作用不写在 UI 事件处理器内

## 4. 依赖方向
- UI → state → domain → core
- 不允许反向依赖

检查项：
- [ ] core 不依赖 features/shell/state
- [ ] entities 不依赖 state/features/shell

## 5. 持久化 Schema
- 版本化（`version` 字段）
- 迁移函数齐备
- 备份与错误恢复路径明确

检查项：
- [ ] schema 变更有迁移
- [ ] 读写前后有备份/校验

## 6. 代码质量
- 文件建议 <500 行，>300 行需考虑拆分
- 无明显重复逻辑（>20 行）
- 核心逻辑/纯函数有测试

## 7. 变更前检查
- [ ] 不破坏分层与依赖方向
- [ ] 不合并模型
- [ ] UI 解耦未破坏
- [ ] schema 变更已考虑迁移
- [ ] 文件大小与重复通过

## 8. 变更后验证
- [ ] `npm run build` 通过
- [ ] `npm test` 通过
- [ ] 无新增 TS/Lint 报错
- [ ] 架构检查项满足

## 9. 常见违规示例
- 在 UI 组件中直接操作 `CodeGraphNode`
- 在 state slice 中导入 ReactFlow/Monaco 类型
- 在 core 层导入 React/useEffect

