# Product Decisions

1. Product Brain is runtime state, not a markdown-only report.
2. Product Brain is stored as `notes` with `systemType: "product_brain"` so it uses the shared Artifact repository.
3. Graph uses a separate `productBrain` filter and explicit `product-brain-*` edge reasons.
4. Chat answers Product Brain questions locally before Ollama, with no hidden mutation.
5. GitHub release is not marked done while `git ls-remote` cannot confirm the branch.
6. Provider gates remain setup UX, not final completion.
7. Product Brain docs mirror app state but do not replace app state.

