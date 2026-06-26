# LifeOS Market Research Realtime

Date: 2026-06-25

Purpose: translate current market patterns into LifeOS rescue rules. LifeOS is not a bundle of apps; it is an Artifact OS where every workspace is a projection over one local repository-backed graph.

## Sources Consulted

- [Obsidian Graph View](https://obsidian.md/help/plugins/graph): graph nodes, links, hover/click interaction, local/global mental model.
- [Notion relations and rollups](https://www.notion.com/help/relations-and-rollups) and [database properties](https://www.notion.com/help/database-properties): pages as database items with typed relationships and derived views.
- [Todoist Quick Add](https://www.todoist.com/help/articles/use-task-quick-add-in-todoist-va4Lhpzz) and [Todoist calendar integration](https://www.todoist.com/help/articles/use-the-calendar-integration-rCqwLCt3G): natural capture, Today/Upcoming planning, calendar task projection.
- [Readwise Reader FAQ](https://docs.readwise.io/reader/docs/faqs): reading inbox, highlights, offline cache, exports.
- [Linear workflows](https://linear.app/docs/configuring-workflows) and [Linear priority](https://linear.app/docs/priority): status and priority are first-class issue fields, not decorative labels.
- [n8n executions](https://docs.n8n.io/workflows/executions/), [n8n node types](https://docs.n8n.io/integrations/builtin/node-types/), [n8n If node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.if/), and [n8n workflow history](https://docs.n8n.io/workflows/history/): trigger/action graph, run history, manual-vs-production execution, restore.
- [Zapier trigger setup](https://help.zapier.com/hc/en-us/articles/8496288188429-Set-up-your-Zap-trigger) and [Zapier action setup](https://help.zapier.com/hc/en-us/articles/8496257774221-Set-up-your-Zap-action): trigger/action/test/publish mental model.
- [Apple Shortcuts guide](https://support.apple.com/guide/shortcuts/welcome/ios) and [personal automations](https://support.apple.com/guide/shortcuts/intro-to-personal-automation-apd690170742/ios): multi-step shortcuts and event-triggered automations.
- [Google Calendar Tasks help](https://support.google.com/calendar/answer/9901136?co=GENIE.Platform%3DAndroid&hl=en) and [Google Tasks product page](https://workspace.google.com/products/tasks/): dated tasks appear on calendar; task notifications need date/time.
- [YNAB getting started guide](https://www.ynab.com/guide/the-ultimate-get-started-guide), [YNAB targets](https://support.ynab.com/how-to-use-targets-rk5kkI9ks), and [YNAB categories](https://support.ynab.com/en_us/adding-removing-and-customizing-categories-a-guide-HJFO5j909): categories, targets, non-monthly expenses, and budget envelopes.
- [Habitify](https://habitify.me/): habits as small repeatable actions with progress insight, not shame-heavy streak walls.
- [Logseq docs](https://docs.logseq.com/): pages, blocks, links, references, graph.
- [Anytype objects](https://doc.anytype.io/anytype-docs/getting-started/object-editor), [Anytype queries](https://doc.anytype.io/anytype-docs/getting-started/sets), and [Anytype collections](https://doc.anytype.io/anytype-docs/getting-started/sets/collections): objects, properties, graph, filtered projections.
- [Zotero PDF reader](https://www.zotero.org/support/pdf_reader) and [Zotero annotations in database](https://www.zotero.org/support/kb/annotations_in_database): annotations as database-backed objects linked back to pages.
- [Trello cards and dates](https://support.atlassian.com/trello/docs/adding-dates-to-cards/) and [Trello templates](https://trello.com/templates): board/list/card model, front/back card detail, due dates.
- [MDN File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications), [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API), [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API), [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API), [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API), and [File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API): browser-local storage and capability gates.
- [Ollama API introduction](https://docs.ollama.com/api/introduction), [Ollama chat](https://docs.ollama.com/api/chat), and [Ollama tags](https://docs.ollama.com/api/tags): local model endpoint, model list, chat/generate boundaries.
- [NN/g usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/), [visibility of system status](https://www.nngroup.com/articles/visibility-system-status/), and [progressive disclosure](https://www.nngroup.com/videos/progressive-disclosure/): minimalism, system status, user control, recognition over recall.

## 40 Product Patterns To Copy

1. Obsidian: big graph is a destination, not a small side widget.
2. Obsidian: local graph follows the active artifact.
3. Obsidian: graph nodes are clickable and open the underlying object.
4. Obsidian: backlinks and outgoing links make the vault feel navigable.
5. Obsidian: filters and groups change graph meaning without mutating data.
6. Notion: every object can be a page plus typed properties.
7. Notion: relation-like links should be visible in both connected projections.
8. Notion: database views are lenses over the same object set.
9. Todoist: quick capture should parse dates, recurrence, labels, and priorities inline.
10. Todoist: Today and Upcoming are planning views, not generic lists.
11. Todoist/Google Calendar: scheduled tasks belong on the calendar as blocks.
12. Akiflow/Sunsama/Morgen pattern: drag or intentionally place tasks into time.
13. Readwise Reader: a reading inbox separates saved sources from processed knowledge.
14. Readwise/Zotero: highlights become durable objects with source links.
15. Zotero: annotation objects should link back to the source page/location.
16. Pocket/Reader pattern: reading state needs progress, queue, archive, and undo.
17. Linear: status and priority are explicit workflow fields.
18. Linear: issue details are focused around one object and its next step.
19. Trello: card front summarizes; card back carries detail.
20. Jira/Linear pattern: activity history is part of trust.
21. n8n: flows are visual trigger-condition-action systems.
22. n8n/Zapier: test/dry-run before publishing or mutating live data.
23. n8n: execution history is a first-class debugging surface.
24. Apple Shortcuts: multi-step automations are understandable as action stacks.
25. Anytype: everything important is an object with type, properties, and graph links.
26. Anytype: collections/queries are projections, not copied data islands.
27. Logseq: references and blocks support small reusable knowledge units.
28. Google Calendar/Fantastical pattern: day/week grid must be readable at a glance.
29. Calendar apps: colors should encode domains and busy/available meaning.
30. YNAB: money is organized by categories/envelopes, not only transactions.
31. YNAB: targets turn vague savings into visible pressure.
32. Monarch/Wallet pattern: transaction review should be fast and reassuring.
33. Finance apps: subscriptions deserve a recurring-cost lane.
34. Habitify/Streaks: habit check-in should be instant and visually satisfying.
35. Habit apps: weekly rhythm and recovery reduce shame.
36. PWA pattern: offline/local state must be visible.
37. Browser File API: file import must clearly state what was read locally.
38. Ollama: local AI must show endpoint, model, status, and what context is sent.
39. NN/g: system status must be continuously visible after user action.
40. NN/g: advanced capabilities should be progressively disclosed behind the active object.

## 40 Anti-Patterns To Avoid

1. One cockpit page that tries to show every capability at once.
2. Same-looking workspaces with only different headings.
3. Right rails filled with unrelated mini panels.
4. Tiny desktop controls that cannot be read in screenshots.
5. Pale low-contrast panels with no semantic hierarchy.
6. Empty centers with busy edges.
7. Graph canvas inside a small card when graph is the job.
8. Decorative graph nodes not backed by repository objects.
9. Static "AI ready" labels without endpoint/model/provider proof.
10. Provider success without owner approval or real probe.
11. Apply buttons that silently mutate without proposal evidence.
12. "Edit/Apply/Skip" generic actions that hide intent.
13. Imported files that vanish into a generic list.
14. PDF/EPUB support claims without parser or honest manual gate.
15. Audio import without playback/transcript workflow.
16. Finance forms without balances, envelopes, subscriptions, or review.
17. Habit streaks that create shame and no recovery path.
18. Goals that are forms rather than progress and next action.
19. Calendar as rows instead of day/week time grid.
20. Tasks hidden away from calendar and today planning.
21. Search results without match explanation.
22. Backlinks hidden from the active artifact.
23. Debug words on the first screen.
24. Raw storage implementation details before owner intent.
25. Mixed English/Russian action labels in primary flows.
26. Duplicate nav ribbons and sidebars.
27. Deep feature menus before the first capture.
28. Fake run history or fake receipts.
29. Hardcoded samples passing as owner data.
30. Dead buttons retained for future work.
31. Route-state islands that do not persist.
32. Object arrays disconnected from graph and audit.
33. "Done" claims without screenshot and e2e proof.
34. Long lists with no recommended next action.
35. Unclear local/cloud boundaries.
36. Provider permissions buried in settings only.
37. No undo or rollback after mutation.
38. No archive/recover path for imported artifacts.
39. AI chat that edits data directly.
40. Automation publish paths without dry-run and owner approval.

## 40 UI Layout Rules For LifeOS

1. Home has one dominant capture area and three supporting zones max.
2. Home does not show the big graph, provider tables, or debug storage details.
3. Every workspace uses a distinct semantic accent and composition.
4. The right rail is a context inspector only.
5. The inspector appears only when an object is selected or the workspace benefits from it.
6. Navigation must show workspace jobs, not just app names.
7. Mobile uses bottom navigation and capture-first layout.
8. Calendar is a time grid first, list second.
9. Finance starts with balance, spending, budget pressure, and review queue.
10. Habits/goals start with today's check-ins, recovery, wheel/balance, and next step.
11. Library starts with notes/knowledge objects, backlinks, folders/spaces, and review.
12. Reader starts with queue and active reading surface.
13. Player starts with audio controls and transcript.
14. Chat starts with local AI/provider status and artifact context.
15. Agents/flows start with dry-runs and approval queue.
16. Graph starts full-width and dark canvas.
17. Control starts with last changes, export, archive/recover, and provider permissions.
18. Providers start with capability passport and setup gate.
19. Workspace headings must name the job-to-be-done.
20. Primary actions must be visually stronger than secondary controls.
21. Secondary panels collapse behind explicit controls.
22. Forms should sit next to the resulting objects where possible.
23. Large lists need grouping, filters, and a next action.
24. Empty states must contain one usable primary action.
25. Semantic colors map to object domains consistently.
26. Page title, zone title, object title, metadata, and controls use separate type scales.
27. Buttons use intent-specific Russian verbs.
28. Disabled actions explain what is required.
29. Visual density increases only after data exists.
30. No nested cards inside cards.
31. Repeated item cards use small radius and strong scan lines.
32. Important numbers get dashboard treatment.
33. Data source/projection/control chain is visible near active artifact.
34. Search belongs in top-level nav but results explain matches in workspace.
35. Graph filters are checkboxes/toggles, not hidden text commands.
36. Provider risk uses rose/red; audit uses neutral.
37. AI/local status uses electric blue, not generic gray.
38. Finance uses green/emerald, not blue.
39. Knowledge uses indigo; reader uses warm sand; audio uses magenta.
40. Every screenshot should reveal the workspace identity in five seconds.

## 40 Interaction Rules For Proposal/Apply Flows

1. Capture creates a source Artifact first.
2. Analysis creates proposal cards only; no projection mutation before approval.
3. Proposal cards show destination, reason, quote/source, confidence, and fields.
4. Primary proposal buttons are intent-specific: `Создать задачу`, `Создать расход`, `Поставить в календарь`.
5. Secondary proposal actions are `Изменить`, `Пропустить`, `Открыть источник`, `Показать связи`, `Контроль`.
6. Apply writes a repository object with stable ID.
7. Apply adds a graph edge with a readable reason.
8. Apply writes Data Control/audit receipt.
9. Apply updates the target workspace immediately.
10. Apply shows an undo toast or rollback path.
11. Proposal editing changes fields before mutation.
12. Skipped proposals stay auditable.
13. "Apply all" is scoped to active artifact and safe proposal classes.
14. Provider proposals cannot silently connect credentials.
15. AI output is proposal-only unless owner applies it.
16. Flow dry-run output is proposal-only until approved.
17. Agent dry-run shows scopes and what was read.
18. File import states parser capability honestly.
19. Receipt screenshot creates a manual transaction draft without fake OCR.
20. Audio import asks for manual transcript or STT gate.
21. Book/PDF/EPUB import creates a reading item and parser gate if needed.
22. Calendar task reschedule writes audit and graph reason.
23. Finance transaction creation updates accounts/budgets where applicable.
24. Habit check-in toggles fast and writes audit.
25. Goal progress updates show next step.
26. Backlink/graph opening never changes content.
27. Search result click focuses/open graph object.
28. Data export is explicit and writes audit.
29. Archive/recover is reversible where implemented.
30. Rollback snapshots are explicit and visible.
31. Offline mode is allowed but status must be visible.
32. Notifications require browser permission and owner intent.
33. Provider revoke is always available after setup.
34. Owner credential blockers show exact next action.
35. Command palette can expose advanced commands without crowding home.
36. Weak-day mode hides noncritical clutter.
37. Money pressure can simplify Today's plan but must explain why.
38. Calendar overload detector recommends reschedule, not shame.
39. Learning review mode surfaces important knowledge with source.
40. No release passes if a button has no handler.

## 40 Component Requirements

1. Home capture: textarea/dropzone, file/audio buttons, one primary CTA, local-only hint.
2. Home next action: one recommended action with route.
3. Home money snapshot: balance, today spend, budget left, subscription count.
4. Home habits/goals snapshot: check-in ratio, active goals, next progress step.
5. Home active artifact: source, analysis state, latest proposals, graph/control route.
6. Inbox review: unprocessed sources, batch evening review, kind filters.
7. Today: today, tomorrow, overdue, no-time, reminders, habits, weak-day mode.
8. Calendar: day/week grid, hour lanes, agenda mode, composer.
9. Calendar: drag/edit/reschedule controls and audit.
10. Finance: accounts, balance, transactions, budgets/envelopes, subscriptions.
11. Finance: receipt screenshot preview and manual extraction form.
12. Habits: check-in rows, streak/recovery, weekly rhythm.
13. Goals: progress controls, target date/amount, next task.
14. Wheel: life domains with visible balance scores.
15. Library: folders/spaces, markdown editor, wikilinks, backlinks.
16. Knowledge: claims, questions, review queue, insights.
17. Reader: reading list, active document, progress, highlights, notes.
18. Reader: PDF/EPUB honest parser gate.
19. Player: audio list, controls, transcript editor, segments.
20. Player: checkpoints and transcript-to-task/claim/highlight actions.
21. Chat: artifact-bound log, local AI status, proposal output.
22. Chat: Ollama probe/model list/run-as-proposals.
23. Agents: dry-run run card, scopes, read context, created proposals.
24. Flows: trigger, condition, action builder, dry-run result.
25. Flows: approval queue and run history.
26. Graph: full canvas, global/local toggle, zoom/pan, filters.
27. Graph: groups/colors by artifact domain.
28. Graph: node inspector with open/source/control buttons.
29. Graph: edge list with reason labels.
30. Graph: search results with why matched.
31. Control: last changes, audit log, storage map.
32. Control: export selected/all.
33. Control: archive/recover and rollback snapshots.
34. Control: provider permissions and privacy zones.
35. Providers: one passport row per provider.
36. Providers: status, last probe, scopes, required owner action.
37. Providers: revoke and prepare setup actions.
38. Mobile: bottom nav and capture-first home.
39. Release gate: visual screenshots mounted to `output/playwright`.
40. Fixture marketplace: 120+ grouped inputs for behavior regression.

## 40 Technical Constraints

1. IndexedDB can store structured data and blobs, but schema/versioning must be managed.
2. localStorage is only a fallback for smaller payloads.
3. Large source payloads need chunking/compression or file-size gates.
4. File API access requires user selection or drag/drop.
5. Browser code cannot freely scan local folders without explicit handles.
6. File System Access API support varies and needs feature detection.
7. Service Workers cannot access the DOM and are asynchronous.
8. Service Workers can improve offline behavior but must be registered and scoped carefully.
9. Notifications require permission and secure-context behavior.
10. Push/background notifications require additional service worker plumbing.
11. Web Speech SpeechRecognition is not baseline across major browsers.
12. Speech recognition may be server-backed depending on browser/provider; local boundary must be honest.
13. Audio STT must be gated unless a local engine is actually integrated.
14. OCR must be gated unless a local OCR engine is actually integrated.
15. PDF/EPUB parsing must be gated unless parser code is bundled and tested.
16. Ollama default local endpoint is `http://localhost:11434`.
17. Ollama model list uses `/api/tags`.
18. Ollama chat uses `/api/chat`; generate uses `/api/generate`.
19. Ollama calls can fail because the server is stopped, model missing, or CORS/network blocked.
20. AI output must be treated as untrusted proposal text.
21. Provider probes must record status and error without claiming success.
22. External Gmail/calendar sync requires owner OAuth credentials.
23. Browser storage quota can be evicted unless persistence is requested/granted.
24. Storage UI should show estimate/persistence where available.
25. Export must not assume cloud backup.
26. Rollback snapshots can grow; enforce bounds.
27. Graph layout should cap local graph nodes for performance.
28. Search over large vaults needs normalization and scoped result sets.
29. Canvas graph must guard against blank render and resize.
30. Drag/drop needs preventDefault and file-kind detection.
31. Data URLs for inline media should be size-limited.
32. Every mutation must be atomic within repository state.
33. Reload persistence is part of the acceptance test.
34. Audit entries must include object IDs or note/source context.
35. Graph edges need labels/reasons, not only source/target IDs.
36. Tests should reset IndexedDB/localStorage between scenarios.
37. Playwright screenshots need stable viewport and no horizontal overflow.
38. Button audits must detect dead `data-action` handlers.
39. Hardcoded sample audits must block fake owner progress.
40. Release gate must distinguish local verification from GitHub push/auth blockers.
