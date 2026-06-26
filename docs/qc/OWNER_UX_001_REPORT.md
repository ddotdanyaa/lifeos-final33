# OWNER_UX_001_REPORT

status: FIXED_WITH_CODE_AND_TEST

## Package

P_OWNER_UX_001 — Turn the working Artifact MVP into a clear usable LifeOS.

## What Changed

- Rebuilt Home around four owner-visible zones: Universal Capture, My Day / Next, Money / Budget, Active Artifact / Review.
- Moved workspace navigation to a readable left rail on desktop and below capture on mobile.
- Removed the Home graph/proof inspector from the first viewport and stopped rendering hidden inbox inspector DOM.
- Hid topbar technical actions on Home so Universal Capture remains dominant.
- Added source-scoped proposal apply so Home `Принять всё` does not mutate unrelated seed proposals.
- Changed proposal actions to Russian-first labels: `Принять`, `Принять всё`, `Изменить`, `Пропустить`, `Источник`, `Связи / Контроль`.
- Added quick task fast path: filled capture text + `Быстрая задача` creates an Artifact, applies task/calendar/reminder proposals, updates Home/Calendar/Graph/Control, and shows an owner-visible result.
- Updated Russian date/time parsing for real owner input such as `завтра`, `послезавтра`, `в 6`, `после обеда`, `вечером`, and weekdays.
- Changed calendar time rows to start at `05:00`.
- Fixed mobile horizontal overflow and preserved capture-first mobile order.

## Evidence

- `npm run verify` passed.
- `npm run e2e:ux` passed.
- `npm run audit:no-hardcoded-sample` passed.
- `npm run audit:buttons` passed.
- `npm run audit:workspace-links` passed.
- `npm run audit:ledger` passed.

## Screenshots

- `output/playwright/ux-home-calm.png`
- `output/playwright/ux-after-analysis.png`
- `output/playwright/ux-after-quick-task.png`
- `output/playwright/ux-calendar.png`
- `output/playwright/ux-dashboard.png`
- `output/playwright/ux-graph.png`
- `output/playwright/ux-mobile.png`

## Remaining Honest Blocks

- GitHub push remains blocked because `gh auth status` reports not logged in and no remote is configured.
- Provider features remain gated where they require local/external engines or credentials: Gmail/OAuth, external calendar sync, automatic OCR/STT, PDF/EPUB advanced parsing, and Ollama if local endpoint is offline.
