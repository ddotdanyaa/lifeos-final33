# Journey J18 - Flows and n8n-like automation

status: PASS

## What User Sees
Flow builder uses a visible trigger-condition-action board, dry-runs proposals, records execution history and keeps approval required before mutations.

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
  "flowRuns": 2,
  "providerRuns": 0,
  "proposalsOpen": 2,
  "proposalsApplied": 0,
  "auditEvents": 0,
  "graphNodes": 4,
  "graphEdges": 10,
  "graphEdgeReasons": 10
}
```

## Graph Edges
After: 756 edges, 756 with visible reasons.

## Data Control Events
After: 300 audit events. Tail: chat.local.answer: Local chat answered: NO_AI_LOCAL_CHAT_MARKER без AI: преврати это сообщение в заметку и задачу | chat.proposal: Chat message became proposal: вечерний обзор: голосом записал идею про сон, деньги и граф | provider.run: pwa boot: PWA shell checked: service-worker-ready | capability.grant: Capability granted: agent/run (local) | chat.answer.artifact: Ответ сохранён: Локальный организатор подготовил действия для вечерний обзор: голосом записал идею про сон,.... | agent.run: Local organizer completed: вечерний обзор: голосом записал идею про сон,... | flow.dry-run: Проверка сценария создала предложение: plan | flow.dry-run: Проверка сценария создала предложение: задача

## Remaining Gated
None for this local journey.

## Fixed In This Package
P18 upgraded Flows from a plain form to a visible trigger-condition-action builder with approval queue and dry-run proof.
