# Celest 架构与路线概览

## 产品定位与目标
- Local-first 图式工作台 / Node IDE：用 Figma-like Shell + 无限画布组织项目结构、知识与工作流。
- 运行环境：纯 Web（浏览器），依赖 File System Access API；状态与图数据写入项目根目录 `/.celest/`。
- 原则：Graph 为源；AI 仅做加速，不持久化隐藏状态。

## 分层与职责
- `entities/`：领域模型（Graph / Project / FS Index），无 UI 依赖。
- `core/`：纯逻辑与持久化（如 `persistence/`），无 React 依赖。
- `state/`：Zustand 单 store，多 slice；不直接依赖 UI 引擎类型。
- `features/`：用户能力（canvas、fsIndex、inspector、project、terminal、views）；通过 adapter 连接领域模型与 UI。
- `shell/`：Figma-like 应用壳与布局装配；不写领域逻辑。
- `shared/`：通用样式与复用组件。
- 硬性边界：FS Index ≠ CodeGraph ≠ Knowledge Tree；UI ≠ Domain ≠ Persistence。

## 核心数据模型（Phase 1）
- CodeGraph：节点类型（note/fileRef/frame/group/subgraphInstance），边 source/target，可扩展 handles；位置坐标及 viewport 独立。
- FS Index：文件/文件夹导航树，仅导航，不等同画布。
- Workspace / Graph 持久化：版本化 JSON，存于 `/.celest/workspace.json` 与 `/.celest/graphs/main.json`；支持备份与迁移。

## 关键模块速览
- 画布（`features/canvas/*`）：自定义 SVG 渲染，交互包含选中、框选、拖拽、平移、缩放、双击创建；通过 `codeGraphToCanvas` adapter 解耦领域模型。
- 持久化（`core/persistence/*`）：load/save、迁移、备份、错误恢复；固定写入 `/.celest/`。
- 项目打开（`features/project/*`）：File System Access API 入口，处理迁移与视图种子数据。
- 状态（`state/*`）：切片化 store，selectors 辅助 UI；保持纯逻辑。
- Inspector（`features/inspector/*`）：Monaco 编辑并写回真实文件（Phase 1 面向 `.md`）。
- Terminal（`features/terminal/*`）：占位组件，预留扩展。

## 未来预期与路线摘要
- P0 稳定性：完善自定义画布系统，确保交互/性能/边界可靠。
- P1 Backlog：多选完善、Inspector Delete 按钮、Monaco 语言映射。
- P2 核心能力：FS Mirror Graph（文件⇄节点/Frame 映射、懒加载）、Frame 容器行为、折叠聚合端口、Subgraph 占位、Knowledge Tree 模式。
- P3 工程护栏：架构健康检查清单，防止跨层耦合与 schema 倒退。
- P4 UI/UX：视觉统一、交互细节和空/加载状态优化。

## 回归检查（轻量清单）
- `npm run dev` 可启动；File System Access API 缺失时有兜底提示。
- 打开项目：能生成/读取 `/.celest/`，旧 `.nodeide/` 自动迁移且保留备份。
- 画布：点击/框选/拖拽/平移/缩放/双击创建正常；选中态即时同步 store。
- Inspector：可读取与写回 `.md`（或其他文本）；无异常抛出。
- 备份与迁移：损坏文件可恢复或提示；版本迁移成功写入新 schema。

## 测试优先级建议
1) `core/persistence/`：load/save、migration、backup、错误路径与 NotFound 兜底。
2) `entities/graph/`：ops 与约束。
3) `features/fsIndex/`：扫描与 ignore 规则。
4) `state/selectors/` 与关键 slices：纯逻辑分支。
5) `features/canvas/core/` 的几何/选择/视口算法（避开 DOM）。

