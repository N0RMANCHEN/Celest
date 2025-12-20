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

---

## 4. State Management Rules

- Zustand only
- One store
- Multiple slices
- No global mutable state

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
- Store provider‑specific data

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
- A change would affect persistence schema

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

## 8. Commit‑Level Discipline (Mental Model)

Think in **Git commits**:

- Each step should be reversible
- Each step should be reviewable
- Each step should compile

---

## 9. Success Criteria

A contribution is successful if:

- It aligns with AGENT.md
- It preserves existing behavior
- It advances the current Step goal
- It does not introduce hidden state

---

**If unsure — stop and ask.**

