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

# Celest Roadmap

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

## Roadmap（待完成项）

> 说明：下面是面向下一阶段的执行版；每个 task 都要保持"最小变更集"。

### P0（稳定性与可靠性：高优先级）

#### P0-1 修复 CanvasNodeType 类型定义缺失

**问题**：
- `CanvasNodeType` 类型定义中缺少 `"frameNode"`
- `codeGraphToCanvas.ts` 会返回 `"frameNode"`，但类型定义不包含，导致类型不匹配

**交付**：
- 在 `src/features/canvas/types.ts` 的 `CanvasNodeType` 中添加 `"frameNode"`
- 确保所有节点类型都有对应的 Canvas 类型定义

**DoD**：
- `CanvasNodeType` 包含所有节点类型（noteNode, fileRefNode, groupNode, subgraphNode, frameNode）
- 类型检查通过，无 TypeScript 错误
- 运行时 `codeGraphToCanvas` 返回的类型都能匹配

#### P0-2 修复连线校验问题

**问题**：
- Frame/Group 节点 ports 为空但仍可连线（CanvasNode 硬编码了 left/right handle）
- 连接校验未使用 NodeSpec 的 `accepts` 规则（如 fileRef.out 只接受 note）

**交付**：
- CanvasNode 根据 `spec.ports` 动态渲染 handles，ports 为空时不渲染
- `useCanvasConnection` 连接校验升级为基于 NodeSpec（检查 `direction` 和 `accepts`）
- Frame/Group 节点无法连线（符合设计：非连接节点）

**DoD**：
- Frame/Group 节点无 handles，无法连线
- fileRef.out 只能连接到 note.in（符合 accepts 规则）
- 连接校验逻辑完整且可扩展

#### P0-3 对齐命名与文档口径

**问题**：
- 代码使用 CodeMirror 但命名/文档都叫 "MonacoEditor"
- 代码已移除 ReactFlow 但注释/文档仍有残留引用
- `recentStore.ts` 中 DB_NAME 仍为 "node_ide"，应改为 "celest"

**交付**：
- 统一命名：CodeMirror 相关组件/文件/文档统一为 "CodeMirror" 或 "Editor"
- 清理 ReactFlow 残留：注释、文档、测试中的 ReactFlow 引用
- 更新 DB_NAME：`recentStore.ts` 中 `DB_NAME = "celest"`（需处理数据迁移）

**DoD**：
- 命名一致：代码、文档、注释统一
- 无 ReactFlow 残留引用
- IndexedDB 数据库名统一为 "celest"（向后兼容迁移）


---

### P1（架构完整性与一致性：中优先级）

#### P1-1 添加 Subgraph definition 存储路径常量

**问题**：
- AGENT.md 中定义 Subgraph 定义存储在 `/.celest/subgraphs/<name>/`
- 代码中只有 `GRAPHS_DIRNAME = "graphs"`，缺少 `SUBGRAPHS_DIRNAME` 常量
- 没有 Subgraph definition 的存储逻辑定义

**交付**：
- 在 `src/core/persistence/nodeideSchema.ts` 中添加 `SUBGRAPHS_DIRNAME = "subgraphs"` 常量
- 为后续 P2-4 Subgraph 定义存储功能提供基础

**DoD**：
- 常量定义清晰，与 AGENT.md 定义一致
- 为未来 Subgraph definition 存储功能预留接口

#### P1-2 更新 Frame 节点描述以匹配 AGENT.md

**问题**：
- `registry.ts` 中 Frame 的描述为 "Visual grouping box (planned)"
- AGENT.md 中 Frame 的定义更完整（可折叠、映射到文件夹、画板框选等）

**交付**：
- 更新 `src/entities/graph/registry.ts` 中 Frame 的 description
- 确保代码中的描述与 AGENT.md 的产品定义一致

**DoD**：
- Frame 的描述准确反映其在产品中的定位和功能
- 代码注释与产品文档一致

#### P1-3 多选（Shift toggle + 框选）

**交付**：
- Shift 点击 toggle selection
- 框选多选
- Inspector 多选态显示"批量操作/仅显示计数"

**DoD**：
- 多选稳定、删除行为符合预期
- 交互符合 Figma 习惯

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
- **符号**：当前版本符号全显且无抖动；如需再次隐藏，需重新设计占位方案以保持行高稳定
- **占位符**：placeholder 文案可调整/关闭

**DoD**：
- 视觉和交互体验接近 Obsidian
- 编辑体验流畅自然

#### P1-7 真实文件编辑闭环（最小 .md 读写）

**问题**：
- Inspector 中编辑 Note 节点的 text 只更新了 graph，未写回真实文件
- 缺少文件写入逻辑

**交付**：
- 实现最小文件读写闭环：编辑 Note 节点时，如果节点有 `path` 字段，写回对应文件
- 支持 `.md` 文件的读取和保存（使用 File System Access API）
- 文件路径映射：Note 节点可关联到工作区文件路径

**DoD**：
- 编辑 Note 节点内容可写回真实 `.md` 文件
- 打开文件时自动加载内容到 Note 节点
- 文件保存有明确的成功/失败反馈

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

**交付**：
- 折叠时边挂到 frame 的 in/out badge（聚合端口）
- 展开后恢复真实端点

**DoD**：
- Frame 折叠时，内部节点的连线聚合显示在 Frame 的 in/out badge
- Frame 展开时，连线恢复为真实端点连接

---

#### P2-4 Subgraph 占位完善（definition/instance + IO ports + schema versioning）

**交付**：
- 实现 Subgraph definition 存储逻辑（使用 `/.celest/subgraphs/<name>/` 路径）
- `/.celest/graphs/*` schema 版本化 + import/export 占位
- 能创建 SubgraphDefinition（哪怕不可用），序列化不破
- Subgraph definition 在 FS Index 中显示为特殊图标（🪐）

**DoD**：
- 能创建 SubgraphDefinition，序列化不破
- Subgraph definition 存储在正确的路径（`/.celest/subgraphs/`）
- FS Index 中能识别并显示 Subgraph definition 文件夹

---

#### P2-5 Knowledge Tree（MD Skill Tree）作为 Graph Mode

**交付**：
- `/.celest/knowledge/*.json` + md 内容策略（Phase1 可"一树一 md"）
- 节点：todo/doing/done + summary（可编辑）+ branch
- 实现知识树的基本 CRUD 操作

**DoD**：
- 可保存/加载/重命名/分支基本闭环
- 知识树节点支持状态切换和编辑

#### P2-6 Group 在 FS Index 中的虚拟节点显示（可选）

**问题**：
- AGENT.md 中定义 Group 可以在 FS Index 中显示为虚拟节点（🧩）用于导航和选取
- 当前 FS Index 只显示真实文件系统结构，没有 Group 虚拟节点

**交付**：
- 在 FS Index 中显示 Group 虚拟节点（可选功能）
- 点击 Group 名称可选中画布上对应的 Group
- Group 虚拟节点不产生实际文件夹

**DoD**：
- Group 可以在 FS Index 中显示为虚拟节点（可选）
- 点击 Group 虚拟节点能正确选中画布上的 Group
- 不影响真实文件系统的显示

---

### P3（工程护栏：避免未来再次大重构）

#### P3-1 架构健康度 Checklist

**交付**：
- 输出：`docs/architecture-checklist.md`（已存在，需持续维护）
- 每次变更前后对照：
  - FS Index / CodeGraph / Knowledge Tree 分离
  - adapter 边界未破坏（state 不依赖 UI 引擎类型）
  - persistence schema 可升级（versioned）
  - 三层关系（文件系统/FS Index/Canvas）清晰分离

**DoD**：
- 架构检查清单完整且可执行
- 每次代码变更都对照检查清单验证

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

## 产品定位补充说明

- **CodeGraph（手工图）**：适合知识树/自定义结构/跨文件引用
- **FS Mirror Graph（默认视图）**：适合"左侧结构 ⇄ 画布结构语义一一对应"的工作流（Frame 折叠懒加载保证性能）

## License

TBD
