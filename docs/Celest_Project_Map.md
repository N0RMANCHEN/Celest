# Celest Project Map（学习版）

> 这份文档面向“**不精通代码但要能指挥 AI**”的你：让你在 **10–20 分钟**内建立“这个项目怎么跑、哪里改什么”的心智模型。  
> 仓库样本来源：你上传的 `Celest.zip`（Vite + React + TS + Zustand + Vitest + CodeMirror）。

---

## 0. 你先记住这一句就够了

**Celest 的主链路是：**  
**Shell（装配 UI） → Store（Zustand slices） → Usecases（features/project） → Persistence（core/persistence） → Entities（domain types/ops）**

你以后 debug / 加功能，只要沿着这条链路往前追，就不会迷路。

---

## 1. 仓库顶层结构（只看这些就够）

```text
├─ docs/
│  ├─ architecture-checklist.md
│  ├─ architecture-decisions.md
│  ├─ architecture.md
│  └─ code-quality-standards.md
├─ public/
│  ├─ assets/
│  └─ Celest.svg
├─ scripts/
│  ├─ check-architecture.js
│  └─ check-code-quality.js
├─ src/
│  ├─ app/
│  ├─ config/
│  ├─ core/
│  ├─ entities/
│  ├─ features/
│  ├─ layout/
│  ├─ pages/
│  ├─ shared/
│  ├─ shell/
│  ├─ state/
│  ├─ index.css
│  └─ main.tsx
├─ .gitignore
├─ AGENT.md
├─ contributing_ai.md
├─ eslint.config.js
├─ index.html
├─ LICENSE
├─ package-lock.json
├─ package.json
├─ README.md
├─ tsconfig.app.json
├─ tsconfig.json
├─ tsconfig.node.json
├─ vite.config.ts
└─ vitest.config.ts
```

### 关键入口文件（顶层）
- `README.md`：产品范围 + 目录导览（有些描述会比代码“更理想”，以代码为准）
- `AGENT.md` / `contributing_ai.md`：协作/改动规则（你的“护栏”）
- `docs/architecture.md`：分层原则（entities/core/state/features/shell/shared）
- `scripts/check-architecture.js`：架构护栏（防止跨层耦合）
- `package.json`：脚本与依赖（`dev/test/build/check:*`）

---

## 2. src/ 结构总览（你要建立“层级感”）

```text
├─ app/
│  ├─ App.tsx
│  └─ bootstrap.ts
├─ config/
│  ├─ app.ts
│  ├─ canvas.ts
│  └─ hotkeys.ts
├─ core/
│  ├─ ai/
│  ├─ compile/
│  └─ persistence/
├─ entities/
│  ├─ canvas/
│  ├─ fsIndex/
│  ├─ graph/
│  ├─ node/
│  └─ project/
├─ features/
│  ├─ canvas/
│  ├─ fsIndex/
│  ├─ inspector/
│  ├─ md/
│  ├─ project/
│  ├─ terminal/
│  └─ views/
├─ layout/
│  ├─ Dock.tsx
│  ├─ resizable.css
│  ├─ ResizablePane.tsx
│  ├─ SplitPane.tsx
│  ├─ StackPane.tsx
│  └─ styles.css
├─ pages/
│  ├─ HomePage.tsx
│  └─ WorkspacePage.tsx
├─ shared/
│  ├─ styles/
│  ├─ types/
│  ├─ utils/
│  ├─ ErrorBoundary.test.tsx
│  └─ ErrorBoundary.tsx
├─ shell/
│  ├─ workbench/
│  ├─ AppShell.tsx
│  ├─ Home.test.tsx
│  ├─ Home.tsx
│  ├─ TopTabs.tsx
│  └─ Workspace.tsx
├─ state/
│  ├─ hooks/
│  ├─ selectors/
│  ├─ slices/
│  ├─ utils/
│  ├─ store.ts
│  └─ types.ts
├─ index.css
└─ main.tsx
```

### 每一层干什么（背下来）
- `src/entities/`：领域模型（**纯类型 + ops + registry**，不依赖 React）
- `src/core/`：纯逻辑（重点是 `core/persistence` 文件读写/迁移/备份）
- `src/state/`：Zustand 单 store + slices（“产品状态中枢”，尽量不写 UI）
- `src/features/`：面向用户的能力模块（canvas / fsIndex / inspector / project / …）
- `src/shell/`：Figma-like 壳（TopTabs/Home/Workspace/LeftSidebar 只做装配）
- `src/app/`：应用入口装配（bootstrap、全局热键等）
- `src/shared/`：通用组件/样式/工具

---

## 3. 你从哪里开始读（最短路径）

> 目标：**20 分钟内搞清楚“启动→打开项目→画布→保存”**。

### 3.1 启动链路（App 怎么起来）
1. `src/main.tsx`：挂载 React；调用 `bootstrap()`
2. `src/app/bootstrap.ts`：  
   - hydrate recents（IndexedDB）  
   - 绑定全局热键（Cmd/Ctrl+S 保存）  
   - 禁用浏览器默认右键/部分快捷键
3. `src/app/App.tsx`：只渲染 `AppShell`
4. `src/shell/AppShell.tsx`：根据 `activeProjectId` 决定显示 Home 还是 Workspace

---

## 4. 核心工作流地图（你要用这个来“指挥 AI”）

### 4.1 打开项目（Open Folder）
**你要记住的“入口→中枢→落盘”路径：**

- UI：`src/shell/Home.tsx`（点按钮）
- Store：`src/state/slices/projectSlice.ts`  
  - `openProjectFolder()` / `reopenRecent()`
- Usecase：`src/features/project/usecases.ts`
- Build project：`src/features/project/openProject.ts`  
  - `scanFsMeta()` → 扫描 FS 元信息（**只做导航**）
  - `ensureWorkspaceFile()` → 读/建 `/.celest/workspace.json`
  - `loadMainGraph()` / `saveMainGraph()` → 读/写 `/.celest/graphs/main.json`
- 落盘实现：`src/core/persistence/loadSave.ts` + `nodeideSchema.ts`

> **记忆点**：Open Project 的“产物”是一个 `ProjectState`（见 `entities/project/types.ts`）  
> 里面带着：`dirHandle`（目录句柄）、`graph`（CodeGraph）、`views`（viewport）、FS meta snapshot。

---

### 4.2 画布编辑（Canvas）
Canvas 在 Celest 里是个完整模块（自研 SVG 画布），结构很清晰：

```text
├─ adapters/
│  ├─ codeGraphToCanvas.test.ts
│  └─ codeGraphToCanvas.ts
├─ components/
│  ├─ CanvasBackground.test.tsx
│  ├─ CanvasBackground.tsx
│  ├─ CanvasEdge.tsx
│  ├─ CanvasNode.test.tsx
│  ├─ CanvasNode.tsx
│  ├─ ConnectionLine.tsx
│  ├─ NodeHandle.test.tsx
│  ├─ NodeHandle.tsx
│  └─ SelectionBox.tsx
├─ config/
│  └─ constants.ts
├─ core/
│  ├─ BoxSelection.test.ts
│  ├─ BoxSelection.ts
│  ├─ canvasBounds.ts
│  ├─ connection.test.ts
│  ├─ connection.ts
│  ├─ DragManager.test.ts
│  ├─ DragManager.ts
│  ├─ SelectionManager.test.ts
│  ├─ SelectionManager.ts
│  ├─ ViewportManager.test.ts
│  └─ ViewportManager.ts
├─ hooks/
│  ├─ useBoxSelection.test.tsx
│  ├─ useBoxSelection.tsx
│  ├─ useCanvasConnection.test.tsx
│  ├─ useCanvasConnection.ts
│  ├─ useCanvasDrag.ts
│  ├─ useCanvasEdgePositions.ts
│  ├─ useCanvasFocus.test.tsx
│  ├─ useCanvasFocus.ts
│  ├─ useCanvasKeyboard.ts
│  ├─ useCanvasMouseEvents.ts
│  ├─ useCanvasPanZoom.ts
│  ├─ useCanvasSelection.ts
│  ├─ useCanvasState.ts
│  └─ useCanvasWheel.ts
├─ utils/
│  ├─ edgeRouting.test.ts
│  ├─ edgeRouting.ts
│  ├─ geometry.test.ts
│  └─ geometry.ts
├─ BottomToolbar.tsx
├─ Canvas.integration.test.tsx
├─ Canvas.tsx
├─ canvasController.ts
├─ canvasEvents.ts
└─ types.ts
```

你读 Canvas 的顺序建议：
1. `features/canvas/Canvas.tsx`：画布主组件（SVG 渲染 + 装配 hooks/components）
2. `features/canvas/canvasController.ts`：把“Canvas 事件”翻译成 store 操作
3. `features/canvas/adapters/codeGraphToCanvas.ts`：**领域模型 → 画布 view model**（很关键！）
4. `features/canvas/core/*`：Viewport/Selection/Drag/BoxSelection（这里是交互算法核心）
5. `features/canvas/hooks/*`：把 DOM 事件（鼠标/键盘/滚轮）转成 core 行为

> **记忆点**：Canvas 不是 source-of-truth；**source-of-truth 在 store 的 CodeGraph**（`entities/graph/types.ts`）。

---

### 4.3 保存（Save）
保存是“最像资深工程师”的地方：有 debounce、状态机、错误格式化、回写 UI state。

- 热键入口：`src/app/bootstrap.ts` → `flushActiveProjectSave({ reason: "hotkey" })`
- 核心逻辑：`src/state/slices/persistenceSlice.ts`
  - 写 `main.json`（graph）
  - 写 `workspace.json`（views + fsTree ui + canvas selection）
- IO 实现：`src/core/persistence/loadSave.ts`
- Schema：`src/core/persistence/nodeideSchema.ts`
- 错误统一：`src/core/persistence/errors.ts`

---

### 4.4 Inspector（右侧面板）
- UI：`src/features/inspector/InspectorPanel.tsx`
- 编辑器：`CodeMirrorEditor.tsx`（注意：这里是 CodeMirror，不是 Monaco）
- Inspector 需要的数据来自 selectors（见 `src/state/selectors/inspectorSelectors.ts`）

> 当前 Phase 1：Note 节点内容直接存在 graph 里（`NoteNode.text`），并随 graph 保存到 `main.json`。

---

### 4.5 FS Index（左侧文件树导航）
- 扫描：`src/features/fsIndex/scanFsMeta.ts` / `buildFsIndex.ts`
- Store：`src/state/slices/fsIndexSlice.ts`
- Selector：`src/features/fsIndex/fsIndexSelectors.ts` + `src/state/selectors/fsIndexSelectors.ts`

> **记忆点**：FS Index **不持久化**（每次打开项目重新扫描），UI 展开/选中状态才持久化。

---

## 5. 领域模型（你要知道有哪些“核心对象”）

```text
├─ canvas/
│  └─ canvasEvents.ts
├─ fsIndex/
│  └─ types.ts
├─ graph/
│  ├─ ops.test.ts
│  ├─ ops.ts
│  ├─ registry.ts
│  └─ types.ts
├─ node/
│  ├─ ports.ts
│  └─ registry.ts
└─ project/
   └─ types.ts
```

你最该读的 3 个文件：
- `entities/graph/types.ts`：CodeGraph 的 nodes/edges 形状（note/fileRef/frame/group/subgraphInstance）
- `entities/graph/ops.ts`：对 graph 的纯操作（创建/更新/删除/选择等）
- `entities/graph/registry.ts`：节点类型注册表（label/icon/ports）

---

## 6. Persistence（落盘格式与迁移：可靠性核心）

```text
├─ backup.test.ts
├─ backup.ts
├─ errors.test.ts
├─ errors.ts
├─ loadSave.test.ts
├─ loadSave.ts
├─ migration.test.ts
├─ migration.ts
├─ nodeideSchema.test.ts
└─ nodeideSchema.ts
```

你要理解的点：
- `nodeideSchema.ts`：定义 `/.celest/` 目录结构 + `workspace.json` / `main.json` 的 schema
- `loadSave.ts`：ensure/load/save 的真实实现
- `migration.ts`：旧 `.nodeide/` → 新 `.celest/` 的迁移
- `backup.ts`：损坏/读写错误时的备份恢复

---

## 7. Store（Zustand slices：产品中枢）

```text
├─ hooks/
│  └─ useWorkbenchModel.ts
├─ selectors/
│  ├─ fsIndexSelectors.test.ts
│  ├─ fsIndexSelectors.ts
│  ├─ graphSelectors.ts
│  ├─ inspectorSelectors.ts
│  ├─ projectSelectors.ts
│  ├─ uiSelectors.ts
│  ├─ workbenchSelectors.test.ts
│  └─ workbenchSelectors.ts
├─ slices/
│  ├─ editorSlice.test.ts
│  ├─ editorSlice.ts
│  ├─ fsIndexSlice.test.ts
│  ├─ fsIndexSlice.ts
│  ├─ graphSlice.test.ts
│  ├─ graphSlice.ts
│  ├─ persistenceSlice.test.ts
│  ├─ persistenceSlice.ts
│  ├─ projectSlice.test.ts
│  ├─ projectSlice.ts
│  ├─ shellSlice.test.ts
│  ├─ shellSlice.ts
│  ├─ terminalSlice.test.ts
│  ├─ terminalSlice.ts
│  ├─ viewSlice.test.ts
│  └─ viewSlice.ts
├─ utils/
│  ├─ projectUtils.test.ts
│  └─ projectUtils.ts
├─ store.ts
└─ types.ts
```

你只需要记住：
- `state/store.ts`：拼接所有 slice
- `state/types.ts`：AppState 的总类型
- `state/slices/*`：各领域状态（project/view/graph/fsIndex/editor/terminal/persistence）
- `state/selectors/*`：给 UI 用的“读模型”（强烈建议优先用 selectors 而不是直接拼 state）

---

## 8. “改需求/修 bug 时，我该去哪里？”

### 我想改：打开项目/最近项目
- `state/slices/projectSlice.ts`
- `features/project/usecases.ts` / `openProject.ts`
- `core/persistence/*`

### 我想改：画布交互（拖拽/缩放/框选/连线）
- `features/canvas/core/*`（算法）
- `features/canvas/hooks/*`（DOM 事件）
- `features/canvas/canvasController.ts`（事件→store）

### 我想加一个新节点类型（比如 “Task”）
- `entities/graph/types.ts`（加 kind + node shape）
- `entities/graph/registry.ts`（label/icon/ports）
- `entities/graph/ops.ts`（创建/更新操作）
- `features/canvas/adapters/codeGraphToCanvas.ts`（渲染需要的 VM）
- `features/canvas/components/CanvasNode.tsx`（表现层）
- `features/inspector/InspectorPanel.tsx`（编辑 UI）

### 我想改：持久化格式 / 版本升级
- `core/persistence/nodeideSchema.ts`
- `core/persistence/migration.ts`
- 对应的 `.test.ts`（一定要补）

---

## 9. 你现在最该做的“学习动作”（不需要懂语法）

做完这 3 个追踪，你就能像“半个资深工程师”一样指挥 AI 了：

1) **追踪一次启动**：`main.tsx → bootstrap.ts → AppShell.tsx`  
2) **追踪一次 open folder**：`Home.tsx → projectSlice.openProjectFolder → usecases → openProject.ts → loadSave.ts`  
3) **追踪一次“拖拽节点→自动保存”**：`Canvas hooks/core → graphSlice 更新 → persistenceSlice debounce 保存`

---

## 10. 术语小抄（给不写代码的你）

- **Entity**：领域对象（graph/node/project 等），尽量不带 UI 细节  
- **Usecase**：把多个低层能力串起来的“应用动作”（openProject/saveProject）  
- **Slice**：store 中的一块状态 + 操作集合  
- **Selector**：把 raw state 变成 UI 需要的 view model  
- **Invariant（不变量）**：永远必须成立的规则（比如 zoom 范围、schema 合法）  
- **Observability（可观测性）**：日志/断言/测试/错误信息，让你能定位问题  
