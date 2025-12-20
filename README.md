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

## Roadmap（执行版 / 2025-12-20）

> 原则：严格遵守 `AGENT.md` 与 `contributing_ai.md`
>
> - 一次只改一个文件（或一个最小变更集合），交付可复制粘贴的完整文件
> - 不删除旧代码：旧实现只移动到 `src/_legacy/`（保留历史）
> - Phase 1 只做 BrowserAdapter；持久化固定写入项目根目录 `/.nodeide/`
> - Canvas 通过 adapter 隔离 React Flow 数据结构，避免业务绑死实现细节

### P1（“真正像产品” + 对齐你期望的文件/节点语义 + 分层洁净）

**P1 目标**

- 交互闭环更完整（创建/选中/删除/编辑/保存/重开）
- “文件树 ↔ Canvas 节点”建立明确的、可控的映射机制（但不破坏 FS Index ≠ CodeGraph 的边界）
- 代码分层更干净，为后续 Subgraph / Knowledge Tree 做基座

#### P1-Task-1：节点删除（Delete UX 闭环）

- 交付：选中节点后可通过 Delete/Backspace 删除（并同步删除相关 edges）
- 同时提供一个显式入口：TopBar / Inspector 里的 “Delete Node” 按钮（避免只靠快捷键）

#### P1-Task-2：文件树与节点的“对齐策略”落地（你提出的：每个文件=一个 Node）

> 注意：保持 FS Index ≠ CodeGraph 的硬边界，但允许“显式导入/映射”

- 交付（最小可用）：
  - 在左侧文件树对文件提供动作：**Add to Canvas** → 创建 `fileRef` 节点（path 指向该文件）
  - 对文件夹提供动作：**Add Folder as Frame** → 创建 `frame` 节点（容器语义）
  - Group 仍为用户手动创建（UI-only）
- 约束：
  - 默认不自动把整个项目“全量生成节点”（避免性能灾难）
  - 允许“对某个 folder 显式生成一层节点”的模式（可做增量）

#### P1-Task-3：FS Index id 稳定化（path-based id）

- 交付：同一路径重复打开项目，FS 条目 id 不变
- 修复：展开状态/选中状态不再每次丢失

#### P1-Task-4：Inspector 根据扩展名自动选择 Monaco language

- 交付：.ts/.json/.md 等语言正确，不再全部当 markdown

#### P1-Task-5：文件内容编辑闭环（右侧 Inspector 真正编辑真实文件）

- 交付（最小可用）：
  - 在 FS Tree 选中一个文件：Inspector 读取文件内容并可保存回文件
  - 明确策略：Phase 1 优先支持 `.md`（其余文本文件可读写但先不保证语法特性）

#### P1-Task-6：ProjectState / ViewState 归位（entities 层）

- 交付：把核心类型收敛到 `entities/project/types.ts`
- 清理：features/state 中零散占位 types 收敛

#### P1-Task-7：BottomToolbar（正式实现 + SplitPane 可拖拽调整）

- 交付：BottomToolbar 回归（非 legacy），SplitPane 支持拖拽调整 panel 尺寸
- Canvas 永远优先占满剩余空间

---

### P2（对齐长期架构：Subgraph / Knowledge Tree / 插件化节点注册）

**P2 目标**

- 做好“未来一定要用”的结构占位，避免后期大返工

#### P2-Task-1：Subgraph（definition/instance + IO ports + schema version）

- 交付：能创建 SubgraphDefinition（哪怕不可用），序列化/反序列化不破

#### P2-Task-2：Knowledge Tree（MD Skill Tree）最小落地

- 交付：从 md 入口 “Open as Skill Tree” 生成最小节点结构（todo/doing/done + summary）

#### P2-Task-3：节点类型 plugin registry 强化

- 交付：新增 node type 不需要改一堆核心文件（UI + ports/spec + validate + compile/codegen + aiHints）

#### P2-Task-4：架构健康度 checklist

- 交付：`docs/architecture-checklist.md`（FS Index / CodeGraph 分离、adapter 隔离、slice 边界、序列化纯净等）

## License

TBD
