# Journey J17 - Agents

status: PASS

## What User Sees
Agent dry-run is attached to the current artifact, shows safety boundaries, records context/risk and creates approval-bound proposals.

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
  "chatMessages": 1,
  "agentRuns": 1,
  "flowRuns": 0,
  "providerRuns": 0,
  "proposalsOpen": 2,
  "proposalsApplied": 0,
  "auditEvents": 0,
  "graphNodes": 3,
  "graphEdges": 6,
  "graphEdgeReasons": 6
}
```

## Graph Edges
After: 693 edges, 693 with visible reasons.

## Data Control Events
After: 300 audit events. Tail: source.import: Source imported: вечерний обзор: голосом записал идею про сон,....md (text) | inbox.capture: Inbox text captured as artifact | provider.run: ollama probe: Ollama models_found at http://localhost:11434 | ollama.probe: Ollama models_found at http://localhost:11434 | chat.local: Local chat message linked to artifact | chat.proposal: Chat message became proposal: вечерний обзор: голосом записал идею про сон, деньги и граф | provider.run: pwa boot: PWA shell checked: service-worker-ready | agent.run: Local organizer completed: вечерний обзор: голосом записал идею про сон,...

## Remaining Gated
None for this local journey.

## Fixed In This Package
P18 tightened Agents into an owner-visible proposal engine: safety boundary, apply-required history and approval queue are asserted by e2e.
