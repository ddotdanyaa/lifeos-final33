# OWNER_REAL_PRODUCT_QUALITY_AUDIT

status: PASSED_LOCALLY_WITH_GITHUB_GATE

## Purpose

This audit checks that LifeOS is not merely passing one owner sample phrase and is not a wall of disconnected labels/cards.

## Browser Audit Added

- Test: `output/playwright/owner-quality-audit.spec.mjs`
- Script: `npm run e2e:quality`
- Latest local result: `1 passed`

## What The Audit Verifies

1. First screen is not a cockpit:
   - no top app ribbon on Home;
   - no proposal wall before capture;
   - no graph canvas/debug wall in the first viewport;
   - no seeded proof/demo vault on first launch;
   - no visible `Artifact Graph`, `Backlink Engine`, `Verify wikilinks`, build label, `IndexedDB`, `ghost`, `unchecked`, `dry-run` or `review` debug wording on Home;
   - fresh first launch has zero sources, notes, tasks, plan blocks and goals before owner input;
   - exactly four owner zones next to the dominant Universal Capture;
   - distinct visual accents/backgrounds for Today, Money, Goals and Active Artifact;
   - first viewport text stays bounded.

2. Inputs are varied, not the old single gym/protein sample:
   - dated task/reminder;
   - expense;
   - income plus balance;
   - habit;
   - goal;
   - pasted email/calendar text;
   - idea/project/knowledge text;
   - home task plus expense.

3. No silent mutation before Apply:
   - task/calendar/finance/habit/goal counters are checked before proposal apply;
   - capture creates a source artifact and proposals only.

4. Apply creates real repository objects:
   - tasks;
   - plan/calendar blocks;
   - reminders;
   - finance transactions;
   - accounts;
   - habits;
   - goals;
   - insights;
   - audit log entries.

5. Workspace projections update:
   - Calendar shows created times;
   - Finance shows created spending;
   - Graph search finds created artifact content;
   - Control shows owner readiness and audit-backed state.

6. Graph/control chain is real:
   - graph nodes and links are generated from repository objects;
   - `proposal.apply` exists in the audit log after Apply;
   - Data Control shows readiness/counts instead of raw debug walls.

7. Persistence is checked:
   - after reload, repository counts for tasks, finance, habits, goals and audit log remain present.

## Evidence Screenshots

- `output/playwright/quality-home-audit.png`
- `output/playwright/quality-calendar-audit.png`
- `output/playwright/quality-finance-audit.png`
- `output/playwright/quality-graph-audit.png`
- `output/playwright/quality-control-audit.png`

## Remaining Hard Gate

GitHub publishing remains blocked because no remote is configured and GitHub CLI is not authenticated. This is intentionally not faked.

Final publish command after owner auth/remote:

```powershell
gh auth login
npm run release:push -- <repo-url>
```
