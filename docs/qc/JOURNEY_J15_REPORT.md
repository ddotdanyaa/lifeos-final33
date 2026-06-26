# Journey J15 - Local AI and Ollama chat

status: PASS

## What User Sees
Chat/Providers expose Ollama status, explicit probe, model list and proposal-only execution boundary.

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
  "providerRuns": 1,
  "proposalsOpen": 0,
  "proposalsApplied": 0,
  "auditEvents": 0,
  "graphNodes": 1,
  "graphEdges": 2,
  "graphEdgeReasons": 2
}
```

## Graph Edges
After: 683 edges, 683 with visible reasons.

## Data Control Events
After: 300 audit events. Tail: reading.create: Reading item created: вечерний обзор: голосом записал идею про сон,... | review.create: Review item created: Повторить highlight: вечерний обзор: голосом записал идею про сон, деньг... | highlight.create: Highlight created: вечерний обзор: голосом записал идею про сон, деньги и граф | highlight.extract: Highlights extracted from вечерний обзор: голосом записал идею про сон,....md: 1 | source.import: Source imported: вечерний обзор: голосом записал идею про сон,....md (text) | inbox.capture: Inbox text captured as artifact | provider.run: ollama probe: Ollama models_found at http://localhost:11434 | ollama.probe: Ollama models_found at http://localhost:11434

## Remaining Gated
A real local Ollama daemon is owner/device-dependent; this journey verifies the reachable API contract with a mocked localhost response.

## Fixed In This Package
P19 generated executable journey evidence with before/after screenshots and direct repository assertions.
