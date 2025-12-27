# Celest — Agent Guide (AGENT.md)

> This document defines the **product vision, architecture principles, scope boundaries, and development rules** for **Celest**.  
> It is written to guide **Codex / GPT / AI agents** to work correctly inside this codebase and product direction.

> **重要**：AI agents 在发现架构问题时，应遵循 `CONTRIBUTING_AI.md` 的流程提出建议并说明理由，由用户最终决定。  
> 如果有冲突：**AGENT.md 优先**。

---

## 1. Product Identity

**Product Name:** Celest  
**Tagline (internal):** Local-first Graph Workbench for Projects & Knowledge

Celest is **not** just a code editor, and **not** just a knowledge tool.  
It is a **graph-based workbench** that lets users:

- Work with **real local projects** (files & folders)
- Express **structure and thinking** on a canvas (graphs)
- Organize **Markdown knowledge** as a branching _Skill / Knowledge Tree_
- Persist everything **inside the project** (no hidden cloud state)

AI is an **accelerator**, never the source of truth.

---

## 2. Core Product Philosophy

### 2.1 Local-First, Project-Scoped

- Every Celest workspace maps to a **real project folder**
- All metadata lives in `/.celest/` under the project root
- Users must be able to:
  - Close Celest
  - Reopen the project
  - Get **identical state** back

### 2.2 Graph Is the Source of Truth

- Canvas graphs are **not visualizations** of something else
- They are the **primary editing and reasoning surface**

### 2.3 Separation of Concerns (Non-Negotiable)

- **FS Index ≠ CodeGraph ≠ Knowledge Tree**
- Never merge these models
- Never let UI logic leak into core/domain logic

### 2.4 AI Never Owns State

- AI does **not** have persistent internal state
- AI outputs are always:
  - Suggestions
  - Summaries
  - Draft content
- Only **user-editable artifacts** are saved

---

## 3. Primary Use Cases

Celest serves three validated cognitive workflows:

1. **Exploration / Questioning**
2. **Organization / Synthesis**
3. **Learning / Skill Progression** (Skill Tree)

> North Star: “My thinking no longer disappears in chat logs — it becomes a structure I can grow.”

---

## 4. UI Shell & Layout Rules

Celest uses a **Figma-like Shell**.

### 4.1 Layout Zones

- **Top Bar**

  - Home
  - Project Tabs
  - Panel Toggles

- **Left Sidebar**

  - **Views / Pages** (VERY IMPORTANT)
    - Located **above** the file tree
    - Behaves like **Figma Pages**
    - Switches the active graph / mode
  - **FS Index Tree**
    - Real files & folders
    - Navigation only

- **Center**

  - **Canvas** (graph editor; source of truth)

- **Right Sidebar**

  - **Inspector**
  - Phase 1 uses **CodeMirror** for Markdown/text editing

- **Bottom Panel**
  - **AI Input (main tab, planned)**
    - selection-driven “summarize / branch / generate”
    - entrypoint: a small Toolbar “AI” button can toggle/open this tab (the workspace lives in Bottom Panel).
  - **Terminal (sub tab)**
    - Phase 1 placeholder (logs/output)

### 4.2 Selection Model (Primary + Selected Set)

Celest 的所有“批量能力”（Inspector 多选查看 / 批量编辑 / Runtime AI Context Pack）都依赖同一套选择语义：

- `selectedIds`: 当前选中集合（框选、Shift toggle 的结果）
- `primaryId`: 主选中（键盘焦点、Inspector 默认展开项、AI 生成锚点）

Inspector 多选 UI（Phase 1/2 约束）：

- 右侧以 **Accordion** 展示选中集合
- 默认只展开 `primaryId` 对应的节点，其余折叠；用户可逐个展开或“一键展开全部”
- 切换 Accordion 的展开项不会改变 `selectedIds`；但可以更新 `primaryId`（使其成为主选中）

Runtime AI 约束：

- Context Pack 必须包含 `selectedIds`，并尽量包含 `primaryId`（缺失时，模型必须在 `questions` 请求补齐，而不是猜测）
- 任何需要连线/摆放的动作优先锚定 `primaryId`；禁止在 (0,0) 堆叠新节点

All non-canvas panels:

- Can be hidden
- Future-proofed for resizing

---

## 5. Views (Pages) System

Views are **graph presets**, not UI filters.

- Shown at the **top of the left sidebar**
- Similar to **Figma Pages**
- Views can switch which graph/mode is active
- Phase 1 ships with **2 fixed presets**; future-extensible

---

## 6. Graph Models (Hard Boundary)

### 6.1 FS Index

- Purpose: navigation
- Mirrors file system as a snapshot/index
- Not the canvas graph by default

> Future: FS Mirror Graph Mode renders a _derived_ graph view, but the boundary still holds:
> FS Index remains navigation data; the mirror graph is a _separate_ graph mode/layout.

### 6.2 CodeGraph

- Purpose: structure, architecture, logic
- Node-based
- Plugin-driven node types

#### 6.2.1 Container Types

**1) Group**

- Logical grouping (selection/organization)
- No ports; not wireable
- Optional: can appear in FS Index as virtual items (🧩)

**2) Frame**

- Visual container; maps to folders in FS Mirror Graph Mode
- Can collapse/expand; can resize
- When collapsed, future: edges aggregate to frame badges

**3) Subgraph**

- Encapsulation + reuse (definition/instance)
- Has IO ports
- Definitions stored under `/.celest/subgraphs/<name>/`
- FS Index shows special icon (🪐)

### 6.3 Knowledge Graph (MD Skill Tree)

- Purpose: learning, research, synthesis
- Implemented as a dedicated graph mode (or Knowledge Subgraph)
- Rendered using the same Canvas engine, with different semantics

---

## 7. MD Skill Tree (Knowledge Tree)

Each knowledge node contains:

- `id`, `title`
- `status` (todo / doing / done)
- `summary` (editable)
- `body` (Markdown content)
- `parentId`
- `sources[]` (file paths, URLs, references)

Core interactions:

- Create Next / Create Branch
- Edit Summary / Edit Body
- Rename / Delete / Move
- Status toggle
- Path highlight (root → selected)

Storage strategy:

- `/.celest/knowledge/<treeId>.json` for structure/layout
- Content strategy is upgradeable (Phase 1 may start with “one tree = one md”)

> Branching stores snapshots of understanding, not AI state.

---

## 8. AI Integration Contract (Planned, Binding Rules)

### 8.1 Interaction Model: Selection → Context Pack → GraphPatch → GraphOps

AI input is always grounded by **explicit user selection**.

**Definitions (binding):**

- **Context Pack**: the _only_ context the model may use. Built from explicit user selection, with `constraints` and truncated excerpts.
- **GraphPatch (JSON envelope)**: model output, strictly machine-validated. Contains ordered `ops` (create nodes before edges).
- **GraphOps (execution layer)**: app-side domain actions derived from GraphPatch; must be deterministic and undoable.

> GraphPlan is allowed only as an internal reasoning step; it must never be persisted or applied directly.

- User selects nodes (box select / multi-select)
- System builds a **Context Pack** (previewable, editable)
- AI may internally think in a **GraphPlan** (non-executed), but its **only executable output** must be a:
  - **GraphPatch**: strict JSON envelope containing `patch.ops[]`
- The app validates GraphPatch (schema), previews it, and only then applies it as **GraphOps** (domain actions).
- Output is applied as **Draft** first, then user clicks Apply

### 8.2 Context Pack Rules (No Silent Overreach)

- Context Pack must be **visible to the user** before sending to any model
- Must support:
  - include/exclude nodes
  - per-node compression level (summary / excerpt / full)
  - rough size estimate (chars/token estimate)

### 8.3 Overflow Strategy (Must)

If selection is too large:

- Prefer node `summary`
- Then add `excerpt` (e.g., first N lines / key spans)
- If still too large: ask user to narrow scope
- Never silently truncate without telling the user

### 8.4 Draft-first Output (Must)

Prompt templates + GraphPatch schemas live under: `docs/ai/runtime/`.

- AI-generated changes land as **Draft** on the canvas (e.g., Draft Frame/Group)
- User must be able to:
  - Apply
  - Discard
  - Undo

### 8.5 Incremental Generation + Deterministic Placement (Must)

- AI/FS-generated nodes must be created **incrementally**
- Use a **deterministic layout/placer** (no “everything at origin”)

### 8.6 What AI May / Must Not Do

AI may:

- Summarize
- Suggest next branches
- Propose reorganizations

AI must not:

- Own or mutate saved state silently
- Persist hidden reasoning
- Bypass user review

---

## 9. Architecture Overview

### 9.1 Layering

- `app/` — bootstrap only
- `shell/` — global UI shell
- `features/` — user-facing capabilities
- `entities/` — stable domain models
- `core/` — pure logic & persistence
- `state/` — Zustand slices/selectors
- `shared/` — reusable UI & utilities

### 9.2 State Management

- Zustand
- Single store; multiple slices
- No Immer in Phase 1
- UI talks to state through **events/adapters**, not engine types

---

## 10. Development Rules for AI Agents

AI agents **must**:

1. Preserve all existing files (old code → `src/_legacy/`)
2. Prefer modularity and clean boundaries
3. Avoid global refactors unless requested
4. Keep `npm run dev` working at every step
5. Ask for clarification **before** schema changes under `/.celest/`
6. Stay focused on the current step

---

## 11. MVP Guardrails (Lightweight, Required)

For any coding change, the agent must also provide:

- Goal
- DoD (testable)
- Minimal changes (files touched, why)
- Regression Pack (3–5 smoke checks)
- Self-check status: PASS / NOT VERIFIED (and why)

---

## 12. Phase 1 Scope (Locked)

- Web only (browser)
- File System Access API
- **Custom SVG Canvas** (self-built engine; UI engine isolated)
- **CodeMirror** editor in Inspector
- Two fixed Views
- Bottom Panel includes Terminal placeholder (AI tab planned)

No desktop, no collaboration, no cloud sync.

---

## 13. Product North Star

If Celest is successful, users will say:

> “My thinking no longer disappears in chat logs — it becomes a structure I can grow.”

---

## Contributing & AI Execution Rules

All AI agents MUST also follow `CONTRIBUTING_AI.md`.
If there is any conflict, **AGENT.md overrides CONTRIBUTING_AI.md**.
Reading order: `AGENT.md` → `CONTRIBUTING_AI.md`.
