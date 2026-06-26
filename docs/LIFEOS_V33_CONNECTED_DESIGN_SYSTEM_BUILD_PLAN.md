# LifeOS v33 Connected Design System Build Plan

This document explains how to design LifeOS v33 so the interface is not a static dashboard, not a proof panel, and not a set of disconnected pages.

The design system is part of the product architecture. Every visible surface must prove the same artifact-first path:

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

The first visible MVP must show one artifact moving through Inbox, Library/Obsidian, Today/Plan, Chat, Agents, Graph and Control.

## Table Of Contents

1. Design Goal
2. Product Direction
3. Non-Negotiable Design Rules
4. Artifact-First UX Model
5. Local-First UI Model
6. Visual Direction
7. Information Architecture
8. App Shell Layout
9. Artifact Corridor Layout
10. Workspace Visual Contracts
11. Component System
12. Button And Action System
13. State Language
14. Data Control And Trust Surfaces
15. Graph And Backlink Design
16. Chat Design
17. Agents Design
18. Providers Design
19. Domains And Packs Design
20. Empty, Error And Recovery States
21. Typography
22. Color System
23. Spacing And Density
24. Motion
25. Responsive Rules
26. Accessibility Rules
27. Copy Rules
28. Repository Binding Rules
29. Design Implementation Sequence
30. Playwright Visual Verification
31. Subagent Design Workflow
32. Plugin And Extension Boundaries
33. Design Acceptance Gate

## 1. Design Goal

LifeOS is a personal operating system for artifacts.

The interface must make the owner feel three things:

- I know where this artifact came from.
- I know what this artifact became.
- I can inspect, reverse, export, delete or continue the work.

The UI must be compact, operational and alive. It should feel like a serious working environment, not a landing page, not a collection of empty widgets, and not a decorative command center.

## 2. Product Direction

Chosen direction:

```text
quiet operational OS
```

Meaning:

- dense enough for repeated daily use;
- calm enough for trust and personal data;
- clear enough that no text block has to explain the product;
- visually distinctive through structure, artifact state and interaction, not decoration;
- no marketing hero;
- no giant cards as page sections;
- no decorative graph when graph data is missing;
- no purple-gradient generic AI style;
- no ten-section proof dashboard.

The one thing the owner should remember:

```text
I can watch one thing become many useful things without losing control.
```

## 3. Non-Negotiable Design Rules

The design is rejected if any rule is broken:

1. No workspace can be a separate app or separate store.
2. No page can show fake labels without repository-backed objects.
3. No action can change UI only. It must call a mutation and write a receipt.
4. No static proof panels.
5. No page-per-canon-item implementation.
6. No empty sections used as proof of breadth.
7. No decorative graph without real nodes and edges.
8. No connected provider state without actual setup proof.
9. No agent result without proposal, policy boundary, receipt and approval state.
10. No Data Control button without a real local operation or explicit blocked-provider state.
11. No button that is visible but has no working state path.
12. No hidden source lineage for any artifact.
13. No design decision that prevents keyboard use.
14. No clipped text on mobile.
15. No design accepted without desktop and mobile Playwright screenshots.

## 4. Artifact-First UX Model

Everything visible starts from a selected artifact or a capture action.

Core visible object:

```text
Artifact
```

Minimum visible fields:

- title;
- source type;
- source excerpt or file/url/manual input reference;
- current stage;
- linked projections;
- graph neighborhood;
- latest receipt;
- audit trail count;
- Data Control state.

Primary artifact stages:

```text
Captured
Classified
Projected
Planned
Discussed
Proposed
Linked
Controlled
```

The first MVP must show one artifact moving across these projections:

| Surface | What It Shows | What It Writes |
| --- | --- | --- |
| Inbox | source packet and captured artifact | `Artifact`, `SourceRef`, `Receipt`, `AuditEvent` |
| Library/Obsidian | note projection and backlinks | `Note`, `Backlink`, `GraphEdge`, `AuditEvent` |
| Today/Plan | actionable task or focus block | `Task`, `PlanBlock`, `Receipt`, `GraphEdge` |
| Chat | conversation about the artifact | `Message`, `ChatThread`, `ActionCandidate` |
| Agents | proposal or dry-run workflow | `AgentRun`, `Proposal`, `PolicyBoundary` |
| Graph | typed nodes and edges | `GraphNode`, `GraphEdge`, `Backlink` |
| Control | receipt, export/delete/rollback controls | `Receipt`, `AuditEvent`, `ControlAction` |

## 5. Local-First UI Model

The UI reads from local repository state first.

Required rule:

```text
render = local repository projection
```

No workspace fetches its own hidden state. No component owns product truth.

Read path:

```text
Repository
-> selector/query
-> projection model
-> UI component
```

Write path:

```text
Owner action
-> command
-> mutation contract
-> repository transaction
-> receipt/audit
-> graph/backlink update
-> projection refresh
-> UI state
```

Local-first design states:

| State | UI Treatment |
| --- | --- |
| local saved | calm confirmation in receipt rail |
| queued for sync | small sync status, no blocking read |
| offline | visible offline indicator and local-save confidence |
| conflict | conflict panel with field-level explanation |
| provider blocked | blocked provider badge and setup requirement |
| dead-lettered | recovery action in Control |
| migration needed | maintenance banner and non-destructive upgrade action |

## 6. Visual Direction

LifeOS should look like an operating environment built for inspecting and moving work.

Visual qualities:

- structured;
- local;
- precise;
- calm;
- active;
- evidence-driven.

Avoid:

- one-note palettes;
- beige-only or purple-only systems;
- generic SaaS cards;
- huge hero text;
- decorative blobs;
- fake command palettes;
- visual density without hierarchy;
- tiny nav labels as the only product identity.

Recommended overall shape:

```text
left rail + artifact spine + working projection + evidence/control rail
```

The selected artifact is the visual anchor. The user should never wonder what object the screen is about.

## 7. Information Architecture

The app has one shell and multiple projections.

Navigation changes projection. It does not change store or product model.

Primary shell regions:

| Region | Purpose |
| --- | --- |
| Left rail | workspace navigation and repository counts |
| Top strip | selected artifact state and system status |
| Artifact spine | compact history of source, projections and receipts |
| Main projection | current workspace workflow |
| Evidence rail | graph, receipt, audit and Data Control preview |

Routes are allowed only when they preserve the artifact context.

Route examples:

```text
/app/inbox
/app/library
/app/today
/app/plan
/app/chat
/app/agents
/app/graph
/app/control
/app/providers
/app/domains
/app/packs
```

Every route must be able to answer:

```text
Which artifact is selected?
What repository objects are rendered?
What mutation can happen here?
What receipt proves it?
What graph/backlink changes?
What control action applies?
```

## 8. App Shell Layout

Desktop layout:

```text
┌ left rail ┬ artifact spine ┬ main projection ┬ evidence rail ┐
│ nav       │ timeline       │ workspace       │ graph/control │
└───────────┴────────────────┴─────────────────┴───────────────┘
```

Mobile layout:

```text
top artifact bar
workspace projection
bottom workspace switcher
evidence drawer
```

Stable layout dimensions:

- left rail width is fixed at desktop sizes;
- artifact spine has min and max width;
- main projection fills remaining space;
- evidence rail can collapse into a drawer;
- mobile never shows four columns;
- no hover-only controls for required actions;
- no section jumps when labels change.

## 9. Artifact Corridor Layout

The first MVP should be built as an artifact corridor.

Visible corridor sequence:

```text
Source
-> Artifact
-> Note
-> Task/Plan
-> Chat
-> Agent Proposal
-> Graph
-> Control
```

Each step has:

- current state;
- last mutation;
- receipt id;
- next action;
- failure state;
- smoke proof.

The corridor is not a decorative timeline. Clicking a step changes the projection and shows repository-backed data.

## 10. Workspace Visual Contracts

### Inbox

Purpose:

Capture source into an artifact.

Required controls:

- capture text;
- attach source metadata;
- classify artifact;
- create artifact;
- open artifact corridor.

Visible proof:

- source preview;
- artifact id;
- receipt id;
- audit event;
- current stage.

### Library/Obsidian

Purpose:

Show artifact as knowledge.

Required controls:

- open note projection;
- edit note body;
- add wikilink;
- inspect backlinks;
- link to source.

Visible proof:

- note id;
- linked artifact id;
- backlink count;
- graph edges;
- updated receipt.

### Today

Purpose:

Show artifact as today-relevant work.

Required controls:

- pin to today;
- start focus;
- complete block;
- defer block;
- journal result.

Visible proof:

- today block id;
- source artifact;
- status transition;
- receipt.

### Plan

Purpose:

Turn artifact into scheduled or structured work.

Required controls:

- create task;
- set priority;
- schedule block;
- change status;
- connect to note/chat/agent proposal.

Visible proof:

- task id;
- status;
- planning edge;
- audit event.

### Chat

Purpose:

Discuss artifact and extract action candidates.

Required controls:

- send local message;
- attach artifact context;
- extract action candidate;
- convert candidate to task/proposal;
- view conversation receipts.

Visible proof:

- message id;
- thread id;
- source artifact;
- action candidate id;
- receipt.

### Agents

Purpose:

Show safe agent work as proposal before action.

Required controls:

- generate dry-run proposal;
- inspect impact;
- approve;
- reject;
- convert proposal to task or mutation.

Visible proof:

- agent run id;
- policy boundary;
- affected objects;
- approval receipt;
- blocked credential state when needed.

### Graph

Purpose:

Explain why things are connected.

Required controls:

- select node;
- inspect edge;
- jump to source/projection;
- add correction;
- filter edge type.

Visible proof:

- typed nodes;
- typed edges;
- backlink proof;
- source of edge.

### Control

Purpose:

Give the owner power over data.

Required controls:

- inspect receipt;
- inspect audit event;
- export artifact bundle;
- delete artifact;
- rollback mutation;
- inspect provider access.

Visible proof:

- control action id;
- export/delete/rollback result;
- audit event;
- local-only or provider boundary state.

## 11. Component System

Required component groups:

| Group | Components |
| --- | --- |
| Shell | `AppShell`, `WorkspaceRail`, `ArtifactBar`, `EvidenceRail`, `MobileSwitcher` |
| Artifact | `ArtifactHeader`, `ArtifactStagePill`, `SourcePreview`, `ArtifactCorridor`, `ArtifactTimeline` |
| Repository | `ObjectBadge`, `ReceiptBadge`, `AuditEventRow`, `MutationStatus`, `SyncStatus` |
| Workspace | `InboxCapture`, `LibraryNote`, `TodayBlock`, `PlanTask`, `ChatThread`, `AgentProposal`, `GraphCanvas`, `ControlPanel` |
| Actions | `IconButton`, `CommandButton`, `SegmentedControl`, `Toggle`, `MenuButton`, `DangerAction`, `ApprovalAction` |
| Feedback | `EmptyState`, `ErrorState`, `ConflictPanel`, `OfflineBanner`, `ProviderBlockedPanel`, `RecoveryPanel` |

Every component must declare:

- repository objects it reads;
- command/mutation it can call;
- receipt or audit object it expects after action;
- disabled/loading/error states;
- keyboard behavior;
- Playwright selector strategy.

## 12. Button And Action System

Button types:

| Type | Use |
| --- | --- |
| icon button | tool actions such as inspect, link, open, copy, export |
| text command | primary business command |
| segmented control | projection mode or filter mode |
| toggle | binary local setting |
| menu | secondary grouped actions |
| danger action | delete, revoke, reset, rollback |
| approval action | agent approval, provider activation |

Every visible action must have this state map:

```text
idle
hover/focus
disabled with reason
pending
success with receipt
failed with recovery
blocked with policy reason
```

Rejected button examples:

- button exists but does nothing;
- button only changes local React state;
- button says export but no export object exists;
- button says connected but no provider profile exists;
- button says approve but no approval receipt is written.

## 13. State Language

The visual system must teach state without long explanations.

State markers:

| State | Marker |
| --- | --- |
| captured | source marker |
| projected | projection marker |
| linked | backlink marker |
| planned | task marker |
| proposed | agent marker |
| controlled | receipt marker |
| blocked | boundary marker |
| failed | recovery marker |
| offline | local-save marker |

Use these consistently in every workspace.

## 14. Data Control And Trust Surfaces

Control must be visible but calm.

Required surfaces:

- receipt rail;
- audit event list;
- export bundle preview;
- delete confirmation;
- rollback preview;
- provider access state;
- data location indicator;
- sync queue indicator.

Trust UI must show facts:

```text
stored locally
queued for sync
sent to provider
blocked until setup
deleted locally
exported to file
rolled back
```

Do not use vague trust copy like "secure by design" without evidence.

## 15. Graph And Backlink Design

Graph UI is accepted only when it renders real repository edges.

Minimum graph model:

- artifact node;
- source node;
- note node;
- task node;
- chat node;
- agent proposal node;
- receipt node;
- typed edges between them.

Graph panel must answer:

```text
Why is this connected?
Who created the edge?
When was it created?
Can the owner correct or remove it?
Where is the receipt?
```

Backlinks are shown as lists before any complex canvas. Canvas is enhancement, not proof.

## 16. Chat Design

Chat is not a generic chatbot.

Chat must be artifact-contextual:

- selected artifact stays visible;
- message composer can attach artifact context;
- extracted actions become repository objects;
- agent handoff is visible as proposal, not magic;
- chat thread has receipts.

Chat should not claim external AI is active unless provider setup is real.

## 17. Agents Design

Agents are proposal machines until approved.

Agent UI must show:

- dry-run status;
- affected objects;
- required permission;
- risk class;
- approval buttons;
- rejection reason;
- receipt after approval;
- blocked provider state when credentials are required.

An agent card without impact preview is rejected.

## 18. Providers Design

Provider UI must be honest.

Provider states:

```text
not configured
configured locally
ready
blocked credential
failed
revoked
```

Provider design must never imply setup has happened when it has not.

Every provider action must have:

- setup state;
- data leaving local scope;
- permission summary;
- receipt;
- revoke action.

## 19. Domains And Packs Design

Domains are projections over artifacts. Packs are reversible extensions.

Domain UI must show:

- linked source artifacts;
- domain object type;
- local state;
- graph link;
- control action.

Pack UI must show:

- what it adds;
- what data it can read;
- what routes/components it touches;
- install preview;
- rollback action.

Do not build marketplace theater. Packs are not decorative cards.

## 20. Empty, Error And Recovery States

Empty states are not marketing text.

Every empty state must provide one useful action:

| Empty Area | Required Action |
| --- | --- |
| Inbox | capture source |
| Library | create note from artifact |
| Today | pin artifact to today |
| Plan | create task from artifact |
| Chat | start artifact thread |
| Agents | create dry-run proposal |
| Graph | create first link or explain missing edges |
| Control | open latest receipt or explain no receipt yet |

Error states must show:

- what failed;
- what object was affected;
- whether data was saved locally;
- recovery action;
- audit entry if available.

## 21. Typography

Typography must support operational scanning.

Recommended hierarchy:

| Use | Rule |
| --- | --- |
| app title | small, stable, not hero-scale |
| workspace title | compact and clear |
| artifact title | strongest local heading |
| object id | mono, small |
| receipt/audit rows | mono or tabular number support |
| buttons | short verbs |
| dense lists | readable body size |

No viewport-width font scaling.

Letter spacing stays at `0`.

## 22. Color System

Color communicates state and workspace identity.

Required palette behavior:

- neutral base for trust and density;
- limited state colors;
- workspace accents are secondary;
- destructive actions use reserved danger color;
- provider blocked state is distinct from failure;
- graph edges use type-based color, not random colors.

Avoid:

- dominant purple/purple-blue gradient;
- beige/cream-only system;
- dark slate-only system;
- too many equally loud accents;
- color as the only state indicator.

## 23. Spacing And Density

LifeOS should be dense but not cramped.

Rules:

- repeated items use compact rows;
- no card-inside-card;
- no floating page-section cards;
- panels use stable min/max widths;
- icon buttons have fixed square dimensions;
- lists use consistent row heights;
- side rails do not jump when counts change.

## 24. Motion

Motion must show cause and continuity.

Allowed motion:

- artifact moving to next corridor stage;
- evidence rail updating after mutation;
- graph edge appearing after link;
- receipt row entering after command;
- drawer opening for control/evidence.

Rejected motion:

- random hover animation;
- looping decoration;
- heavy transition that slows daily work;
- motion that hides state changes.

## 25. Responsive Rules

Desktop:

- four-region shell is allowed;
- artifact and evidence can be simultaneously visible;
- graph can be side-by-side with workspace.

Tablet:

- evidence rail collapses;
- artifact spine may become horizontal;
- workspace remains primary.

Mobile:

- one primary region at a time;
- selected artifact is always visible in top bar;
- workspace switcher is reachable;
- evidence/control is a drawer;
- no clipped buttons;
- no horizontal scroll.

## 26. Accessibility Rules

Minimum:

- keyboard navigation for all commands;
- visible focus states;
- semantic buttons for actions;
- `aria-live` for sync and receipt updates;
- contrast passes normal text and icon controls;
- destructive actions require confirmation;
- no hover-only required information;
- reduced motion support.

The design is not done until keyboard and screen reader paths are tested for the first artifact corridor.

## 27. Copy Rules

Copy must be short and operational.

Use:

- command verbs;
- object names;
- state names;
- receipt ids;
- direct failure reasons.

Avoid:

- long feature explanations;
- fake inspirational copy;
- explaining obvious UI;
- calling unavailable features active;
- generic "AI-powered" text without provider proof.

## 28. Repository Binding Rules

Every design element must bind to repository truth.

Design handoff for every component must include:

```text
component name
repository reads
mutation commands
created/updated objects
receipt expectation
graph/backlink expectation
Data Control expectation
empty/error/recovery states
Playwright selector
```

If a component cannot list these, it is a visual placeholder and should not ship.

## 29. Design Implementation Sequence

Design must be built in this order:

1. Shell tokens and layout primitives.
2. Repository-backed artifact bar.
3. Inbox capture and receipt rail.
4. Artifact corridor navigation.
5. Library note projection.
6. Today/Plan projection.
7. Chat projection.
8. Agent proposal projection.
9. Graph/backlink projection.
10. Control/Data Control projection.
11. Provider blocked states.
12. Domain and Pack extension patterns.
13. Mobile shell.
14. Accessibility pass.
15. Visual polish pass.
16. Playwright screenshot and interaction audit.

Do not design ten workspaces before the artifact corridor works.

## 30. Playwright Visual Verification

Playwright must verify the interface as the owner sees it.

Required checks:

- open localhost;
- capture screenshot desktop;
- capture screenshot mobile;
- create one artifact;
- reload and confirm persistence;
- click through Inbox, Library, Today/Plan, Chat, Agents, Graph and Control;
- confirm every clicked surface displays the same artifact id;
- confirm at least one receipt exists;
- confirm at least one graph edge exists;
- confirm Data Control shows export/delete/rollback state;
- confirm no obvious overflow on mobile.

Artifacts go in:

```text
output/playwright/
```

`npx` is available on this machine, so Playwright CLI verification can use the installed wrapper or project scripts when implementation resumes.

## 31. Subagent Design Workflow

Use subagents as roles, not as uncontrolled automation.

Recommended roles:

| Role | Responsibility |
| --- | --- |
| product-architect | keeps artifact-first route intact |
| local-first-architect | checks repository and sync assumptions |
| frontend-developer | implements shell and components |
| ui-fixer | removes generic UI and overflow |
| accessibility-tester | verifies keyboard and contrast |
| e2e-tester | runs Playwright corridor |
| reviewer | checks code and missing tests |

Subagents must work from this design plan, the master plan, the ledger and gate checklist. They must not invent alternate product architecture.

## 32. Plugin And Extension Boundaries

Plugin design is future work unless explicitly approved.

Before any plugin exists:

- core repository contract must be stable;
- extension permission model must exist;
- pack install preview must exist;
- rollback must exist;
- Data Control must show extension access.

No plugin should be scaffolded just to make the product look extensible.

## 33. Design Acceptance Gate

Design is accepted only when all are true:

- first artifact corridor works end to end;
- every visible object is repository-backed;
- every primary action writes receipt/audit or shows blocked reason;
- graph/backlink proof is visible;
- Data Control is visible and functional for the artifact;
- desktop screenshot passes visual review;
- mobile screenshot passes visual review;
- keyboard path works;
- no empty decorative workspaces;
- no fake provider/agent labels;
- design checklist rows are updated with evidence.
- affected owner use-case rows in `docs/source_of_truth/V33_OWNER_USE_CASE_AUDIT.csv` are updated with evidence.

For the owner's expanded workflows, design acceptance also requires:

- books/PDFs appear as source-backed artifacts, not dead attachments;
- audio appears as source-backed artifact before transcription;
- transcription state is honest when no STT engine is configured;
- Ollama state is honest when the local service is not configured;
- Ollama outputs are proposals before they mutate notes, books, transcripts, tasks or goals;
- day schedule and goals share the same repository/graph as notes;
- file import, book import, transcript, task, goal and graph screens have no dead buttons;
- large vault graph/search performance is tested before claiming Obsidian-scale speed.

The design system is not separate from implementation. It is the owner-visible shape of the artifact operating system.
