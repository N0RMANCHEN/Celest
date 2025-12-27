# AI in Celest: Runtime Prompt Pack

This folder contains **Runtime AI** prompts + **GraphPatch** JSON schemas.

- Runtime AI is used **inside the product** (Bottom AI Panel, graph-driven).
- It must output **strict JSON (GraphPatch)** only.
- The app must: validate → preview → user confirm → apply → undo.

Entry:
- `docs/ai/runtime/SYSTEM_PROMPT.md`
- `docs/ai/runtime/actions/**`
- `docs/ai/runtime/contracts/**`
