# Product Maturity Scorecard

Updated: 2026-06-26 after `P_WORKSPACE_9PLUS_VISUAL_POLISH`.

| Workspace | Score | State | Biggest blocker | Proof |
| --- | ---: | --- | --- | --- |
| Home | 9 | BUILT_REVALIDATED | keep no-cockpit after Product Brain seed | final-home / no-cockpit audit |
| Capture | 9 | BUILT_REVALIDATED | keep proposal-first capture and no silent mutation | J01-J04 / fixture audit |
| Today | 9 | BUILT_REVALIDATED | keep weak-day mode from turning into generic task rows | J02/J08 / final-today |
| Calendar | 9 | BUILT_REVALIDATED | keep week planner readable on mobile | final-calendar-week / e2e:journeys |
| Finance | 9 | BUILT_REVALIDATED_WITH_OCR_GATE | OCR engine external; manual receipt path works | final-finance / final-screenshot-expense |
| Habits / Goals | 9 | BUILT_REVALIDATED | keep wheel/domain insight linked to artifacts | final-habits-goals-wheel |
| Library | 9 | BUILT_REVALIDATED | Product Brain must remain discoverable | product-brain-library.png |
| Reader | 9 | BUILT_WITH_PARSER_GATE | PDF/EPUB external parser setup | final-reader |
| Player | 9 | BUILT_WITH_STT_GATE | STT external engine/permission setup | final-player-transcript |
| Chat | 9 | BUILT_WITH_OLLAMA_GATE | Ollama daemon optional/external | product-brain-chat.png |
| Agents / Flows | 9 | BUILT_REVALIDATED | keep dry-run approval boundary | final-agents-flows |
| Graph | 9 | BUILT_REVALIDATED | keep Product Brain filter and edge reasons | product-brain-graph.png |
| Control | 9 | BUILT_REVALIDATED | keep release/evidence state honest | product-brain-control.png |
| Providers | 9 | PASSPORTS_BUILT_EXTERNAL_GATED | owner credentials, browser permissions and local engines | final-providers |
| GitHub Release | 9 | LITE_SNAPSHOT_PUSHED | Remote branch verified by git ls-remote; oversized evidence omitted into manifest | docs/ops/GITHUB_RELEASE_STATE.md |

Next package: `P_OWNER_PROVIDER_CONNECTIONS_EXTERNAL`.
