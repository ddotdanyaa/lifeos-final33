# LifeOS v34 Architecture Contract

status: FIXED_WITH_CODE_AND_TEST
updated_at: 2026-07-09T00:00:00+03:00

LifeOS v34 is a local-first personal OS. The product is one shared artifact repository with many lenses over it: feed, capture, today, calendar, finance, knowledge, systems, builder, projects, model hub, smart home, marketplace, design, databases, screen companion, personal twin, graph and data control.

## Executable Contract

- `artifact-os-architecture.mjs` owns `ARTIFACT_SCHEMA_VERSION = 4`, the v34 collection registry, workspace contracts, module boundaries, state adapters and invariants.
- `app.js` imports that module, normalizes old state into v34 collections, seeds default channels, local marketplace packs, design profiles and model routes, and records architecture events through `ReactiveStore.commit()`.
- **Object Contract v4** (Seven Contracts, contract 1 of 7): every record in the 44 non-exempt collections carries `id, type, title, owner, sourceRefs, artifactRefs, relations, lifecycleState, privacyScope, accessContour, provenance, confidence, receipts, createdAt, updatedAt, version` (`OBJECT_CONTRACT_V4_FIELDS`). `applyObjectContractToState()` runs at the end of `normalizeState()` on every load/save, so migration from pre-v4 records is automatic and idempotent (re-applying never changes an already-contracted record). `auditLog`, `control` and `environment` are exempt — they are a log and two singleton runtime-state records, not individually-owned artifact instances (`OBJECT_CONTRACT_EXEMPT_COLLECTIONS`). `tools/audit-seven-contracts.mjs` proves coverage, idempotency and the app.js wiring; Receipt coverage (P1.2) and Capability/Locality (P1.3) extend the same script.
- `ui/v34-platform.js` renders the new v34 surfaces. These are not route labels: each surface reads shared state, exposes real actions and writes back through audited handlers.
- Data Control renders an `architecture-contract` panel with collection, workspace, module, adapter and event-bus counts.
- `window.__lifeosKnowledgeBase.getArchitectureSnapshot()` exposes the same contract to Playwright/audit code.
- `tools/audit-architecture-contract.mjs` fails if the v34 contract is not imported, rendered, exposed, cached, or connected to the event bus.

## v34 Primitive Mapping

- Sources and artifacts: `sources`, `notes`, imported files/audio/books/screens and all derived objects remain local repository records.
- Events and channels: `auditLog`, `providerRuns`, `channels` and `feedEvents` form the Life Feed projection.
- Systems and builder: `systemDefinitions`, `systemRecords`, `marketplacePacks` and `installedPacks` define user-buildable systems without separate route stores.
- Work and projects: `projects` and `projectItems` connect decisions, risks, tasks and documents to the graph.
- Model Hub: `modelProfiles` and provider runs record model routes and checks without silently sending private artifacts.
- Smart Home: `smartHomeDevices` and `smartHomeEvents` work in manual/local mode until the owner explicitly connects a local hub.
- Marketplace: packs install as local system definitions; `vendorCodeExecuted` stays false for built-in packs.
- Design Studio: `designProfiles` and `designStudio` keep data separate from rendering modes.
- Databases: `customDatabases` and `databaseRows` provide relational personal systems that still export and appear in graph/control.
- Screen Companion: `screenCompanionSessions` are permission gates; LifeOS does not read the screen without explicit owner permission.
- Personal Twin: `personalTwinSnapshots` are local recovery summaries, not an external identity clone.

## Closure Mapping

- `module boundaries`: fixed by `MODULE_BOUNDARIES`, Data Control proof and `audit:architecture`.
- `state adapters`: fixed by `STATE_ADAPTERS`, repository storage proof and service-worker shell boundary.
- `event bus`: fixed by persisted `control.architectureEvents` records on repository commits.
- `code splitting`: fixed by browser-imported architecture and UI modules plus service-worker cache coverage.
- `schema docs`: fixed by `ARTIFACT_SCHEMA_VERSION`, `ARTIFACT_COLLECTIONS`, this document and `getArchitectureSnapshot()`.

## Non-Goals

The v34 package does not weaken tests, fake provider success, execute vendor marketplace code, read the screen without permission, control smart-home devices without a hub, or move product behavior into disconnected route shells. External services stay behind explicit owner-approved adapters.
