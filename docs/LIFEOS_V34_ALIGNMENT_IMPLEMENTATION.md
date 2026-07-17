# LifeOS v34 Alignment Implementation

updated_at: 2026-07-09

This document maps the v34 product description to the implemented local product surfaces and state contracts.

## Implemented Surfaces

- First screen remains usable immediately: Home, Capture, Feed, Search, Systems, Builder, Graph, AI/Model Hub and Data Control are reachable from the shell.
- Life Feed: `feed` renders channels plus real audit, source, provider, marketplace, screen, smart-home and twin events.
- Systems and Builder: `systems` and `builder` create system definitions from shared primitives and link them to notes/graph/control.
- Projects and Work: `projects` creates projects and project items for decisions, tasks, risks and notes.
- Model Hub: `models` stores model routes and checks them without silently sending private artifacts.
- Smart Home: `smart-home` stores devices and manual events until the owner connects a local hub.
- Marketplace: `marketplace` installs local packs as system definitions without vendor code execution.
- Design Studio: `design` switches data-independent render profiles.
- Databases: `databases` creates custom databases and rows that export and appear in graph/control.
- Screen Companion: `screen` creates permission-gated sessions only; no screen reading happens without explicit owner permission.
- Personal Twin: `twin` creates local recovery/context snapshots.

## Implemented State

Schema version 3 adds:

- `channels`
- `systemDefinitions`
- `systemRecords`
- `projects`
- `projectItems`
- `modelProfiles`
- `smartHomeDevices`
- `smartHomeEvents`
- `marketplacePacks`
- `installedPacks`
- `designProfiles`
- `customDatabases`
- `databaseRows`
- `screenCompanionSessions`
- `personalTwinSnapshots`

## Safety Boundaries

- Provider success is never faked; external providers remain `not-connected`, `permission-required`, `not-configured`, `parser-required`, `needs-owner-credentials` or `local-only`.
- Marketplace packs install as local definitions; built-in installs record `vendorCodeExecuted: false`.
- Screen and smart-home capabilities are permission-gated.
- All v34 actions write through the shared repository and leave audit/provider/control evidence.

## Verification Gates

- `npm run smoke`
- `npm run audit:architecture`
- `npm run audit:buttons`
- `npm run audit:workspace-links`
- `npm run audit:workspace-shape`
- `npm run build:public`
