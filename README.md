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

## Roadmap（执行版）

> 原则：严格遵守 `AGENT.md` 与 `contributing_ai.md`
>
> - 一次只改一个文件（或一个最小变更集合），交付可复制粘贴的完整文件
> - 不删除旧代码：旧实现只移动到 `src/_legacy`（保留历史）
> - Phase 1 只做 BrowserAdapter；持久化固定写入项目根目录 `/.nodeide/`
> - Canvas 通过 adapter 隔离 React Flow 数据结构，避免业务绑死实现细节

---

### P0（跑通 + 清零硬依赖/硬错误）

**目标**

- 任何人 clone 后 `npm ci && npm run dev` 必须稳定跑起来
- `npm run build` 必须通过
- UI 基本壳逻辑正确（面板开关真实生效）
- 不再依赖 `src/_legacy` 才能编译（清零编译期依赖）

**验收标准（Definition of Done）**

- ✅ `npm ci && npm run dev`：可启动，无 missing module、无 runtime crash
- ✅ `npm run build`：构建通过
- ✅ 基础闭环：打开文件夹 → 生成/写入 `/.nodeide/` → 重开项目状态可恢复
- ✅ Shell 面板开关真实生效：Left / Inspector / Terminal 可隐藏/显示且布局不崩
- ✅ FS 扫描打开常见前端项目目录不应卡死/长时间无响应
- ✅ TS strict 环境下不需要用 `any` 糊 File System Access API 类型

**执行顺序（更稳）**

1. **清零 `_legacy` 的“编译期依赖”**

   - 修复工作区引用不存在 legacy 组件文件（如 LeftSidebar 的 import）
   - 交付：构建不再因为 missing module 失败；`src/_legacy` 仅存档（不被 import）

2. **TopTabs 的 panel toggles 真正驱动 Workspace 布局显示/隐藏**

   - 现状：toggle 写入 store，但 Workspace 未消费 → “假开关”
   - 交付：左栏/右栏/底栏可隐藏/显示，布局不会崩

3. **React Flow StrictMode 下 nodeTypes/edgeTypes 警告处理**

   - 工程侧兜底：确保 nodeTypes/edgeTypes 引用稳定（组件外常量或 useMemo 且依赖稳定）
   - 同时列为 P0：升级 React Flow/@xyflow/react（最小适配，不改构建工具）
   - 交付：全仓库仅一个稳定 nodeTypes/edgeTypes 来源，不再出现 React Flow #002 告警

4. **File System Access API 的 TS 类型补齐**

   - 交付：TS strict 下不需要 any 去糊 `showDirectoryPicker` / handles / entries

5. **FS 扫描默认忽略目录**

   - 默认 ignore：`node_modules`、`.git`、`dist`、`build`、`.next`、`.cache` 等
   - 交付：打开常见前端项目目录不应卡死/长时间无响应

6. **能力兜底：不支持 File System Access API 的提示**
   - 交付：在不支持环境（如部分 Safari）能提示原因与替代方案，而不是直接报错/白屏

---

### P1（高收益 UI + 分层洁净 + `_legacy` 引用清零）

**目标**

- 壳体验更像产品（底部工具条/分隔布局回归）
- 分层更干净：entities 承担核心类型与纯逻辑
- `_legacy` 逐步可删除（import 引用清零）

**验收标准**

- ✅ BottomToolbar + SplitPane 成为正式模块（不再 import `_legacy`）
- ✅ 项目状态/视图状态的核心类型收敛到 entities 层
- ✅ 全仓 `ripgrep "_legacy"`：只剩注释/文档，不再出现在 import 中
- ✅ FS Index id 稳定（同一路径多次打开 id 不变）
- ✅ Monaco 根据扩展名自动选择 language（ts/json 不再当 markdown）

**执行顺序（建议拆步，便于回滚）**

1. **迁出 SplitPane（最小改动）**

   - 策略：原样搬迁 + 补类型/补样式变量，不顺手大改逻辑
   - 交付：SplitPane 不再依赖 `_legacy`

2. **迁出 BottomToolbar（最小改动）**

   - 同上
   - 交付：BottomToolbar 不再依赖 `_legacy`

3. **把 ProjectState / ViewState 收敛到 `entities/project/types.ts`**

   - 交付：features/slices 只引用，不再散落占位 types

4. **清理 `_legacy` 的“运行期依赖”**

   - 替换剩余所有 `import from "src/_legacy/..."` 为新路径
   - 交付：import 中 `_legacy` 清零

5. **FS Index id 稳定化（path-based id）**

   - 解决：展开状态丢失/选中丢失/引用不稳定
   - 交付：同一路径重复打开项目，id 稳定，左侧树体验可靠

6. **Inspector 的 language mapping**
   - 按扩展名选择 Monaco language（.md/.ts/.json/...）
   - 交付：打开 ts/json 不再当 markdown

> 建议：在 P1 末尾交付一份 `docs/architecture-checklist.md`（见 P2 的 checklist 项），作为后续迭代护栏。

---

### P2（对齐长期架构：插件化节点 / Subgraph / Knowledge Tree / 架构检查）

**目标**

- 把 Phase 1 的可扩展方向补齐关键占位，避免未来大返工
- 建立“架构健康度 checklist”，每次改动可对照

**验收护栏（必须持续成立）**

- ✅ FS Index / CodeGraph / Knowledge Tree 分离不被破坏（类型与持久化文件独立）
- ✅ Canvas 仍隔离 React Flow 数据结构（通过 adapter）
- ✅ Zustand slice 边界清晰；序列化数据来自 entities/core，而不是 UI 临时结构

**内容**

1. **Subgraph：数据结构占位完善 + 最小序列化闭环**

   - definition/instance、IO ports、schema 版本化（import/export）
   - 交付：可创建 SubgraphDefinition（哪怕不可用），序列化/反序列化不破

2. **Knowledge Tree（MD Skill Tree）最小落地**

   - `.nodeide/knowledge/*.json` + md 内容策略（Phase1 可“一树一 md”）
   - 交付：能从 md 入口 “Open as Skill Tree”，生成最小节点结构（todo/doing/done + summary）

3. **节点类型 plugin registry 强化**

   - UI + ports/spec + validate + compile/codegen + aiHints 结构更明确
   - 交付：新增一个 node type 不需要改一堆核心文件

4. **产品级架构检查清单**
   - 输出：`docs/architecture-checklist.md`
   - 交付：给出可勾选 checklist（FS Index / CodeGraph 分离、adapter 隔离、slice 边界、序列化纯净等）

## License

TBD
