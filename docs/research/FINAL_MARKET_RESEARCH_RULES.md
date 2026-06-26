# Final Market Research Rules For LifeOS

STATUS: CONTINUATION_REQUIRED
updated_at: 2026-06-25

This document converts current product research into executable LifeOS rules. It is not completion proof; it is the market bar for the remaining packages.

## Sources

- Obsidian Help: Graph view and local graph settings: https://obsidian.md/help/plugins/graph
- Obsidian community explanation of backlinks: https://forum.obsidian.md/t/can-someone-please-help-me-understand-backlinks/57990
- Notion Help: relations and rollups: https://www.notion.com/help/relations-and-rollups
- Notion guide: using relation and rollup properties: https://www.notion.com/help/guides/using-relation-and-rollup-properties
- Todoist Help: dates/time and Quick Add: https://www.todoist.com/help/articles/introduction-to-dates-and-time-q7VobO and https://www.todoist.com/help/articles/use-task-quick-add-in-todoist-va4Lhpzz
- Readwise Reader docs: undo/trash/restore behavior: https://docs.readwise.io/reader/docs/faqs
- n8n Docs: executions: https://docs.n8n.io/workflows/executions/
- Ollama Docs: local API introduction and chat endpoint: https://docs.ollama.com/api/introduction and https://docs.ollama.com/api/chat
- MDN: File API, FileReader, IndexedDB, Service Workers, Notifications, Storage, Web Speech: https://developer.mozilla.org/en-US/docs/Web/API/File_API, https://developer.mozilla.org/en-US/docs/Web/API/FileReader, https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API, https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API, https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API, https://developer.mozilla.org/en-US/docs/Web/API/Storage_API, https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- Google Calendar Help: calendar/event management: https://support.google.com/calendar/
- Apple Calendar User Guide: multiple accounts and color-coded calendars: https://support.apple.com/guide/calendar/welcome/mac
- YNAB Help: categories/targets/transactions: https://support.ynab.com/en_us/ynab-glossary-a-guide-BJd80SORq and https://support.ynab.com/en_us/categorizing-transactions-a-guide-HyRl60sks
- Linear Docs: priority and workflow statuses: https://linear.app/docs/priority and https://linear.app/docs/configuring-workflows

## 50 Layout Rules

1. Home starts with four zones only: capture, today/next, money/progress, active artifact.
2. No graph canvas on first viewport.
3. No control log on first viewport.
4. Right rail is an inspector for the selected artifact only.
5. Every route must change layout, not just card labels.
6. Capture uses a large input and a single review stage.
7. Today uses time-ordered execution, not a dashboard grid.
8. Calendar uses a real time grid with blocks.
9. Finance uses money-first summary, then review queues.
10. Habits/goals uses check-ins and wheel, not form-first layout.
11. Library uses notes/backlinks/editor split.
12. Reader uses document surface with highlights beside text.
13. Player uses audio controls, transcript and checkpoints.
14. Chat uses artifact context above conversation.
15. Agents/Flows uses trigger-condition-action canvas.
16. Graph uses full dark canvas with filters/inspector/search.
17. Control uses trust actions first: changes, export, archive/recover.
18. Providers uses passport cards with status and setup.
19. Mobile uses bottom nav and capture-first order.
20. Each workspace has one primary action above the fold.
21. Secondary details live in collapsible sections.
22. Proposal details are collapsed when one recommendation is obvious.
23. Empty states must name one next action.
24. Lists must show why an item is present.
25. Tables are allowed only for dense audit/finance data.
26. Cards are for repeated items, not whole page sections.
27. Graph inspector is not a dumping rail.
28. Calendar unscheduled bucket is visually separate from time grid.
29. Finance receipt preview is beside manual extraction.
30. Reading progress stays near the document title.
31. Transcript editor stays beside source audio.
32. Provider setup steps stay below status/action.
33. Storage/quota map is in Control, not Home.
34. Search results explain match reason.
35. Route hero copy is short and operational.
36. Controls use stable dimensions.
37. Buttons never resize the layout after text changes.
38. Dense pages use section bands, not nested cards.
39. Color semantics follow artifact type.
40. Danger/risk is reserved for Control/privacy/provider risk.
41. Disabled state must show a reason.
42. Active artifact appears consistently across workspaces.
43. Backlinks are close to the object they explain.
44. Local graph preview stays local; global graph is its own workspace.
45. Calendar color means object type or calendar source, never decoration.
46. Finance categories use envelope/budget visual language.
47. Habits use recovery visuals, not shame visuals.
48. Reader/player routes prioritize the media object, not import controls.
49. Agents/flows show dry-run output before approval controls.
50. Final screenshots must prove route-specific useful state, not HTTP 200.

## 50 Interaction Rules

1. Capture never mutates domain objects before approval.
2. Simple capture shows one recommended action.
3. Complex capture groups proposals by type.
4. `Принять всё` applies only safe groups.
5. Ambiguous time is blocked for owner choice.
6. Explicit time with part of day is respected.
7. Natural language date parsing must show the detected date.
8. Proposal cards show source quote and reason.
9. Apply creates object, graph edge and audit event.
10. Undo/rollback is visible after important mutations.
11. Edit proposal changes fields before apply.
12. Skip records an audit decision.
13. Opening source goes to the artifact, not a generic page.
14. Opening links goes to Graph/Control for that object.
15. Search explains title/body/source/tag/backlink match.
16. Calendar block can be edited/rescheduled.
17. Calendar overload is a warning, not hidden math.
18. Tasks can move today/tomorrow/no-time without losing source.
19. Habit check/uncheck is reversible.
20. Goal progress can create next action.
21. Finance transaction review shows category and account impact.
22. Receipt screenshot works manually even when OCR is gated.
23. Reader highlight can become knowledge/task.
24. Player transcript segment can become note/task.
25. Chat message can become proposal without AI.
26. Ollama run requires explicit owner click.
27. Ollama output is proposal-only by default.
28. Agent run is always dry-run before approval.
29. Flow run shows trigger, condition, action and execution record.
30. Provider probe never claims ready without actual response.
31. Gmail/calendar external sync never fakes OAuth.
32. Notification permission is requested explicitly.
33. Export all and export selected artifact are separate.
34. Archive/recover keeps provenance.
35. Restore confirms what changed.
36. Corrupt records must be isolated and explained.
37. Large vault mode degrades graph detail before freezing.
38. Graph node click opens inspector.
39. Edge click/reason explains relationship.
40. Local/global graph toggle is visible.
41. Graph filters affect both canvas and result list.
42. Mobile capture accepts text/files/audio when supported.
43. File import shows parser status immediately.
44. Unsupported format stores source and shows gate.
45. Provider revoke/disconnect is visible where applicable.
46. Owner can see what data would leave device.
47. Every disabled button explains why.
48. Every primary button has a handler.
49. No destructive reset without explicit confirmation.
50. Final status cannot be `DONE_ALL` while local gates remain.

## 50 Component Requirements

1. Universal Capture component: text, paste, file, image, audio and book paths.
2. Proposal component: type, title, reason, quote, fields, confidence.
3. Recommended action component: one primary, edit, details.
4. Proposal group component: grouped by knowledge/actions/calendar/money/habits/goals/media/automation/control.
5. Active artifact card: source, projections, latest proposals.
6. Today list: timed, no-time, overdue, reminders, habits.
7. Weak-day mode control.
8. Calendar week grid.
9. Calendar day agenda.
10. Unscheduled bucket.
11. Conflict/overload banner.
12. Finance balance strip.
13. Account list.
14. Transaction review list.
15. Budget envelope bars.
16. Subscription/bills list.
17. Receipt image preview.
18. Manual receipt extraction form.
19. Habit card with frequency/check-in/recovery.
20. Goal card with target/progress/next step.
21. Wheel of balance component.
22. Domain insight component.
23. Markdown editor.
24. Wikilink renderer.
25. Backlinks panel.
26. Ghost link create action.
27. Knowledge card.
28. Review queue.
29. Reader document pane.
30. Reader highlight list.
31. Reader note/question controls.
32. Format gate component.
33. Audio list.
34. Audio player controls.
35. Transcript editor.
36. Transcript checkpoint list.
37. STT provider gate.
38. Artifact-bound chat thread.
39. Ollama status/probe/model list.
40. AI proposal output panel.
41. Agent manifest card.
42. Agent dry-run result.
43. Flow builder trigger field.
44. Flow condition field.
45. Flow action field.
46. Flow execution history.
47. Graph canvas.
48. Graph filters/search/inspector.
49. Data Control audit/export/recover/storage map.
50. Provider passport with status/setup/data boundary/revoke.

## 50 Anti-Pattern Bans

1. No cockpit Home with all capabilities visible.
2. No right-rail junk drawer.
3. No decorative graph nodes.
4. No fake provider success.
5. No provider action without status.
6. No route-state islands.
7. No mutation without audit.
8. No mutation without graph/control where relevant.
9. No hardcoded owner example branch.
10. No proposal duplicates for one simple action.
11. No ten equal buttons for a simple task.
12. No ambiguous time guessing.
13. No hidden apply-all mutation for risky proposals.
14. No raw debug labels in primary surface.
15. No spreadsheet-looking Home.
16. No massive empty center with tiny controls.
17. No pale same-looking workspaces.
18. No forms-only finance.
19. No forms-only habits/goals.
20. No import-only reader.
21. No import-only player.
22. No chat that silently edits data.
23. No agent that executes without approval.
24. No flow that runs without dry-run.
25. No fake OCR.
26. No fake STT.
27. No fake PDF/EPUB parse.
28. No fake Gmail OAuth.
29. No fake external calendar sync.
30. No hidden storage quota.
31. No export button without real output.
32. No archive without recover.
33. No rollback claim without snapshot.
34. No graph without clickable nodes.
35. No edge without reason.
36. No search without why-match.
37. No screenshots that only prove page open.
38. No ledger fixed row without code/test/screenshot evidence.
39. No hidden external gates.
40. No disabled controls without reason.
41. No Russian mojibake in visible UI.
42. No mixed language action labels except proper nouns.
43. No mobile horizontal overflow.
44. No global graph squeezed into side widget.
45. No Graph on Home first viewport.
46. No Control log wall on Home first viewport.
47. No one-note color palette.
48. No nested page cards.
49. No destructive local reset without explicit owner confirmation.
50. No `DONE_ALL` without clean tree, push, tests and closed local gates.

## 50 Technical Constraints

1. File API only sees files the user provides.
2. Drag/drop file access must be user initiated.
3. FileReader is asynchronous and can fail.
4. Large files need size limits and policy.
5. IndexedDB is suited for structured local data and blobs.
6. IndexedDB operations are asynchronous.
7. Web Storage is too small for large structured vaults.
8. Storage quota is origin-specific and estimated.
9. Storage estimates are not exact.
10. Browser eviction can happen under pressure.
11. Export/backup is required for trust.
12. Restore must validate schema.
13. Corrupt records must not break boot.
14. Schema version must migrate old state.
15. Compression/chunking needs fallback.
16. Service workers can support offline assets.
17. Service workers need registration lifecycle handling.
18. Cache API persistence is browser-managed.
19. Notifications require explicit permission.
20. Background notifications need service worker support.
21. Web Speech recognition is limited availability.
22. SpeechRecognition may use browser/vendor services.
23. STT must disclose data boundary.
24. OCR requires engine/library or manual fallback.
25. PDF parsing requires parser support.
26. EPUB parsing requires parser support.
27. Ollama API is local at `localhost:11434` when daemon runs.
28. Ollama `/api/tags` can list local models.
29. Ollama `/api/chat` is explicit request/response and may stream.
30. AI output must be stored as proposal, not mutation.
31. Fetching localhost can fail due daemon/CORS/network state.
32. Provider probes need timeouts and error states.
33. OAuth providers require credentials and redirect setup.
34. No secrets in localStorage.
35. Browser local app cannot guarantee OS-level backups.
36. Large graphs need filters/limits to avoid freezing.
37. Canvas/SVG graph interactions must remain accessible via list/inspector.
38. Search over large vaults needs indexed/scored paths.
39. Route switch performance must be measured.
40. Screenshots should not dirty release without commit/ignore policy.
41. Playwright tests must assert state, not just DOM.
42. Fixture tests must avoid exact production sample strings.
43. Date/time parser must expose uncertainty.
44. Apply engine must skip/hold unsafe proposals.
45. Audit log must be human readable.
46. Graph edges need typed labels/reasons.
47. Data Control must show storage location and object IDs where useful.
48. Provider gates must explain what stays local and what leaves.
49. Release helper must never force push.
50. GitHub release requires authenticated remote push; otherwise final status cannot be `DONE_ALL`.

