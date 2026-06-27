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
  "providerRuns": 0,
  "proposalsOpen": 100,
  "proposalsApplied": 0,
  "auditEvents": 154,
  "graphNodes": 196,
  "graphEdges": 350,
  "graphEdgeReasons": 350
}
```

## Graph Edges
After: 390 edges, 390 with visible reasons.

## Data Control Events
After: 193 audit events. Tail: note.create: Note created: каждый день вода 2л и читать 20 страниц | source.project: Source projected into note: каждый день вода 2л и читать 20 страниц.md | reading.create: Reading item created: каждый день вода 2л и читать 20 страниц | review.create: Review item created: Повторить highlight: каждый день вода 2л и читать 20 страниц | highlight.create: Highlight created: каждый день вода 2л и читать 20 страниц | highlight.extract: Highlights extracted from каждый день вода 2л и читать 20 страниц.md: 1 | source.import: Source imported: каждый день вода 2л и читать 20 страниц.md (text) | inbox.capture: Inbox text captured as artifact

## Remaining Gated
None for this local journey.

## Fixed In This Package
P19 records the 20-input journey in executable evidence; fixture matrix remains separately enforced at 120 cases.
