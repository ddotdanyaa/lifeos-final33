# LifeOS v33 Artifact OS - Full Scale Implementation Master Plan

Status: master build plan. Product coding must follow this plan only after owner approval.

Purpose: turn the audited LifeOS v33 function list into a complete, working, locally verifiable personal operating system. This plan exists to prevent forgotten features, fake sections, disconnected stores, dead buttons, static proof panels, and late-stage audit chaos.

Important correction: the current localhost app is only a rough spike. It can be used as evidence for the first artifact corridor idea, but it is not the final product architecture, not the final design, and not the full implementation standard.

## Table Of Contents

1. How To Use This Plan
2. Source Of Truth And Inventory Control
3. Non-Negotiable Product Thesis
4. Build Principles And Forbidden Shortcuts
5. Full System Architecture
6. Local-First Storage Strategy
7. Repository And Domain Model
8. Universal Mutation Contract
9. Product App Shell And UX Direction
10. Workspace Plans
11. Provider, AI, Media, Screen And Sync Boundaries
12. Data Control, Trust, Privacy And Audit
13. Graph, Backlinks And Explainability
14. Agents And Workflows
15. Domains, Packs And Marketplace
16. Subagents And Team Workflow
17. Plugin Strategy
18. Implementation Phases
19. Ticket System And Definition Of Done
20. Testing Strategy
21. Playwright Browser Verification
22. Canon Coverage Ledger
23. Final Audit Protocol
24. Full-Scale Completion Gate
25. Risk Register
26. Required Files And Future Repo Shape
27. End-To-End Dependency Map
28. Cross-Workspace Contracts
29. Artifact Journey Blueprints
30. Data Integrity And Migration Protocol
31. Error States, Empty States And Recovery
32. UI Action And Button Contract
33. Quality Gates And Audit Automation
34. Integration And Provider Readiness Matrix
35. Design System Completion Contract
36. Performance, Accessibility And Security Budgets
37. Execution Runbook
38. Release Readiness Scorecard
39. Plan Self-Audit

## 1. How To Use This Plan

This document is the build controller. Before writing product code, each implementation ticket must point back to one or more sections here and one or more canon IDs from:

`docs/source_of_truth/V33_CANON_ITEM_INVENTORY.csv`

Every feature must be created as a repository-backed capability. It is not enough to display a panel, label, route, graph dot, receipt-looking text, or "ready" state.

The working loop is:

```text
read canon row
-> classify row
-> define owner action
-> define repository mutation
-> define artifact/projection objects
-> define graph/backlink/control/audit consequences
-> implement
-> test with unit/integration/e2e
-> mark canon row as covered
-> run audit
```

No development phase is complete until:

- the implementation has a visible owner action;
- the action mutates durable local repository state;
- the mutation creates receipt/audit/control consequences;
- Graph or backlinks explain the relation where relevant;
- Playwright or another automated test proves the user flow;
- the canon coverage ledger marks the related item as implemented or intentionally blocked.

## 2. Source Of Truth And Inventory Control

Primary source:

`C:/Users/Данил/Downloads/LIFEOS_V33_ARTIFACT_OS_MASTER_FUNCTION_SPEC_AUDITED.md`

Extracted source:

`docs/source_of_truth/V33_CANON_ITEM_INVENTORY.csv`

Generated planning classes:

`docs/source_of_truth/V33_CANON_ITEM_IMPLEMENTATION_CLASSES.csv`

Known counts:

| Inventory type | Count |
| --- | ---: |
| Function rows | 1172 |
| Quality rows | 145 |
| Negative guard rows | 131 |
| Total canon rows | 1449 |

Implementation class counts:

| Class | Count | Meaning |
| --- | ---: | --- |
| `P0-kernel` | 51 | Artifact kernel and shared OS spine. |
| `P1-corridor` | 20 | First visible single-artifact MVP corridor. |
| `P2-expand` | 716 | Workspace depth after the corridor works. |
| `P3-domain` | 280 | Domains, packs, marketplace and specialized life layers. |
| `Blocked-provider` | 106 | Needs explicit provider/media/screen/sync setup or owner approval. |
| `Guard-only` | 276 | Quality/negative rows converted into tests and policy gates. |

Exact workspace registry from the canon CSV:

| Workspace | Planning owner |
| --- | --- |
| `Core / invisible OS spine` | Artifact kernel, mutation contract, policy gates and repository invariants. |
| `Inbox` | Capture and source intake. |
| `Library` | Notes, wikilinks, backlinks and knowledge projections. |
| `Today` | Daily center and journal projections. |
| `Plan` | Tasks, calendar blocks, focus and recovery. |
| `Chat` | Local communication context and message-to-action bridges. |
| `Agents` | Dry-run proposals, approval classes and workflow previews. |
| `Graph` | Typed graph, entities, explainability and corrections. |
| `Control` | Receipts, audit, export/delete/rollback and privacy controls. |
| `Providers` | AI, media, screen, sync and external readiness boundaries. |
| `Domains` | Health, routines, relationships, home, money, food and trips. |
| `Packs` | Builder, templates, pack install preview and marketplace boundary. |

The full plan must preserve all IDs. IDs are not decorative. They are traceability anchors.

Required inventory files later:

```text
docs/source_of_truth/V33_CANON_ITEM_INVENTORY.csv
docs/source_of_truth/V33_CANON_ITEM_IMPLEMENTATION_CLASSES.csv
docs/source_of_truth/V33_CANON_COVERAGE_LEDGER.csv
docs/source_of_truth/V33_BUILD_GATE_CHECKLIST.csv
docs/source_of_truth/V33_DESIGN_IMPLEMENTATION_CHECKLIST.csv
docs/source_of_truth/V33_OWNER_USE_CASE_AUDIT.csv
docs/LIFEOS_V33_CONNECTED_DESIGN_SYSTEM_BUILD_PLAN.md
docs/audit/LIFEOS_V33_OWNER_USE_CASE_PLAN_AUDIT_2026-06-23.md
docs/source_of_truth/V33_CANON_AUDIT_REPORT.md
```

Coverage ledger columns:

```text
ID
Type
Workspace
PrimaryRoute
ImplementationClass
ImplementationStatus
OwnerAction
RepositoryObjects
MutationContract
Projection
GraphBacklinkProof
ReceiptAuditProof
DataControlProof
PolicyBoundary
Tests
ManualAuditNotes
EvidencePath
LastVerifiedAt
```

Allowed implementation statuses:

```text
not-started
planned
in-progress
implemented
verified
blocked-provider
blocked-owner-approval
guarded
deferred-after-kernel
rejected-by-policy
```

## 3. Non-Negotiable Product Thesis

LifeOS v33 is not a notes app, not a task app, not a calendar, not a chat wrapper, not a proof dashboard, and not a static mockup of a personal OS.

LifeOS is an artifact operating system:

```text
input/source
-> Artifact
-> projections
-> repository
-> graph/backlinks
-> receipt/audit
-> Data Control
-> owner-visible result
-> smoke
```

Every workspace is a projection over shared artifacts. Workspaces are not separate apps and not separate stores.

The first meaningful product shape is one artifact moving through:

```text
Inbox
-> Library / Obsidian
-> Today / Plan
-> Chat
-> Agents
-> Graph
-> Control
```

Full-scale product shape is many artifact types moving through the same OS spine, with domains, providers, workflows, packs and sync added only after the spine is reliable.

## 4. Build Principles And Forbidden Shortcuts

Required principles:

- Artifact first, route second.
- Local repository first, UI state second.
- Mutation contract first, animation later.
- Data Control and audit are part of the feature, not afterthoughts.
- Graph and backlinks must be generated from repository facts.
- Provider, AI, screen, media, sync and destructive actions are disabled until explicitly configured.
- Owner-visible result must exist for every implemented capability.
- Tests must click the product, not only inspect source code.

Forbidden shortcuts:

- no route shell with empty content;
- no one page per canon item;
- no fake labels without artifacts;
- no static proof panels;
- no disconnected `useState` arrays per workspace;
- no "provider connected" status without actual setup;
- no "AI processed" claim without configured model/provider or explicit local dry-run;
- no hidden agent action;
- no delete/export/sync/publish without preview and boundary;
- no vendor archive execution;
- no import from the old broken app;
- no treating `siyuan-master.zip` or `logseq-master.zip` as runtime code;
- no global graph as the first home screen;
- no long marketing copy in the app surface.

## 5. Full System Architecture

Target architecture:

```text
src/
  domain/
    artifact/
    source/
    projection/
    graph/
    receipt/
    audit/
    data-control/
    policy/
    providers/
    agents/
    workspaces/
  repository/
    schema/
    migrations/
    local-db/
    indexes/
    transactions/
  services/
    mutations/
    projections/
    graph-builder/
    backlink-indexer/
    audit-writer/
    data-control-writer/
    policy-gates/
  ui/
    app-shell/
    command-bar/
    inspector/
    workspaces/
    components/
    design-system/
  tests/
    unit/
    integration/
    e2e/
  scripts/
    canon/
    audit/
    smoke/
```

Recommended final stack:

| Area | Recommended choice | Reason |
| --- | --- | --- |
| App framework | Vite + React + TypeScript | Local app shell, fast iteration, no server dependency for MVP. |
| Routing | React Router or file-based internal route map | Workspaces are projections, not separate apps. |
| Local DB | IndexedDB via typed adapter or Dexie | Durable local-first baseline, simple browser support. |
| Validation | Zod or equivalent schema layer | Runtime object validation and migrations. |
| Unit tests | Vitest | Fast domain/repository verification. |
| Component tests | Testing Library where useful | UI states and actions. |
| Browser tests | Playwright | Full owner-visible flows. |
| Audit scripts | Node scripts | Canon coverage and no-fake-progress gates. |
| Later complex storage | SQLite WASM or PGlite | Only if graph/domain queries outgrow IndexedDB. |

The static app can be replaced by this architecture. Do not keep the current spike if it blocks typed structure, testability, or design quality.

## 6. Local-First Storage Strategy

LifeOS core must be local-first because capture, notes, planning, chat context, graph and control must work immediately and survive reload.

MVP local-first model:

```text
UI reads from local repository
UI writes to local repository
repository emits mutation effects
effects update graph/backlinks/receipt/audit/control
sync/provider layers are absent or disabled
```

Storage phases:

| Phase | Storage | Purpose |
| --- | --- | --- |
| Storage 1 | Typed IndexedDB | MVP, all P0/P1/P2 core artifacts. |
| Storage 2 | IndexedDB indexes + query helpers | Workspace depth and graph neighborhood queries. |
| Storage 3 | Migration framework | Schema evolution without data loss. |
| Storage 4 | Optional SQLite WASM/PGlite | Only if queries, graph analytics or packs demand SQL. |
| Storage 5 | Optional sync engine | Multi-device/collaboration after local OS spine is stable. |

Required local DB object stores:

```text
artifacts
sources
projections
notes
tasks
calendarBlocks
todayPages
journalEntries
chatThreads
messages
agentProposals
workflowPreviews
graphNodes
graphEdges
entities
receipts
auditEvents
dataControlItems
policyBoundaries
providerProfiles
syncOutbox
migrations
canonCoverage
```

Local write rule:

```text
Every owner action is a transaction.
Every transaction returns a MutationResult.
Every MutationResult includes changed objects, receipt id, audit id, data-control ids, graph changes and test evidence hooks.
```

## 7. Repository And Domain Model

Core objects:

| Object | Full-scale responsibility |
| --- | --- |
| `Artifact` | Root identity for all life material and projections. |
| `SourcePacket` | Raw captured input with provenance, checksum, attachments and parse state. |
| `ArtifactProjection` | Generic relation from artifact to note/task/chat/proposal/domain object. |
| `Note` | Markdown/block note projection with wikilinks, backlinks, versions and privacy. |
| `Task` | Action projection with source refs, status, priority, schedule refs and receipts. |
| `CalendarBlock` | Local time block or provider-linked calendar event preview. |
| `TodayPage` | Daily projection over real notes/tasks/calendar/source links. |
| `JournalEntry` | Reflective projection with privacy boundaries and optional mood/energy links. |
| `ChatThread` | Local communication context attached to artifact/entity/workspace. |
| `Message` | Owner/local/provider message with action extraction boundaries. |
| `AgentProposal` | Dry-run candidate action with approval class and blocked operations. |
| `WorkflowRunPreview` | Multi-step plan before any external or destructive execution. |
| `GraphNode` | Typed node backed by artifact/entity/projection/receipt/control. |
| `GraphEdge` | Typed relation with source, reason, confidence and correction state. |
| `Entity` | Person, place, organization, object, project, domain concept or external object. |
| `Receipt` | Owner-visible proof of mutation. |
| `AuditEvent` | Append-only event log for important changes and boundaries. |
| `DataControlItem` | Export/delete/revoke/rollback/privacy entry for a data object. |
| `PolicyBoundary` | Gate for sensitive, external, destructive, provider and hidden actions. |
| `ProviderProfile` | Readiness/config state for external/local AI/media/sync providers. |
| `SyncOutboxItem` | Later sync queue item, never silently sent in MVP. |

Artifact required fields:

```text
id
title
lifecycleState
sourceRefs
projectionRefs
activeRoles
receiptRefs
auditRefs
graphRefs
dataControlRefs
privacyScope
canonRefs
ownerDecisionState
createdAt
updatedAt
schemaVersion
```

Lifecycle states:

```text
captured
parsed
reviewed
projected
planned
active
done
archived
blocked
deleted-previewed
deleted
```

Roles:

```text
source
note
task
calendar_block
today_item
journal_entry
chat_context
message_context
agent_proposal
workflow_preview
graph_entity
domain_object
control_item
```

## 8. Universal Mutation Contract

Every user-visible action must be implemented through the same contract.

Required input:

```text
actor
actionType
artifactId or source payload
workspace
canonRefs
payload
policyContext
```

Required output:

```text
MutationResult
  changedObjects
  projectionRefs
  graphNodes
  graphEdges
  receipt
  auditEvents
  dataControlItems
  policyBoundaryResult
  ownerVisibleMessage
  testEvidence
```

Mutation examples:

| Owner action | Mutation type | Required effects |
| --- | --- | --- |
| Paste text in Inbox | `source.capture` | SourcePacket, Artifact, receipt, audit, graph edge, control item. |
| Promote to note | `library.note.create` | Note projection, backlink scan, graph node/edge, receipt/control. |
| Add wikilink | `library.wikilink.update` | Backlink index, graph edge with reason, receipt. |
| Create task | `plan.task.create` | Task projection, source ref, graph edge, receipt/control. |
| Send local message | `chat.message.create` | Message, thread ref, graph edge, local-only receipt. |
| Agent dry-run | `agent.proposal.create` | Proposal, blocked actions, approval class, receipt/control. |
| Open export preview | `control.export.preview` | ExportJob preview, audit event, no external write. |
| Delete preview | `control.delete.preview` | DeletePreview only, no deletion until confirmation boundary. |

No direct UI mutation is allowed. UI calls service, service calls repository transaction, transaction writes all consequences.

## 9. Product App Shell And UX Direction

The final UI must feel like a working personal operating environment, not a landing page.

UX direction:

```text
quiet
operational
dense but readable
artifact-centered
low-copy
fast actions
visible provenance
visible control
```

First screen:

- selected artifact or capture surface;
- command strip;
- current projection;
- inspector with graph/backlinks/receipts/control;
- no giant hero;
- no proof dashboard;
- no decorative global graph;
- no ten empty panels.

App shell zones:

| Zone | Purpose |
| --- | --- |
| Left navigation | Workspaces and counts from repository. |
| Top command strip | Capture, promote, plan, chat, propose, export, control. |
| Main surface | Active projection for selected artifact. |
| Right inspector | Provenance, graph neighborhood, receipts, audit, Data Control. |
| Bottom/status layer | Local DB state, provider readiness, sync queue, policy boundary. |

Design system requirements:

- compact 8px-or-less radii;
- stable dimensions for nav, controls, graph, cards and lists;
- no text overflow on mobile;
- no single-hue purple/slate/beige theme;
- no nested UI cards;
- icon buttons where tools are familiar;
- visible disabled reasons for blocked actions;
- `data-testid` on important controls;
- keyboard focus and accessibility states;
- mobile layout must preserve the core corridor.

## 10. Workspace Plans

### 10.1 Inbox

Goal: capture real life material with nearly zero friction.

Canon focus:

```text
C01-003
C03-007
C03-013
plus all Inbox P2/P3 rows after kernel
```

Must build:

- text capture;
- URL capture;
- file/attachment capture;
- clipboard capture;
- import job preview;
- raw source status;
- source checksum/provenance;
- duplicate detection;
- interrupted capture recovery;
- source-to-artifact graph edge;
- receipt/audit/control on every capture.

Acceptance:

```text
Owner can capture a raw source.
Artifact is created.
SourcePacket is inspectable.
Data Control knows storage and export/delete preview.
Reload preserves it.
Playwright proves the flow.
```

### 10.2 Library / Obsidian Core

Goal: real knowledge workspace over artifacts.

Must build:

- markdown editor;
- block or document note model;
- note versions;
- wikilink parser;
- backlink index;
- tag/entity extraction;
- note-to-task bridge;
- note-to-calendar bridge;
- daily note bridge;
- media attachments later;
- note privacy controls;
- graph edges from links;
- export formats.

Acceptance:

```text
Owner edits a note.
[[wikilink]] creates backlinks and graph edges.
Note version is stored.
Task can be created from note.
Control shows note data and rollback/export options.
```

### 10.3 Today / Plan

Goal: day and planning surfaces read from real artifacts, not invented dashboard blocks.

Must build:

- task creation from source/note/chat;
- local time block preview;
- day view;
- week view;
- recovery after missed plan;
- focus session;
- daily review;
- Today page from actual projections;
- reschedule mutation with receipt;
- calendar provider boundary later.

Acceptance:

```text
Task has source artifact.
Calendar block is local preview unless provider configured.
Today reads notes/tasks/calendar/source refs.
Every reschedule/toggle has audit and receipt.
```

### 10.4 Chat / Communication

Goal: local conversation around artifacts, messages and actions.

Must build:

- artifact-context chat thread;
- local-only messages;
- message-to-task;
- message-to-artifact;
- message-to-note;
- message-to-proposal;
- hidden-obligation guard;
- external send blocked until provider setup;
- provider readiness panel later;
- email/meeting/calendar integrations only after policy gates.

Acceptance:

```text
Message is stored locally.
Message can become task/artifact only through owner action.
No hidden commitment appears.
External send shows blocked provider boundary.
```

### 10.5 Agents / Workflows

Goal: agents propose and prepare, owner decides.

Must build:

- dry-run proposals;
- approval classes: automatic, candidate, confirm-only, forbidden;
- workflow preview;
- budget/privacy/quality routing;
- repeat-safety;
- no hidden autonomy;
- emergency stop;
- action queue;
- provider boundary;
- local planner before external tools.

Acceptance:

```text
Agent creates proposal only.
Proposal lists impact and blocked actions.
Approval creates local mutation only.
External/destructive action requires explicit setup and confirmation.
```

### 10.6 Graph / Entities

Goal: explainable typed graph around current artifact.

Must build:

- graph nodes from artifacts, sources, notes, tasks, messages, proposals, receipts, entities;
- graph edges with reason/confidence/source;
- "why linked" panel;
- edge hide/correct;
- entity canonization;
- local graph around selected artifact;
- global graph only later;
- decorative graph guard.

Acceptance:

```text
Graph node/edge exists only if repository fact exists.
Owner can inspect reason.
Owner can hide/correct relation through preview.
Control/audit records correction.
```

### 10.7 Data Control / Trust / Privacy

Goal: every data object is owner-visible and controllable.

Must build:

- receipt timeline;
- audit timeline;
- storage location;
- export preview;
- delete preview;
- rollback preview;
- revoke provider access later;
- privacy zones;
- sensitive data classification;
- permission impact display;
- destructive confirmation boundary.

Acceptance:

```text
Every mutation has receipt and audit event.
Every object has Data Control item.
Delete/export/revoke are previewed before action.
No silent destructive action exists.
```

### 10.8 Providers / Local AI / Media / Screen

Goal: explicit readiness and safe setup, no fake success.

Must build only after core:

- provider profile;
- local model readiness;
- external AI key readiness;
- media transcription job preview;
- OCR/screen capture explicit mode;
- sync readiness;
- budget and privacy routing;
- provider failure states;
- "not configured" states that still let local product work.

Acceptance:

```text
Provider actions are impossible until configured.
Readiness is honest.
No cloud/model/screen/media claim is shown as success without setup.
Credentials require owner confirmation.
```

### 10.9 Domains / Life Layers

Goal: health, relationships, home, money, food, trips and other domains become artifact roles.

Must build after kernel:

- health signals;
- routines;
- relationships;
- home inventory;
- money events;
- meals;
- trips;
- domain packs;
- domain templates;
- domain-specific graph edges;
- domain-specific privacy controls.

Acceptance:

```text
Domain object is still a LifeObject/Artifact projection.
It has source, receipt, graph, control and audit.
Domain does not become a separate app/store.
```

### 10.10 Packs / Builder / Marketplace

Goal: user-extensible templates and domain packs after the OS spine works.

Must build:

- pack manifest;
- object schema builder;
- view templates;
- pack install preview;
- pack permission model;
- pack rollback;
- pack export;
- marketplace only after local pack safety exists.

Acceptance:

```text
Pack cannot create hidden objects.
Pack install is previewed.
Pack data is repository-backed and removable.
```

## 11. Provider, AI, Media, Screen And Sync Boundaries

Provider rows are not ignored. They are blocked until setup is explicit.

Blocked-provider plan:

```text
show readiness
show setup requirements
show privacy/budget impact
show what would happen
disable execution
record owner decision if configured
```

Provider boundary object:

```text
ProviderBoundary
  id
  providerType
  status
  requiredCredentials
  allowedDataScopes
  forbiddenDataScopes
  budgetLimit
  privacyImpact
  ownerApprovalState
  lastCheckedAt
```

Never claim:

- AI answer generated;
- model connected;
- transcription completed;
- OCR active;
- screen captured;
- cloud sync active;
- email sent;
- calendar synced;
- external search complete;

unless the real provider path exists and owner approved it.

## 12. Data Control, Trust, Privacy And Audit

Data Control is a workspace and a system layer.

Required for every repository object:

```text
object id
object type
artifact id
storage location
privacy zone
export support
delete preview support
rollback support
provider exposure
permission impact
retention state
last mutation receipt
```

Audit must record:

- source capture;
- note edits;
- task changes;
- chat message mutations;
- agent proposals;
- approvals;
- graph corrections;
- export preview;
- delete preview;
- archive;
- rollback;
- provider setup;
- sync action;
- privacy zone changes.

Audit is not only technical. It answers owner questions:

```text
What happened?
Why did it happen?
What source caused it?
What changed?
Can I undo it?
Where is my data?
Was anything sent externally?
```

## 13. Graph, Backlinks And Explainability

Graph/backlinks must be facts derived from mutations.

Graph edge required fields:

```text
id
from
to
artifactId
edgeType
reason
sourceRef
confidence
createdBy
createdAt
hidden
correctionState
```

Backlinks required fields:

```text
sourceNoteId
targetLabel
targetEntityId
artifactId
matchText
createdAt
```

Explainability rules:

- every edge can answer "why linked";
- every inferred relation has source/provenance;
- owner can hide/correct relation;
- correction creates audit/control event;
- global graph waits until local artifact graph is reliable.

## 14. Agents And Workflows

Agents are not autonomous by default.

Action classes:

| Class | Meaning |
| --- | --- |
| `automatic` | Local safe mutations with no external/destructive impact. |
| `candidate` | Suggested action, owner chooses. |
| `confirm-only` | Must show preview and require confirmation. |
| `forbidden` | Not allowed in current setup. |

Workflow preview must show:

```text
steps
input artifacts
objects that would change
provider calls required
external sends required
destructive operations
privacy impact
cost/budget
rollback plan
owner decision controls
```

Agent Done means:

```text
proposal exists
impact is clear
blocked actions are visible
approval state is stored
receipt/audit/control exist
no hidden external action happened
```

## 15. Domains, Packs And Marketplace

Domains are late expansion, not MVP foundation.

Domain implementation pattern:

```text
source -> artifact -> domain projection -> graph/control/audit -> owner result
```

Examples:

| Domain | Object | Required connection |
| --- | --- | --- |
| Health | `HealthSignal` | source, day, routine, privacy, graph. |
| Routines | `Routine` | tasks, calendar, progress, recovery. |
| Relationships | `Relationship` | people, notes, reminders, privacy. |
| Home | `HomeItem` | photos/docs/tasks/warranty. |
| Money | `MoneyEvent` | receipt, budget, risk, privacy. |
| Trips | `Trip` | calendar, documents, bookings, tasks. |
| Food | `Meal` | health, routine, shopping, notes. |

Marketplace appears only after:

- pack install preview exists;
- pack rollback exists;
- pack permissions exist;
- pack data can be exported/deleted;
- pack cannot bypass repository.

## 16. Subagents And Team Workflow

The `awesome-codex-subagents` skill should be used as role guidance, not as an excuse to fragment ownership.

Recommended project-specific agents later:

| Role | When to use | Required output |
| --- | --- | --- |
| `product-architect` | Before phase/ticket changes | scope, risks, canon IDs, acceptance. |
| `typescript-pro` | Domain/repository implementation | typed schemas, tests. |
| `frontend-developer` | Workspace UI | app shell, components, responsiveness. |
| `ui-fixer` | Visual cleanup | no generic UI, no overflow. |
| `test-engineer` | Unit/integration strategy | reliable tests and fixtures. |
| `e2e-tester` | Playwright flows | browser proof. |
| `security-auditor` | Policy/provider/data control | no hidden external/destructive actions. |
| `accessibility-tester` | UI accessibility | keyboard, focus, contrast. |
| `reviewer` | Final code review | bugs, missing tests, regressions. |
| `technical-writer` | Docs/audit reports | owner-readable release evidence. |

Do not install every subagent automatically. Install only the specific roles needed for the current phase, and keep them project-specific under `.codex/agents/` if installed.

## 17. Plugin Strategy

The `plugin-creator` skill is not part of the first product implementation.

Use plugin creation only for repeated tooling after the product architecture stabilizes.

Potential future plugins:

| Plugin | Purpose | Create only after |
| --- | --- | --- |
| `lifeos-canon-auditor` | Runs canon coverage checks and reports missing rows. | Coverage ledger format is stable. |
| `lifeos-product-gate` | Blocks fake panels, dead buttons, provider success claims. | Gate scripts are proven inside repo. |
| `lifeos-import-auditor` | Audits vendor/reference archives without executing them. | Static audit rules are stable. |

Plugin creation requirements:

- use plugin-creator scaffold;
- validate plugin;
- no TODO placeholders;
- no marketplace edits by hand;
- no plugin before internal script works.

## 18. Implementation Phases

### Phase 0 - Planning Freeze And Source Control

Goal: stop random building.

Deliverables:

```text
master plan
canon inventory
implementation classes
coverage ledger template
guardrail document
decision log
```

Exit gate:

```text
all 1449 rows have a class
owner approves plan
first tickets selected
no product code proceeds outside plan
```

### Phase 1 - Final App Foundation

Goal: replace rough static spike with proper architecture.

Deliverables:

```text
Vite/React/TypeScript project
domain folders
repository interface
IndexedDB adapter
schema validation
migration framework
test framework
Playwright setup
app shell skeleton
```

Exit gate:

```text
npm run verify passes
empty app opens on localhost
no dead routes
no static proof panels
```

### Phase 2 - P0 Artifact Kernel

Goal: implement shared OS spine.

Deliverables:

```text
Artifact model
SourcePacket model
Projection model
MutationResult
Receipt writer
Audit writer
Data Control writer
Graph writer
Policy gate
repository transaction layer
```

Exit gate:

```text
source.capture creates all required consequences
reload preserves data
unit and e2e pass
```

### Phase 3 - P1 Single Artifact Corridor

Goal: first real owner-visible MVP.

Deliverables:

```text
Inbox capture
Library note
wikilink/backlink
Plan task
Today projection
Chat local message
Agent dry-run proposal
Graph neighborhood
Control receipt/audit/export/delete preview
```

Exit gate:

```text
Playwright creates one artifact and moves it through all surfaces
same artifact id survives reload
no global graph home
no empty sections
```

### Phase 4 - Workspace Depth

Goal: turn each required workspace into a real product surface.

Order:

```text
Inbox depth
Library depth
Plan/Today depth
Chat depth
Agents depth
Graph depth
Control depth
```

Exit gate:

```text
each workspace has at least one complete owner workflow
each workflow has repository/audit/control/graph evidence
coverage ledger updates after every ticket
```

### Phase 5 - Provider Boundaries

Goal: configure optional external/local providers safely.

Deliverables:

```text
provider readiness screens
credential boundary
local model readiness
external model readiness
media/transcription preview
screen/OCR explicit mode
budget/privacy routing
provider failure UI
```

Exit gate:

```text
no provider claim without setup
owner confirms credential use
external action smoke tests use mocked/local-safe providers unless owner approves real setup
```

### Phase 6 - Domain Expansion

Goal: add life domains as artifact projections.

Deliverables:

```text
health
routines
relationships
home
money
food
trips
domain packs
```

Exit gate:

```text
domain object is still artifact-backed
domain workflow has control/audit/graph
domain does not create separate store
```

### Phase 7 - Sync And Multi-Device

Goal: optional sync after local correctness.

Deliverables:

```text
sync outbox
conflict strategy
schema migration strategy
device state
partial replication model
privacy zones
offline tests
```

Exit gate:

```text
offline first still works
sync cannot leak unapproved privacy zones
conflict tests pass
```

### Phase 8 - Packs, Builder And Marketplace

Goal: controlled extensibility.

Deliverables:

```text
pack schema
pack install preview
pack permissions
pack rollback
pack export/delete
marketplace UI
```

Exit gate:

```text
pack cannot bypass repository
pack install is reversible
pack coverage is audited
```

### Phase 9 - Full Hardening

Goal: prepare for full-scale owner review.

Deliverables:

```text
performance pass
accessibility pass
security pass
copy/cognitive load pass
mobile pass
empty state pass
error state pass
offline pass
audit report
```

Exit gate:

```text
all automated gates pass
manual audit finds no P0/P1 defects
coverage ledger has no unexplained not-started rows
```

### Phase 10 - Final Release Audit

Goal: prove full implementation.

Deliverables:

```text
canon coverage report
workspace coverage report
policy boundary report
e2e report
visual screenshots
known limitations
owner acceptance checklist
```

Exit gate:

```text
owner can verify locally on localhost
all promised functions are implemented, guarded, blocked with reason, or deferred with explicit approval
```

## 19. Ticket System And Definition Of Done

Every ticket must use this template:

```text
Ticket ID:
Title:
Canon IDs:
Implementation class:
Workspace:
Owner action:
Repository objects:
Mutation type:
Projection:
Graph/backlink effect:
Receipt/audit effect:
Data Control effect:
Policy boundary:
UI controls:
Tests:
Audit ledger update:
Done proof:
```

### 19.1 Full Initial Ticket Backlog

This backlog is the first complete build route. It can be split further, but tickets must not be skipped or silently merged into vague work.

| Ticket | Phase | Title | Core output | Required gate |
| --- | --- | --- | --- | --- |
| `T00` | 0 | Freeze spike and source state | Mark current static localhost as spike; preserve useful lessons only. | No final architecture depends on spike-only code. |
| `T01` | 0 | Canon source ledger | Inventory, classes, coverage ledger template. | 1449 rows counted and classed. |
| `T02` | 0 | Guardrail pack | Project guardrails, forbidden shortcuts, decision log. | No old app/vendor runtime import. |
| `T03` | 1 | Final app scaffold | Vite/React/TypeScript structure or approved equivalent. | App opens locally with no empty fake routes. |
| `T04` | 1 | Test harness | Vitest, Playwright, audit script command structure. | `npm run verify` exists. |
| `T05` | 1 | Design system foundation | tokens, shell layout, accessible controls, responsive grid. | desktop/mobile screenshot review. |
| `T06` | 2 | Domain schemas | Artifact, SourcePacket, Projection, Receipt, Audit, Control, Graph, Policy schemas. | schema unit tests. |
| `T07` | 2 | Local repository adapter | IndexedDB adapter, stores, indexes, migrations. | repository integration tests. |
| `T08` | 2 | Universal mutation pipeline | `commitMutation` and `MutationResult`. | every mutation can emit consequences. |
| `T09` | 2 | Receipt/audit/control writers | reusable side-effect writers. | mutation test proves all three are created. |
| `T10` | 2 | Graph writer | graph nodes/edges with reasons/source refs. | graph evidence test. |
| `T11` | 2 | Policy boundary engine | external/destructive/provider/credential gates. | blocked action test. |
| `T12` | 3 | Inbox capture MVP | source -> artifact. | Playwright capture/reload. |
| `T13` | 3 | Library note MVP | artifact -> note. | note persistence test. |
| `T14` | 3 | Wikilink/backlink MVP | parser and index. | backlink + graph e2e. |
| `T15` | 3 | Plan task MVP | artifact/note -> task. | task traceability e2e. |
| `T16` | 3 | Today projection MVP | Today reads source/note/task/block. | no separate Today state. |
| `T17` | 3 | Chat local MVP | artifact thread and local message. | message persists and converts by owner action. |
| `T18` | 3 | Agent dry-run MVP | proposal, blocked actions, approval class. | no hidden action. |
| `T19` | 3 | Graph workspace MVP | local graph around selected artifact. | edge reasons visible. |
| `T20` | 3 | Control workspace MVP | receipts, audit, export/delete preview. | destructive boundary e2e. |
| `T21` | 3 | Full corridor e2e | complete artifact corridor spec. | same artifact id after reload. |
| `T22` | 4 | Inbox depth | URL/file/import/dedupe/interruption recovery. | each capture creates control/audit. |
| `T23` | 4 | Library depth | versions, tags, spaces, task bridges, exports. | version/rollback evidence. |
| `T24` | 4 | Plan depth | day/week/month, reschedule, focus, recovery. | reschedule receipts. |
| `T25` | 4 | Today/Journal depth | daily review, journal, mood/energy links. | Today uses real projections. |
| `T26` | 4 | Chat depth | message to note/task/artifact/proposal. | hidden obligation guard. |
| `T27` | 4 | Agents depth | queues, budgets, repeated-safe workflows. | approval class matrix passes. |
| `T28` | 4 | Graph depth | entity canonization, correction, relationship reasons. | correction audit. |
| `T29` | 4 | Data Control depth | privacy zones, export formats, revoke/rollback. | object-level control report. |
| `T30` | 5 | Provider readiness | provider profiles, setup states, failure states. | no fake success scan. |
| `T31` | 5 | Local AI boundary | local model readiness and disabled states. | owner approval required. |
| `T32` | 5 | Media/screen boundary | OCR/STT/screen explicit mode previews. | no hidden capture. |
| `T33` | 7 | Sync architecture | outbox, conflict policy, device state. | offline tests. |
| `T34` | 6 | Health/routine domain | artifact-backed health/routine projections. | domain object has source/control/graph. |
| `T35` | 6 | Relationships domain | people, reminders, private notes. | privacy zone audit. |
| `T36` | 6 | Home/money/trips/food domain wave | domain objects and flows. | no domain separate store. |
| `T37` | 8 | Pack schema | pack manifest and install preview. | pack rollback test. |
| `T38` | 8 | Builder views | custom object schemas/views. | repository-backed pack data. |
| `T39` | 8 | Marketplace boundary | local marketplace preview and permissions. | no hidden install. |
| `T40` | 9 | Performance pass | startup, storage, graph, large lists. | performance budget met. |
| `T41` | 9 | Accessibility pass | keyboard, focus, contrast, screen reader labels. | accessibility audit. |
| `T42` | 9 | Security/privacy pass | provider, credentials, destructive, export. | security audit. |
| `T43` | 9 | Visual/product pass | remove junk copy, empty surfaces, generic UI. | screenshot review. |
| `T44` | 10 | Canon coverage report | generated coverage and missing evidence. | no unclassified rows. |
| `T45` | 10 | Final owner audit pack | reports, screenshots, known limits, commands. | owner can verify locally. |

### 19.2 Ticket Ordering Rules

Do not start `T22+` before `T21` passes. Do not start provider/sync/domain/marketplace work before P0/P1 gates are stable. Do not mark a workspace complete until its negative and quality canon rows are mapped to guards.

Ticket sizes:

- small enough to test;
- must not mix unrelated workspaces unless corridor requires it;
- must not claim canon completion without coverage row;
- must include negative/quality guards where relevant.

Definition of Done:

```text
implemented code
unit/integration tests
Playwright flow if owner-visible
receipt/audit/control visible
graph/backlink visible where relevant
coverage ledger updated
manual smoke completed
no console errors
no mobile overflow
no fake provider/dead button/static proof
```

## 20. Testing Strategy

Required test layers:

| Layer | Purpose |
| --- | --- |
| Unit | Domain object validation, mutation logic, graph edge generation. |
| Repository | IndexedDB adapter, migrations, transactions, rollback snapshots. |
| Integration | Service mutation creates all side effects. |
| Component | UI states, disabled boundaries, error states. |
| Playwright | Full owner-visible user flows. |
| Audit scripts | Coverage, dead buttons, fake copy, provider claims. |
| Visual checks | Screenshot review for desktop/mobile. |

Required command family:

```text
npm run typecheck
npm run lint
npm run test
npm run e2e
npm run audit:canon
npm run audit:policy
npm run audit:ui
npm run verify
```

`npm run verify` must become the top-level gate.

## 21. Playwright Browser Verification

Playwright must verify the product as the owner sees it.

Core e2e specs:

```text
artifact-corridor.spec.ts
inbox-capture.spec.ts
library-backlinks.spec.ts
plan-today.spec.ts
chat-actions.spec.ts
agents-boundaries.spec.ts
graph-explainability.spec.ts
control-export-delete.spec.ts
provider-readiness.spec.ts
mobile-shell.spec.ts
```

First permanent e2e:

```text
open localhost
clear test DB
capture source
assert artifact id
promote to library note
add wikilink
assert backlink
create task
create time block
create Today page
send chat message
convert message to task
create agent dry-run proposal
approve local proposal
inspect graph nodes/edges/reasons
open Control
export preview
delete preview
reload
assert same artifact id and projections
mobile viewport
assert no overflow
capture screenshot
```

Browser verification is not optional. If a feature cannot be clicked and verified, it is not done.

## 22. Canon Coverage Ledger

The coverage ledger is the final anti-forgetting mechanism.

For every canon row:

- if function: map to implementation ticket;
- if quality: map to test/gate;
- if negative: map to regression guard or policy block;
- if provider: map to blocked-provider or implementation after setup;
- if domain: map to domain phase and artifact projection pattern.

Audit script must report:

```text
total rows
implemented rows
verified rows
guarded rows
blocked rows
deferred rows
unclassified rows
rows with no evidence
rows with stale evidence
rows whose tests no longer exist
```

Failure conditions:

- any unclassified row;
- any implemented row without evidence;
- any owner-visible row without e2e or manual evidence;
- any provider row claiming success without setup;
- any negative row without guard;
- any quality row without acceptance gate.

## 23. Final Audit Protocol

Final audit happens in stages.

### Audit 1 - Source Audit

Checks:

```text
master spec exists
inventory CSV exists
coverage ledger exists
all row counts match
no canon IDs lost
```

### Audit 2 - Architecture Audit

Checks:

```text
single repository interface
no workspace-local fake stores
all routes read from repository
mutation contract used
migrations present
```

### Audit 3 - Product Surface Audit

Checks:

```text
no empty routes
no static proof dashboard
no dead buttons
no feature copy without action
no overflowing mobile text
no generic landing page
```

### Audit 4 - Data Control Audit

Checks:

```text
every mutation has receipt
every mutation has audit
every object has Data Control item
export/delete/revoke/rollback preview works
privacy zones visible
```

### Audit 5 - Provider And Agent Audit

Checks:

```text
no fake provider success
no hidden agent action
approval classes enforced
credential use requires owner confirmation
external actions blocked until setup
```

### Audit 6 - Graph And Backlink Audit

Checks:

```text
graph nodes backed by objects
graph edges backed by reasons/source refs
backlinks generated from note content
corrections are audited
global graph not used as fake home
```

### Audit 7 - E2E Audit

Checks:

```text
all core e2e specs pass
desktop screenshots exist
mobile screenshots exist
no console errors
reload persistence verified
offline/local behavior verified
```

### Audit 8 - Canon Coverage Audit

Checks:

```text
1449 rows accounted for
1172 functions implemented/blocked/deferred with evidence
145 quality rows converted into gates
131 negative rows converted into guards
no unexplained not-started row in release scope
```

## 24. Full-Scale Completion Gate

LifeOS is full-scale complete only when:

```text
the owner can use it locally
the artifact kernel is stable
all workspaces are repository-backed
all P0/P1/P2 release rows are implemented or explicitly deferred
all quality rows have gates
all negative rows have guards
all provider rows are honest
all domains are artifact projections
all actions have audit/control
all e2e flows pass
coverage report is clean
manual audit is signed off
```

The final owner-visible proof must include:

```text
localhost URL
test command results
Playwright report
screenshots
coverage ledger
canon audit report
known limitations
next-phase backlog
```

## 25. Risk Register

| Risk | What breaks | Prevention |
| --- | --- | --- |
| Building screens before repository | Fake product | P0 kernel before workspace depth. |
| Too many canon rows at once | Chaos | Implementation classes and phase gates. |
| Provider excitement | Fake AI/cloud success | Provider boundary and blocked-provider class. |
| Graph as decoration | Trust loss | Edge reasons, source refs, corrections. |
| Data Control late | Privacy failure | Receipt/audit/control inside mutation contract. |
| Design afterthought | Bad localhost experience | Design system before workspace depth. |
| Tests only at end | Hidden breakage | Playwright per package. |
| Domains too early | Separate apps | Domains only as artifact projections. |
| Plugin too early | Tooling distraction | Plugin only after internal scripts stabilize. |
| Old app import | Broken inheritance | No old runtime import. |

## 26. Required Files And Future Repo Shape

Required docs:

```text
docs/LIFEOS_V33_FULL_SCALE_IMPLEMENTATION_MASTER_PLAN.md
docs/source_of_truth/V33_CANON_ITEM_INVENTORY.csv
docs/source_of_truth/V33_CANON_ITEM_IMPLEMENTATION_CLASSES.csv
docs/source_of_truth/V33_CANON_COVERAGE_LEDGER.csv
docs/source_of_truth/V33_BUILD_GATE_CHECKLIST.csv
docs/audit/V33_FINAL_AUDIT_REPORT.md
docs/decisions/
```

Required scripts later:

```text
scripts/canon/extract-inventory.mjs
scripts/canon/classify-inventory.mjs
scripts/canon/check-coverage.mjs
scripts/audit/no-dead-buttons.mjs
scripts/audit/no-fake-provider-success.mjs
scripts/audit/no-static-proof-panels.mjs
scripts/audit/no-disconnected-stores.mjs
scripts/audit/check-data-control.mjs
scripts/audit/check-graph-evidence.mjs
```

Required tests later:

```text
tests/unit/domain/
tests/unit/mutations/
tests/integration/repository/
tests/integration/projections/
tests/e2e/artifact-corridor.spec.ts
tests/e2e/workspaces/
```

Required evidence later:

```text
output/audit/
output/playwright/
output/screenshots/
output/coverage/
```

## 27. End-To-End Dependency Map

This section prevents disconnected implementation. Nothing should be built as an isolated feature unless its upstream and downstream dependencies are explicit.

### 27.1 Core Dependency Chain

Every product capability must attach to this chain:

```text
Canon row
-> Ticket
-> Owner action
-> Mutation contract
-> Repository transaction
-> Domain objects
-> Projection
-> Graph/backlink effect
-> Receipt
-> Audit event
-> Data Control item
-> Policy boundary
-> UI state
-> Test evidence
-> Coverage ledger update
```

If any link is missing, the feature is incomplete.

### 27.2 Hard Dependency Order

| Build area | Must exist before it | Why |
| --- | --- | --- |
| Inbox capture | Repository, Artifact, SourcePacket, Receipt/Audit/Data Control writers | Capture is the root input. |
| Library note | Artifact, Projection, Note schema, Graph writer | Notes are projections, not independent pages. |
| Wikilinks/backlinks | Note model, backlink index, graph edge writer | Links must become explainable graph facts. |
| Plan task | Artifact, Task schema, projection writer | Tasks must trace back to source/note/chat. |
| Today | Notes/tasks/calendar blocks | Today reads real work, never invents blocks. |
| Chat | Artifact context and Message schema | Messages must attach to an artifact. |
| Agents | Policy boundary, Proposal schema, receipts | Agents must not silently mutate or send. |
| Graph | Object schemas and graph writer | Graph cannot be decorative. |
| Control | Receipt/audit/control writers | Control must be universal, not workspace-specific. |
| Providers | Policy boundary, provider profiles, credential gates | No fake external readiness. |
| Domains | Artifact kernel and core workspace bridges | Domains cannot become separate apps. |
| Packs | Repository schema, policy gates, rollback | Packs must be reversible and controlled. |
| Sync | Local-first correctness, migrations, privacy zones | Sync must not define the product truth. |

### 27.3 Reverse Dependency Rule

Before implementing a feature, ask:

```text
What source creates it?
What artifact owns it?
What projection displays it?
What repository objects store it?
What graph/backlink relation explains it?
What receipt/audit/control records it?
What policy boundary can block it?
What test proves it?
What ledger rows are updated?
```

If the answer is unclear, the feature returns to planning.

### 27.4 Release Scope Dependency Rule

Release scope must be built in layers:

```text
P0-kernel -> P1-corridor -> P2-expand -> Blocked-provider setup -> P3-domain -> sync/packs/marketplace
```

Do not let visual polish, domains, providers, marketplace, sync, or plugins bypass the artifact kernel.

## 28. Cross-Workspace Contracts

This section defines how workspaces talk to each other without becoming separate apps.

### 28.1 Shared Contract

Every workspace receives:

```text
selectedArtifactId
repository query functions
mutation dispatcher
policy boundary reader
inspector data
coverage metadata
```

Every workspace returns:

```text
owner actions
projection refs
mutation requests
empty/error states
test ids
audit evidence
```

No workspace owns its own permanent store.

### 28.2 Workspace Contract Matrix

| Workspace | Reads | Writes | Must emit | Must never do |
| --- | --- | --- | --- | --- |
| Inbox | sources, artifacts, capture drafts | SourcePacket, Artifact | receipt, audit, data control, graph edge | create orphan source |
| Library | artifacts, notes, backlinks, graph refs | Note, WikiLink, Backlink | note receipt, graph edges, version event | store notes outside repository |
| Today | notes, tasks, calendar blocks, journal entries | TodayPage, DailyReview | daily receipt/audit | invent fake dashboard blocks |
| Plan | artifacts, tasks, calendar blocks | Task, CalendarBlock, FocusSession | task/calendar receipt and graph link | create untraceable tasks |
| Chat | artifact context, threads, messages | Message, action extraction candidate | local message receipt | hidden obligation or external send |
| Agents | artifacts, tasks, messages, policy | Proposal, WorkflowRunPreview | dry-run receipt, approval class | autonomous external/destructive action |
| Graph | graph nodes/edges/entities | correction/hide relation | correction audit/control | decorative/invented nodes |
| Control | all objects, receipts, audits, policy | ExportPreview, DeletePreview, RollbackPreview | control receipt/audit | silent delete/export/revoke |
| Providers | provider profiles, policy boundaries | readiness state, setup decision | setup audit | fake connected/success state |
| Domains | artifacts, source refs, graph, tasks | domain projections | domain receipt/control | separate app/store |
| Packs | schemas, templates, pack manifests | pack preview/install | permission/rollback receipt | hidden install |

### 28.3 Inspector Contract

The right-side inspector must work in every workspace and always answer:

```text
What artifact is selected?
Where did it come from?
What projections exist?
What graph links exist and why?
What receipts exist?
What audit events exist?
What data can be exported/deleted/rolled back?
What policy boundaries are active?
What provider exposure exists?
```

### 28.4 Navigation Contract

Workspace navigation is not app navigation. It changes projection view for the selected artifact.

Required navigation behavior:

- selected artifact persists across workspace changes;
- counts come from repository queries;
- empty workspace state gives the next safe action;
- blocked provider actions explain setup requirements;
- every route has at least one real action or a clear blocked boundary;
- no route exists only to show text.

## 29. Artifact Journey Blueprints

This section prevents incomplete workflows. Each major journey must be implemented and tested end-to-end.

### 29.1 Journey A - Raw Thought To Action

```text
Inbox text capture
-> Artifact
-> Library note
-> wikilink/backlink
-> task
-> Today block
-> Control receipt
-> Graph relation
```

Required tests:

- capture creates source/artifact;
- note is created from same artifact;
- wikilink creates backlink and graph edge;
- task references note/source;
- Today reads task;
- reload preserves all objects.

### 29.2 Journey B - Chat Message To Task

```text
Artifact context
-> local chat thread
-> owner message
-> message-to-task candidate
-> owner confirm
-> task projection
-> audit/control
```

Required guards:

- no hidden obligation;
- no external send;
- conversion requires owner action;
- message remains traceable after conversion.

### 29.3 Journey C - Agent Proposal To Local Approval

```text
Artifact
-> agent dry-run
-> action proposal
-> approval class
-> owner approves local mutation
-> task/workflow update
-> receipt/audit/control
```

Required guards:

- proposal is not execution;
- blocked actions visible;
- provider calls disabled;
- approval is stored;
- rollback preview exists.

### 29.4 Journey D - External Provider Setup

```text
Provider readiness
-> setup requirements
-> privacy/budget impact
-> owner confirmation
-> provider profile
-> limited test action
-> audit/control
```

Required guards:

- no credential use without confirmation;
- no fake success state;
- failure states are visible;
- provider can be revoked.

### 29.5 Journey E - Graph Correction

```text
Graph edge
-> why linked
-> owner disputes relation
-> correction preview
-> hide/correct edge
-> audit/control
```

Required guards:

- graph edge has source/reason;
- correction does not delete source object;
- audit records correction.

### 29.6 Journey F - Export/Delete/Rollback

```text
Control
-> select object/artifact
-> export preview
-> delete preview
-> rollback preview
-> owner confirmation if destructive
-> receipt/audit/control
```

Required guards:

- preview before destructive action;
- export shows scope;
- deletion cannot bypass privacy/policy;
- rollback has evidence.

### 29.7 Journey G - Domain Object From Source

```text
source
-> artifact
-> domain projection
-> task or routine
-> graph/entity link
-> Data Control
```

Required guards:

- domain projection keeps artifact id;
- domain object is not in a separate store;
- privacy zone exists for sensitive domains.

## 30. Data Integrity And Migration Protocol

Full-scale LifeOS must survive schema changes and owner data growth.

### 30.1 Schema Rules

Every persistent object must have:

```text
id
schemaVersion
createdAt
updatedAt
artifactId or explicit reason for no artifactId
canonRefs
privacyScope
receipt/audit trace where mutable
```

### 30.2 Migration Rules

Required migration behavior:

- migrations are versioned;
- migrations are additive when possible;
- migration creates audit event for major data transformations;
- migration has rollback or backup strategy;
- migration tests use old fixture data;
- no migration silently drops owner data.

### 30.3 Data Consistency Rules

Audit scripts must detect:

- projection without artifact;
- graph edge with missing node;
- receipt without artifact;
- audit without action type;
- Data Control item without target object;
- task without source/projection ref;
- note backlink without note;
- provider action without provider boundary;
- domain object without artifact role.

### 30.4 Data Repair Protocol

If integrity check fails:

```text
1. Freeze new writes.
2. Export broken object bundle.
3. Produce repair preview.
4. Owner approves repair if data-changing.
5. Apply repair transaction.
6. Write repair receipt/audit/control.
7. Re-run integrity checks.
```

## 31. Error States, Empty States And Recovery

The app must fail honestly and recover locally.

### 31.1 Required Error States

| Error | Owner-visible behavior | Required recovery |
| --- | --- | --- |
| Local DB open failure | Show local repository error | retry, export fallback if possible |
| Migration failure | Stop writes, show repair needed | backup and migration report |
| Quota exceeded | Explain storage limit | export/delete/archive suggestions |
| Provider not configured | Show setup boundary | configure or stay local |
| Provider failed | Show failed status | retry/disable/provider logs |
| Invalid capture | Keep draft | edit and retry |
| Broken graph relation | Show correction path | hide/correct edge |
| Delete blocked | Show reason | preview/confirm or cancel |
| Sync conflict later | Show conflict preview | field-level merge decision |
| Missing artifact reference | Show repair state | integrity repair protocol |

### 31.2 Empty State Rules

Empty states must:

- contain one safe next action;
- not advertise unbuilt features;
- not use long marketing text;
- not claim readiness;
- show what data is needed;
- create a real object when acted on.

Examples:

```text
Inbox empty -> Capture source
Library empty -> Promote selected artifact to note
Plan empty -> Create task from artifact
Chat empty -> Open local thread
Agents empty -> Create dry-run proposal
Graph empty -> Build graph from existing artifact facts
Control empty -> Explain that receipts appear after first mutation
Providers empty -> Provider not configured, local mode available
```

### 31.3 Recovery Rules

Every workspace needs:

- draft preservation;
- retry behavior;
- blocked reason;
- rollback or undo where meaningful;
- audit of recovery if data changes;
- e2e test for at least one failure path.

## 32. UI Action And Button Contract

This section prevents dead buttons.

### 32.1 Button Contract

Every clickable control must have:

```text
label or icon
data-testid
enabled/disabled state
disabled reason if disabled
handler
mutation type or navigation type
owner-visible result
receipt/audit/control effect if mutation
test coverage
```

### 32.2 Button Categories

| Category | Examples | Requirements |
| --- | --- | --- |
| Navigation | workspace switch, artifact select | no data mutation unless explicit |
| Local mutation | capture, save note, create task | repository transaction and receipt |
| Preview | export preview, delete preview, workflow preview | no destructive/external side effect |
| Confirmed action | delete, provider connect, external send | explicit owner confirmation |
| Blocked action | provider call before setup | visible disabled reason |

### 32.3 Dead Button Audit

Audit script must fail if:

- button has no handler;
- handler does not change route/state/mutation/preview;
- mutation button produces no receipt;
- provider button claims success without provider profile;
- destructive button lacks preview/confirmation;
- button text overflows on mobile.

## 33. Quality Gates And Audit Automation

Manual discipline is not enough. The repo needs automated gates.

### 33.1 Required Gate Commands

```text
npm run verify
npm run audit:canon
npm run audit:coverage
npm run audit:integrity
npm run audit:ui
npm run audit:policy
npm run audit:graph
npm run audit:data-control
npm run e2e
```

### 33.2 Gate Responsibilities

| Gate | Must check |
| --- | --- |
| `audit:canon` | counts, missing IDs, duplicate IDs |
| `audit:coverage` | every canon row has status/evidence when in scope |
| `audit:integrity` | orphan objects, broken refs, schema mismatch |
| `audit:ui` | dead buttons, fake panels, overflow, missing test ids |
| `audit:policy` | provider/destructive/credential boundaries |
| `audit:graph` | graph edges have nodes/reasons/source refs |
| `audit:data-control` | mutations have receipts/audit/control |
| `e2e` | browser flows |

### 33.3 Evidence Requirements

Evidence paths may include:

```text
tests/unit/...
tests/integration/...
tests/e2e/...
output/playwright/...
output/audit/...
docs/audit/...
manual audit note with date and owner-visible steps
```

No coverage ledger row should be `verified` without evidence.

### 33.4 Build Gate Checklist

The build gate checklist is stored at:

`docs/source_of_truth/V33_BUILD_GATE_CHECKLIST.csv`

It defines concrete gates from `G00` to `G45`. A phase cannot be considered complete unless all gates for that phase pass or are explicitly deferred with owner approval and audit notes.

Each gate row is also an acceptance journal row. Future development must fill:

```text
GateStatus
EvidencePath
LastVerifiedAt
ManualAuditNotes
```

Accepted values for `GateStatus`:

```text
pending
pass
fail
deferred-owner-approved
blocked-provider
```

No phase should be marked complete while any required gate is `pending` or `fail`.

## 34. Integration And Provider Readiness Matrix

External integrations are dangerous if treated as normal UI.

### 34.1 Provider Types

| Provider type | Initial status | Required before use |
| --- | --- | --- |
| Local AI model | disabled | local model detection, privacy note, owner enable |
| External AI API | disabled | credential confirmation, budget, privacy scope |
| Calendar sync | disabled | provider profile, scope, test event preview |
| Email send/read | disabled | account setup, scopes, send preview |
| OCR/screen | disabled | explicit mode, visible capture state |
| STT/audio | disabled | microphone/file permission, transcript preview |
| Cloud sync | disabled | sync engine, privacy zones, conflict strategy |
| Payments | disabled | legal/business setup, server-authoritative validation |
| Search/web | disabled | source citation, rate/privacy boundary |

### 34.2 Provider State Machine

```text
not-configured
setup-preview
awaiting-owner-confirmation
configured
test-ready
active
failed
revoked
disabled-by-policy
```

Provider UI must display state honestly. `active` is impossible without real setup and verification.

### 34.3 Provider Audit

Provider audit fails if:

- UI says connected but no profile exists;
- action succeeds without credential/setup;
- data leaves local scope without audit;
- provider failure is hidden;
- owner cannot revoke provider;
- provider action has no Data Control item.

### 34.4 Ollama / Local AI Contract

Ollama is a local provider, not a built-in assumption. It must be treated with the same honesty rules as every provider.

Required repository objects:

```text
LocalAIProvider
ModelProfile
ProviderHealth
AgentRun
Proposal
PolicyBoundary
Receipt
AuditEvent
DataControlAction
```

Required Ollama states:

```text
not-installed-or-not-running
probe-pending-owner-confirmation
reachable-no-models
model-ready
test-failed
revoked
```

Required actions:

1. Ask owner before probing `localhost` Ollama.
2. Probe health endpoint only after confirmation.
3. List models only if the service responds.
4. Run a small test prompt before showing `model-ready`.
5. Save model output as a proposal first.
6. Require approval before mutating notes, books, transcripts, tasks or goals.
7. Record receipt, audit event, graph edge and Data Control action.
8. Provide revoke/disconnect control.

Ollama acceptance fails if:

- UI says local AI is ready without a successful probe;
- generated text silently edits notes;
- books or transcripts are summarized without source refs;
- a provider failure is hidden behind generic copy;
- no revoke/disconnect action exists;
- no Playwright smoke proves unavailable and available states.

Ollama is useful for:

- note summarization;
- tag/concept extraction;
- book chapter summarization;
- transcript cleanup and action extraction;
- goal/task proposal generation.

Ollama is not a transcription engine by itself. Audio transcription must first produce a transcript through a configured STT provider or local STT engine, then Ollama may summarize or structure that transcript.

## 35. Design System Completion Contract

The app must not merely function. It must be usable without cognitive mess.

### 35.1 Visual System Requirements

Required:

- consistent typography scale;
- consistent spacing rhythm;
- limited but not one-note palette;
- compact operational density;
- clear selected artifact identity;
- clear action hierarchy;
- stable responsive grid;
- no nested card stacks;
- no excessive explanatory text;
- no marketing hero;
- no decorative graph/panels;
- clear disabled states;
- real empty states.

### 35.2 Workspace Visual Contracts

| Workspace | Visual priority |
| --- | --- |
| Inbox | fast capture, artifact list, source preview |
| Library | editor, backlinks, note metadata |
| Today | actionable day blocks, not dashboard theater |
| Plan | tasks/time/focus with traceability |
| Chat | conversation plus action extraction |
| Agents | proposal queue with impact and approvals |
| Graph | local graph and why-linked panel |
| Control | receipts/audit/control actions, calm trust surface |
| Providers | readiness and setup boundaries |
| Domains | domain object panels tied to artifact/source |
| Packs | install preview and permissions |

### 35.3 Design QA Checklist

Before release:

- desktop screenshot for every workspace;
- mobile screenshot for every workspace;
- no horizontal overflow;
- no clipped button text;
- no unreadable contrast;
- keyboard navigation works;
- empty/error states are useful;
- no page reads like placeholder UI;
- selected artifact is always visible or intentionally replaced by capture mode.

### 35.4 Connected Design Build Plan

Detailed design implementation is controlled by:

```text
docs/LIFEOS_V33_CONNECTED_DESIGN_SYSTEM_BUILD_PLAN.md
docs/source_of_truth/V33_DESIGN_IMPLEMENTATION_CHECKLIST.csv
```

The design plan is not a moodboard. It defines how every visible surface binds to repository objects, mutation commands, receipts, audit events, graph/backlink proof and Data Control.

Each design checklist row is an acceptance journal row. Future design work must fill:

```text
DesignStatus
EvidencePath
LastVerifiedAt
ManualAuditNotes
```

Accepted values for `DesignStatus`:

```text
pending
pass
fail
deferred-owner-approved
blocked-provider
```

Design work must follow this order:

1. Build shell tokens and layout primitives.
2. Bind the selected artifact to the shell.
3. Make Inbox capture create repository-backed objects.
4. Add the artifact corridor.
5. Add Library, Today/Plan, Chat, Agents, Graph and Control projections for the same artifact.
6. Add provider blocked states honestly.
7. Add mobile shell and evidence drawer.
8. Run Playwright desktop and mobile verification.
9. Update the coverage ledger and design checklist with evidence.

Design acceptance fails if:

- a workspace is visually complete but does not render repository objects;
- a button has no mutation and no receipt path;
- graph/backlinks are decorative;
- Data Control is missing from the selected artifact;
- provider or agent state is fake;
- screenshots show overflow, clipped text or placeholder surfaces.

## 36. Performance, Accessibility And Security Budgets

### 36.1 Performance Budgets

Initial budgets:

```text
first usable local screen: under 2s on normal dev machine
workspace switch: under 150ms after data loaded
local mutation feedback: under 100ms optimistic/local
graph around selected artifact: under 300ms for 200 nodes
search/filter visible results: under 200ms for MVP data sizes
e2e corridor test: under 60s
```

Performance audit must include large local fixture data, not only empty state.

### 36.2 Accessibility Budgets

Required:

- keyboard access for core flows;
- visible focus states;
- labels for inputs;
- accessible names for icon buttons;
- no action only by color;
- contrast checks;
- reduced-motion handling where motion exists;
- error messages tied to controls.

### 36.3 Security And Privacy Budgets

Required:

- no hardcoded secrets;
- no credentials in repo;
- no external action without provider profile;
- no hidden capture;
- local data export path;
- delete preview;
- privacy zones;
- provider revocation;
- audit for sensitive actions;
- no committing `*.local.txt` or `*.local.md`.

## 37. Execution Runbook

This is the step-by-step operating procedure once owner approves implementation.

### 37.1 Start Of Each Work Session

```text
1. Read latest user request.
2. Read AGENTS/guardrails.
3. Check git status.
4. Open master plan.
5. Pick exactly one active ticket.
6. Read canon rows for that ticket.
7. Update or create ticket note.
8. Implement only scoped changes.
```

### 37.2 During Ticket

```text
1. Add/modify schemas.
2. Add mutation contract path.
3. Add repository transaction.
4. Add UI action if owner-visible.
5. Add receipt/audit/control consequences.
6. Add graph/backlink consequences.
7. Add policy boundary if needed.
8. Add tests.
9. Run verify.
10. Update coverage ledger.
```

### 37.3 End Of Ticket

```text
1. Run unit/integration tests.
2. Run Playwright for owner-visible flows.
3. Run audit scripts.
4. Save evidence path.
5. Update coverage ledger status.
6. Write short ticket completion note.
7. Do not claim full product completion unless final gate passed.
```

### 37.4 When Something Fails

```text
1. Do not weaken tests.
2. Identify whether failure is data, UI, policy, graph, control, provider or test harness.
3. Add regression test if missing.
4. Fix root cause.
5. Re-run focused test.
6. Re-run verify.
7. Record audit note if it affects coverage.
```

## 38. Release Readiness Scorecard

The project needs a numeric readiness view so "almost done" does not become vague.

### 38.1 Score Categories

| Category | Weight | Pass condition |
| --- | ---: | --- |
| Canon coverage | 20 | No unclassified rows, release scope has evidence. |
| P0/P1 kernel/corridor | 15 | Full artifact corridor passes. |
| Workspace depth | 15 | Each release workspace has real workflows. |
| Data Control/audit | 15 | Every mutation has receipt/audit/control. |
| Graph/backlinks | 10 | Edges have reason/source/correction. |
| Provider honesty | 10 | No fake setup/success. |
| UI/UX quality | 5 | No placeholder/generic/overflow issues. |
| Accessibility/performance/security | 5 | Budgets pass. |
| Final owner evidence | 5 | Reports, screenshots, commands, known limits. |

Total: 100.

### 38.2 Readiness Levels

| Score | Meaning |
| ---: | --- |
| 0-39 | Planning/spike only. |
| 40-59 | Kernel partially works, not product-ready. |
| 60-74 | MVP usable but not full-scale. |
| 75-89 | Broad beta, audit gaps remain. |
| 90-100 | Release candidate. |

### 38.3 Release Candidate Rule

Release candidate requires:

```text
score >= 90
P0/P1 all verified
no critical policy failures
no fake provider claims
no dead core buttons
coverage ledger clean for release scope
owner can reproduce locally
```

## 39. Plan Self-Audit

This plan covers:

- source inventory control;
- all 1449 canon rows through coverage ledger;
- local-first architecture;
- repository/domain model;
- mutation contract;
- app shell and design direction;
- every major workspace;
- provider boundaries;
- Data Control;
- graph/backlinks;
- agents/workflows;
- domains/packs/marketplace;
- subagent workflow;
- plugin strategy;
- phased roadmap;
- ticket template;
- testing strategy;
- Playwright verification;
- final audit protocol;
- full-scale completion gate.
- end-to-end dependency map;
- cross-workspace contracts;
- artifact journey blueprints;
- data integrity and migrations;
- error, empty and recovery states;
- UI action/button contract;
- audit automation gates;
- provider readiness matrix;
- design completion contract;
- connected design implementation plan;
- design implementation checklist;
- performance/accessibility/security budgets;
- execution runbook;
- release readiness scorecard.

This plan does not claim the product is complete. It defines how to build and audit it so completion can be proven.

Next required owner decision:

```text
Approve this master plan as the build controller, then start Phase 0 cleanup and Phase 1 final app foundation.
```
