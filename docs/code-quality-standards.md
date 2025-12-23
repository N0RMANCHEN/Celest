# 代码质量与架构检查标准

本文档详细说明代码质量检查脚本和架构检查脚本的评估标准。

---

## 一、代码质量检查标准 (`check-code-quality.js`)

### 1.1 文件大小标准

**目的**：确保代码文件不会过大，便于维护和理解。

#### 评估标准：

- **✅ 正常**：文件 ≤ 300 行
- **⚠️ 警告**：文件 > 300 行且 ≤ 500 行（建议拆分）
- **❌ 错误**：文件 > 500 行（必须拆分）

#### 为什么这样设置？

- **300 行**：一个屏幕大约可以显示 30-50 行代码，300 行大约需要 6-10 屏，这是人类可以轻松理解的合理范围
- **500 行**：超过 500 行的文件通常包含多个职责，难以维护和测试

#### 示例：

```typescript
// ✅ 正常：200 行的文件
src/utils/helper.ts: 200 行

// ⚠️ 警告：350 行的文件（建议拆分）
src/features/canvas/Canvas.tsx: 350 行

// ❌ 错误：600 行的文件（必须拆分）
src/core/persistence/loadSave.ts: 600 行
```

---

### 1.2 圈复杂度标准

**目的**：衡量代码的控制流复杂度，确保代码逻辑清晰。

#### 评估标准：

- **✅ 正常**：圈复杂度 ≤ 15
- **⚠️ 警告**：圈复杂度 > 15（建议重构）

#### 什么是圈复杂度？

圈复杂度（Cyclomatic Complexity）是衡量代码复杂度的指标，基于以下控制流元素：
- `if` / `else` 语句
- `for` / `while` 循环
- `switch` / `case` 语句
- `catch` 异常处理
- 逻辑运算符：`&&`、`||`、`?`、`??`

**计算公式**：基础复杂度 1 + 所有控制流元素数量

#### 为什么阈值是 15？

- **1-10**：简单函数，易于理解和测试
- **11-15**：中等复杂度，需要仔细阅读
- **16-20**：高复杂度，建议重构
- **> 20**：非常复杂，难以维护和测试

#### 示例：

```typescript
// ✅ 简单函数（复杂度 3）
function add(a: number, b: number): number {
  if (a < 0) return 0;  // +1
  if (b < 0) return 0;  // +1
  return a + b;        // 基础 1
}

// ⚠️ 复杂函数（复杂度 18）
function processData(data: any) {
  if (!data) return;           // +1
  if (data.type === 'A') {     // +1
    for (const item of data.items) {  // +1
      if (item.valid && item.active) {  // +1
        // ... 更多嵌套逻辑
      }
    }
  } else if (data.type === 'B') {  // +1
    // ... 更多逻辑
  }
  // ... 更多条件分支
}
```

---

### 1.3 检查范围

#### 包含的文件：
- `.ts`、`.tsx`、`.js`、`.jsx` 源代码文件

#### 排除的文件：
- `node_modules/` 目录
- `dist/` 构建输出目录
- `_legacy/` 遗留代码目录
- `*.test.ts`、`*.test.tsx` 测试文件
- `*.spec.ts`、`*.spec.tsx` 测试文件

**原因**：测试文件通常需要模拟复杂场景，允许更高的复杂度。

---

## 二、架构检查标准 (`check-architecture.js`)

### 2.1 分层边界规则

**目的**：确保代码遵循 Clean Architecture 原则，保持各层之间的清晰边界。

#### 规则 1：Domain 层不能依赖 UI

**规则**：`entities/` 和 `core/` 不能导入 React

**检查内容**：
- 禁止导入：`react`、`react-dom`

**为什么？**
- `entities/` 是领域模型，应该与 UI 框架无关
- `core/` 是核心业务逻辑，应该可以在任何环境中运行（Node.js、浏览器等）
- 违反此规则会导致领域逻辑与 UI 框架耦合，难以测试和复用

**示例**：

```typescript
// ❌ 错误：entities/ 中导入 React
// src/entities/graph/types.ts
import { useState } from "react";  // ❌ 违规！

// ✅ 正确：entities/ 中只使用纯 TypeScript
// src/entities/graph/types.ts
export type CodeGraphNode = {
  id: string;
  kind: string;
};
```

---

#### 规则 2：State 层不能依赖 UI 引擎

**规则**：`state/` 不能导入 UI 引擎类型

**检查内容**：
- 禁止导入：`reactflow`、`monaco`、`@monaco-editor`

**为什么？**
- `state/` 是状态管理层，应该与具体的 UI 库解耦
- 如果 state 依赖 UI 引擎，更换 UI 库时需要修改 state 层
- 应该通过 adapter 或契约类型来隔离 UI 引擎

**示例**：

```typescript
// ❌ 错误：state/ 中导入 ReactFlow 类型
// src/state/slices/graphSlice.ts
import type { Node } from "reactflow";  // ❌ 违规！

// ✅ 正确：使用契约类型
// src/entities/canvas/canvasEvents.ts
export type CanvasNodeChange = {
  id: string;
  type: "position" | "data";
  // ...
};

// src/state/slices/graphSlice.ts
import type { CanvasNodeChange } from "../../entities/canvas/canvasEvents";  // ✅ 正确
```

---

### 2.2 依赖方向规则

**目的**：确保依赖方向正确，遵循依赖倒置原则。

#### 规则 3：Core 层不能向上依赖

**规则**：`core/` 不能依赖 `features/`、`shell/`、`state/`

**检查内容**：
- 禁止相对路径导入：`../../features/`、`../../shell/`、`../../state/`
- 禁止直接导入这些模块

**为什么？**
- `core/` 是最底层，应该被上层依赖，而不是依赖上层
- 违反此规则会导致循环依赖和架构混乱
- `core/` 应该只依赖 `entities/` 或外部库

**依赖方向应该是**：
```
UI (shell/features) 
  ↓
State
  ↓
Domain (entities)
  ↓
Core
```

**示例**：

```typescript
// ❌ 错误：core/ 向上依赖
// src/core/persistence/loadSave.ts
import { useAppStore } from "../../state/store";  // ❌ 违规！

// ✅ 正确：core/ 只依赖 entities
// src/core/persistence/loadSave.ts
import type { CodeGraphModel } from "../../entities/graph/types";  // ✅ 正确
```

---

#### 规则 4：Entities 层不能向上依赖

**规则**：`entities/` 不能依赖 `state/`、`features/`、`shell/`

**检查内容**：
- 禁止相对路径导入：`../../state/`、`../../features/`、`../../shell/`

**为什么？**
- `entities/` 是领域模型，应该是最纯净的，不依赖任何框架或应用层
- 违反此规则会导致领域模型与应用逻辑耦合
- `entities/` 应该只包含类型定义和纯函数

**示例**：

```typescript
// ❌ 错误：entities/ 向上依赖
// src/entities/graph/types.ts
import { useAppStore } from "../../state/store";  // ❌ 违规！

// ✅ 正确：entities/ 只包含类型定义
// src/entities/graph/types.ts
export type CodeGraphNode = {
  id: string;
  kind: string;
};
```

---

### 2.3 检查方法

#### 检查方式：

1. **扫描所有 `.ts` 和 `.tsx` 文件**
2. **检查 import 语句**：
   - 检查是否导入了禁止的包（如 `react`、`reactflow`）
   - 检查相对路径导入是否违反了依赖方向
3. **报告违规**：
   - 显示违规文件路径
   - 显示违规行号
   - 显示具体的违规内容

#### 检查示例：

```typescript
// 文件：src/core/persistence/loadSave.ts
// 第 5 行：
import { useAppStore } from "../../state/store";  // ❌ 违规！

// 检查脚本会报告：
// 📄 src/core/persistence/loadSave.ts:
//    行 5: core/ 不能依赖 features/shell/state
//    向上依赖: state
```

---

## 三、如何使用

### 3.1 运行检查

```bash
# 代码质量检查
npm run check:quality

# 架构检查
npm run check:architecture

# 运行所有检查
npm run check:all
```

### 3.2 在 CI/CD 中集成

可以在 GitHub Actions、GitLab CI 等 CI/CD 流程中运行：

```yaml
# .github/workflows/ci.yml
- name: Check Code Quality
  run: npm run check:quality

- name: Check Architecture
  run: npm run check:architecture
```

### 3.3 修复建议

#### 文件过大（> 500 行）：
1. 识别文件中的不同职责
2. 将相关功能提取到独立的文件或模块
3. 使用 hooks、utils、components 等拆分

#### 圈复杂度过高（> 15）：
1. 提取复杂条件到独立函数
2. 使用策略模式或状态机替代大量 if-else
3. 拆分大函数为多个小函数

#### 架构违规：
1. 识别违规的导入语句
2. 使用 adapter 模式隔离 UI 依赖
3. 使用契约类型（contract types）替代直接依赖
4. 重构代码以遵循正确的依赖方向

---

## 四、标准调整

如果需要调整标准，可以修改脚本中的配置：

### 代码质量标准（`check-code-quality.js`）：

```javascript
const MAX_FILE_LINES = 500;      // 最大文件行数
const WARN_FILE_LINES = 300;     // 警告阈值
const MAX_COMPLEXITY = 15;       // 最大圈复杂度
```

### 架构规则（`check-architecture.js`）：

```javascript
const ARCHITECTURE_RULES = {
  noReactInDomain: {
    paths: ["entities", "core"],
    forbidden: ["react", "react-dom"],
    // ...
  },
  // ...
};
```

---

## 五、总结

### 代码质量检查关注：
- ✅ 文件大小（可维护性）
- ✅ 圈复杂度（代码清晰度）

### 架构检查关注：
- ✅ 分层边界（UI 与 Domain 解耦）
- ✅ 依赖方向（正确的依赖关系）

这些标准基于业界最佳实践，旨在：
1. **提高代码可维护性**：小文件、低复杂度
2. **保持架构清晰**：清晰的层次和依赖关系
3. **便于测试**：解耦的代码更容易测试
4. **支持重构**：清晰的边界便于未来重构

