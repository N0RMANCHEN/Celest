# CONTRIBUTING_AI.md

> Rules for AI agents (Codex / GPT / others) contributing to **Celest**.
> This document is **binding**.

---

## 1. Read Order (Mandatory)

Before writing or modifying any code, AI agents must read:

1. `AGENT.md`
2. This file (`CONTRIBUTING_AI.md`)

If there is a conflict, **AGENT.md wins**.

---

## 2. Core Principles

### 2.1 Preserve Working State

- `npm run dev` must remain functional
- No large refactors unless explicitly requested
- Never delete existing files

### 2.2 Legacy Code Handling

- Old code must be moved to:
  ```
  src/_legacy/
  ```
- Legacy code is **not required** to run

### 2.3 Separation of Concerns

AI must respect these boundaries:

- FS Index ≠ CodeGraph ≠ Knowledge Tree
- UI ≠ Domain Logic ≠ Persistence
- Canvas ≠ Business Rules

Violations require user approval.

**UI ↔ Domain 解耦守则（补充约束）**
- UI 组件只消费视图模型/事件契约，不直接操作领域模型或文件 IO。
- 交互/几何/拖拽/选中等规则放 `core/` 或 `utils/` 纯函数层，组件仅调用。
- Adapter 负责领域模型 ⇄ 视图模型转换（如 `codeGraphToCanvas`）；新增能力优先改 adapter，而非在 UI 内引用领域类型。
- 状态读写走 slices/selectors，不在组件内直接 mutate store 或拼装领域数据。
- 持久化/迁移/FS 访问留在 usecase 或 `core/persistence`，UI 事件中只触发 action。

---

## 3. How to Make Changes

### 3.1 Change Size

- One logical change per step
- Prefer additive changes
- Avoid touching unrelated files

### 3.2 File Placement

New code must go in the correct layer:

- `entities/` → stable domain models
- `features/` → user capabilities
- `state/` → Zustand slices
- `core/` → pure logic / persistence
- `shell/` → app shell only
- `shared/` → reusable UI & utilities

---

## 4. State Management Rules

- Zustand only
- One store
- Multiple slices
- No global mutable state
- No Immer in Phase 1

UI components must not mutate state directly.

---

## 5. AI-Specific Rules

### 5.1 AI Never Owns State

AI agents may:

- Generate drafts
- Suggest summaries
- Propose branches

AI agents must not:

- Persist hidden reasoning
- Mutate saved data silently
- Store provider-specific data

### 5.2 Determinism

AI outputs must be:

- Explicit
- Reviewable
- Editable by the user

---

## 6. Asking for Clarification

AI agents **must ask** when:

- Requirements are ambiguous
- Multiple architectural paths exist
- A change would affect persistence schema or any persisted `/.celest/` format

Guessing is forbidden.

---

## 7. Forbidden Actions

AI agents must not:

- Introduce new frameworks
- Change build tools
- Modify Vite config
- Add backend services
- Introduce cloud dependencies

Unless explicitly instructed.

---

## 8. Commit-Level Discipline (Mental Model)

Think in **Git commits**:

- Each step should be reversible
- Each step should be reviewable
- Each step should compile

---

## 9. MVP Guardrails (Lightweight, Required)

For any coding change, the agent must include:

- **Goal**
- **DoD** (testable)
- **Minimal Changes** (files touched, why)
- **Regression Pack** (3–5 smoke checks)
- **Final Files** (complete file contents, no diffs)
- **Self-check status** per regression item: PASS / NOT VERIFIED (and why)

Unit tests are optional during MVP unless:

- the repo already has a test runner, AND
- the change touches pure logic in `entities/` or `core/`.

---

## 10. MVP Reliability Notes (Lightweight)

- If a change touches `/.celest/` persistence formats: ask first and include a brief migration note.
- For OPEN_PROJECT / SAVE / LOAD changes: ensure clear success/failure user feedback.
- When reporting bugs: include full error output + steps to reproduce + what changed.

---

## 11. Architecture Decision Process (协作方式)

### 11.1 架构决策流程

AI agents 在发现架构问题时，必须遵循以下流程：

1. **识别问题**：发现可能违反架构原则的情况
2. **提出建议**：说明问题，并提出建议（保持现状或修改）
3. **说明理由**：解释为什么建议这样做
4. **等待决策**：由用户最终决定是否采纳

**禁止行为**：
- ❌ 直接修改代码而不说明理由
- ❌ 假设用户想要"完美架构"而过度设计
- ❌ 创建不必要的抽象层而不先说明

**正确做法**：
- ✅ 发现问题时主动提出："这里可能违反 XX 原则，但我建议保持现状，因为..."
- ✅ 说明理由：为什么这样做更好
- ✅ 尊重用户决策：用户决定是否修复或改变

### 11.2 架构原则的严格程度

**必须严格遵循的原则**：
- `entities/` 和 `core/` 不能导入 React
- `state/` 不能导入 UI 引擎类型（如 ReactFlow、Monaco）
- 持久化 schema 必须版本化
- FS Index ≠ CodeGraph ≠ Knowledge Tree（严格分离）

**可以灵活处理的情况**：
- UI 组件直接使用领域模型（如果结构简单，不需要复杂转换）
- 某些组件直接导入 `entities/` 的类型定义（如果只是类型，不是逻辑）
- 简单的数据展示不需要视图模型层

**判断标准**：
- 是否需要复杂转换？（如 Canvas 需要坐标转换、选中态等 → 需要 adapter）
- 领域模型是否包含 UI 不需要的字段？（是 → 考虑视图模型）
- 是否需要多个视图变体？（是 → 考虑视图模型）
- 如果以上都是"否"，直接使用领域模型更实用

### 11.3 架构决策记录

重要架构决策应记录在 `docs/architecture-decisions.md` 中，包括：
- 决策内容
- 决策理由
- 替代方案
- 影响范围

## 12. Success Criteria

A contribution is successful if:

- It aligns with AGENT.md
- It preserves existing behavior
- It advances the current Step goal
- It does not introduce hidden state
- It follows the architecture decision process (Section 11)
