# Journey J12 - Reader and books

status: PASS

## What User Sees
Reader parses TXT/MD, tracks progress and highlights, and shows honest PDF/EPUB parser gates with manual extraction path.

## Repository Objects Created
```json
{
  "sources": 2,
  "notes": 2,
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
  "reviewItems": 5,
  "readingItems": 2,
  "highlights": 5,
  "transcriptSegments": 0,
  "audioCheckpoints": 0,
  "playerNotes": 0,
  "chatMessages": 2,
  "agentRuns": 0,
  "flowRuns": 0,
  "providerRuns": 2,
  "proposalsOpen": 15,
  "proposalsApplied": 0,
  "auditEvents": 0,
  "graphNodes": 36,
  "graphEdges": 70,
  "graphEdgeReasons": 70
}
```

## Graph Edges
After: 655 edges, 655 with visible reasons.

## Data Control Events
After: 300 audit events. Tail: highlight.create: Highlight created: Highlight becomes knowledge | reading.progress: Reading progress 45%: book-sample | note.create: Note created: journey-parser-gate | source.project.gated: Book source projected with parser gate: journey-parser-gate.pdf | reading.create: Reading item created: journey-parser-gate | provider.run: import file: Импорт: journey-parser-gate.pdf (book) | source.import: Source imported: journey-parser-gate.pdf (book) | chat.answer.artifact: assistant chat artifact recorded: Imported journey-parser-gate.pdf and prepared next actions.

## Remaining Gated
PDF/EPUB automatic parsing remains parser-gated until local parser packages are installed.

## Fixed In This Package
P19 generated executable journey evidence with before/after screenshots and direct repository assertions.
