# LifeOS v33 — Function Inventory And Real Working Environment Plan

Status: planning and inventory only. No product code is implemented by this document.

Owner intent: turn the master function list into a real local working LifeOS environment where buttons mutate repository-backed artifacts, state survives reload, graph/control/audit are real, and Playwright smoke proves the product corridor works.

## 1. Inputs Read

- Master spec: `C:/Users/Данил/Downloads/LIFEOS_V33_ARTIFACT_OS_MASTER_FUNCTION_SPEC_AUDITED.md`
- Extracted machine-readable inventory: `docs/source_of_truth/V33_CANON_ITEM_INVENTORY.csv`
- Generated implementation classes: `docs/source_of_truth/V33_CANON_ITEM_IMPLEMENTATION_CLASSES.csv`
- Existing plan: `docs/LIFEOS_V33_ARTIFACT_OS_INTER_APP_BUILD_PLAN.md`
- Installed skill: `.agents/skills/local-first/SKILL.md`
- Installed skill: `.agents/skills/playwright-e2e-init/SKILL.md`
- Existing local skill: `C:/CodexHome/skills/frontend-design/SKILL.md`
- Existing local guard skill: `lifeos-orchestrator`

## 2. Skills Installed For This Planning Pass

These skills were installed because they directly support the move from a function list to a working local product:

| Skill | Installed path | Why it is needed |
| --- | --- | --- |
| `oakoss/agent-skills@local-first` | `.agents/skills/local-first` | Forces the architecture to start from local durable data, not disconnected UI arrays. |
| `shipshitdev/library@playwright-e2e-init` | `.agents/skills/playwright-e2e-init` | Forces real browser verification of the core user flow. |

No credentials were used. No external service was configured. No product code was written as part of skill installation.

## 3. Architecture Decisions From The Installed Skills

### 3.1 Local-first decision

LifeOS should start as a local-first product for the core artifact corridor because:

- capture, notes, planning, chat context and graph must feel instant;
- the MVP must work without external providers;
- the source of truth for the UI must be local and durable;
- reload must not destroy the owner's work;
- later sync/provider layers must not define the product's core truth.

Initial storage recommendation:

| Layer | MVP choice | Later upgrade |
| --- | --- | --- |
| UI read path | local repository read | live query layer if needed |
| UI write path | local repository mutation | background sync queue if needed |
| Browser persistence | IndexedDB or a thin typed adapter | SQLite WASM / PGlite only if query complexity demands it |
| Conflict model | single-owner local writes first | field-level merge for multi-device sync later |
| Provider/AI | disabled unless explicitly configured | provider boundary with dry-run, budget and approval |

MVP rule: the local repository is the source of truth. It is not a cache around static demo state.

### 3.2 Playwright/e2e decision

Every development package must include a browser-level proof. The first critical test is:

```text
create source -> artifact id -> library note -> wikilink/backlink
-> plan item -> chat message -> agent dry-run proposal
-> graph nodes/edges -> control receipt/audit/export/delete preview
-> reload -> same artifact id still appears everywhere
```

Selectors must be stable, using `data-testid`. Tests must click real controls, not only assert text.

### 3.3 Frontend decision

LifeOS should not start as a landing page, proof dashboard, or ten empty app sections.

The first visible surface should be a dense working app shell:

- left: workspace navigation;
- center: selected artifact and active projection;
- right: backlinks, graph neighborhood, receipts and control state;
- command/action strip: capture, promote, plan, chat, propose, inspect, export/preview.

Visible copy should be short and operational. No long explanatory feature panels.

## 4. Inventory Extraction Result

The master spec contains an embedded CSV inventory. It was extracted into:

`docs/source_of_truth/V33_CANON_ITEM_INVENTORY.csv`

Parsed counts:

| Type | Count |
| --- | ---: |
| Functions | 1172 |
| Quality criteria | 145 |
| Negative guards | 131 |
| Total canonical inventory rows | 1449 |

Generated implementation-class counts:

| Implementation class | Count | Meaning |
| --- | ---: | --- |
| `P0-kernel` | 51 | Shared artifact kernel before broad UI expansion. |
| `P1-corridor` | 20 | First visible single-artifact MVP corridor. |
| `P2-expand` | 716 | Workspace depth after the MVP corridor works. |
| `P3-domain` | 280 | Domain and builder expansion after the kernel is reliable. |
| `Blocked-provider` | 106 | Provider/model/media/screen/sync work blocked until explicit setup. |
| `Guard-only` | 276 | Quality and negative rows converted into gates/tests/guards. |

## 5. Inventory By Product Bucket

| Bucket | Total | Initial planning decision |
| --- | ---: | --- |
| Life Domains / Wellbeing / Money / Family | 289 | Later. Must not drive MVP. Domain objects become LifeObjects after kernel exists. |
| Data Control / Trust / Privacy | 171 | Required in MVP as receipt/audit/export/delete/rollback preview. |
| Library / Obsidian Core | 170 | Required in MVP as note projection, wikilinks and backlinks. |
| Planner / Tasks / Calendar / Focus | 151 | Required in MVP as task/time-block projection from the artifact. |
| Providers / Local AI / Media / Screen | 150 | Mostly blocked until provider boundaries exist. No fake provider success. |
| Today / Journal | 117 | Required in MVP as owner-facing daily projection reading real notes/tasks/source links. |
| Capture / Inbox | 101 | Required first. Every source becomes a repository-backed artifact. |
| Kernel / OS Spine | 95 | Required before broad UI. It defines identity, lifecycle, receipts and graph refs. |
| Chat / Communication | 77 | Required in MVP as local artifact-context conversation, with no external send. |
| Packs / Builder / Marketplace | 44 | Later. Do not build marketplace before the artifact kernel works. |
| Agents / Workflows | 44 | Required in MVP only as dry-run proposals and approval classes. |
| LifeGraph / Entities | 40 | Required in MVP as local graph around the selected artifact, not global graph as home screen. |

## 6. Inventory Classification Rules

Every canonical row gets one implementation class:

| Class | Meaning | Development rule |
| --- | --- | --- |
| `P0-kernel` | Required for any honest product surface | Build before or together with the first corridor. |
| `P1-corridor` | Needed for the first visible artifact journey | Must be clickable and smoke-tested in MVP. |
| `P2-expand` | Useful after the corridor works | Add after repository, receipts, graph and control are stable. |
| `P3-domain` | Domain-specific life/wellbeing/money/family/work features | Build as projections over LifeObject, not separate apps. |
| `Blocked-provider` | Needs external provider, model, sync, screen, audio or credential setup | Show readiness/config/preview only; no fake success. |
| `Guard-only` | Negative or quality row | Convert into tests, copy review checks or policy gates. |

No row becomes "just a label". If it cannot produce a repository mutation, graph/control consequence, or testable guard, it is not ready for product implementation.

## 7. First MVP Canonical Corridor

This is the first visible product. It is one artifact moving through all required projections.

| Step | Canon IDs | Route | Owner-visible action | Required repository effect | Required proof |
| --- | --- | --- | --- | --- | --- |
| Kernel identity | `C01-004`, `C19-001` | `/app/system` invisible | Artifact gets lifecycle, role, projection refs | `Artifact`, `SourceRef`, `Receipt`, `AuditEvent`, `GraphEdge` | Same id appears in all projections after reload. |
| Inbox capture | `C01-003`, `C03-007`, `C03-013` | `/app/inbox` | Owner pastes text and captures it | `SourcePacket` + `Artifact` + provenance + receipt | Capture button creates durable artifact. |
| Library projection | `C06-008`, `C06-009`, `C18-001` | `/app/library` | Owner promotes artifact to note and adds `[[wikilink]]` | `Note`, `WikiLink`, `Backlink`, graph edge | Backlink appears and survives reload. |
| Plan projection | `C09-001`, `C06-063`, `C06-065` | `/app/plan` | Owner turns note/source into task/time block | `Task`, `CalendarBlock`, projection refs | Task is traceable back to artifact. |
| Today projection | `C07-001` | `/app/today` | Owner sees today's real artifact/task/note block | `TodayPage` reads existing data | Today does not invent separate state. |
| Chat projection | `C04-013`, `C04-026`, `C04-028`, guard `C04-054` | `/app/chat` | Owner sends local context message and can turn it into task/artifact | `ChatThread`, `Message`, optional task/proposal refs | No hidden obligation is created. |
| Agent dry-run | `C17-003`, `C17-018`, `C21-061`, guards `C17-035`, `C17-036` | `/app/agents` | Owner asks for a proposed next action | `ActionProposal`, `WorkflowRunPreview`, approval class, receipt | Proposal is dry-run until approval. |
| Graph | `C18-038`, `C18-040`, `C18-041`, guards `C18-042`, `C22-045` | `/app/graph` | Owner inspects local graph around artifact | `GraphNode`, `GraphEdge`, reason, confidence | Graph explains "why linked" and is not decorative. |
| Control | `C20-001`, `C19-032`, `C21-001` | `/app/control` | Owner sees receipts, audit, storage, export/delete/rollback preview | `DataControlItem`, `AuditEvent`, `ExportJob`, `DeletePreview` | No destructive action without preview/confirmation boundary. |

## 8. Repository Objects Required Before Feature Expansion

The first implementation milestone must define these typed objects:

| Object | Why it exists |
| --- | --- |
| `Artifact` | Root identity for a piece of life material across all workspaces. |
| `SourcePacket` | Raw input with provenance, source type and checksum/stable identity. |
| `ArtifactProjection` | Shared way to represent note/task/chat/proposal/control/graph projections. |
| `Note` | Library/Obsidian projection with markdown, wikilinks and backlinks. |
| `Task` | Plan projection connected to source/note/chat. |
| `CalendarBlock` | Time placement for a task or artifact-driven action. |
| `ChatThread` / `Message` | Local artifact-context conversation. |
| `ActionProposal` | Agent/workflow dry-run proposal with approval state. |
| `GraphNode` / `GraphEdge` | Typed graph with source, reason and confidence. |
| `Receipt` | Owner-visible proof of mutation. |
| `AuditEvent` | Append-only log of important local actions. |
| `DataControlItem` | Export/delete/revoke/rollback/privacy surface for data. |
| `PolicyBoundary` | Blocks external, destructive, credential, provider and hidden actions. |

## 9. Work Packages

### Package 0 — Source Of Truth

Deliverables:

- keep `V33_CANON_ITEM_INVENTORY.csv` as the machine-readable planning source;
- create a generated planning table that assigns every row to one of the classes above;
- mark all provider/cloud/screen/audio/payment/sync rows as `Blocked-provider` until setup exists.

Done:

- inventory totals match `1449 / 1172 / 145 / 131`;
- every row has an implementation class;
- no row is silently dropped.

### Package 1 — Artifact Kernel

Deliverables:

- domain types;
- local repository interface;
- persistence adapter;
- mutation contract;
- receipt/audit/graph/control hooks on every mutation.

Done:

- create/update/delete-preview actions always produce receipts;
- UI cannot create disconnected workspace-local records.

### Package 2 — First Artifact Corridor

Deliverables:

- one working surface for `Inbox`, `Library`, `Today/Plan`, `Chat`, `Agents`, `Graph`, `Control`;
- all surfaces read the same artifact id;
- no static proof panels.

Done:

- Playwright corridor test clicks the full journey and proves persistence after reload.

### Package 3 — Control And Policy Gates

Deliverables:

- export preview;
- delete preview;
- rollback preview;
- policy boundary for provider/external/destructive actions;
- audit timeline.

Done:

- no external send, provider success, deletion, publication or credential action can happen silently.

### Package 4 — Expansion Waves

Expansion only starts after the first corridor passes smoke.

Order:

1. Library depth: note versions, tags, spaces, backlinks, tasks inside notes.
2. Plan depth: day/week/month, focus, reschedule, recovery.
3. Today depth: daily review, journal, recovery, progress.
4. Chat depth: messages to tasks/events/artifacts, local-only work conversations.
5. Agents depth: more proposal types, queues, budgets, approval classes.
6. Graph depth: entity canonization, edge correction, relationship reasons.
7. Data Control depth: privacy zones, export formats, deletion workflows.
8. Providers only after explicit setup and owner approval.
9. Domains only after the artifact kernel is boringly reliable.

## 10. Real Smoke Gate

The first product cannot be called working unless this passes:

```text
npm run verify
```

Expected internal checks:

```text
typecheck
lint
unit/domain tests
repository persistence tests
receipt/audit tests
graph edge tests
data control tests
playwright artifact corridor test
dead button scan
fake proof/copy scan
provider success scan
reload persistence test
mobile viewport smoke
```

Core Playwright spec name:

```text
e2e/artifact-corridor.spec.ts
```

Required e2e story:

```text
1. Open localhost.
2. Capture a source in Inbox.
3. Assert a new artifact id exists.
4. Promote it to Library.
5. Add a wikilink and assert backlinks.
6. Create a plan item/time block.
7. Confirm Today reads the same artifact/task.
8. Send a local chat message attached to the artifact.
9. Generate an agent dry-run proposal.
10. Inspect graph nodes/edges and edge reasons.
11. Inspect Control receipt/audit/export/delete preview.
12. Reload page.
13. Assert the same artifact id is still present in all projections.
```

## 11. What Must Not Be Built First

- No proof dashboard.
- No ten empty sections.
- No one page per canon item.
- No fake labels without repository-backed artifacts.
- No workspaces as separate apps or separate stores.
- No global graph as the home screen.
- No fake provider, model, screen, sync or cloud readiness.
- No hidden agent actions.
- No old broken app import.
- No vendor archive execution from `siyuan-master.zip` or `logseq-master.zip`.

## 12. Immediate Next Development Plan

If approved, the next actionable development ticket is:

```text
Ticket 1: Build the typed artifact repository kernel and the first Inbox -> Artifact mutation.
```

Current status: implemented in the static localhost app shell with an IndexedDB-backed `LifeOSRepository`; verified by `npm run verify` and Playwright CLI corridor run on `http://localhost:4173`.

Acceptance for Ticket 1:

- owner can paste source text;
- `SourcePacket` and `Artifact` are persisted locally;
- a receipt and audit event are created;
- a graph edge `source -> artifact` exists;
- Data Control shows storage/export/delete preview for the artifact;
- reload keeps the artifact;
- Playwright verifies the flow.

Then proceed to:

```text
Ticket 2: Library note projection with wikilinks/backlinks.
Ticket 3: Plan/Today projection from the same artifact.
Ticket 4: Chat local thread attached to the artifact.
Ticket 5: Agent dry-run proposal with approval class.
Ticket 6: Graph and Control inspector around the selected artifact.
Ticket 7: Full corridor Playwright smoke and no-fake-progress gates.
```

This keeps the project honest: one artifact, one repository, many projections, real smoke.
