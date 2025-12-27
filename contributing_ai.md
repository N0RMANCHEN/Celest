# CONTRIBUTING_AI.md

> Rules for AI agents (Codex / GPT / others) contributing to **Celest**.  
> This document is **binding**. If there is a conflict, **AGENT.md wins**.

---

## 0. Scope（Dev AI vs Runtime AI）

- 本文件约束的是 **Dev AI（开发协作）**：用于 Cursor/Windsurf/VSCode Agent/Codex 等 AI 编程工具如何改动仓库。
- Celest 产品内置的“图驱动 AI”属于 **Runtime AI**：其输出应遵循 GraphPatch 合约（strict JSON ops），由应用校验/预览后再应用（详见 `docs/ai/runtime/`）。

---

## 1. Read Order (Mandatory)

Before writing or modifying any code, AI agents must read:

1. `AGENT.md`
2. `CONTRIBUTING_AI.md` (this file)

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

### 2.4 UI ↔ Domain 解耦守则（补充约束）

- UI 组件只消费视图模型/事件契约，不直接操作领域模型或文件 IO。
- 交互/几何/拖拽/选中等规则放 `core/` 或 `entities/` 的纯函数层，组件仅调用。
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
- `state/` → Zustand slices/selectors
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

### 4.1 Selection Semantics (Primary + Multi-select)

多选与批量能力必须遵循统一语义（否则会破坏 Inspector 与 Runtime AI 的一致性）：

- Store 中必须区分：`selectedIds`（选中集合）与 `primaryId`（主选中）
- 多选时 Inspector 采用 Accordion：默认展开 `primaryId`，其余折叠；允许用户展开查看更多
- 任何新引入的批量操作（Delete、Batch edit、AI Load selection 等）都以 `selectedIds` 为作用域

禁止事项：

- 禁止把“最后点击的节点”隐式当作 primary（必须显式维护 `primaryId`）
- 禁止在未征得用户同意的情况下更改 selection 状态结构或持久化格式

## 5. AI Feature Rules (Planned, Binding When Implemented)

> These rules apply to any future “AI panel / model calls” work.

### 5.1 Context Pack Must Be Visible

If any model call is introduced:

- The app must build a **Context Pack** from explicit user selection.
- The user must be able to preview and edit the pack **before** sending it.
- Provide rough size estimate (chars / token estimate).
- Never silently upload arbitrary files or the whole repo.

### 5.2 Output Must Be Draft-first

- Model output must be represented as **GraphPatch/GraphOps** (node/edge CRUD) or editable text.
- Apply changes as **Draft** on the canvas first.
- User must be able to Apply / Discard / Undo.

### 5.3 Overflow Strategy (Must)

When selection is large:

- Prefer per-node `summary`
- Then `excerpt` (e.g., first N lines)
- If still too large: require user to narrow the selection
- Never silently truncate without UI feedback

### 5.4 Deterministic Placement (Must)

All auto-generated nodes (AI or FS Mirror) must use a deterministic placer/layout and must not pile up at (0,0).

---

## 6. Asking for Clarification (Hard Rule)

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

## 11. Success Criteria

A contribution is successful if:

- It aligns with AGENT.md
- It preserves existing behavior
- It advances the current Step goal
- It does not introduce hidden state
