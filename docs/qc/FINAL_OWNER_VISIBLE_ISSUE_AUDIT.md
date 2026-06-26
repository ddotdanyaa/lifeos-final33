# Final Owner-Visible Issue Audit

STATUS: BLOCKED_EXTERNAL_CREDENTIAL_ONLY

## Fixed In Current Package

- C25 architecture/developer backlog: module boundaries, state adapters, event bus, code splitting and schema docs now have executable proof through `artifact-os-architecture.mjs`, Data Control architecture contract, persisted `control.architectureEvents`, `getArchitectureSnapshot()` and `npm run audit:architecture`.
- Market ledger honesty: R0001-R8000 now has zero `NOT_STARTED` and zero `DEFERRED_WITH_REASON`; 120 rows remain `BLOCKED_OWNER_CREDENTIAL` because they require owner GitHub/external credentials or provider setup.
- PWA/offline-shell: service worker, manifest, installability passport and honest install prompt boundary are real and tested.
- Command palette/saved searches: command palette opens from topbar and `Ctrl/Cmd+K`; saved searches persist as repository-backed objects, appear in Graph with edge reasons and write Data Control audit.
- Domain artifacts: health, home, relationships, food, shopping, travel, documents and energy render as graph projections with next actions and control/graph routes in Habits/Goals.

## Previously Fixed Owner Gates

- Home/Daily OS: first screen has four owner zones, hidden first-viewport rail, one visible next action and active artifact/proposal lane.
- Calendar: agenda strip, overload warning, compact empty days and hidden empty hours make the planner usable.
- Habits/Goals wheel: computed balance wheel, six domain rows, weak-domain explanation and next-action button.
- Graph: inspector connection summary, readable edge reasons and search match reasons.
- Agents/Flows: visible safety boundary, trigger-condition-action board, dry-run history and approval queue.
- Large vault/recovery: exact mixed dataset and corrupt-record recovery remain covered by final journey proof.

## Still Open

- No known local product-critical gates remain open after P27.
- F25 GitHub release remains blocked by missing owner GitHub auth/remote.
- External Gmail/calendar sync, OCR, STT and PDF/EPUB parser automation remain honest provider/credential gates.
