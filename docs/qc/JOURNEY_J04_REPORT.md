# Journey J04 - Arbitrary messy capture

status: PASS

## What User Sees
Twenty typo-heavy and mixed-language inputs create source artifacts and proposal groups without silently creating accepted task/finance/habit/goal objects.

## Repository Objects Created
```json
{
  "sources": 20,
  "notes": 20,
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
  "reviewItems": 18,
  "readingItems": 20,
  "highlights": 18,
  "transcriptSegments": 0,
  "audioCheckpoints": 0,
  "playerNotes": 0,
  "chatMessages": 40,
  "agentRuns": 0,
  "flowRuns": 0,
  "providerRuns": 20,
  "proposalsOpen": 100,
  "proposalsApplied": 0,
  "auditEvents": 214,
  "graphNodes": 236,
  "graphEdges": 430,
  "graphEdgeReasons": 430
}
```

## Graph Edges
After: 496 edges, 496 with visible reasons.

## Data Control Events
After: 279 audit events. Tail: review.create: Review item created: Повторить highlight: каждый день вода 2л и читать 20 страниц | highlight.create: Highlight created: каждый день вода 2л и читать 20 страниц | highlight.extract: Highlights extracted from каждый день вода 2л и читать 20 страниц.md: 1 | provider.run: import file: Импорт: каждый день вода 2л и читать 20 страниц.md (text) | source.import: Source imported: каждый день вода 2л и читать 20 страниц.md (text) | chat.input.artifact: owner chat artifact recorded: каждый день вода 2л и читать 20 страниц | chat.answer.artifact: assistant chat artifact recorded: Артефакт связан с Библиотекой, Графом и предложениями на Сегодня. | inbox.capture: Inbox text captured as artifact

## Remaining Gated
None for this local journey.

## Fixed In This Package
P19 records the 20-input journey in executable evidence; fixture matrix remains separately enforced at 120 cases.
