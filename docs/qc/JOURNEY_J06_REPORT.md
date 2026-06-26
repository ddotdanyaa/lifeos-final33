# Journey J06 - Screenshot receipt

status: PASS

## What User Sees
Receipt screenshot shows an image/manual extraction path with an honest OCR gate; save creates a finance transaction tied to its source.

## Repository Objects Created
```json
{
  "sources": 1,
  "notes": 0,
  "tasks": 0,
  "calendarBlocks": 0,
  "reminders": 0,
  "financeTransactions": 1,
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
  "agentRuns": 0,
  "flowRuns": 0,
  "providerRuns": 0,
  "proposalsOpen": 7,
  "proposalsApplied": 0,
  "auditEvents": 3,
  "graphNodes": 9,
  "graphEdges": 18,
  "graphEdgeReasons": 18
}
```

## Graph Edges
After: 502 edges, 502 with visible reasons.

## Data Control Events
After: 218 audit events. Tail: proposal.apply: Applied proposal: Доход | finance.account: Finance account set: Карта | proposal.apply: Applied proposal: Баланс счета | finance.subscription: Subscription added: пятерочка продукты сегодня баланс карта подпи... 1240 | proposal.apply: Applied proposal: пятерочка продукты сегодня баланс карта подпи... | source.import: Source imported: market-home.png (image) | finance.transaction: Finance expense: Аптека 890 RUB | receipt.manual: Manual receipt expense saved from market-home.png

## Remaining Gated
Automatic OCR remains provider-gated; manual extraction works now.

## Fixed In This Package
P19 generated executable journey evidence with before/after screenshots and direct repository assertions.
