# Celest

Celest 是一个 **local-first 的图式工作台 / Node IDE**：用 **Figma-like Shell + 无限画布 Canvas** 来组织项目结构、知识与工作流。  
Phase 1 目标是一个纯 Web（浏览器）MVP：用 **File System Access API** 打开本地项目文件夹，把工作区状态持久化写回项目根目录的 `/.celest/`。

> ⚠️ 铁律：本仓库的协作与改动必须严格遵守 `AGENT.md` 与 `CONTRIBUTING_AI.md`。  
> 任何未来修改都应遵循：**一次只改一个文件 / 给出可复制粘贴的完整文件内容 / 旧代码只移动到 `src/_legacy` 不删除。**

---

## 产品定位

- **外壳（Shell）**：Top Tabs（Home + Project Tabs + Panel Toggles）
- **左侧索引**：文件/节点索引树（用于导航）
  - **Views / Pages（VERY IMPORTANT）**：位于左侧索引顶部，类似 Figma Pages，用于切换 active graph / mode
- **中心 Canvas**：架构编辑的 Source of Truth（已实现自定义画布系统，SVG 渲染，Figma 级交互）
- **右侧 Inspector**：编辑/属性面板（Phase 1 用 Monaco，`.md` 直接编辑并保存到真实文件）
- **底部 Terminal**：占位（Phase 1 仅展示日志/输出容器）

长期方向（已在代码结构中预埋）：

- 分离 **FS Index**（文件索引）与 **CodeGraph**（可编辑图）
- 容器概念：Frame / Group / Subgraph（Subgraph Phase1 占位）
- 节点类型 plugin 化（spec/ports/validate/compile/codegen/aiHints），未来支持多语言 adapter
- `.md` 知识树（Skill Tree / Knowledge Tree）作为一种图模式：用于分支式学习/整理/探索

---

## Phase 1 MVP 范围（现仓库状态）

已实现（✅）：

- ✅ Home + Recents（打开/重开入口）
- ✅ 打开项目文件夹（File System Access API）
- ✅ 持久化写入 `/.celest/`（`workspace.json` + `graphs/main.json`）
- ✅ Canvas 基础：自定义 SVG 画布系统，Figma 级交互（点击选择、框选、拖拽、平移、缩放、双击创建节点）
- ✅ Inspector：Monaco 编辑 + 写回真实文件
- ✅ Terminal：placeholder
- ✅ 自动迁移：从旧版 `.nodeide/` 自动迁移到 `.celest/`

待补齐/修复（⚠️）：

- 无（所有 Phase 1 MVP 功能已实现）

---

## 运行环境要求

- Node.js：建议 20+
- 包管理：npm（仓库已带 `package-lock.json`）
- 浏览器：Chrome / Edge（需支持 File System Access API：`showDirectoryPicker`）

---

## 本地启动

```bash
# 安装依赖
npm ci

# 开发启动
npm run dev

# 单测
npm test

# 构建
npm run build
```

---

## 使用方式（MVP）

1. 打开网页后进入 Home
2. 点击 "Open Folder / 打开项目文件夹"
3. Celest 会：
   - 扫描目录生成 FS Index（用于左侧索引/导航）
   - 自动检测并迁移旧版 `.nodeide/` 到 `.celest/`（如果存在）
   - 在项目根目录创建/更新 `/.celest/` 并写入：
     - `/.celest/workspace.json`
     - `/.celest/graphs/main.json`
4. 在 Canvas 上编辑图（节点/连线/viewport）
   - 双击空白处创建新节点
   - 点击选择节点/边
   - Shift+点击多选
   - 拖拽框选
   - Space+拖拽或双指滑动平移画布
   - 滚轮缩放
5. 在 Inspector 中编辑文件（Phase 1：主要面向 `.md`，直接写回真实文件）

---

## 持久化数据结构（`/.celest/`）

当前最小持久化：

- `/.celest/workspace.json`：工作区元信息（views、activeGraphId、指向主图文件路径等）
- `/.celest/graphs/main.json`：主图（CodeGraphModel）

> `/.celest/` 是 Celest 的"工作区资产目录"，用于 local-first 的状态保存。  
> 是否提交到 Git：取决于你是否希望团队共享图布局/节点状态（建议后续在协作策略里明确）。

**向后兼容**：
- 如果检测到旧版 `.nodeide/` 目录，Celest 会自动迁移到 `.celest/`
- 迁移后保留原 `.nodeide/` 目录（作为备份）

---

## 代码结构导览

核心层（纯逻辑/可测试）：

- `src/entities/graph/*`：CodeGraph 数据结构 + ops（创建/更新/选择等）
- `src/entities/graph/registry.ts`：节点类型注册表（plugin 方向的入口）
- `src/core/persistence/*`：`/.celest/` 读写（workspace + graphs）+ 迁移逻辑

功能层（面向 UI 的 features）：

- `src/features/project/*`：打开项目、recent、storage adapter（Phase1: BrowserAdapter）
- `src/features/fsIndex/*`：扫描文件夹、构建 FS Index snapshot
- `src/features/canvas/*`：自定义画布系统（SVG渲染，Figma级交互）+ adapter（隔离UI引擎）
  - `Canvas.tsx`：主画布组件（SVG 渲染）
  - `core/`：ViewportManager、SelectionManager、DragManager、BoxSelection
  - `components/`：CanvasNode、CanvasEdge、SelectionBox
  - `adapters/codeGraphToCanvas.ts`：领域模型到画布视图模型的转换
- `src/features/inspector/*`：Monaco 编辑器 + 保存
- `src/features/terminal/*`：Terminal 占位

Shell（布局与交互）：

- `src/shell/*`：TopTabs / Home / Workspace / LeftSidebar（Figma-like 壳）

状态管理（Zustand 单 store + slices）：

- `src/state/store.ts` + `src/state/slices/*`

---

## 协作与改动规范（务必遵守）

请先读：

- `AGENT.md`
- `CONTRIBUTING_AI.md`

架构治理：
- 检查清单：`docs/architecture-checklist.md`
- 违规记录：`docs/architecture-violations.md`（当前无未解决项）

核心规则摘要：

- 一次只改一个文件；改动必须提供"可复制粘贴的完整文件内容"
- 不删除旧代码：旧实现移动到 `src/_legacy`（保留历史）
- 优先模块化：Canvas 使用自定义实现，通过 adapter 隔离领域模型和 UI
- Phase 1 只实现 BrowserAdapter，持久化固定 `/.celest/`

---

# Celest Roadmap（最新版，合并：已完成 + 待办）

> 依据：仓库 `AGENT.md` / `CONTRIBUTING_AI.md` 的分层原则
>
> - `entities/`：稳定领域模型（不依赖 UI/React）
> - `core/`：纯逻辑 / 持久化（不依赖 React）
> - `state/`：Zustand（不直接依赖 UI 库数据结构；通过 feature adapter 输入）
> - `features/`：用户能力（Canvas/Inspector/FS/Project usecases）
> - `shell/`：应用壳与布局（只装配，不写领域逻辑）
>
> 协作规则：一次只做一个任务（最小变更集）；交付方式为"整文件可复制粘贴"；`npm run dev/build` 必须保持可用。

---

## 0) 现状摘要（当前已跑通的能力）

- Phase 1：纯 Web（浏览器），打开项目使用 File System Access API
- 项目持久化固定写入项目根目录：`/.celest/`
- Canvas 已实现自定义画布系统（SVG 渲染，Figma 级交互），完全替换 ReactFlow
- FS Index 与 CodeGraph 分离（左侧树 ≠ 画布资产）
- 自动迁移：从 `.nodeide/` 迁移到 `.celest/`

---

## 1) 已完成（✅）

### P0（稳定基座）

- ✅ 清理 `_legacy` 编译期依赖（已完全移除 ReactFlow 和 `_legacy` 目录）
- ✅ 面板开关驱动布局（Left / Inspector / Terminal 可隐藏，Canvas 优先铺满）
- ✅ File System Access API TS 类型补齐（strict TS，不靠 any）
- ✅ FS 扫描默认 ignore（node_modules/.git/dist/.next/.celest 等）避免卡死
- ✅ 不支持 File System Access API 的提示兜底（避免白屏）

### P1（交互高收益 + 分层洁净）

- ✅ BottomToolbar 固定在 Canvas 底部居中（不被 Terminal 展开影响）
- ✅ 删除闭环：Delete/Backspace 删除节点（可靠）
- ✅ 选中可视化：节点选中为 tint（非描边）
- ✅ 选中即时同步：点击 Node/Edge 立刻写入 store selection（Inspector/高亮不再需要再点空白）
- ✅ Cursor 规范：全站无"小手 pointer"，默认箭头；输入区域保持 I-beam
- ✅ 拖动/轻点分离：拖动时选中态不闪
- ✅ **P1-1**：彻底隔离 UI 引擎（state 层使用 Canvas* 契约，不直接依赖任何 UI 库类型）
- ✅ **P1-2**：ProjectState / ViewState 收敛到 `entities/project/types.ts`（Snapshot vs Runtime 分离）
- ✅ **P1-3**：`entities/graph/types.ts` 去 Canvas* 命名（Canvas 视图类型移至 `features/canvas/types.ts`）
- ✅ **P1-4**：FS Index path-based id（`fs:${normalizePath(relPath)}`）+ FS Tree UI 持久化闭环
- ✅ **P1-5**：`useWorkbenchModel` 变薄（selector 化，已迁移至 `state/selectors/*`，有单测）
- ✅ **P1-6**：Canvas 交互一致性（Figma-like：点击即选中、光标策略）

### P0-2 持久化文件错误处理与版本管理（✅ 已完成）

**状态**：已完成

**交付**：
- ✅ **错误恢复**：
  - 文件损坏时自动创建备份（`.celest/workspace.json.backup`）
  - 提供"重置为默认值"的降级选项
  - 添加文件完整性校验
- ✅ **版本迁移**：
  - 实现 `migrateWorkspaceFile(v1 -> v2)` 函数
  - 实现 `migrateGraphFile(v1 -> v2)` 函数
  - 支持向后兼容（读取旧版本，写入新版本）
- ✅ **备份机制**：
  - 保存前自动备份（`.celest/workspace.json.backup`）
  - 支持手动备份/恢复功能
- ✅ **错误报告**：
  - 详细的错误日志（文件路径、错误类型、建议操作）
  - 用户友好的错误提示（UI 中显示）
- ✅ **目录迁移**：
  - 自动从 `.nodeide/` 迁移到 `.celest/`

**DoD**：
- ✅ 文件损坏时能自动恢复或提示用户
- ✅ 版本升级时能自动迁移数据
- ✅ 有备份机制防止数据丢失
- ✅ 错误信息清晰，便于排查

---

## 2) Roadmap（待完成项）

> 说明：下面是面向下一阶段的执行版；每个 task 都要保持"最小变更集"。

### P0（稳定性与可靠性：高优先级）

#### P0-1.5 自定义画布系统完善（🔄 进行中）

**状态**：基础实现完成，但需要完善以达到生产质量

**当前进度**：
- ✅ 实现自定义画布系统（SVG 渲染）
- ✅ 基础交互实现：
  - ✅ 点击选择（单选）
  - ✅ 框选（部分重叠即选中）
  - ✅ 节点拖拽（单个、多个）
  - ✅ 视口管理（平移、缩放）
  - ✅ 双击创建节点
- ✅ 边连接系统（handles、连接、路由）
- ✅ 保持 API 兼容（使用 `canvasEvents.ts` 契约）
- ✅ 替换 `FlowCanvas.tsx` 为 `Canvas.tsx`
- ✅ 完全移除 ReactFlow 依赖

**待完善项（待用户反馈后补充）**：
- ⏳ 等待用户反馈具体问题
- ⏳ 交互细节优化
- ⏳ 性能优化
- ⏳ 边界情况处理
- ⏳ 测试覆盖

**DoD（目标）**：
- 画布功能完全对等或超越 ReactFlow 版本
- 所有交互行为完全符合 Figma
- 无错误和性能问题
- 用户体验流畅自然


---

### P1（补充 Backlog：UI 价值高但不阻塞 P2）

> 这些是之前 Roadmap 里提过、但在你最新架构版 Roadmap 里未显式列出的项。建议按"一个一个做"的原则插队推进。

#### P1-B1 多选（Shift toggle + 框选）

- Shift 点击 toggle selection；框选多选；Inspector 多选态显示"批量操作/仅显示计数"
- DoD：多选稳定、删除行为符合预期

#### P1-B2 Inspector 增加 Delete 按钮（非快捷键依赖）

- DoD：不靠键盘也能删除选中节点/边

#### P1-B3 Inspector Monaco language mapping（按扩展名选择语言）

- DoD：`.md/.ts/.json` 等至少覆盖一批常用后缀

#### P1-B4 Inspector Markdown（CM6）对齐 Obsidian（交互/视觉）

- 样式：标题/正文/列表/代码/引用/HR 的字号、行高、段间距贴近 Obsidian；代码块/行内 code 背景与主题色统一
- 交互：列表/任务续写、Tab 缩进、任务勾选、``` 补全已保留，需最终验证
- 符号：当前版本符号全显且无抖动；如需再次隐藏，需重新设计占位方案以保持行高稳定
- 占位符：placeholder 文案可调整/关闭

---

### P2（核心产品能力：FS⇄Canvas 一一映射 + Frame 折叠懒加载 + Graph Modes）

#### P2-1 FS Mirror Graph Mode（文件/文件夹 ⇄ Node/Frame）

**交付**

- 文件夹 → Frame；文件 → FileNode
- id 稳定（path-based）
- 默认折叠 Frame；展开时懒加载其 children nodes（并记录已加载状态）
- 布局独立持久化：`/.celest/layout/fs-mirror.json`

**DoD**

- 打开项目后：至少生成 root frame（Mirror 视图）
- 展开 frame 才渲染/加载其内部节点，性能可控

---

#### P2-2 Frame 容器能力（行为与数据结构）

- FrameNode 最小闭环：可创建/重命名/折叠/调整大小
- 允许跨 Frame 连线；折叠时后续接 P2-3 做聚合端口

---

#### P2-3 折叠 Frame 的连线聚合端口

- 折叠时边挂到 frame 的 in/out badge（聚合端口）
- 展开后恢复真实端点

---

#### P2-4 Subgraph 占位完善（definition/instance + IO ports + schema versioning）

- `/.celest/graphs/*` schema 版本化 + import/export 占位
- DoD：能创建 SubgraphDefinition（哪怕不可用），序列化不破

---

#### P2-5 Knowledge Tree（MD Skill Tree）作为 Graph Mode

- `/.celest/knowledge/*.json` + md 内容策略（Phase1 可"一树一 md"）
- 节点：todo/doing/done + summary（可编辑）+ branch
- DoD：可保存/加载/重命名/分支基本闭环

---

### P3（工程护栏：避免未来再次大重构）

#### P3-1 架构健康度 Checklist

- 输出：`docs/architecture-checklist.md`
- 每次变更前后对照：
  - FS Index / CodeGraph / MirrorGraph 分离
  - adapter 边界未破坏（state 不依赖 UI 引擎类型）
  - persistence schema 可升级（versioned）

---

### P4（UI/UX 持续改进）

#### P4-1 UI 界面美观化与交互细节优化

**目标**
- 提升整体视觉设计（颜色、间距、字体、图标）
- 优化交互细节（动画、反馈、状态提示）
- 改善用户体验（减少操作步骤、提高可发现性）

**交付**
- **视觉设计**：
  - 统一设计系统（颜色、间距、字体）
  - 优化 Canvas 背景和节点样式
  - 改进左侧树和 Inspector 的视觉层次
- **交互优化**：
  - 添加过渡动画（节点拖拽、面板展开/收起）
  - 改进选中态反馈（更明显的视觉提示）
  - 优化快捷键提示和帮助文档
- **用户体验**：
  - 改进错误提示（更友好、更具体）
  - 添加加载状态指示器
  - 优化空状态提示（无节点、无文件等）

**DoD**
- UI 视觉统一、美观
- 交互流畅、反馈及时
- 用户体验明显提升

**优先级**
- 中低优先级（不影响功能，持续改进）

---

## 3) README 里建议加一句（产品定位）

- CodeGraph（手工图）：适合知识树/自定义结构/跨文件引用
- FS Mirror Graph（默认视图）：适合"左侧结构 ⇄ 画布结构语义一一对应"的工作流（Frame 折叠懒加载保证性能）

## License

TBD
