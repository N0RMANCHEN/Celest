# Celest — Agent Guide (AGENT.md)

> This document defines the **product vision, architecture principles, scope boundaries, and development rules** for **Celest**.  
> It is written to guide **Codex / GPT / AI agents** to work correctly inside this codebase and product direction.

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
   Branching questions and hypotheses

2. **Organization / Synthesis**  
   Turning scattered material into structured knowledge

3. **Learning / Skill Progression**  
   Planned paths with progress tracking ("skill tree")

The **MD Skill Tree** is the first _killer scenario_.

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
    - Navigation only (not graph editing)

- **Center**

  - **Canvas** (graph editor)
  - Source of truth for structure

- **Right Sidebar**

  - **Inspector**
  - Monaco editor (MD / text / fields)

- **Bottom Panel**
  - Terminal (Phase 1 placeholder)

All non-canvas panels:

- Can be hidden
- Future-proofed for resizing

---

## 5. Views (Pages) System

Views are **graph presets**, not UI filters.

- Shown at the **top of the left sidebar**
- Similar to **Figma Pages**

Examples:

- Main
- View2
- Knowledge Tree

Rules:

- Views can switch which graph is active
- Views are future-extensible
- Phase 1 ships with **2 fixed presets**

---

## 6. Graph Models (Hard Boundary)

### 6.1 FS Index

- Purpose: navigation
- Mirrors file system
- Never rendered as a canvas graph by default

### 6.2 CodeGraph

- Purpose: structure, architecture, logic
- Node-based
- Plugin-driven node types

### 6.3 Knowledge Graph (MD Skill Tree)

- Purpose: learning, research, synthesis
- Implemented as a **Knowledge Subgraph**
- Rendered using the same Canvas engine
- Different node types & semantics

---

## 7. MD Skill Tree (Knowledge Tree)

### 7.1 Definition

The MD Skill Tree turns a Markdown document into a **branching knowledge graph**.

- Entry point: a `.md` file
- Action: "Open as Skill Tree"

### 7.2 Node Model

Each knowledge node contains:

- `id`
- `title`
- `status` (todo / doing / done)
- `summary` (editable; AI-assist later)
- `body` (Markdown content)
- `parentId`
- `sources[]` (file paths, URLs, references)

### 7.3 Core Interactions

- Create Next
- Create Branch
- Edit Summary
- Edit Body (Monaco)
- Rename / Delete
- Progress state toggle
- Path highlight (root → selected)

### 7.4 Storage Strategy (Phase 1)

- **Structure & layout**

  - `/.celest/knowledge/<treeId>.json`

- **Content**
  - One tree = one Markdown file
  - (Later upgradeable to one node = one file)

### 7.5 Key Principle

> Branching stores **snapshots of understanding**, not AI state.

Equivalent to Git commits, not CPU memory.

---

## 8. AI Integration Rules

### 8.1 What AI May Do

- Generate summaries
- Suggest next branches
- Compress long text into nodes

### 8.2 What AI Must NOT Do

- Own or mutate saved state silently
- Persist hidden reasoning chains
- Bypass user review

AI always works through **explicit contracts**.

---

## 9. Architecture Overview

### 9.1 Layering

- `app/` — bootstrap only
- `shell/` — global UI shell
- `features/` — user-facing capabilities
- `entities/` — stable domain models
- `core/` — pure logic & persistence
- `state/` — Zustand slices
- `shared/` — reusable UI & utilities

### 9.2 State Management

- Zustand
- Single store
- Multiple slices
- No Immer in Phase 1

UI never touches store internals directly.

---

## 10. Development Rules for AI Agents

AI agents **must**:

1. Preserve all existing files
   - Old code goes to `src/_legacy/`
2. Prioritize modularity
3. Avoid global refactors unless requested
4. Keep `npm run dev` working at every step
5. Ask for clarification **before** guessing
6. Stay focused on the current step

AI agents **must not**:

- Re-architect without instruction
- Merge FS Index with graphs
- Introduce hidden state

---

## 11. MVP Guardrails (Lightweight, Required)

For any coding change, the agent must also provide:

- A **Regression Pack** (3–5 smoke checks) for the change
- A **Self-check status** for each item: PASS / NOT VERIFIED (and why)

Note: Automated unit tests are optional for MVP unless the repo already has a test runner and the change is pure logic.

---

## 12. MVP Reliability Add-ons (Lightweight, Required)

These are CS146S-style guardrails adapted to MVP speed.

### 12.1 Schema & Persistence Changes (Ask First)

If a change touches any persisted format under `/.celest/` (JSON schema, file names, folder layout):

- Stop and ask before changing the format.
- Provide a short migration note (how old data is handled).

### 12.2 Minimal Observability

For key actions, ensure there is at least minimal, non-sensitive reporting:

- OPEN_PROJECT / SAVE / LOAD should have clear success/failure user feedback.
- Do not log absolute paths or file contents.

### 12.3 Debug Package When Reporting Bugs

When reporting a bug or failure, always include:

- Command/run context (what you did)
- Error output (full)
- What changed recently (files/feature)

### 12.4 Lightweight Review Checklist

Before delivering code, quickly check:

- Does it violate FS Index ≠ CodeGraph ≠ Knowledge Tree?
- Does it touch persistence? (then ask first)
- Could it break open/save/load? (add to regression pack)

### 12.5 Optional Multi-Agent Workflow (If Using Multiple Agents)

If you split work across agents:

- One agent may research/file-scan; one implements; one reviews/tests.
- Output must still be consolidated into a single coherent delivery (full files).

---

## 13. Phase 1 Scope (Locked)

- Web only
- File System Access API
- React Flow (wrapped & isolated)
- Monaco Editor
- Two fixed Views
- Terminal placeholder

No desktop, no collaboration, no cloud sync.

---

## 14. Product North Star

If Celest is successful, users will say:

> "My thinking no longer disappears in chat logs — it becomes a structure I can grow."

---

## Contributing & AI Execution Rules

All AI agents (Codex / GPT / others) MUST also follow `CONTRIBUTING_AI.md`.
If there is any conflict, **AGENT.md overrides CONTRIBUTING_AI.md**.
Reading order: `AGENT.md` → `CONTRIBUTING_AI.md`.

**This file is authoritative.**  
Any AI system contributing to Celest must align with it.
