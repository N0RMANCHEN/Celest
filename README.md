# Celest

Celest 是一个 **local-first 的图式工作台 / Node IDE**：用 **Figma-like Shell + 无限画布 Canvas** 来组织项目结构、知识与工作流。  
Phase 1 目标是一个纯 Web（浏览器）MVP：用 **File System Access API** 打开本地项目文件夹，把工作区状态持久化写回项目根目录的 `/.nodeide/`。

> ⚠️ 铁律：本仓库的协作与改动必须严格遵守 `AGENT.md` 与 `contributing_ai.md`。  
> 任何未来修改都应遵循：**一次只改一个文件 / 给出可复制粘贴的完整文件内容 / 旧代码只移动到 `src/_legacy` 不删除。**

---

## 产品定位

- **外壳（Shell）**：Top Tabs（Home + Project Tabs + Panel Toggles）
- **左侧索引**：文件/节点索引树（用于导航）
  - **Views / Pages（VERY IMPORTANT）**：位于左侧索引顶部，类似 Figma Pages，用于切换 active graph / mode
- **中心 Canvas**：架构编辑的 Source of Truth（Phase 1 用 React Flow，但通过 adapter 隔离）
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
- ✅ 持久化写入 `/.nodeide/`（`workspace.json` + `graphs/main.json`）
- ✅ Canvas 基础：节点/连线渲染、viewport 更新（View preset）
- ✅ Inspector：Monaco 编辑 + 写回真实文件
- ✅ Terminal：placeholder

待补齐/修复（⚠️）：

- ⚠️ 左侧索引树与 View 切换 UI：当前工作区引用了不存在的 legacy 组件文件，需修复后才能正常编译运行
- ⚠️ 面板开关（TopTabs）目前未驱动布局隐藏（toggle 写入了 store，但 Workspace 未消费）

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
2. 点击 “Open Folder / 打开项目文件夹”
3. Celest 会：
   - 扫描目录生成 FS Index（用于左侧索引/导航）
   - 在项目根目录创建/更新 `/.nodeide/` 并写入：
     - `/.nodeide/workspace.json`
     - `/.nodeide/graphs/main.json`
4. 在 Canvas 上编辑图（节点/连线/viewport）
5. 在 Inspector 中编辑文件（Phase 1：主要面向 `.md`，直接写回真实文件）

---

## 持久化数据结构（`/.nodeide/`）

当前最小持久化：

- `/.nodeide/workspace.json`：工作区元信息（views、activeGraphId、指向主图文件路径等）
- `/.nodeide/graphs/main.json`：主图（CodeGraphModel）

> `/.nodeide/` 是 Celest 的“工作区资产目录”，用于 local-first 的状态保存。  
> 是否提交到 Git：取决于你是否希望团队共享图布局/节点状态（建议后续在协作策略里明确）。

---

## 代码结构导览

核心层（纯逻辑/可测试）：

- `src/entities/graph/*`：CodeGraph 数据结构 + ops（创建/更新/选择等）
- `src/entities/graph/registry.ts`：节点类型注册表（plugin 方向的入口）
- `src/core/persistence/*`：`/.nodeide/` 读写（workspace + graphs）

功能层（面向 UI 的 features）：

- `src/features/project/*`：打开项目、recent、storage adapter（Phase1: BrowserAdapter）
- `src/features/fsIndex/*`：扫描文件夹、构建 FS Index snapshot
- `src/features/canvas/*`：React Flow 封装 + adapter（隔离 React Flow 数据结构）
- `src/features/inspector/*`：Monaco 编辑器 + 保存
- `src/features/terminal/*`：Terminal 占位

Shell（布局与交互）：

- `src/shell/*`：TopTabs / Home / Workspace / LeftSidebar（Figma-like 壳）

状态管理（Zustand 单 store + slices）：

- `src/state/store.ts` + `src/state/slices/*`

Legacy（归档，不要求可运行）：

- `src/_legacy/*`

---

## 协作与改动规范（务必遵守）

请先读：

- `AGENT.md`
- `contributing_ai.md`

核心规则摘要：

- 一次只改一个文件；改动必须提供“可复制粘贴的完整文件内容”
- 不删除旧代码：旧实现移动到 `src/_legacy`（保留历史）
- 优先模块化：避免把业务绑死 React Flow（用 adapter 隔离）
- Phase 1 只实现 BrowserAdapter，持久化固定 `/.nodeide/`

---

# Celest Roadmap（最新版，合并：已完成 + 待办）

> 依据：仓库 `AGENT.md` / `contributing_ai.md` 的分层原则
>
> - `entities/`：稳定领域模型（不依赖 UI/React/ReactFlow）
> - `core/`：纯逻辑 / 持久化（不依赖 React）
> - `state/`：Zustand（不直接依赖 UI 库数据结构；通过 feature adapter 输入）
> - `features/`：用户能力（Canvas/Inspector/FS/Project usecases）
> - `shell/`：应用壳与布局（只装配，不写领域逻辑）
>
> 协作规则：一次只做一个任务（最小变更集）；交付方式为“整文件可复制粘贴”；`npm run dev/build` 必须保持可用。

---

## 0) 现状摘要（当前已跑通的能力）

- Phase 1：纯 Web（浏览器），打开项目使用 File System Access API
- 项目持久化固定写入项目根目录：`/.nodeide/`
- Canvas Phase 1 用 React Flow（@xyflow/react），但必须经由 adapter 隔离（避免 state/UI 强耦合）
- FS Index 与 CodeGraph 分离（左侧树 ≠ 画布资产）

---

## 1) 已完成（✅）

### P0（稳定基座，用户已验证）

- ✅ 清理 `_legacy` 编译期依赖（并且用户已删除 `_legacy` 仍可编译运行）
- ✅ 面板开关驱动布局（Left / Inspector / Terminal 可隐藏，Canvas 优先铺满）
- ✅ ReactFlow StrictMode nodeTypes/edgeTypes 稳定引用警告处理
- ✅ File System Access API TS 类型补齐（strict TS，不靠 any）
- ✅ FS 扫描默认 ignore（node_modules/.git/dist/.next 等）避免卡死
- ✅ 不支持 File System Access API 的提示兜底（避免白屏）

### P1（交互高收益）

- ✅ BottomToolbar 固定在 Canvas 底部居中（不被 Terminal 展开影响）
- ✅ 删除闭环：Delete/Backspace 删除节点（可靠）
- ✅ 选中可视化：节点选中为 tint（非描边）
- ✅ 选中即时同步修复：点击 Node/Edge 立刻写入 store selection（Inspector/高亮不再需要再点空白）
- ✅ Cursor 规范：全站无“小手 pointer”，默认箭头；输入区域保持 I-beam（通过全局 cursor.css 收敛）
- ✅ 拖动/轻点分离：拖动时选中态不闪（drag start 立即选中；drag stop 后短窗口忽略 pane click 清空）

---

## 2) Roadmap（最新执行版：未完成/新增项）

> 说明：下面是面向下一阶段的执行版；每个 task 都要保持“最小变更集”。

### P1（分层洁净 + 为 P2 做地基）

#### P1-1 彻底隔离 ReactFlow（state 层不 import reactflow/@xyflow）

**目标**

- state 层不再依赖 `NodeChange/EdgeChange/Connection/Viewport` 等 ReactFlow 类型

**交付**

- 新增 `features/canvas/canvasEvents.ts`（UI-无关事件契约）
- `FlowCanvas` 把 ReactFlow 事件翻译为契约 → 再调用 store action
- state/types、graphSlice 等仅使用契约类型

**DoD**

- `rg "reactflow|@xyflow" src/state` 结果为空
- 拖拽/连线/viewport 保存加载行为不回归

---

#### P1-2 ProjectState / ViewState 收敛到 `entities/project/types.ts`（拆 snapshot vs runtime）

**目标**

- 清晰区分“可序列化快照”和“运行时句柄/缓存”

**交付**

- `entities/project/types.ts` 定义：
  - `ProjectSnapshot`（可持久化）
  - `ProjectRuntime`（不可持久化：dirHandle/handles map 等）
  - `ProjectState = Snapshot & Runtime`
- `features/project/openProject.ts` 只保留用例逻辑，不再定义类型
- state/types 只从 entities 引类型

**DoD**

- `openProject.ts` 不再导出/定义 ProjectState/ViewState
- snapshot 与 runtime 边界明确

---

#### P1-3 `entities/graph/types.ts` 去 Canvas\* 命名（领域模型更纯）

**目标**

- `entities/graph/*` 只保留“领域对象”，Canvas 视图类型移入 `features/canvas/*`

**交付**

- `CanvasNodeData/CanvasEdgeData/...` 移动到 `features/canvas/types.ts`（或 adapters/types.ts）
- `entities/graph/types.ts` 只保留 CodeGraphModel + 各类领域节点（Note/FileRef/Frame/Group/Subgraph 等）

**DoD**

- `entities/graph` 内不再出现 `Canvas*` 命名
- adapter 与编译通过

---

#### P1-4 FS Index id 稳定化（path-based id）+ 为 Frame 懒加载铺垫

**目标**

- 同一路径在多次打开项目时 id 稳定（否则展开/选中/未来映射都会丢）

**交付**

- `scanFsMeta.ts`：从 `nanoid()` 改为 path-based id（推荐 hash(path)）
- `treeExpanded/selected` 等状态以稳定 id 为 key

**DoD**

- 重复打开同项目：左侧树展开态/选中态稳定
- ignore 规则仍生效、性能不回退

---

#### P1-5 `useWorkbenchModel` 变薄（selector 化）

**目标**

- 降低“巨型拼装 hook”的维护成本，为 Frame/多选/懒加载扩展做准备

**交付**

- 纯派生逻辑迁移到 `state/selectors/*`
- hook 只负责绑定 store + selectors
- 至少补 3 个核心 selector 的 vitest 单测（最小集即可）

**DoD**

- `useWorkbenchModel.ts` 显著变短（如 <120 行）
- 单测可跑通

---

#### P1-6 Canvas 交互一致性（Figma-like）——已完成 ✅

- 点击即选中、无需二次点击空白
- Cursor 策略：默认箭头；输入区 I-beam；避免全站 pointer hand

---

### P1（补充 Backlog：UI 价值高但不阻塞 P2）

> 这些是之前 Roadmap 里提过、但在你最新架构版 Roadmap 里未显式列出的项。建议按“一个一个做”的原则插队推进。

#### P1-B1 多选（Shift toggle + 框选）

- Shift 点击 toggle selection；框选多选；Inspector 多选态显示“批量操作/仅显示计数”
- DoD：多选稳定、删除行为符合预期

#### P1-B2 Inspector 增加 Delete 按钮（非快捷键依赖）

- DoD：不靠键盘也能删除选中节点/边

#### P1-B3 Inspector Monaco language mapping（按扩展名选择语言）

- DoD：`.md/.ts/.json` 等至少覆盖一批常用后缀

---

### P2（核心产品能力：FS⇄Canvas 一一映射 + Frame 折叠懒加载 + Graph Modes）

#### P2-1 FS Mirror Graph Mode（文件/文件夹 ⇄ Node/Frame）

**交付**

- 文件夹 → Frame；文件 → FileNode
- id 稳定（path-based）
- 默认折叠 Frame；展开时懒加载其 children nodes（并记录已加载状态）
- 布局独立持久化：`/.nodeide/layout/fs-mirror.json`

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

- `.nodeide/graphs/*` schema 版本化 + import/export 占位
- DoD：能创建 SubgraphDefinition（哪怕不可用），序列化不破

---

#### P2-5 Knowledge Tree（MD Skill Tree）作为 Graph Mode

- `.nodeide/knowledge/*.json` + md 内容策略（Phase1 可“一树一 md”）
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

## 3) README 里建议加一句（产品定位）

- CodeGraph（手工图）：适合知识树/自定义结构/跨文件引用
- FS Mirror Graph（默认视图）：适合“左侧结构 ⇄ 画布结构语义一一对应”的工作流（Frame 折叠懒加载保证性能）

## License

TBD
