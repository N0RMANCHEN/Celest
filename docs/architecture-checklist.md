# 架构健康度检查清单

> 本文档用于在每次代码变更前后进行架构健康度检查，确保不违反核心架构原则。  
> 依据：`AGENT.md` 和 `CONTRIBUTING_AI.md`

---

## 检查时机

- **变更前**：确认变更不会破坏架构原则
- **变更后**：验证变更符合架构原则
- **代码审查**：作为审查清单使用

---

## 1. 分层边界检查

### 1.1 `entities/` 层

**原则**：稳定领域模型，无 UI/React 依赖

**检查项**：
- [ ] `entities/` 中的文件不导入 React 相关模块
- [ ] `entities/` 中的文件不导入 `features/` 或 `shell/` 中的模块
- [ ] `entities/` 中的类型定义不包含 UI 引擎特定类型（如 ReactFlow、Monaco 等）
- [ ] `entities/` 中的函数是纯函数（无副作用，可测试）

**违规示例**：
```typescript
// ❌ 错误：entities 层导入 React
import { useState } from "react";

// ❌ 错误：entities 层导入 UI 组件
import { Canvas } from "../features/canvas/Canvas";
```

**正确示例**：
```typescript
// ✅ 正确：只定义领域模型
export type CodeGraphModel = {
  version: number;
  nodes: Record<string, CodeGraphNode>;
  edges: Record<string, CodeGraphEdge>;
};
```

---

### 1.2 `core/` 层

**原则**：纯逻辑/持久化，无 React 依赖

**检查项**：
- [ ] `core/` 中的文件不导入 React 相关模块
- [ ] `core/` 中的文件不导入 `features/` 或 `shell/` 中的模块
- [ ] `core/` 中的函数是纯函数或只包含文件 I/O 等副作用
- [ ] `core/persistence/` 中的代码不依赖 UI 状态

**违规示例**：
```typescript
// ❌ 错误：core 层导入 React
import { useCallback } from "react";

// ❌ 错误：core 层导入 UI 组件
import { InspectorPanel } from "../features/inspector/InspectorPanel";
```

**正确示例**：
```typescript
// ✅ 正确：只包含纯逻辑和文件操作
export async function loadWorkspaceFile(
  projectDir: FileSystemDirectoryHandle
): Promise<WorkspaceFileV1> {
  // ...
}
```

---

### 1.3 `state/` 层

**原则**：Zustand slices，不直接依赖 UI 引擎类型

**检查项**：
- [ ] `state/slices/` 中的代码不导入 ReactFlow、Monaco 等 UI 引擎类型
- [ ] `state/slices/` 中的代码只使用 `entities/canvas/canvasEvents.ts` 中的契约类型
- [ ] `state/selectors/` 中的代码是纯函数（可测试）
- [ ] `state/` 中的代码不直接操作 DOM

**违规示例**：
```typescript
// ❌ 错误：state 层导入 UI 引擎类型
import type { Node, Edge } from "@xyflow/react";

// ❌ 错误：state 层直接操作 DOM
document.getElementById("canvas");
```

**正确示例**：
```typescript
// ✅ 正确：使用 canvasEvents 契约
import type { CanvasNodeChange, CanvasEdgeChange } from "../../entities/canvas/canvasEvents";
```

---

### 1.4 `features/` 层

**原则**：用户能力，通过 adapter 连接领域模型与 UI

**检查项**：
- [ ] `features/` 中的 UI 组件不直接操作 `entities/` 中的领域模型
- [ ] `features/` 中的 UI 组件通过 adapter 转换领域模型到视图模型
- [ ] `features/` 中的 usecases 封装业务逻辑，不直接暴露给 UI
- [ ] `features/canvas/` 中的组件使用 `codeGraphToCanvas` adapter

**违规示例**：
```typescript
// ❌ 错误：UI 组件直接操作领域模型
import { CodeGraphModel } from "../../entities/graph/types";
function Canvas({ graph }: { graph: CodeGraphModel }) {
  // 直接使用领域模型
}

// ❌ 错误：UI 组件直接调用持久化
import { saveMainGraph } from "../../core/persistence/loadSave";
function MyComponent() {
  saveMainGraph(...); // 应该通过 usecase 或 slice action
}
```

**正确示例**：
```typescript
// ✅ 正确：通过 adapter 转换
import { codeGraphToCanvas } from "./adapters/codeGraphToCanvas";
function Canvas({ graph }: { graph: CodeGraphModel }) {
  const { nodes, edges } = codeGraphToCanvas(graph, selectedIds);
  // 使用视图模型
}
```

---

### 1.5 `shell/` 层

**原则**：应用壳与布局，只装配，不写领域逻辑

**检查项**：
- [ ] `shell/` 中的组件只负责布局和组件组合
- [ ] `shell/` 中的组件不包含业务逻辑
- [ ] `shell/` 中的组件通过 hooks/selectors 获取数据

**违规示例**：
```typescript
// ❌ 错误：shell 层包含业务逻辑
function Workspace() {
  const graph = buildGraphFromFiles(); // 业务逻辑应该在 features/
  // ...
}
```

**正确示例**：
```typescript
// ✅ 正确：只负责布局
function Workspace() {
  const vm = useWorkbenchModel(); // 通过 hook 获取数据
  return <Canvas nodes={vm.canvasNodes} />;
}
```

---

## 2. 模型分离检查

### 2.1 FS Index ≠ CodeGraph ≠ Knowledge Tree

**原则**：三个模型必须严格分离，不能合并

**检查项**：
- [ ] FS Index 只用于导航，不渲染为画布图
- [ ] CodeGraph 是独立的可编辑图，不依赖 FS Index
- [ ] Knowledge Tree 是独立的图模式，不依赖 FS Index 或 CodeGraph
- [ ] 三个模型的数据结构不互相引用

**违规示例**：
```typescript
// ❌ 错误：合并 FS Index 和 CodeGraph
type GraphNode = {
  id: string;
  filePath: string; // 不应该直接引用文件路径
  fsEntryId: string; // 不应该直接引用 FS Index
};

// ❌ 错误：FS Index 包含画布位置
type FsIndexNode = {
  id: string;
  path: string;
  position: { x: number; y: number }; // FS Index 不应该有画布位置
};
```

**正确示例**：
```typescript
// ✅ 正确：FS Index 只用于导航
type FsIndexNode = {
  id: string;
  path: string;
  kind: "file" | "dir";
  // 不包含画布相关字段
};

// ✅ 正确：CodeGraph 独立
type CodeGraphNode = {
  id: string;
  kind: "note" | "fileRef" | "frame";
  position: { x: number; y: number };
  // 不直接引用 FS Index
};
```

---

## 3. UI ↔ Domain 解耦检查

### 3.1 UI 组件只消费视图模型/事件契约

**检查项**：
- [ ] UI 组件不直接导入 `entities/graph/types.ts` 等领域模型
- [ ] UI 组件只使用 `entities/canvas/canvasEvents.ts` 中的事件契约
- [ ] UI 组件通过 adapter 获取视图模型

**违规示例**：
```typescript
// ❌ 错误：UI 组件直接使用领域模型
import type { CodeGraphNode } from "../../entities/graph/types";
function MyComponent({ node }: { node: CodeGraphNode }) {
  // ...
}
```

**正确示例**：
```typescript
// ✅ 正确：使用视图模型
import type { CanvasNode } from "./adapters/codeGraphToCanvas";
function MyComponent({ node }: { node: CanvasNode }) {
  // ...
}
```

---

### 3.2 交互逻辑在纯函数层

**检查项**：
- [ ] 几何计算、选择规则、拖拽逻辑在 `features/canvas/core/` 或 `features/canvas/utils/`
- [ ] UI 组件只调用这些函数，不实现逻辑

**违规示例**：
```typescript
// ❌ 错误：在组件中实现逻辑
function Canvas() {
  const handleDrag = (e: MouseEvent) => {
    // 复杂的拖拽计算逻辑
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    // ...
  };
}
```

**正确示例**：
```typescript
// ✅ 正确：逻辑在纯函数层
import { updateDragPositions } from "./core/DragManager";
function Canvas() {
  const handleDrag = (e: MouseEvent) => {
    updateDragPositions(dragState, e);
  };
}
```

---

### 3.3 Adapter 负责转换

**检查项**：
- [ ] 领域模型到视图模型的转换在 adapter 中完成
- [ ] 新增 UI 能力时优先更新 adapter，而不是修改领域类型

**违规示例**：
```typescript
// ❌ 错误：在组件中转换
function Canvas({ graph }: { graph: CodeGraphModel }) {
  const nodes = Object.values(graph.nodes).map(n => ({
    id: n.id,
    // 转换逻辑在组件中
  }));
}
```

**正确示例**：
```typescript
// ✅ 正确：在 adapter 中转换
import { codeGraphToCanvas } from "./adapters/codeGraphToCanvas";
function Canvas({ graph }: { graph: CodeGraphModel }) {
  const { nodes, edges } = codeGraphToCanvas(graph, selectedIds);
}
```

---

### 3.4 状态通过 Slices/Selectors

**检查项**：
- [ ] UI 组件通过 Zustand selectors 获取数据
- [ ] UI 组件通过 slice actions 修改数据
- [ ] UI 组件不直接 mutate store 或拼装领域数据

**违规示例**：
```typescript
// ❌ 错误：直接操作 store
function MyComponent() {
  const store = useAppStore.getState();
  store.projects[0].graph.nodes["n1"] = newNode; // 直接修改
}

// ❌ 错误：在组件中拼装领域数据
function MyComponent() {
  const graph: CodeGraphModel = {
    version: 1,
    nodes: { /* 拼装逻辑 */ },
    edges: {},
  };
}
```

**正确示例**：
```typescript
// ✅ 正确：通过 slice actions
function MyComponent() {
  const updateNodeTitle = useAppStore(s => s.updateNodeTitle);
  updateNodeTitle("n1", "New Title");
}

// ✅ 正确：通过 selectors 获取数据
function MyComponent() {
  const canvasNodes = useAppStore(selectCanvasViewModel).nodes;
}
```

---

### 3.5 副作用集中在 usecase 或 core/persistence

**检查项**：
- [ ] 文件 I/O、持久化、迁移在 `core/persistence/` 或 `features/*/usecases.ts`
- [ ] UI 事件处理器只触发 state actions，不直接执行副作用

**违规示例**：
```typescript
// ❌ 错误：在 UI 组件中直接执行文件操作
function MyComponent() {
  const handleSave = async () => {
    await saveMainGraph(dirHandle, graph); // 应该在 usecase 或 slice action 中
  };
}
```

**正确示例**：
```typescript
// ✅ 正确：通过 slice action
function MyComponent() {
  const saveActiveProject = useAppStore(s => s.saveActiveProject);
  const handleSave = () => {
    saveActiveProject(); // slice action 内部调用 usecase
  };
}
```

---

## 4. 依赖方向检查

### 4.1 依赖方向规则

**原则**：依赖方向必须正确：UI → State → Domain → Core

**检查项**：
- [ ] `shell/` 可以依赖 `features/`、`state/`
- [ ] `features/` 可以依赖 `state/`、`entities/`、`core/`
- [ ] `state/` 可以依赖 `entities/`、`core/`
- [ ] `entities/` 可以依赖 `core/`
- [ ] `core/` 不依赖其他层（除了 `entities/`）

**违规示例**：
```typescript
// ❌ 错误：core 层依赖 features 层
// core/persistence/loadSave.ts
import { openProject } from "../../features/project/openProject";

// ❌ 错误：entities 层依赖 state 层
// entities/graph/types.ts
import { useAppStore } from "../../state/store";
```

**正确示例**：
```typescript
// ✅ 正确：features 层依赖 core 层
// features/project/usecases.ts
import { ensureWorkspaceFile } from "../../core/persistence/loadSave";

// ✅ 正确：state 层依赖 entities 层
// state/slices/graphSlice.ts
import type { CodeGraphModel } from "../../entities/graph/types";
```

---

## 5. Persistence Schema 检查

### 5.1 Schema 版本化

**检查项**：
- [ ] 所有持久化文件都有版本号
- [ ] Schema 变更时版本号递增
- [ ] 有对应的迁移函数

**违规示例**：
```typescript
// ❌ 错误：没有版本号
type WorkspaceFile = {
  views: ViewState[];
  // 没有 version 字段
};
```

**正确示例**：
```typescript
// ✅ 正确：有版本号
type WorkspaceFileV1 = {
  version: 1;
  views: ViewState[];
  // ...
};
```

---

### 5.2 迁移函数

**检查项**：
- [ ] 每个 schema 版本都有对应的迁移函数
- [ ] 迁移函数处理向后兼容
- [ ] 迁移失败时有降级策略

**正确示例**：
```typescript
// ✅ 正确：有迁移函数
export function migrateWorkspaceFile(
  raw: unknown,
  filePath: string
): MigrationResult<WorkspaceFileV1> {
  // 处理版本迁移
}
```

---

## 6. 代码质量检查

### 6.1 文件大小

**检查项**：
- [ ] 单个文件不超过 500 行（UI 组件可适当放宽）
- [ ] 超过 300 行的文件考虑拆分

---

### 6.2 代码重复

**检查项**：
- [ ] 没有明显的代码重复（> 20 行）
- [ ] 公共逻辑提取到辅助函数或工具函数

---

### 6.3 测试覆盖

**检查项**：
- [ ] 核心逻辑（`core/`、`entities/`）有测试
- [ ] 纯函数有测试
- [ ] 复杂业务逻辑有测试

---

## 7. 变更前检查清单

在进行任何代码变更前，请确认：

- [ ] 变更不会破坏分层边界
- [ ] 变更不会合并 FS Index / CodeGraph / Knowledge Tree
- [ ] 变更不会破坏 UI ↔ Domain 解耦
- [ ] 变更不会违反依赖方向
- [ ] 如果涉及持久化 schema，已考虑版本化和迁移
- [ ] 变更不会导致文件过大（> 500 行）
- [ ] 变更不会引入代码重复

---

## 8. 变更后验证清单

完成代码变更后，请验证：

- [ ] `npm run dev` 可以正常启动
- [ ] `npm run build` 可以正常构建
- [ ] `npm test` 所有测试通过
- [ ] 没有新的 TypeScript 错误
- [ ] 没有新的 ESLint 错误
- [ ] 变更符合架构原则（对照本清单）

---

## 9. 常见违规模式

### 9.1 在 UI 组件中直接操作领域模型

```typescript
// ❌ 错误
function Canvas({ graph }: { graph: CodeGraphModel }) {
  graph.nodes["n1"].position = { x: 100, y: 100 }; // 直接修改领域模型
}

// ✅ 正确
function Canvas({ graph }: { graph: CodeGraphModel }) {
  const { nodes } = codeGraphToCanvas(graph); // 使用视图模型
  onNodesChange([{ id: "n1", type: "position", position: { x: 100, y: 100 } }]); // 通过事件
}
```

---

### 9.2 在 state slice 中导入 UI 引擎类型

```typescript
// ❌ 错误
import type { Node, Edge } from "@xyflow/react";
export const createGraphSlice = () => ({
  onNodesChange: (nodes: Node[]) => { // 使用 UI 引擎类型
    // ...
  },
});

// ✅ 正确
import type { CanvasNodeChange } from "../../entities/canvas/canvasEvents";
export const createGraphSlice = () => ({
  onNodesChange: (changes: CanvasNodeChange[]) => { // 使用契约类型
    // ...
  },
});
```

---

### 9.3 在 core 层导入 React

```typescript
// ❌ 错误
import { useState } from "react";
export function loadWorkspaceFile() {
  const [loading, setLoading] = useState(false); // React hook
}

// ✅ 正确
export async function loadWorkspaceFile() {
  // 纯函数，无 React 依赖
}
```

---

## 10. 检查流程

### 10.1 变更前

1. 阅读本清单，确认变更不会违反原则
2. 如果涉及持久化 schema，先询问用户确认
3. 如果涉及跨层依赖，先询问用户确认

### 10.2 变更中

1. 遵循"一次只改一个文件"原则
2. 保持 `npm run dev` 可用
3. 及时运行测试

### 10.3 变更后

1. 运行完整检查清单
2. 运行 `npm run build` 确认无错误
3. 运行 `npm test` 确认测试通过
4. 更新相关文档（如需要）

---

## 11. 快速参考

### 11.1 分层职责

| 层 | 职责 | 可依赖 |
|---|---|---|
| `shell/` | 布局装配 | `features/`, `state/` |
| `features/` | 用户能力 | `state/`, `entities/`, `core/` |
| `state/` | 状态管理 | `entities/`, `core/` |
| `entities/` | 领域模型 | `core/` |
| `core/` | 纯逻辑/持久化 | 无 |

### 11.2 模型分离

- **FS Index**：文件系统导航，不渲染为画布
- **CodeGraph**：可编辑图，独立于 FS Index
- **Knowledge Tree**：知识树图模式，独立于其他模型

### 11.3 UI ↔ Domain 解耦

- UI 组件 → 视图模型/事件契约
- 交互逻辑 → 纯函数层
- 数据转换 → Adapter
- 状态操作 → Slices/Selectors
- 副作用 → Usecases/Core

---

**检查清单结束**

每次变更时，请对照本清单进行检查，确保架构健康度。

