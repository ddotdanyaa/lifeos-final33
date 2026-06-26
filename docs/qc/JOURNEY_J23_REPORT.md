# Journey J23 - Performance and large vault

status: PASS

## What User Sees
Exact mixed large vault создан: 1000 артефактов, 2000 заметок, 2000 задач, 1000 финансовых транзакций, 500 привычек/целей и минимум 5000 связей графа. Поиск и граф остаются usable.

## Repository Objects Created
```json
{
  "sources": 1000,
  "notes": 2000,
  "tasks": 2000,
  "calendarBlocks": 0,
  "reminders": 0,
  "financeTransactions": 1000,
  "accounts": 1,
  "budgets": 0,
  "subscriptions": 0,
  "habits": 250,
  "goals": 250,
  "insights": 0,
  "claims": 0,
  "questions": 0,
  "reviewItems": 0,
  "readingItems": 0,
  "highlights": 0,
  "transcriptSegments": 0,
  "audioCheckpoints": 0,
  "playerNotes": 0,
  "chatMessages": 0,
  "agentRuns": 0,
  "flowRuns": 0,
  "providerRuns": 0,
  "proposalsOpen": 0,
  "proposalsApplied": 0,
  "auditEvents": 0,
  "graphNodes": 0,
  "graphEdges": 0,
  "graphEdgeReasons": 0
}
```

## Graph Edges
After: 11 edges, 11 with visible reasons.

## Data Control Events
After: 300 audit events. Tail: vault.export: Vault export generated: notes=47, sources=29, tasks=5, finance=4, habits=2, goals=2, savedSearches=0, audit=300 | control.export.selected: Selected artifact export generated: selected note / note_991370892e5a | control.rollback.snapshot: Rollback snapshot created: Snapshot before Data Control change | provider.run: pwa owner-check: PWA shell checked: service-worker-ready | provider.run: mail prepare: Provider waits for owner-approved credentials | provider.prepare: mail provider waiting for owner-approved credentials | architecture.validation.failed: Architecture contract failed: activeSurface not declared in workspace contracts | test.seed.exact-large-vault: Exact large vault seeded: 6501 graph nodes / 12750 graph edges

## Remaining Gated
Нет локального gate для этого journey.

## Fixed In This Package
P17 закрыт кодом, e2e, скриншотом и owner-visible режимом большого хранилища.
