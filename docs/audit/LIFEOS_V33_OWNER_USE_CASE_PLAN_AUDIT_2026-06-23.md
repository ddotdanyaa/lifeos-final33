# LifeOS v33 Owner Use-Case Plan Audit

Date: 2026-06-23

Status: implementation pass for the local artifact MVP; conditional pass for the full LifeOS scope.

The plan and current localhost are now strong enough for the local-first Obsidian-like knowledge base plus the first connected Artifact OS cockpit. The broader LifeOS promise is not complete yet. Universal inbox capture, browser drag/drop intake, text-book import, local file intake, audio-source storage, small-audio playback, manual transcript notes, local proposals, local chat, local agent/flow runs, Today plan blocks, local calendar preview, goals, tasks, expanded export, recovery, graph filters, central Graph workbench and audit are working. PDF extraction, EPUB parsing, automatic STT, real Ollama model actions, external calendar sync, OS/PWA share target, full rollback snapshots and provider revocation must remain explicit gates before any final-complete claim.

2026-06-24 update: the first visible screen is now the owner-facing Command Center instead of the old note-editor default. Existing local repositories migrate once to the new `Inbox` UI revision while preserving notes, sources, tasks, goals, graph state and audit. The first screen now shows one active artifact moving through Inbox, Library, Today, Chat, Agents, Graph and Control, with a large universal intake field, artifact route buttons, repository-backed seed actions, left artifact-flow rail, right graph preview and source panel. The verified screenshot is `output/playwright/lifeos-command-center-checked.png`.

2026-06-24 v3 update: the Command Center now includes repository-backed artifact analysis and a connected-app network. Each imported/captured source stores `source.analysis` with detected type, summary, word count, action lines, dates, URLs, emails, headings, wiki links and connected app targets. The first screen shows `Разбор артефакта` and `Связанные приложения одного артефакта` with Notion/Library, Obsidian/Graph, Calendar/Today, Chat/Context, Agents/Multiagent, n8n/Flow, Player/Audio, Book/Reader, Gmail/Mail and Control/Data. Gmail remains an owner-credential boundary. The verified screenshot is `output/playwright/lifeos-command-center-v3-readable.png`.

## Audited Sources

- `docs/LIFEOS_V33_FULL_SCALE_IMPLEMENTATION_MASTER_PLAN.md`
- `docs/LIFEOS_V33_CONNECTED_DESIGN_SYSTEM_BUILD_PLAN.md`
- `docs/source_of_truth/V33_BUILD_GATE_CHECKLIST.csv`
- `docs/source_of_truth/V33_DESIGN_IMPLEMENTATION_CHECKLIST.csv`
- `docs/source_of_truth/V33_OWNER_USE_CASE_AUDIT.csv`
- `app.js`
- `styles.css`
- `smoke.mjs`
- `output/playwright/kb-smoke.spec.mjs`

## Current Working Evidence

Commands run:

```text
npm run verify
npm run e2e
data-action handler audit
```

Results:

```text
npm run verify: pass
npm run e2e: pass
current data-action missing handlers: none
current localhost: http://localhost:4173
graph screenshot: output/playwright/kb-graph-canvas.png
command center screenshot: output/playwright/lifeos-command-center-checked.png
command center v3 screenshot: output/playwright/lifeos-command-center-v3-readable.png
```

Verified current app capabilities:

- opens on localhost;
- opens stale local sessions into the Command Center after the v2 UI migration;
- first visible MVP shows a real artifact through Inbox, Library, Today, Chat, Agents, Graph and Control;
- universal intake field accepts owner text from the first screen;
- artifact analysis is stored on source packets and visible in the first screen;
- connected app network is visible for Notion/Library, Obsidian/Graph, Calendar/Today, Chat, Agents, n8n/Flow, Player, Book, Gmail and Control;
- IndexedDB-backed local repository opens;
- note creation works;
- folder creation works;
- note editing works;
- 1500ms autosave works;
- global search works;
- wikilinks parse;
- ghost nodes appear for broken wikilinks;
- ghost nodes can become notes;
- cascade rename updates wikilinks;
- backlink index updates;
- graph canvas renders;
- graph can pan, zoom, drag and select;
- central Graph workbench can be opened from the ribbon;
- graph type filters work;
- Inbox cockpit accepts text capture;
- browser drag/drop creates source artifacts;
- capture/import creates local action proposals;
- local chat messages link to the active artifact;
- local agent and flow actions create runs/proposals;
- text/book file import works through the browser File API;
- PDF import creates a visible `pdf-parser-required` boundary;
- imported text sources become source-backed notes;
- source text is searchable;
- audio file import stores a repository-backed audio source;
- small audio files render with a local player;
- manual audio transcript entry creates a transcript note;
- transcript wikilinks enter the normal backlink/ghost/graph pipeline;
- local 7-day calendar preview reads tasks and plan blocks;
- Today plan blocks can be created and toggled;
- tasks can be created and toggled;
- goals can be created, linked to tasks and shown with progress;
- source, audio, goal, task and plan nodes appear in the graph;
- Local AI panel stores Ollama endpoint state and exposes an owner-confirmed probe action;
- Mail provider card records owner-credential boundary without using credentials;
- Control panel shows schema, online/offline, persisted storage, quota and recovery;
- archived notes/sources/tasks/goals/plans can be restored;
- mobile Playwright smoke verifies cockpit/ribbon/graph/control with no horizontal overflow;
- reload persistence works;
- export button is wired and includes notes, folders, sources, tasks, goals, plan blocks, Ollama state, graph and audit;
- delete button is wired and confirms;
- all currently rendered `data-action` buttons have handlers.

## Current Button Audit

Current rendered actions:

```text
add-goal
add-plan-block
add-task
apply-proposal
archive-goal
archive-plan
archive-source
archive-task
capture-text
clear-capture
create-from-ghost
delete-note
dismiss-proposal
export-vault
import-audio
import-file
new-folder
new-note
open-note
open-source-note
prepare-mail
probe-ollama
run-agent-active
run-flow
save-transcript
select-folder
send-chat
set-surface
toggle-goal
toggle-plan-block
toggle-task
```

Handled actions:

```text
add-goal
add-plan-block
add-task
apply-proposal
archive-goal
archive-plan
archive-source
archive-task
capture-text
clear-capture
create-from-ghost
delete-note
dismiss-proposal
export-vault
import-audio
import-file
new-folder
new-note
open-note
open-source-note
prepare-mail
probe-ollama
run-agent-active
run-flow
save-transcript
select-folder
send-chat
set-surface
toggle-goal
toggle-plan-block
toggle-task
```

Missing handlers:

```text
none
```

This passes the current dead-button audit. It does not prove future screens are safe; every new screen must repeat this audit.

## Scope Verdict

### Working Now

- Obsidian-like notes.
- Folders.
- Wikilinks.
- Backlinks.
- Ghost nodes.
- Cascade rename.
- Local graph.
- Search.
- Local persistence.
- Current button wiring.
- Local text/book source import.
- Local audio-source import.
- Manual transcript-to-note flow.
- Today plan block creation and toggling.
- Goal creation and task-linked progress.
- Task/checklist toggling as repository objects.
- Mixed graph nodes for notes, sources, audio, goals, tasks and plan blocks.
- Universal Inbox cockpit.
- Browser drag/drop source intake.
- Local action proposals.
- Local chat linked to artifacts.
- Local agent/flow run records.
- Local 7-day calendar preview.
- Small-audio playback.
- Data Control recovery for archived local objects.
- Central Graph workbench with type filters.
- Mobile cockpit smoke.

### Partially Working

- Books/PDFs: TXT/MD works; PDF binary storage is honest, but extraction/chaptering is still planned.
- EPUB/text books: TXT/MD works; EPUB parsing, chaptering and highlights are still planned.
- Audio transcription: manual transcript works; automatic STT is still provider-gated.
- Ollama readiness: endpoint state and owner-confirmed probe exist; model actions wait for real local setup.
- Data Control: expanded export/archive/restore exist, full rollback snapshots and provider revoke are still planned.
- Audit: broad local audit log exists, full receipt viewer and mutation diff model are still planned.
- PDF/EPUB parsing: boundaries are visible, extraction is still planned.
- Performance: small-vault flow works, large-vault graph/search budget still needs a fixture.
- Unified graph: local manual artifact flow works; provider-driven extraction remains gated.

### Planned Next

- PDF extraction.
- EPUB parsing.
- Chapter/highlight model.
- Automatic transcript provider integration.
- Ollama proposal actions for notes/books/transcripts.
- OS/PWA share target.
- Data Control rollback snapshots.
- Search index for large vaults.
- Large graph performance.

### Blocked Until Setup/Approval

- Ollama local provider.
- Local model selection.
- Note/book/transcript summarization by Ollama.
- Audio transcription engine.
- External calendar sync.
- External cloud/sync/provider actions.

No provider feature may be shown as active without real setup, owner confirmation and smoke evidence.

## Plan Gaps Found And Hardened

Gap: Ollama was covered only generically as provider/local AI readiness, not as an explicit owner use case.

Hardening: `docs/source_of_truth/V33_OWNER_USE_CASE_AUDIT.csv` now includes explicit Ollama readiness, Ollama for notes, Ollama for books and Ollama for transcripts.

Gap: books, PDFs, audio and goals were spread across canon rows and phase language, but not visible in one owner-facing audit matrix.

Hardening: the owner use-case audit now lists these as gates with required objects, required actions, required smoke and provider boundaries.

Gap: current product passes KB core, but broad LifeOS completion could be overclaimed.

Hardening: this audit explicitly separates `working-now`, `partially-working`, `planned-next`, `blocked-setup`, `blocked-provider`, `planned-later` and `planned-final`.

## Required Next Gates

Before claiming the owner can use the system for books:

- file import works; this is now verified for TXT;
- PDF or EPUB fixture imports;
- text extraction produces searchable notes for PDF/EPUB, not only TXT/MD;
- chapter/section graph links exist;
- export/delete source bundle works; export is now expanded, delete preview remains next;
- large document performance is measured.

Before claiming audio transcription:

- audio file stores locally; this is now verified;
- transcript job object exists;
- unavailable STT state is honest; current automatic STT remains gated;
- chosen STT engine is configured with owner approval;
- transcript segments link to source audio;
- transcript-to-note smoke passes for manual transcript; automatic STT still needs provider smoke.

Before claiming Ollama:

- Ollama probe is owner-approved; the probe action asks before calling the endpoint;
- unavailable state is shown honestly;
- model list is displayed only if the local service responds;
- test prompt succeeds;
- output is saved as a proposal, not silent mutation;
- revoke/disconnect state exists.

Before claiming day planning/goals:

- `TodayPage`, `PlanBlock`, `Task`, `Goal`, `Milestone` objects exist;
- note/book/transcript source links are preserved;
- checkboxes are repository objects, not just text;
- completed items write audit/receipt;
- day schedule survives reload;
- goals update from linked tasks.

## Final Audit Decision

The plan can be used as a build controller if the new owner use-case audit is treated as mandatory.

The current localhost is usable now as a local-first Obsidian-like note vault with the first artifact workflow for text/book files, audio sources, manual transcripts, Today blocks, tasks, goals, graph and expanded export. It is not yet the full LifeOS for PDF extraction, EPUB parsing, automatic audio transcription, real Ollama model actions, external calendar sync, provider revocation and rollback/recover.

The next development phase must not add decorative screens. It must implement the next owner workflow end to end:

```text
file/book/audio source
-> local source packet
-> note/transcript/book projection
-> graph/backlinks
-> task/goal/day plan
-> audit/receipt/control
-> Playwright smoke
```
