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
  "graphNodes": 4,
  "graphEdges": 8,
  "graphEdgeReasons": 8
}
```

## Graph Edges
After: 771 edges, 771 with visible reasons.

## Data Control Events
After: 300 audit events. Tail: chat.input.artifact: owner chat artifact recorded: NO_AI_LOCAL_CHAT_MARKER без AI: преврати это сообщение в заметку и задачу | chat.answer.artifact: assistant chat artifact recorded: Похоже, это связано с локальными артефактами: вечерний обзор: голосом записал идею про сон,...; завтра в 14:00 зал, к... | chat.local.answer: Local chat answered: NO_AI_LOCAL_CHAT_MARKER без AI: преврати это сообщение в заметку и задачу | chat.proposal: Chat message became proposal: NO_AI_LOCAL_CHAT_MARKER без AI: преврати это сообщение в заметку и задачу | provider.run: pwa boot: PWA shell checked: service-worker-ready | capability.grant: Capability granted: agent/run (local) | chat.answer.artifact: assistant chat artifact recorded: Локальный организатор подготовил действия для вечерний обзор: голосом записал идею про сон,.... | agent.run: Local organizer completed: вечерний обзор: голосом записал идею про сон,...

## Remaining Gated
None for this local journey.

## Fixed In This Package
P18 tightened Agents into an owner-visible proposal engine: safety boundary, apply-required history and approval queue are asserted by e2e.
