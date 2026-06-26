# Market Research Rescue State

status: BLOCKED_EXTERNAL_CREDENTIAL_ONLY
scope: market-grade LifeOS Artifact OS rescue

## Ledger State

- R rows imported: 8000
- B rows imported: 300
- status ledger: docs/qc/MARKET_RESEARCH_LEDGER_STATUS.csv
- R fixed rows currently claimed: 7880
- R deferred rows with reason: 0
- R owner-credential blocked rows: 120
- R NOT_STARTED rows: 0

## Active Product Rule

LifeOS is an Artifact OS. Workspaces are projections over one repository-backed graph: input/source -> Artifact -> projections -> persistence -> graph/backlinks -> receipt/audit -> Data Control -> owner-visible result -> smoke/e2e/visual proof.

## Current Package

completed_local_package: market workspace split, semantic design system, context inspector cleanup, graph workspace, provider gates, route-specific e2e, visual screenshots.

1. Replaced cockpit/home overload with one capture path, one active artifact, one next action, and contextual details.
2. Gave major workspaces distinct jobs, visual identities, empty states, primary actions, and route-specific test coverage.
3. Kept local AI/providers honest: no silent mutation, no fake provider success, proposal-only outputs until Apply.
4. Kept the status ledger as a gate, not a trophy board.

## Verification Package

- `node --check app.js`
- `npm run verify`
- `npm run e2e`
- `npm run e2e:owner`
- `npm run e2e:market-owner`
- `npm run audit:no-hardcoded-sample`
- `npm run audit:buttons`
- `npm run audit:market-ledger`
- `npm run audit:no-cockpit-first-screen`
- `npm run audit:workspace-distinctness`
- `npm run audit:visual-hierarchy`
- `npm run audit:semantic-colors`
- `git diff --check`

## Blockers

- GitHub release/push remains blocked until owner provides a remote and authenticated GitHub context.
- Gmail/calendar/OCR/STT cloud integrations remain honest setup gates without owner credentials.
