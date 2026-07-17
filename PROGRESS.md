# LifeOS v1.0 — Autonomous Run Progress

Started: 2026-07-17 (overnight autonomous session, owner away ~24h)
Plan: `docs/LIFEOS_V1_MASTER_BUILD_PLAN.md` (v1.1)

## How to see it running

```
npm start
```
Serves on **http://localhost:4173** (server.mjs, live file serving — no build step needed for app.js/ui changes; if `ui/**`, `app.js`, `styles.css`, `index.html`, or `artifact-os-architecture.mjs` changed, run `node tools/build-public.mjs` first to refresh `public-demo/`).

Gate commands:
- `npm run verify` — node --check + smoke (86 markers)
- `for f in tools/audit-*.mjs; do node "$f"; done` — 24+ audits
- `npx playwright test output/playwright/final-human-product.spec.mjs --workers=1 --reporter=line` (needs `npm start` running)

## Package ledger (mirrors plan §9, ticked here as this session executes)

- [x] P0.1 CONTEXT_CANON_INTO_REPO — done in prior session
- [x] P0.4 COMMIT_BASELINE — baseline commit done this session (owner authorized via session-start instructions; see DECISIONS.md)
- [x] P0.5 APPROVED_ENGINES_INSTALLED — done in prior session
- [ ] P0.2 KB_SMOKE_RESCUE — in progress
- [ ] P0.3 LEDGER_TRUTH_REFRESH
- [ ] P1.1 OBJECT_CONTRACT_V4
- [ ] P1.2 RECEIPT_COVERAGE_MATRIX
- [ ] P1.3 CAPABILITY_LOCALITY
- [ ] P2.1 RENDERER_REGISTRY
- [ ] P2.2 ARTIFACT_INSPECTOR_UNIVERSAL
- [ ] P3.1 SYSTEM_FIELDS_TYPED
- [ ] P3.2 SYSTEM_VIEWS_ACTIONS
- [ ] P3.3 SYSTEM_TRIGGERS_LITE
- [ ] P4.1 FLOW_EXEC_REAL
- [ ] P4.2 AGENT_GUARDED_RUNS
- [ ] P5.1 OLLAMA_LIVE
- [ ] P5.2 BYOK_VAULT_ROUTING
- [ ] P5.3 AI_MEMORY_GATE
- [ ] P6.1 PDF_EPUB_LOCAL
- [ ] P6.2 IMPORT_PIPELINE_RECEIPTS
- [ ] P6.3 ICS_EML_FILE_IMPORT
- [ ] P6.4 OBSIDIAN_VAULT_BRIDGE
- [ ] P6.5 SEMANTIC_SEARCH_GATED
- [ ] P7.1 TRASH_UNDO_GRACE
- [ ] P7.2 EXPORT_ROUNDTRIP_PROOF
- [ ] P7.3 TWIN_RECOVERY_DRILL
- [ ] P8.1 PACK_MANIFEST_ENFORCE
- [ ] P8.2 TEN_STARTER_PACKS
- [ ] P9.1 HEALTH_REGISTRY_PANEL
- [ ] P9.2 FAILURE_INJECTION
- [ ] P10.1 FIRST_RUN_CALM
- [ ] P10.2 MOBILE_PWA_CONTINUITY
- [ ] P10.3 PERF_BUDGETS
- [ ] P10.4 UX_COHERENCE
- [ ] P11.1 DOCS_TRUTH_SYNC
- [ ] P11.2 RELEASE_V1 *(owner-gated — will stop here, not attempt)*
