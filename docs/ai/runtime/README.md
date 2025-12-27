# Runtime AI (Graph Assistant)

## How to use

1) Pick an **action** prompt under `actions/` (e.g. codegraph/summarize.md).
2) Provide it together with a **Context Pack JSON** (built by the app from user selection).
3) Use `SYSTEM_PROMPT.md` as the system prompt.
4) Model returns **one JSON object**: `{ explanation, patch: { ops: [...] }, risks, questions }`
5) Validate JSON with the schema in `contracts/` and preview the changes before applying.

## Requirements (must)

- Output must be **JSON only** (no Markdown, no code fences).
- Never exceed selection scope from Context Pack.
- Respect `constraints` (maxNewNodes, allowDelete, etc.)
- Ops must be ordered (nodes before edges).
- IDs must be stable and collision-resistant.
