# Celest

Celest 是一个 **local-first 的图式工作台 / Node IDE**：用 **Figma-like Shell + 无限画布 Canvas** 来组织项目结构、知识与工作流。  
Phase 1 目标是一个纯 Web（浏览器）MVP：用 **File System Access API** 打开本地项目文件夹，把工作区状态持久化写回项目根目录的 `/.celest/`。

> ⚠️ 铁律：本仓库的协作与改动必须严格遵守 `AGENT.md` 与 `CONTRIBUTING_AI.md`。  
> 任何未来修改都应遵循：**一次只改一个文件 / 给出可复制粘贴的完整文件内容 / 旧代码只移动到 `src/_legacy` 不删除。**

---

## 产品定位

> 🤖 产品内置 AI（Runtime）提示词与 GraphPatch 合约：见 `docs/ai/runtime/`（未来实现时：validate → preview → apply）。

- **外壳（Shell）**：Top Tabs（Home + Project Tabs + Panel Toggles）
- **左侧索引**：文件/节点索引树（用于导航）
  - **Views / Pages（VERY IMPORTANT）**：位于左侧索引顶部，类似 Figma Pages，用于切换 active graph / mode
- **中心 Canvas**：架构编辑的 Source of Truth（已实现自研 SVG 画布系统，Figma 级交互）
- **右侧 Inspector**：编辑/属性面板（Phase 1 使用 CodeMirror，编辑内容当前保存到图资产）
- **底部 Bottom Panel**：
  - **AI 输入区（主 Tab，规划中）**：基于选中节点的总结/分支/生成图（输出落为节点资产）
    - 入口建议：工具条（Toolbar）提供一个「AI」按钮/快捷菜单，用于打开 AI Tab 或触发快捷动作；完整审阅与 Apply/Discard 仍在 Bottom Panel 内完成。
  - **Terminal（子 Tab）**：占位（Phase 1 仅展示日志/输出容器）

长期方向（已在代码结构中预埋）：

- 分离 **FS Index**（文件索引）与 **CodeGraph**（可编辑图）
- 容器概念：Frame / Group / Subgraph（Subgraph Phase 1 占位）
- 节点类型 plugin 化（spec/ports/validate/compile/codegen/aiHints），未来支持多语言 adapter
- `.md` 知识树（Skill Tree / Knowledge Tree）作为一种图模式：用于分支式学习/整理/探索

---

## Phase 1 MVP 范围（现仓库状态）

已实现（✅）：

- ✅ Home + Recents（打开/重开入口）
- ✅ 打开项目文件夹（File System Access API）
- ✅ 持久化写入 `/.celest/`（`workspace.json` + `graphs/main.json`）
- ✅ Canvas 基础：自定义 SVG 画布系统，Figma 级交互（点击选择、框选、拖拽、平移、缩放、双击创建节点）
- ✅ Inspector：CodeMirror 编辑（当前编辑内容保存到图资产；真实文件读写属于后续任务）
- ✅ Terminal：placeholder
- ✅ 自动迁移：从旧版 `.nodeide/` 自动迁移到 `.celest/`

待补齐/修复（⚠️）：

- ⚠️ 真实文件编辑闭环（最小 `.md` 读写）：Note 节点绑定 path 并写回真实文件（见 Roadmap：P1-7）
- ⚠️ 多选体验补齐（Primary selection + Inspector 折叠展开）（见 Roadmap：P1-3）
- ⚠️ FS⇄Canvas 一一映射（FS Mirror Graph Mode）（见 Roadmap：P2-1）

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
   - Shift+点击多选（基础）
   - 拖拽框选（基础）
   - Space+拖拽或双指滑动平移画布
   - 滚轮缩放
5. 在 Inspector 中编辑选中节点
   - Phase 1：Note 节点支持 Markdown 编辑（当前保存到图资产；写回真实文件属于后续任务）

---

## AI 能力设计（规划中）

Celest 的 AI 不是“聊天记录”，而是 **把 AI 产出沉淀为可编辑的节点资产**。

### 交互：选中 → 载入 → 生成节点（全部可编辑）

- 用户在 Canvas 上 **框选/多选** 一组节点
- 底部 **AI 输入区**自动生成一个 **Context Pack（可预览/可裁剪）**：

  - 节点标题/类型/路径
  - summary（若存在）
  - excerpt（例如：前 N 行或关键片段）

- 选择语义（与 Inspector/AI 共用）：
  - `selectedIds`：当前选中集合（框选/Shift toggle 的结果）
  - `primaryId`：主选中（Inspector 默认展开项、AI 生成锚点；可在选中集合内切换）
- AI 可以执行的动作（按钮/快捷命令）：
  - **总结**：生成 Summary 节点（或回写到选中节点的 summary 字段）
  - **增加分支**：从选中节点生成“下一步/分支问题”节点，并自动连线
  - **从零生成学习分支图**：按目标生成一个“天赋树/学习路径”子图（节点逐个生成）
  - **重组**：把一堆节点整理成结构化目录/Frame（仍是节点资产，不是隐藏输出）

### Context 超限策略（必须有）

当选中节点过多/文本过长时：

- 先用 **summary** 聚合（若为空，先生成临时 summary）
- 再用 **excerpt**（每节点仅取前 N 行/关键片段）
- 最终仍超限：提示用户裁剪范围（不要“静默截断”）

### 生成必须“可回滚 / 可审阅”

- AI 输出以 **Draft 方式落到图上**（例如：放进一个 Draft Frame/Group）
- 用户点击 Apply 才会合并到主图结构
- 所有变更以一组明确的 **GraphOps（节点/边增删改）**执行，方便撤销与测试

### 自动布局（重要）

- AI/FS Mirror 生成节点必须 **逐个生成** + **使用确定性布局器（CanvasPlacer）**
- 禁止“全部生成在坐标原点”

---

## 持久化数据结构（`/.celest/`）

当前最小持久化：

- `/.celest/workspace.json`：工作区元信息（views、activeGraphId、指向主图文件路径等）
- `/.celest/graphs/main.json`：主图（CodeGraphModel）

规划新增（Roadmap 对应任务）：

- `/.celest/layout/fs-mirror.json`：FS Mirror 视图布局（独立于主图）
- `/.celest/knowledge/*.json`：知识树结构与布局

> `/.celest/` 是 Celest 的"工作区资产目录"，用于 local-first 的状态保存。  
> 是否提交到 Git：取决于你是否希望团队共享图布局/节点状态（建议后续在协作策略里明确）。

---

## 代码结构导览

核心层（纯逻辑/可测试）：

- `src/entities/graph/*`：CodeGraph 数据结构 + ops（创建/更新/选择等）
- `src/entities/graph/registry.ts`：节点类型注册表（plugin 方向入口）
- `src/core/persistence/*`：`/.celest/` 读写（workspace + graphs）+ 迁移逻辑

功能层（面向 UI 的 features）：

- `src/features/project/*`：打开项目、recent、storage adapter（Phase 1: BrowserAdapter）
- `src/features/fsIndex/*`：扫描文件夹、构建 FS Index snapshot
- `src/features/canvas/*`：自研画布系统（SVG 渲染，Figma 级交互）+ adapter（隔离 UI 引擎）
  - `Canvas.tsx`：主画布组件（SVG 渲染）
  - `core/`：ViewportManager、SelectionManager、DragManager、BoxSelection
  - `components/`：CanvasNode、CanvasEdge、SelectionBox
  - `adapters/*`：领域模型 → 画布视图模型 / 事件翻译
- `src/features/inspector/*`：CodeMirror 编辑器
- `src/features/terminal/*`：Terminal 占位（日志/输出）

Shell（布局与交互）：

- `src/shell/*`：TopTabs / Home / Workspace / LeftSidebar（Figma-like 壳）

状态管理（Zustand 单 store + slices）：

- `src/state/store.ts` + `src/state/slices/*` + `src/state/selectors/*`

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
- 优先模块化：Canvas 使用自研实现，通过 adapter 隔离领域模型和 UI
- Phase 1 只实现 BrowserAdapter，持久化固定 `/.celest/`

---

# Celest Roadmap

> 依据：仓库 `AGENT.md` / `CONTRIBUTING_AI.md` 的分层原则  
> 协作规则：一次只做一个任务（最小变更集）；交付方式为"整文件可复制粘贴"；`npm run dev/build` 必须保持可用。

---

## Roadmap（待完成项）

> 说明：下面是面向下一阶段的执行版；每个 task 都要保持"最小变更集"。

### P0（稳定性与可靠性：高优先级）

（待补充：以实际 bug/回归为驱动，优先做 schema 校验、钳制与自愈）

---

### P1（架构完整性与一致性：中优先级）

#### P1-1 添加 Subgraph definition 存储路径常量

**问题**：

- AGENT.md 中定义 Subgraph 定义存储在 `/.celest/subgraphs/<name>/`
- 代码中只有 `GRAPHS_DIRNAME = "graphs"`，缺少 `SUBGRAPHS_DIRNAME` 常量

**交付**：

- 在 `src/core/persistence/nodeideSchema.ts` 中添加 `SUBGRAPHS_DIRNAME = "subgraphs"` 常量

**DoD**：

- 常量定义清晰，与 AGENT.md 定义一致

#### P1-2 更新 Frame 节点描述以匹配 AGENT.md

**交付**：

- 更新 `src/entities/graph/registry.ts` 中 Frame 的 description

**DoD**：

- Frame 描述与产品定义一致

#### P1-3 多选（Shift toggle + 框选 + Primary）

**交付**：

- Shift 点击 toggle selection
- 框选多选
- 引入 **Primary selection** 概念（多选时有一个“主选”节点）
- Inspector 多选态：
  - 默认展开 Primary，其余折叠（可下拉展开全部选中内容）
  - 支持“仅显示计数 / 批量操作”模式切换（后续 AI 也依赖该结构）

**DoD**：

- 多选稳定、删除行为符合预期
- Inspector 多选体验符合 Figma（主选 + 其余折叠）

#### P1-4 Inspector 增加 Delete 按钮（非快捷键依赖）

**交付**：

- Inspector 面板中添加 Delete 按钮
- 支持删除选中的节点/边

**DoD**：

- 不靠键盘也能删除选中节点/边
- 删除操作有明确的视觉反馈

#### P1-5 Inspector CodeMirror language mapping（按扩展名选择语言）

**交付**：

- 根据文件扩展名自动选择 CodeMirror 语言模式
- 支持常用文件类型（`.md/.ts/.json/.js/.css/.html` 等）

**DoD**：

- 至少覆盖一批常用后缀
- 语言高亮正确显示

#### P1-6 Inspector Markdown（CM6）对齐 Obsidian（交互/视觉）

**交付**：

- **样式**：标题/正文/列表/代码/引用/HR 的字号、行高、段间距贴近 Obsidian；代码块/行内 code 背景与主题色统一
- **交互**：列表/任务续写、Tab 缩进、任务勾选、``` 补全

**DoD**：

- 视觉和交互体验接近 Obsidian
- 编辑体验流畅自然

#### P1-7 真实文件编辑闭环（最小 .md 读写）

**问题**：

- Inspector 中编辑 Note 节点的 text 目前只更新 graph，未写回真实文件

**交付**：

- Note 节点可绑定 `path`（相对项目根目录）
- 打开项目时：可按需读取文件内容填充 Note（或用户触发“Load from file”）
- 编辑 Note 时：写回真实文件（使用 File System Access API）
- 保存有明确成功/失败反馈（不泄露绝对路径/内容）

**DoD**：

- `.md` 文件读写闭环可用，且不会破坏现有图资产

#### P1-8 CanvasPlacer：确定性节点摆放（为 FS/AI 生成打底）

**交付**：

- 新增一个纯逻辑的布局器：输入“要生成的节点序列 + 容器/锚点”，输出稳定坐标
- 用于：
  - FS Mirror 展开时生成 children 节点
  - AI 逐个生成节点时避免堆在原点

**DoD**：

- 同输入得到同布局；不会产生 NaN/Infinity；有边界钳制

---

### P2（核心产品能力：FS⇄Canvas 一一映射 + Frame 折叠懒加载 + Graph Modes + AI Panel）

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

**交付**：

- 折叠时边挂到 frame 的 in/out badge（聚合端口）
- 展开后恢复真实端点

**DoD**：

- Frame 折叠/展开时连线可正确聚合/恢复

---

#### P2-4 Subgraph 占位完善（definition/instance + IO ports + schema versioning）

**交付**：

- 实现 Subgraph definition 存储逻辑（`/.celest/subgraphs/<name>/`）
- `/.celest/graphs/*` schema 版本化 + import/export 占位
- FS Index 中显示 Subgraph definition（🪐）

**DoD**：

- 能创建 SubgraphDefinition，序列化不破；存储路径正确

---

#### P2-5 Knowledge Tree（MD Skill Tree）作为 Graph Mode

**交付**：

- `/.celest/knowledge/*.json` + md 内容策略（Phase 1 可"一树一 md"）
- 节点：todo/doing/done + summary（可编辑）+ branch
- CRUD 基本闭环

**DoD**：

- 可保存/加载/重命名/分支基本闭环

---

#### P2-6 Group 在 FS Index 中的虚拟节点显示（可选）

**交付**：

- FS Index 中显示 Group 虚拟节点（🧩）
- 点击虚拟节点可选中画布上的 Group

**DoD**：

- 不影响真实文件系统显示

---

#### P2-7 Bottom Panel：AI 输入区（MVP 版）

**交付**：

- 底部面板新增 AI Tab（Terminal 作为子 Tab）
- 支持“选中节点 → 生成 Context Pack 预览”（标题/summary/excerpt）
- 支持 2 个最小动作：
  - Summarize（生成 Summary 节点）
  - Branch（生成 Next/Branch 节点并连线）
- 输出以 Draft 方式落图，支持 Apply/Discard

**DoD**：

- 无选择时提示；多选时能预览 pack；生成节点不会堆在原点（使用 CanvasPlacer）

---

#### P2-8 Context Budget & 压缩策略（与 AI Panel 配套）

**交付**：

- 估算 pack 大小（字数/粗 token 估算）
- 超限时自动分层压缩：summary → excerpt → 用户裁剪
- 严禁静默截断

**DoD**：

- 超限时 UI 明确提示与可操作

---

### P3（工程护栏：避免未来再次大重构）

#### P3-1 架构健康度 Checklist

**交付**：

- 持续维护 `docs/architecture-checklist.md`
- 每次变更前后对照：
  - FS Index / CodeGraph / Knowledge Tree 分离
  - adapter 边界未破坏（state 不依赖 UI 引擎类型）
  - persistence schema 可升级（versioned）
  - 三层关系清晰分离（文件系统/FS Index/Canvas）

**DoD**：

- 清单完整且可执行；每次变更对照验证

---

### P4（UI/UX 持续改进）

#### P4-1 UI 界面美观化与交互细节优化

（同原 Roadmap）

---

## 产品定位

> 🤖 产品内置 AI（Runtime）提示词与 GraphPatch 合约：见 `docs/ai/runtime/`（未来实现时：validate → preview → apply）。
> 补充说明

- **CodeGraph（手工图）**：适合知识树/自定义结构/跨文件引用
- **FS Mirror Graph（默认视图，规划中）**：适合“左侧结构 ⇄ 画布结构语义一一对应”的工作流（Frame 折叠懒加载保证性能）

## License

TBD
