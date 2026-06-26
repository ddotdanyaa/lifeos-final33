# Artifact OS Architecture Contract

status: FIXED_WITH_CODE_AND_TEST
updated_at: 2026-06-26T07:05:00+03:00

LifeOS remains a local-first Artifact OS. The owner-facing workspaces are lenses over one repository state, not separate route stores.

## Executable Contract

- `artifact-os-architecture.mjs` owns the schema version, collection registry, workspace contracts, module boundaries, state adapters and architecture invariants.
- `app.js` imports that module instead of duplicating the architecture contract inline.
- `ReactiveStore.commit()` records a persisted architecture event for repository mutations.
- Data Control renders an `architecture-contract` panel with collection, workspace, module, adapter and event-bus counts.
- `window.__lifeosKnowledgeBase.getArchitectureSnapshot()` exposes the same contract to Playwright/audit code.
- `tools/audit-architecture-contract.mjs` fails if the contract is not imported, rendered, exposed, or connected to the event bus.

## C25 Closure Mapping

- `module boundaries`: fixed by `MODULE_BOUNDARIES`, Data Control proof and `audit:architecture`.
- `state adapters`: fixed by `STATE_ADAPTERS`, repository storage proof and service-worker shell boundary.
- `event bus`: fixed by persisted `control.architectureEvents` records on repository commits.
- `code splitting`: fixed by a real browser-imported `artifact-os-architecture.mjs` module and service-worker cache entry.
- `schema docs`: fixed by `ARTIFACT_SCHEMA_VERSION`, `ARTIFACT_COLLECTIONS`, this document and `getArchitectureSnapshot()`.

## Non-Goals

This package does not weaken the working vanilla app or move owner flows into speculative framework code. The split is intentionally surgical: the architecture contract becomes executable and testable while the already-passing owner journeys keep their behavior.
