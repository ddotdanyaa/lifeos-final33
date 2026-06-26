# LifeOS v33 Artifact OS — Inter-App Personal Operating System Build Plan

Status: owner-review plan only. Do not write product code from this plan until the owner explicitly approves it.

Source note: the requested in-repo file `docs/LIFEOS_V33_ARTIFACT_OS_MASTER_FUNCTION_SPEC.md` was not present in the current checkout at plan time. This plan was generated from the attached audited source file `C:/Users/Данил/Downloads/LIFEOS_V33_ARTIFACT_OS_MASTER_FUNCTION_SPEC_AUDITED.md`, which says it should become `docs/LIFEOS_V33_ARTIFACT_OS_MASTER_FUNCTION_SPEC.md` in the clean project.

## 1. Product Spine

LifeOS v33 must be built as an artifact operating system, not as a bundle of apps. Inbox, Library/Obsidian, Today/Plan, Chat, Agents, Graph and Control are projections over the same durable artifact graph.

Every implementation package must follow this chain:

```text
input/source -> Artifact -> projections -> repository -> graph/backlinks
-> receipt/audit -> Data Control -> owner-visible result -> smoke
```

No package is done if it only creates labels, cards, static arrays, fake receipt ids, decorative graph nodes, fake AI/provider success, route shells, proof panels, or isolated per-route state.

## 2. First Visible MVP

The first visible MVP is one corridor for one artifact, not ten empty sections.

Owner-visible scenario:

1. The owner captures one raw source in Inbox, such as text, a link, or a pasted note.
2. LifeOS persists a repository-backed `Artifact` with a `SourcePacket`, provenance, lifecycle state, privacy scope and canon refs.
3. The owner promotes the artifact into a Library/Obsidian note projection with markdown, wikilinks and backlinks.
4. The owner creates one Today/Plan projection from the same artifact, such as a next action or local calendar block.
5. Chat opens with the selected artifact as local context and stores one local message thread against the artifact.
6. Agents produce a dry-run proposal attached to the artifact, with scope, impact and approval state. No external action runs.
7. Graph shows the artifact, source, note, task, chat thread, proposal and Control records as real nodes/edges with reasons.
8. Control shows the receipt, audit events, storage location, export preview, revoke/rollback/delete preview and permission boundary.
9. A smoke test creates or loads the artifact, moves it through the corridor, reloads, and proves the same id appears in all projections.

First viewport rule: show the selected artifact and its current useful projection first. The right inspector may show backlinks, graph, receipts and Control trail. Do not lead with a proof dashboard, static readiness cards, or a wall of receipts.

## 3. Repository Model

Build the repository before broad UI.

Required runtime objects:

- `Artifact`: durable root object with id, title, lifecycle state, source refs, projection refs, receipt refs, graph refs, Data Control refs, privacy scope, canon refs, timestamps.
- `SourcePacket`: raw captured material with input type, provenance, checksum or stable source identity, owner-visible status and parsed preview.
- `ArtifactProjection`: typed projection record for inbox source, library note, daily note, task, calendar block, chat context, agent proposal, workflow preview, graph node and data-control trail.
- `GraphNode` and `GraphEdge`: repository-backed graph records with source, reason, confidence, created-by and hidden/corrected state.
- `Receipt` and `AuditEvent`: mutation proof records for local actions, dry-runs, approvals, rollbacks, exports and previews.
- `DataControlItem`: storage, privacy scope, export/delete/revoke/rollback capability and permission impact.
- `PolicyBoundary`: explicit block/gate for provider, external, destructive, payment, public publish, sync, screen/OCR/STT/upload, and hidden mutation actions.

Persistence requirements:

- Use one local repository interface for all workspaces.
- Routes and components read from the repository; they do not own disconnected arrays.
- State survives reload.
- Seed/demo data, if any, must be marked as seeded and still be repository-backed.
- No vendor runtime code, old app runtime, or old route modules are imported into the new product surfaces.

## 4. Package Sequence

### Package A: Source Of Truth And Guardrails

Goal: make the source boundary explicit before any product build.

Scope:

- Put the audited master spec into the expected repo path only after owner approval.
- Keep the old broken app and vendor archives as read-only reference material.
- Record that `siyuan-master.zip` and `logseq-master.zip` may inform interaction patterns only after audit; no execution, dependency install, or runtime import.
- Add a short implementation note that all workspace surfaces are projections over artifacts.

Owner-visible result:

- A plan and source status that explain what will be built and what is forbidden.

Smoke:

- Documentation check confirms the master spec path, this plan path, and the no-import/no-execution boundary.

### Package B: Artifact Kernel And Local Repository

Goal: create the smallest durable artifact system that every later surface must use.

Scope:

- Define the shared artifact, source, projection, graph, receipt, audit, Data Control and policy-boundary types.
- Implement local repository create/read/update/list methods for those records.
- Implement the universal mutation pipeline:

```text
input/source -> Artifact -> typed projection -> permission impact
-> owner approval boundary -> local mutation or dry-run
-> receipt/audit -> Data Control item -> graph/backlinks
```

- Add repository-level contract tests for create, promote, link, receipt, audit, graph and reload.

Owner-visible result:

- Not a standalone screen. The result becomes visible through the corridor in Package C.

Smoke:

- Contract test creates one artifact from a source, adds one projection, records receipt/audit/Data Control, builds graph edges and reloads from storage.

### Package C: Artifact Corridor Shell

Goal: create the usable first screen around one selected artifact.

Scope:

- Build one app shell with a selected-artifact top bar, projection navigation and right inspector.
- Expose only backed corridor projections: Inbox, Library, Today/Plan, Chat, Agents, Graph and Control.
- Hide or clearly block unbacked Packs, Domains, Providers and builder areas until they have repository-backed artifacts.
- Make the right inspector show artifact metadata, backlinks, mini-graph, receipts and Control trail.

Owner-visible result:

- The owner lands on an artifact workspace, captures one item, and sees that same artifact id and title remain selected while moving between projections.

Smoke:

- Browser smoke captures a source, reloads, navigates the corridor and confirms no route shows static proof panels or empty future sections.

### Package D: Inbox Source Capture

Goal: make capture fast, real and provenance-backed.

Scope:

- Add quick text and link capture as the first input types.
- Save raw input as `SourcePacket` first, then create or attach an `Artifact`.
- Show source type, origin, timestamp, parsed preview, privacy scope and processing status.
- Block auto-classification into tasks, truths, rules or actions without owner confirmation.

Owner-visible result:

- The owner can paste a source and immediately see it saved as an artifact with provenance and a receipt.

Smoke:

- Capture smoke verifies source packet, artifact, receipt, audit event, Data Control item and graph edge exist after reload.

### Package E: Library / Obsidian Projection

Goal: make the artifact usable as a note, not just stored input.

Scope:

- Add markdown note projection for the selected artifact.
- Support wikilinks and backlinks stored as graph edges.
- Show source provenance inside the note inspector, not as decorative copy.
- Let owner edit the note locally and keep history through receipt/audit events.

Owner-visible result:

- The captured source becomes a Library note with markdown, `[[wikilink]]`, backlinks and a mini-graph tied to the same artifact.

Smoke:

- Library smoke edits markdown, creates a wikilink, reloads, and verifies backlink and graph edge reason/source/confidence.

### Package F: Today / Plan Projection

Goal: turn the artifact into one next action or local time block.

Scope:

- Add task and calendar-block projections attached to the artifact.
- Support local-only scheduling preview; external calendar sync stays provider-gated.
- Show source note, reason and rollback path for the action.
- Keep Today calm and useful: one selected action, not a debt wall or task database clone.

Owner-visible result:

- The owner can create one next action from the Library note and see it in Today/Plan with a link back to the artifact.

Smoke:

- Plan smoke creates a task from the artifact, confirms it appears in Today/Plan, persists after reload, and has receipt/audit/Data Control entries.

### Package G: Local Chat Projection

Goal: make Chat a projection over artifacts, not a magic chatbot wrapper.

Scope:

- Create local chat thread and message projections attached to the selected artifact.
- Show which artifact, source, note and task are in context.
- Provide local-only draft behavior. Provider/model calls are blocked until explicit setup and approval exist.
- Allow a chat message to propose a note/task/proposal through the mutation pipeline, not by silent mutation.

Owner-visible result:

- The owner opens Chat for the artifact, writes one local message and sees the chat thread linked in Graph and Control.

Smoke:

- Chat smoke writes a message, reloads, confirms artifact context, graph edge and receipt/audit records.

### Package H: Agents Dry-Run Projection

Goal: make agents configurable artifact actors that propose, not silently execute.

Scope:

- Define minimal `AgentManifest`, `ToolScope`, `ActionProposal` and dry-run preview records.
- Add one safe local agent, for example "Plan next step from this artifact."
- The agent can create a proposal attached to the artifact with impact, required permissions and blocked external actions.
- Approval can apply only local safe mutations that already pass the mutation pipeline; provider/external/destructive actions remain gated.

Owner-visible result:

- The owner sees an agent dry-run proposal for the selected artifact, including what it would change and why it is safe or blocked.

Smoke:

- Agent smoke creates a dry-run proposal, verifies no external action ran, and confirms proposal receipt, audit event, graph edge and Data Control item.

### Package I: Graph And Backlinks

Goal: make relationships visually real early.

Scope:

- Build the Graph route and right-panel mini-graph from repository graph records.
- Show artifact, source, note, wikilink, task/calendar block, chat thread, agent proposal, receipt and Control nodes.
- Edges must include reason, source/provenance and confidence.
- Allow safe hide/correct preview for a relationship without destructive mutation.

Owner-visible result:

- The owner sees an Obsidian-like graph for the selected artifact and can understand why each relationship exists.

Smoke:

- Graph smoke verifies nodes and edges are generated from repository records, not static arrays, and edge detail shows reason/source/confidence.

### Package J: Control, Receipts And Audit

Goal: make trust visible without making Control the whole product.

Scope:

- Build Control projection for the selected artifact.
- Show receipts, audit timeline, storage location, privacy scope and permission impact.
- Add export preview and delete/revoke/rollback previews with confirmation boundaries.
- No destructive action runs silently.

Owner-visible result:

- The owner can answer what changed, where it is stored, why it is linked, and how to export/revoke/rollback/delete it.

Smoke:

- Control smoke verifies the captured artifact's source, note, task, chat and proposal all appear in the audit and Data Control trail.

### Package K: Corridor Integration Gate

Goal: prove the first visible MVP is one artifact moving through the system.

Scope:

- Add a single corridor smoke group for the selected artifact.
- Verify the owner path:

```text
Inbox -> Library/Obsidian -> Today/Plan -> Chat -> Agents -> Graph -> Control
```

- Confirm same artifact id, source refs, projection refs, receipt refs, graph refs and Data Control refs across all views.
- Add copy scan for fake readiness, proof-dashboard language, future-tense promises and static-only panels.
- Add route scan for disconnected arrays inside corridor routes.

Owner-visible result:

- A working MVP corridor with one meaningful artifact, not a menu of unfinished workspaces.

Smoke:

- Full corridor smoke passes on desktop and mobile-sized viewport.

## 5. Later Expansion After MVP

Only after Package K passes:

- Add richer source types: files, images, audio, email-like packets and imports.
- Expand Library toward Obsidian/Logseq depth: daily notes, richer backlinks, graph filters, vault export.
- Expand Plan: week view, recurring reviews, recovery flows, focus sessions.
- Expand Chat and Agents: provider setup, local model readiness, tool scopes, approval queue.
- Add Packs, Providers and Domains as artifact projections, not separate stores.
- Map the full 1172 function catalogue into staged releases with source ids, acceptance gates and hardening improvements.

## 6. Rejection Gates

Reject any change that:

- Imports the old broken app into the new product route.
- Executes or imports vendor repository code from SiYuan, Logseq or any other reference archive.
- Creates one route/page per canon item.
- Creates a proof dashboard, static readiness board, or wall of feature cards.
- Shows labels without repository-backed artifacts.
- Lets workspaces own separate stores.
- Adds graph nodes that are decorative instead of repository-backed.
- Creates receipt ids without receipt/audit records.
- Claims provider/model/cloud/sync success without explicit setup and owner approval.
- Runs external, destructive, payment, publish, sync, screen/OCR/STT/upload, memory, graph, calendar or task mutation silently.
- Weakens tests to make a claim pass.

## 7. Approval Boundary

This plan is the stopping point. The next action requires owner approval.

On approval, the first code task should be Package B only: artifact kernel and local repository contract tests. Do not start with UI pages, proof panels, bulk canon implementation, old app import, or vendor code.
