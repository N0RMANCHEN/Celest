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

## 11. Success Criteria

A contribution is successful if:

- It aligns with AGENT.md
- It preserves existing behavior
- It advances the current Step goal
- It does not introduce hidden state
