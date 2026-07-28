# Journey J20 - Data Control export and recover

status: PASS

## What User Sees
Control shows last changes, storage map, export all, selected export, rollback snapshot, recovery rows and the executable Artifact OS architecture contract.

## Repository Objects Created
```json
{
  "sources": 0,
  "notes": 0,
  "tasks": 0,
  "calendarBlocks": 0,
  "reminders": 0,
  "financeTransactions": 0,
  "accounts": 0,
  "budgets": 0,
  "subscriptions": 0,
  "habits": 0,
  "goals": 0,
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
After: 21 edges, 21 with visible reasons.

## Data Control Events
After: 300 audit events. Tail: chat.answer.artifact: Ответ сохранён: Локальный организатор подготовил действия для вечерний обзор: голосом записал идею про сон,.... | agent.run: Local organizer completed: вечерний обзор: голосом записал идею про сон,... | flow.dry-run: Проверка сценария создала предложение: plan | flow.dry-run: Проверка сценария создала предложение: задача | graph.focus: Focused graph node note_09de131f63c8 | vault.export: Vault export generated: notes=63, sources=29, tasks=4, finance=4, habits=2, goals=2, systems=1, projects=0, databases=0, chatMessages=59, savedSearches=0, audit=300 | control.export.selected: Selected artifact export generated: selected note / note_09de131f63c8 | control.rollback.snapshot: Rollback snapshot created: Snapshot before Data Control change

## Remaining Gated
None for this local journey.

## Fixed In This Package
P27 adds C25 architecture contract/event-bus proof without splitting owner journeys into route-local state.
