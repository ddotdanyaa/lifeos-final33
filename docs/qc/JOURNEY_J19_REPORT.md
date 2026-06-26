# Journey J19 - Big graph

status: PASS

## What User Sees
Graph has a dedicated large canvas, local/global mode, search with match reasons, filters, clickable nodes, inspector, connection summary and readable edge reasons.

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
After: 61 edges, 61 with visible reasons.

## Data Control Events
After: 300 audit events. Tail: ollama.probe: Ollama models_found at http://localhost:11434 | chat.local: Local chat message linked to artifact | chat.proposal: Chat message became proposal: вечерний обзор: голосом записал идею про сон, деньги и граф | provider.run: pwa boot: PWA shell checked: service-worker-ready | agent.run: Local organizer completed: вечерний обзор: голосом записал идею про сон,... | flow.dry-run: Flow dry-run created proposal: plan | flow.dry-run: Flow dry-run created proposal: task | graph.focus: Focused graph node note_a1e74966d56b

## Remaining Gated
None for this local journey.

## Fixed In This Package
P13 closed the edge-reason/readability gap: inspector summary, readable reason labels and search match reasons are asserted by e2e.
