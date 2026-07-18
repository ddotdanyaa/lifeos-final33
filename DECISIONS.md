# LifeOS — Autonomous Session Decisions Log

Each entry: package · decision · why.

## 2026-07-17 — Session start

**Decision: treat P0.4 COMMIT_BASELINE as owner-authorized for this run, commit immediately, and continue committing after every package.**
Why: the plan marks P0.4 (commit/push) as owner-gated by default. But the session-start instructions for this specific autonomous run explicitly say "after EACH package: git add -A and git commit... git push only if gh already authorized". This is the owner's direct, current-session instruction overriding the plan's default gate for commit/push specifically (not for other owner-gated steps like credential entry or P11.2 release, which remain gated). `gh auth status` confirmed a valid, active token for `ddotdanyaa`, so push is permitted per the owner's stated condition.

**Decision: verified `gh auth status` is valid (not expired as memory/plan previously noted) — pushes are allowed this session.**
Why: prior session memory (`lifeos-build-state-2026-07`) said the gh token was expired. Re-checked at session start: token is active with repo/workflow scopes. Proceeding to push after commits.

## P0.2 KB_SMOKE_RESCUE

**Discovery: the plan's stated scope for P0.2 (fix `book-workbench` + `top-control` testids, convert raw `surface-chat` clicks to `openSurface`) badly undersold the actual gap.**
Why: kb-smoke.spec.mjs was written against an older, deeper monolithic UI. The chat-first shell
rewrite (commit 8ae0dbcc) replaced `app.js`'s old `renderEditor`/`renderTopbar` render path
(book workbench, second-brain claims/questions/review, library control trail, transcript
segments, today goal/task/plan-block forms, note recovery/trash) with a much simpler `ui/*.js`
set, but left ALL the backend state logic and action handlers (`add-claim-entry`,
`add-goal`, `add-task`, `add-plan-block`, `restore-note`, `syncTranscriptSegments`, etc.)
fully intact and working — only the *rendering* was thinned out, and the old renderers became
dead code (never called). This is exactly the failure mode [[feedback-no-oversimplify]] warns
about. Since app.js's dead functions couldn't be imported into `ui/*.js` without an
architecturally-backwards circular import (app.js → ui/shell.js → ui/library.js → app.js), I
rebuilt the missing presentation in the live `ui/*.js`/`ui/components/**` modules instead,
reusing the existing ctx fields, action names and DOM ids the already-working handlers expect
(verified via `handleAction`/`handleChange`/`handleInput` in app.js) rather than writing new
business logic.

**How to apply:** touched files beyond the plan's literal P0.2 allowlist: `ui/today.js`,
`ui/chat.js`, `ui/control.js`, `ui/agents-flows.js` (all top-level `ui/*.js`, not just
`ui/components/**`). Justification: `ui/components/**` was already in-scope and these are the
exact same class of fix (wire a dead app.js renderer's data into the live simplified one) —
not new features, no new state, no new dependencies. Small `app.js` ctx additions (all
"точечно"): `questions`, `reviewItems`, `planBlocks`, `deletedNotes`, `transcriptSegments`
added to `buildNewShellContext` since the collections already existed in state but were never
exposed to the new shell.

**Fixed a real (not test-only) mobile bug found along the way:** `.control-human-layout`
in styles.css had an unconditional `grid-template-columns: minmax(420px, 1fr) 300px` (no
media-query guard), forcing horizontal overflow on any viewport under ~720px. This was
undetectable before because `top-control` never rendered, so mobile could never reach the
Control surface at all. Fixed with a `@media (max-width: 920px)` override to a single column.
Flagged in BLOCKED.md that the same class-reuse CSS pattern should be swept across other
workspaces in P10.2.

**Fixed stale test expectations in kb-smoke.spec.mjs, not weakened assertions:** `.kb-shell`
selector → `#app` (root container renamed in the shell rewrite); `/nodes/` → `/узлов/` regex
(product is RU-first, English wording was never actually shipped); `/localhost:11434/` →
accepts `127.0.0.1` too (functionally identical default Ollama endpoint); added a missing
`surface-graph` navigation click before a `graph-counts` assertion that had no way to pass
without it (adjacent unrelated code moved the surface away from graph earlier in the same
test, and this looks like a spec authoring gap, not an intentional relaxed check).

**Verified no regression:** stashed all P0.2 changes, confirmed `market-owner.spec.mjs`'s
unrelated `home-next-action` failure pre-exists on baseline (untouched `ui/home.js`), restored
stash. Full G-E2E-CORE (final-human-product H01-H10, human-public, owner-rescue) + G-E2E-KB +
G-ARCH + all 24 audits stay green after the P0.2 commit.

## 2026-07-18 — Session resume (owner authorized full autonomy: commit+push after every package, incl. gh auth/repo create, no per-action confirmation needed this session)

**Found P0.2/P0.3 already done but not ticked/committed from a prior session run.** Git log
showed `af9a7568 P0.2 KB_SMOKE_RESCUE` already landed, and the working tree had uncommitted
P0.3 LEDGER_TRUTH_REFRESH changes (ledger CSV + PRODUCT_BRAIN_OVERVIEW) sitting dirty — this
was the sole reason `audit-owner-rescue-final` was red ("working tree is clean" check). Ticked
P0.2/P0.3/P0.4 in the plan ledger, committed the P0.3 work, verified both previously-red audits
went green, and pushed (`gh auth status` confirmed an active token for `ddotdanyaa`, contradicting
stale memory that said it was expired).

## P1.1 OBJECT_CONTRACT_V4

**Decision: used camelCase field names (`sourceRefs`, `artifactRefs`, `lifecycleState`,
`privacyScope`, `accessContour`) instead of the plan's literal snake_case
(`source_refs`, `artifact_refs`, ...), and reused the existing `createdAt`/`updatedAt`
fields instead of adding duplicate `created_at`/`updated_at`.**
Why: CLAUDE.md §5 requires matching surrounding code style, and every existing field in
app.js/artifact-os-architecture.mjs (id, createdAt, updatedAt, noteId, sourceId, ...) is
camelCase; introducing snake_case fields alongside would be an inconsistent, confusing
duplicate schema for the same two timestamp fields.

**Decision: `applyObjectContractV4` also defaults `createdAt`/`updatedAt` itself (not just
the 14 new fields), even though ~12 collections already set these via their own
per-collection normalization loops earlier in `normalizeState`.**
Why: making the Object Contract self-sufficient for all 16 fields, rather than depending on
each of the 44 collections having its own bespoke loop, is what actually guarantees the
contract holds everywhere (proven by `tools/audit-seven-contracts.mjs`'s whole-state pass,
which found this gap immediately when tested against collections with no existing loop).

**Decision: `auditLog`/`control`/`environment` are exempt from Object Contract v4
(`OBJECT_CONTRACT_EXEMPT_COLLECTIONS`), not migrated to carry the 16 fields.**
Why: these are not artifact instances — `auditLog` is an append-only event log with its own
event shape (id/type/summary/createdAt), `control`/`environment` are singleton
per-vault runtime-state records, not individually-owned objects with an owner/lifecycle/
privacy scope of their own. Forcing the contract onto them would be label theater
(same failure mode as [[feedback-no-oversimplify]] warns about, just the overclaiming
direction instead of the thinning direction).

**Decision: default `confidence = 1` uniformly for all migrated records, not a computed
per-type score.** Why: P1.1's scope is the Object Contract's field *presence*, not
confidence scoring; a fake computed-looking score would be overclaiming precision the
system doesn't have. Documented as a known future refinement, not silently done.

**Verified no regression:** ran full audit loop (only red was the expected pre-commit dirty
tree), G-SMOKE, `audit:architecture`, new `audit:seven-contracts`, G-E2E-CORE (13 passed/1
skipped) and G-E2E-KB (2 passed) all green after the change. Rebuilt public-demo (app.js and
artifact-os-architecture.mjs changed).

## P1.2 RECEIPT_COVERAGE_MATRIX

**Discovery: `tools/audit-ledger.mjs` (the plan's stated gate for this package) already
exists and checks something unrelated** — the `NONSTOP_OWNER_WEAKNESS_LEDGER.csv` (W001-W420
QC weakness rows), not receipts. Also found `state.control.receipts` was declared in
`normalizeState` and rendered in Data Control, but **nothing anywhere ever pushed to it** —
pure label theater, the exact failure mode `audit-no-label-theater*` exists to catch, just not
one of the 44-collection kind so those audits didn't see it.
Why this matters: I did not repurpose `audit-ledger.mjs` (that would silently break its actual
job). Instead extended `tools/audit-seven-contracts.mjs` from P1.1 with a Receipt section,
since that script already declared itself as the growing home for Object/Receipt/Capability/
Locality checks — one canonical "Seven Contracts" audit, not a same-purpose second file.

**Decision: wired receipt-writing into `addAudit()` itself (one choke point) instead of
adding an `addReceipt(...)` call at each of the ~150 individual mutation call sites.**
Why: `addAudit(state, type, summary, noteId)` is already called from every one of the ~150
mutation handlers in app.js, so classifying `type` against the 14 strong-mutation kinds
(`STRONG_MUTATION_RULES`, ordered, first-match-wins) inside `addAudit` gets every existing
call site covered for free and automatically covers any future `addAudit` call too, matching
the plan's own framing of the file scope as "commit-пути" (commit paths) rather than "every
handler." A 150-site edit would have been a much larger diff for identical behavior.

**Decision: `locality` defaults to `"local"` for every receipt.**
Why: every currently-implemented mutation path in LifeOS is genuinely local-only or an
honest permission-gated stub (Ollama is a local daemon; no BYOK/cloud call exists yet) — so
`"local"` is the accurate label today, not an assumption. Flagged here so P5.2
BYOK_VAULT_ROUTING (when a real external-provider call lands) must pass an explicit
`locality: "provider:<name>"` at that call site rather than silently inheriting the default,
which would misrepresent a cloud call as local.

**Decision: `publish` and `share` mutation kinds have a classification rule but no
matching call site yet (no `.publish`/`.share` audit type exists in app.js today).**
Why: the plan requires all 14 kinds to be classifiable, not that all 14 must already have
fired at least once — publish/share aren't implemented as product features yet (no
current package covers them). Documented instead of faking a call site to make the matrix
look more complete than the product actually is.

**Verified no regression:** full audit loop (only red = expected dirty tree), G-SMOKE,
extended `audit:seven-contracts`, G-E2E-CORE (13 passed/1 skipped) green. Rebuilt
public-demo (app.js changed).

## P1.3 CAPABILITY_LOCALITY

**Decision: wired `ensureCapabilityGrant()` into `recordProviderRun()` (one choke point)
instead of each `probe-ollama`/`test-ollama-generation`/etc. action handler.**
Why: same reasoning as P1.2's receipt wiring — `recordProviderRun(state, providerId, kind,
status, summary, details)` is already the single function every provider action calls
(probe, test-generation, model-select, and any future provider), so checking/creating the
grant there covers all of them for free and automatically covers new provider actions later.

**Decision: grants auto-create on first use with `approval: "explicit-user-action"` rather
than blocking the action behind a new confirmation UI.**
Why: every provider action that reaches `recordProviderRun` already required the user to
click a button and, for probe/generation, confirm a `window.confirm` dialog first — that
click **is** the explicit approval event per the architecture invariant "provider actions are
explicit and never fake readiness". Recording that fact in the grant (with a receipt via the
existing `capability.grant` → permission-change classification from P1.2) is honest audit
trail, not a second approval gate for the same click. A real blocking-approval flow (grant
requested but not yet approved) is a bigger feature with its own UI — not scoped here.

**Decision: `budget` defaults to `{ limit: 0, spent: 0, unit: "unmetered-local" }` for every
grant.** Why: identical reasoning to P1.2's locality default — no metered/costed provider path
exists yet (Ollama is a free local daemon), so claiming a computed budget would be fake
precision. P5.2 BYOK_VAULT_ROUTING must set a real budget when wiring paid external models.

**Added a Control surface section** (`ui/control.js`: `capability-list`/`capability-row`,
a `revoke-capability` action) so grants are owner-visible and revocable, not just internal
state — matches the plan's "секция в Контроле" requirement and the project's rule that every
interactive element needs a `data-testid`.

**Verified no regression:** full audit loop (only red = expected dirty tree), G-SMOKE,
`audit:architecture`, `audit:no-label-theater-hard`, extended `audit:seven-contracts`,
G-E2E-CORE (13 passed/1 skipped) all green. Rebuilt public-demo.

## P2.1 RENDERER_REGISTRY

**Discovery: Design Studio (`renderDesignStudio`, the exact surface this package needed to
extend) was completely unreachable in the live product** — wired into `ui/shell.js`'s
dispatcher (`case "design"`) and already present in `ui/shell.js`'s own `secondaryNav` list,
but I initially edited the wrong, dead list (`secondaryOwnerSurfaces()` in app.js, part of
old `renderHomeQuickRibbon`/`renderHumanNavRail` which the live shell doesn't call at all —
reverted that edit once I found the real one). No fix was actually needed: `design` was
already in `ui/shell.js`'s live `secondaryNav`, just not something I'd exercised yet. Logged
here because it cost real time and is worth remembering: **app.js still contains a second,
fully dead copy of nav/surface-list logic from before the chat-first shell rewrite** —
same root cause as the P0.2 discovery, just a different corner of it. Don't trust app.js
nav-related functions without confirming ui/shell.js actually calls them.

**Found and fixed a real rendering bug via manual browser verification, not just gates:**
the `table-row` renderer mode produced 0 visible rows in the M0 proof grid even though the
function ran without error — bare `<tr>` markup assigned via `innerHTML` outside a
`<table>` is silently dropped by the HTML parser (a well-known gotcha). None of the
automated gates (G-SMOKE, G-ARCH, G-E2E-CORE) caught this since they don't inspect DOM
child counts inside Design Studio specifically. Caught by opening the actual surface in a
browser and counting rendered `data-testid` elements per mode (3/3/**0**/3), per CLAUDE.md's
rule to actually exercise UI changes in a browser, not just trust green tests. Fixed by
wrapping the `table-row` preview in `<table><tbody>` (and `timeline` in `<ul>` for
correctness, though that one worked either way).

**Decision: `presentArtifact()` is a single generic projection (title/summary/status/
createdAt/updatedAt) used by all 4 renderer functions, rather than per-type templates.**
Why: the plan's M0 proof is about demonstrating the *registry* mechanism (any type -> any
of 4 modes) works end-to-end on 3 concrete types, not about bespoke visual design per type
- that's Design Studio's whole pitch ("data and presentation are separate; you can change
render modes without a data migration"). Bespoke per-type card designs are a legitimate
follow-up, not part of proving the registry itself works.

**Decision: `import_receipt`'s M0 source is `installedPacks`, not `sources`.** Why: the
plan says "from installedPacks/sources" (either), and `installedPacks`' own
`ARTIFACT_COLLECTIONS` projection is already literally `"local package receipt"` - the
closest honest match, vs. treating arbitrary `sources` records (files/audio/screens) as
a fake "receipt".

**Verified end-to-end in a real browser (not just gates):** navigated to Design Studio,
confirmed all 12 previews (3 types × 4 modes) render with real seeded data for `note` and
honest "Нет данных" empty states for `agent_report`/`import_receipt` (this fresh vault has
no agent runs or installed packs yet - not faked). Saved a ViewPreset (timeline/compact),
reloaded the page fully, and confirmed it round-tripped through IndexedDB, not just DOM
state. Full audit loop (only red = expected dirty tree), G-ARCH (`audit:architecture`,
`audit:workspace-links`, `audit:workspace-shape`), G-PUBLIC (`audit:public-build`),
G-E2E-CORE (13 passed/1 skipped) all green. Rebuilt public-demo.

## P2.2 ARTIFACT_INSPECTOR_UNIVERSAL

**Reused `graphNodeObject(state, id)` (already used internally by Graph focus and Control
archive/restore) instead of building a second any-collection-lookup mechanism.** It already
returns `{kind, object}` for any of the ~41 typed collections. Combined with P1.1's Object
Contract guaranteeing every record already carries `.type` (the real `ownerType`, not the
lookup's own `kind` shorthand), `presentArtifact(record, record.type)` from P2.1 works
directly on the raw record with no new mapping layer needed - P1.1/P2.1 make P2.2
meaningfully smaller than it would have been standalone.

**Extended the existing `ctx.selectedGraph` (buildNewShellContext) with `record` and a
receipts trail, rather than adding a separate `ctx.inspector*` context tree.** Why: this
object was already "the currently focused artifact of any kind" used by Graph and Control's
archive/restore - the inspector is exactly the same concept with more fields shown, not a
different one. One `state.control.inspectorRenderer` field (default "card") plus a
`set-inspector-renderer` action was the only new state needed for the renderer switch.

**Found and fixed the (pre-existing, but only I) `ui/components/InspectorDrawer.js` file
was dead code with a different, incompatible signature** (`renderInspectorDrawer(title,
rows, actions)`, testid `workspace-inspector`, never imported anywhere) - confirmed via
grep that nothing called it, then replaced it outright with the real universal-inspector
implementation the plan asked for, rather than adding a second file.

**Embedded the same `renderInspectorDrawer(ctx)` call in both Graph and Control** (not a
route/drawer overlay) - this is what makes "any object opened from Feed/search/Control
reaches the same inspector" true: those surfaces already route through
`focus-graph-node`/`open-graph-node` → `state.graphView.selectedNodeId`, which both
Graph's and Control's copy of the inspector already read from the same `ctx.selectedGraph`.
No new routing was needed, only reusing the existing one.

**"health" integration named in the plan's P2.2 wording is honestly NOT done** - the Health
Registry panel is P9.1 HEALTH_REGISTRY_PANEL, not built yet, so there is nothing real to
connect the inspector to. Documented in the new e2e spec's header comment and here rather
than faking a connection or silently dropping the requirement.

**Found and fixed a real mobile horizontal-overflow regression via manual + e2e testing,
not caught by any other gate.** Adding the fully-populated inspector drawer (16 contract
field rows + a 4-button renderer switch) into Control's existing `.control-actions` grid
cell pushed `kb-smoke.spec.mjs`'s mobile overflow check from passing to failing by ~9px -
confirmed by binary-search removal of the drawer in a live browser at 390px width before
touching CSS. Root cause wasn't one single element blowing out (no single node's own width
was dramatically large) but the drawer having zero CSS at all, so its flex-free
field-row/button-row layout wasn't guaranteed to wrap. Fixed with explicit `min-width: 0`,
`flex-wrap: wrap`, `overflow-wrap: anywhere` and a scrollable fallback for the (currently
unused-by-default) `<table>` preview - same defensive pattern as P0.2's `.control-human-layout`
fix, extended to the new component rather than only patched at the one call site that
happened to fail.

**Verified end-to-end:** ran the new `presentation-runtime.spec.mjs` (M0 3×4 matrix,
ViewPreset persistence, graph search → inspector, renderer-switch live-swap, feed → graph →
inspector, control embeds the same inspector, export/rollback buttons present) plus the full
G-E2E-CORE + kb-smoke suite together (17 tests, 16 passed/1 skipped) after the CSS fix, and
manually confirmed `scrollWidth === clientWidth` at 390px on the Control surface with the
drawer populated. Full audit loop (only red = expected dirty tree) stayed green. Rebuilt
public-demo.

## P3.1 SYSTEM_FIELDS_TYPED

**Found `systemDefinitions.entities` was just an array of bare name strings (no field
typing at all) and `systemRecords` had zero creation code anywhere** - the collection
existed in the architecture contract and normalizeState but nothing ever wrote to it. This
is a bigger gap than the plan's wording implied ("сущности с типизированными полями"
undersold that the whole record-creation path didn't exist), same discovery pattern as
P0.2. Built both: typed entities (`normalizeSystemEntity`/`normalizeSystemField` in
artifact-os-architecture.mjs, migrating legacy string entities automatically and
idempotently) and `createSystemRecord()`/`addSystemEntityField()` in app.js.

**Found and fixed a real bug via e2e testing, not caught by manual code review:** the
Builder's per-field DOM ids were generated by slugifying the field/entity *name*
(`name.replace(/[^a-zA-Z0-9]+/g, "-")`). Since entity/field names are free-form and often
entirely Cyrillic (e.g. "Приоритет", "Сумма"), that regex collapses ANY all-non-ASCII name
to the identical single "-" - so two different fields (or two different entities' whole
record forms) silently got the *same* DOM id, and `document.querySelector` always resolved
to the first match regardless of which field/form was actually being read. Caught by
writing a real e2e test (add two Cyrillic-named fields, fill both, submit) instead of
trusting the code by inspection - the record silently saved the wrong field's value
instead of erroring, which manual code review would very likely have missed. Fixed by
switching all Builder record-form ids to position-index-based (`entityIndex-fieldIndex`),
which is unique regardless of what script the name is written in, and threading the entity
index through as the button's `data-id` so the submit handler knows which form fired.

**Decision: Builder always operates on one "focused" system at a time** (via
`ctx.selectedGraph`, falling back to the most recent system), rendering that system's
entities/fields/records inline, rather than a single shared cross-system dynamic form.
Why: the server-rendered-per-commit architecture (whole page re-renders on every action,
no client-side reactive re-render on `<select>` change) means a single "pick any
entity, then see its fields" form isn't buildable without a real onchange handler; showing
one static form per entity of the currently-focused system sidesteps that entirely using
only the existing render-per-commit model.

**Verified end-to-end** with a disposable Playwright test (not committed - P3.2 owns the
plan's official "e2e-кейс системы"): added a `select` field and a required `number` field
to an entity via Builder, confirmed record creation is blocked with the required field
empty, then confirmed it succeeds with correct typed values (`Сумма: 500` as a number, not
a string) once filled - including a full Object Contract v4 pass on the new record for
free. Full audit loop (only red = expected dirty tree), G-SMOKE, `audit:architecture`,
G-E2E-CORE (13 passed/1 skipped) all green. Rebuilt public-demo.

## P3.2 SYSTEM_VIEWS_ACTIONS

**Decision: reused P2.1's ViewPreset mechanism (`state.designStudio.viewPresets`) keyed by
`"system:" + systemId` for the list/table/card switch, instead of a new dedicated field.**
Why: it's already exactly "a renderer choice associated with an arbitrary key", which is
what a per-system view preference is - a second parallel mechanism would just be
duplicated state for the same concept.

**Decision: "update" is implemented via sequential native `window.prompt()` calls (one per
field, reusing the existing `promptValue()` helper already used by `edit-task`/
`edit-reminder`/etc.), not a new inline-edit form.** Why: the server-rendered-per-commit
architecture has no client-side reactivity to pop open an edit form pre-filled with a
specific record's current values without a page-state toggle per record; `promptValue()`
is this codebase's established, working pattern for exactly this kind of quick field edit,
and matching it keeps the diff small.

**Decision: "state-change" reuses the Object Contract v4 `lifecycleState` field
(active/archived) already on every record**, rather than inventing a new system-specific
status concept. A generic toggle action was cheaper and more consistent than adding a
second parallel state model on top of the one P1.1 already guarantees exists.

**Found and fixed a real update-validation edge case via e2e testing**: `updateSystemRecord`
validates the *merged* field set atomically - correct behavior (no partial saves), but it
means editing just the title while a required field's prompt gets cancelled/dismissed
silently rejects the *entire* update, including the title, with no visible reason beyond
`commandMessage`. The first version of the e2e test only supplied an answer for the first
prompt and silently failed to see the title change, which is exactly this behavior working
as designed - fixed the test (answer every prompt), not the product code, since rejecting
an invalid merged record is the intended contract-honoring behavior.

**Verified end-to-end** with a new permanent spec, `output/playwright/system-factory.spec.mjs`
(replaces the disposable P3.1 test): typed date field -> record creation -> table view
default -> switch to card view (table disappears, card renderer appears) -> edit via
prompt chain -> state-change toggle -> the date value appears in both Today's and
Calendar's new system-schedule sections without becoming a task. Full audit loop (only red
= expected dirty tree) and G-E2E-CORE + the new spec together (14 passed/1 skipped) green.
Rebuilt public-demo.

## P3.3 SYSTEM_TRIGGERS_LITE

**Decision: every trigger fires through the exact same dry-run-proposal pipeline as the
existing manual "flow dry-run" feature (`runFlowBuilderDryRun`), not a new apply path.**
Why: the plan explicitly requires "сперва dry-run, apply после подтверждения" - the
proposal-apply system (open/apply/dismiss, already fully built) already IS that
confirmation gate. Building a second confirm-then-apply mechanism for triggers would
duplicate the one that already exists and is already tested.

**Decision: on-field-change detection compares old vs. new field values as strings after
validation**, in `updateSystemRecord`, rather than trusting which keys the caller passed in
`rawValues`. Why: the Builder's edit flow (native prompts) always re-supplies every field
whether or not the owner actually changed it, so "was a key present in rawValues" would
fire the trigger on every edit regardless of whether anything changed - comparing resolved
values is what "on-field-change" actually means.

**Decision: daily triggers are evaluated inside `normalizeState`** (guarded by a
`lastFiredDay` string compared to `todayKey()`, so it only actually creates a proposal once
per system+trigger+calendar day no matter how many times normalizeState runs that day).
Why: this app has no background scheduler/cron - normalizeState already runs on every load
and every commit, so it's the only hook that reliably observes a day boundary during
normal use. The result is still an ordinary, visible proposal requiring owner confirmation,
not a hidden action - matches the "explicit and never hidden" architecture invariant even
though it fires without an explicit user click.

**Found and documented a pre-existing gap while building this, not something P3.3 caused:**
`state.proposals` (and the flowRuns/proposals created by both the old manual flow dry-run
and now by triggers) are not rendered anywhere in the live chat-first shell - the
`proposal-panel`/`apply-proposal` UI only exists in app.js's dead `renderCaptureCockpit`
functions. `apply-proposal` the *action* still works fine; there's just no visible way to
see or click it yet. Out of scope for this package (Files list didn't include a proposal
UI); documented in BLOCKED.md as a good candidate for the Phase 4 Agents/Flows work, which
already touches this area.

**Verified end-to-end:** extended `system-factory.spec.mjs` with a second test - added an
on-create trigger via Builder, created a matching record, and confirmed via
`getStateSnapshot()` that a new proposal (status "open", `mutationMode: "proposal-only"`)
and flowRun appeared, while `state.tasks` stayed exactly unchanged - proving the trigger
truly only proposes, never mutates directly. New `tools/audit-system-factory.mjs` checks
the "completeness formula" (a demo entity with two typed fields correctly validates good
data and rejects bad data; a trigger normalizes correctly) plus static wiring checks. Full
audit loop (only red = expected dirty tree), G-E2E-CORE + both system-factory tests (15
passed/1 skipped) all green. Rebuilt public-demo.

## P4.1 FLOW_EXEC_REAL

**Decision: "execution" reuses the existing `applyProposal()` dispatcher (task/note/plan/
finance/etc, already exhaustive) applied to a flowRun's `proposalIds` in sequence, rather
than inventing new executable step types.** Why: applying a proposal already IS "a flow
step executing against the repository for real" (it calls the real `addTask`/
`addPlanBlock`/etc creation functions, which already write their own receipts via P1.2's
classifier) - the only genuinely new things P4.1 needed were: doing it as an explicit,
owner-triggered batch action per flowRun, isolating failures per step, and adding
budget/kill-switch gates in front of it.

**Found and fixed a real crash bug via e2e testing, not caught by manual review:**
`ReactiveStore.commit()` does NOT call `normalizeState()` on every commit - it clones the
current (already-normalized) state, runs the mutator, and renders immediately with that
raw result; `normalizeState()` only runs again later, asynchronously, inside `repo.save()`.
This meant a brand-new flow object created by `runFlowBuilderDryRun`/
`fireSystemTriggerDryRun` in the SAME commit that's about to render did NOT yet have the
`budget`/`killSwitch` fields I'd only added to normalizeState's migration loop - the very
first synchronous render after creating a flow crashed with "Cannot read properties of
undefined (reading 'used')", caught by the app's own repository-boundary error screen (not
a silent bug - the app's isolation actually worked as designed and stopped a crash from
propagating, but the feature itself was broken). Fixed by adding `budget`/`killSwitch`
directly to both flow-creation object literals, matching this codebase's established
pattern (every `add*`/`create*` function sets all of its own object's fields at creation
time rather than depending on a later normalize pass) - the normalizeState migration stays
as the correct safety net for old persisted flows only.

**Confirmed G-E2E-J's one failing case (J15, Ollama probe expecting `models_found`) is
pre-existing and environmental, not caused by this package**: verified by `git stash`-ing
all P4.1 changes and re-running - it fails identically on the untouched P3.3 baseline
(this machine has no local Ollama daemon running with models loaded). P5.1
OLLAMA_LIVE is the package that actually addresses this gate's real coverage.

**Verified end-to-end** with a new `output/playwright/flow-execution.spec.mjs`: run a flow
dry-run -> execute it for real (task count increases, `flow.budget.used` becomes 1,
`flowRun.health` is "alive") -> flip the kill switch -> a second dry-run+execute attempt on
the same flow creates no new task (blocked, not silently ignored) -> confirmed the rest of
the app (Today surface) stays fully usable afterward, proving a blocked/failed flow never
takes down the product. Full audit loop (only red = expected dirty tree), G-E2E-CORE +
system-factory + flow-execution together (16 passed/1 skipped) all green. Rebuilt
public-demo.

## P4.2 AGENT_GUARDED_RUNS

**Decision: agent runs reuse the exact same isolated-batch-apply pattern as
`executeFlowRun` (P4.1)**, applied to `runLocalAgent`'s own proposals via a new
`approveAgentRun()`. Why: this is the same shape of problem (a preview that spawned N
proposals, now needs a guarded batch-apply with per-step isolation) - a second bespoke
implementation would just be a copy of P4.1 with different naming.

**Decision: capability check reuses P1.3's exact mechanism** (`ensureCapabilityGrant(state,
"agent", "run", ...)` on preview, `findActiveCapability(state, "agent", "run")` gating
`approveAgentRun`), not a new agent-specific permission concept. Same resource+action+
scope+locality+approval+budget shape as provider grants; the click that starts the agent
preview is the explicit-user-action approval, same reasoning as P1.3's provider grants.

**Decision: "report = agent_report_artifact" needed no new code** - an agentRun record
already gets `type: "agent-run"` from P1.1's Object Contract and is already one of P2.1's
three M0-proven renderer types (labeled "agent_report" there). Approving a run just adds
real outcome data (`stepResults`, `health`) to the same record Object Contract/renderer
registry/inspector already treat as a first-class artifact - nothing new to wire for the
"report" half of this package.

**Renamed the agentRun status `"dry-run"` to `"preview"`** to match the plan's own
vocabulary ("preview → approve → apply") and distinguish it from `"applied"`; kept the
exact UI strings ("черновой прогон", "Требуется Принять") pre-existing e2e specs
(`final-journeys`, `owner-rescue`, `market-owner`, `kb-smoke`) already assert on, shown
conditionally only while `status !== "applied"`.

**Hit the same normalizeState-timing gotcha as P4.1 ([[lifeos-normalize-state-gotcha]]),
this time in a test rather than product code**: the new e2e test read `run.type` (an
Object Contract v4 field) immediately after clicking "Проверить агента", before the async
save/normalize pass had completed - `commit()` renders with the raw pre-normalize state
first. Fixed the *test* (added `flushForTest()` before asserting on contract fields), not
the product: `runLocalAgent`'s own object literal already needs no Object Contract fields
set directly, since those are guaranteed by the existing generic `applyObjectContractToState`
pass in normalizeState (unlike P4.1's `budget`/`killSwitch`, which had no other source of
truth and had to be read synchronously by the very next render).

**Verified end-to-end** with a new `output/playwright/agent-guarded-runs.spec.mjs`: preview
creates proposals but does not touch tasks/planBlocks yet; a capability grant
(resource=agent, action=run, locality=local) exists; approving applies both proposals for
real (tasks/planBlocks counts increase) and the run becomes `status: "applied"`,
`health: "alive"`. Full audit loop (only red = expected dirty tree), extended
`audit:seven-contracts`, G-E2E-CORE + kb-smoke + the new spec together (16 passed/1
skipped) all green. Rebuilt public-demo.

## P5.1 OLLAMA_LIVE

**Discovery: chat never actually called Ollama at all, even when connected and tested** -
`buildLocalChatAnswer` is a pure rule-based intent matcher; the "generation_ok" status was
only ever used to display a label, never to route an actual `/api/generate` call. This is
exactly the gap the plan names ("полный локальный путь чата... при доступном демоне").

**Decision: the live path only ever fires when `state.ollama.status === "generation_ok"`
AND a model is selected** - i.e. only after the owner has *both* explicitly probed the
endpoint *and* explicitly run the generation test button (two separate confirms already in
place). Never attempted speculatively just because an endpoint string exists. On any
failure (network error, non-200, empty response) it falls back to the existing
`buildLocalChatAnswer` silently and honestly - no error shown to the user as if it were a
model answer, no fake success.

**Decision: reused `recordProviderRun()` verbatim for the receipt** (kind: "chat"), which
already gives capability-grant-checking (P1.3) and receipt/audit writing (P1.2, "provider.run"
already matches the model-call strong-mutation rule) for free - no new receipt-writing code
needed, just a new call site with `providerId: "ollama", kind: "chat"`.

**Decision: citations are the actual notes `searchNotes()` matched and fed into the
prompt**, not anything the model claims - `buildOllamaChatPrompt` includes their titles/
bodies in the prompt text itself, and the citation line appended to the answer lists those
exact same notes' titles. This makes "citations" a property of what was actually given to
the model, not an unverifiable claim about what it used.

**Async network work moved outside `store.commit`'s mutator** (matching the existing
`probe-ollama`/`test-ollama-generation` pattern): the `fetch()` call happens before
`store.commit`, and only the already-resolved answer/citations/model/latency are passed
into the synchronous mutator - `commit()`'s mutator must stay synchronous (see
[[lifeos-normalize-state-gotcha]] for why timing inside commit matters generally).

**Verified end-to-end** with a new `output/playwright/ollama-live-chat.spec.mjs` that mocks
the Ollama daemon over the network (`page.route` on `/api/tags` and `/api/generate` - this
machine has no real Ollama install, same technique the plan itself calls for at P5.2's
gate): probe -> test generation -> send a chat message -> the mocked model's exact text
appears in the answer with a citation line, a `providerRuns` entry with `kind: "chat"` and
the right model exists, and a `control.receipts` entry with `kind: "model-call"` and
`locality: "local"` was written. Then broke the mocked endpoint (500 response) and
confirmed chat still answers coherently through the honest fallback, never crashing or
echoing a stale/fake model response. Confirmed (already known from P4.1) that
`e2e:ai-providers`'s J15 failure is pre-existing/environmental (no real daemon on this
dev machine), not something this package could fix without one. Full audit loop (only red
= expected dirty tree), G-E2E-CORE + the new spec together (14 passed/1 skipped) green.
Rebuilt public-demo.

## P5.2 BYOK_VAULT_ROUTING

**Decision: the vault (`state.control.byokVault`) is a separate collection from
`modelProfiles`, specifically so it can be redacted from export independently.** A model
profile (routing policy, budget, endpoint) is safe to export - it's configuration, not a
secret. Keeping the actual key value in its own collection meant `buildVaultExportPayload`
only needed one targeted change (`byokVault: {}` alongside the existing `rollbackSnapshots: []`
redaction, same established pattern) rather than having to strip fields out of every
individual modelProfile record.

**Found and fixed a real, load-bearing gap in the receipt pipeline while implementing "per-
call locality receipt": `addAudit`/`addReceipt` always wrote `locality: "local"`** -
`addReceipt`'s caller inside `addAudit` never passed a locality option at all, so *every*
receipt in the entire app, regardless of what actually happened, was hardcoded local. This
was invisible until now because nothing had ever needed to claim otherwise (Ollama is
genuinely local). Fixed by adding an optional `options` parameter to `addAudit()` that
flows through to `addReceipt()`, and having `recordProviderRun()` pass through
`details.locality` when the caller specifies one (defaulting to "local" otherwise, so every
other existing call site is unaffected). This is the one path in the whole app that can
honestly say `locality: "cloud:<route>"` instead of "local".

**Decision: the capability grant itself (`ensureCapabilityGrant`) stays coarse-grained
(one grant per resource+action, first-locality-wins)**, while the *receipt* is now the
fine-grained per-call record of actual locality. Not a bug: P1.3's grant answers "is this
kind of action allowed at all," the receipt answers "what actually happened this specific
time" - conflating them would mean a single grant creation event would need to somehow
predict every future call's locality, which isn't the grant's job.

**Decision: cloud calls are gated behind an explicit `window.confirm()` naming the exact
endpoint**, in addition to needing an active BYOK key - two independent gates (confirm +
key present), matching the plan's "cloud только с явным подтверждением." A budget check
(`used >= limit`) blocks the call entirely before either gate, so a runaway budget can't
even prompt for confirmation.

**Verified end-to-end** with a new `output/playwright/byok-vault-routing.spec.mjs` using a
synthetic fixture key (`sk-test-fake-...`, never a real credential) and a fully mocked
network endpoint (no real cloud provider contacted): added a cloud-gated model route,
stored the fake key, confirmed it's masked in every rendered location (including a
whole-page text scan for the raw value), confirmed the call requires the confirm dialog and
writes a `model-call` receipt with `locality` starting `"cloud:"`, and - via real Playwright
download interception on the actual "Экспорт всего" button - confirmed the downloaded
export JSON contains neither the raw key string anywhere nor any entries under
`control.byokVault`. Full audit loop (only red = expected dirty tree),
`audit:no-label-theater-hard`, G-E2E-CORE + byok + ollama-live specs together (15 passed/1
skipped) all green. Rebuilt public-demo.

## P5.3 AI_MEMORY_GATE

**Investigated whether P5.1/P5.2's new AI code paths (`generateOllamaChatAnswer`,
`callModelRoute`) violate "AI writes only via proposals" - they don't.** Both are pure
fetch wrappers that return `{text, latencyMs}`; the only place their result is consumed is
`addChatMessage` (a visible, immediate chat reply - not a silent memory/graph write) and
`recordProviderRun` (a receipt). Neither ever touches `state.notes`/`claims`/`insights` or
calls `applyProposal`. `chatMessageToProposal` (the only path from a chat message, AI-
generated or not, toward becoming a task/note) only ever calls `addProposal` - it was
already correctly gated before this package; P5.3's job was proving and locking that in,
not fixing a violation.

**Decision: extended `tools/audit-seven-contracts.mjs` with a static-analysis check**
(`extractFunctionBody` - a small brace-counting helper, not a full parser, but sufficient
for this codebase's function-per-declaration style) that greps the *body* of
`generateOllamaChatAnswer`/`callModelRoute`/`chatMessageToProposal` for forbidden patterns
(`state.notes[`, `state.claims[`, `state.insights[`, `addGraphEdge(`, `applyProposal(`).
Why a static check in addition to the e2e test: this makes the invariant self-enforcing for
*future* AI code paths too - if someone later adds a new AI-calling function and it
accidentally writes memory directly, this audit fails immediately rather than relying on
someone remembering to write a new e2e case for it.

**Found (not caused by this package) that the legacy `apply-proposal`/`proposal-panel` UI
lives only inside `owner-rescue.spec.mjs`'s already-`test.skip()`-ed legacy test** -
confirming the BLOCKED.md note from P3.3 (proposals have no live UI to apply them from) is
accurate and durable. That skipped test also still asserts `agentRuns` status `"dry-run"`,
which P4.2 renamed to `"preview"` - harmless since the test never runs, but noted here so a
future un-skip doesn't get a confusing failure blamed on the wrong package.

**Verified end-to-end** with a new `output/playwright/ai-memory-gate.spec.mjs`: mocked a
live Ollama answer, confirmed sending it does not change `notes`/`claims`/`insights`/`tasks`
counts at all, then used the one proposal-creation path that *is* live
(`chat-to-proposal`) and confirmed it produces only an open proposal
(`mutationMode: "proposal-only"`) with tasks/notes still unchanged - never attempting to
click a live "apply" button, since none exists yet (out of scope here, tracked separately).
Full audit loop (only red = expected dirty tree), extended `audit:seven-contracts`,
G-E2E-CORE + the new spec (14 passed/1 skipped) all green. Rebuilt public-demo.

## P6.1 PDF_EPUB_LOCAL

**Discovery: pdfjs-dist and fflate were installed in P0.5 but genuinely never imported
anywhere in app.js** - every PDF/EPUB source has always shown "parser-required" with no
code path that could ever change that, and fflate's role for the storage-compression
fallback was also never actually wired (that fallback just returns uncompressed JSON -
out of scope for this package, it's a different concern, noted but not touched).

**Decision: `server.mjs` already serves any file under the repo root** (it has no
path allowlist beyond preventing traversal out of root), so `import("./node_modules/
pdfjs-dist/build/pdf.mjs")` and the fflate equivalent work directly as dynamic imports
with zero server changes - confirmed by curling both paths for a real 200 before writing
any parsing code.

**Found and fixed a real bug via e2e testing: fflate's default `esm/index.mjs` imports
`node:module` (`createRequire`) at the top level**, which no browser can resolve
("Failed to resolve module specifier 'module'") - this only surfaced once EPUB parsing
was actually exercised in a real browser, not from reading the code. fflate ships a
dedicated `esm/browser.js` build with the identical `unzipSync`/`strFromU8` API and no
Node-only imports; switched to that.

**Decision: PDF parsing caps at 60 pages** (`Math.min(doc.numPages, 60)`) - an honest
bound so a very large PDF degrades to "read the first N pages" rather than hanging
indefinitely or exhausting memory; still real extraction, not a fake truncated summary.

**Decision: parse failures are recorded on the source itself** (`source.parserError`,
surfaced in the Reader UI as "ошибка парсера: <message>") and audited under
`source.extract.failed` (deliberately NOT matching any Receipt-classifying suffix, since a
failed attempt didn't actually change anything worth receipting) - `parserStatus` stays
gated, `text` stays empty. Verified this concretely: a hand-crafted PDF fixture with no
valid page/content structure genuinely fails pdf.js parsing and the UI shows the honest
error, never a fabricated "text-ready".

**Noted, not changed: `tools/build-public.mjs` does not copy `node_modules`** into the
GitHub Pages public-demo build, so the dynamic import 404s there and this feature
gracefully falls back to the pre-existing honest gate in that specific deployment target
only. The real product (local/daemon/LAN server modes via `server.mjs`, where
`node_modules` is present) gets full parsing. Copying `node_modules` into the public demo
would bloat a "clean static preview" build for a capability that preview isn't meant to
demonstrate; not worth the tradeoff.

**Verified end-to-end** with a new `output/playwright/pdf-epub-local.spec.mjs`, generating
real fixture files (a hand-built minimal-but-valid single-page PDF, and a real EPUB - zip
container with container.xml/OPF/spine/chapter built via fflate itself, both containing
distinctive text): uploaded each, clicked "Извлечь текст", confirmed the extracted text
matches exactly and `parserStatus` becomes `text-ready`; then uploaded a deliberately
invalid PDF and confirmed the failure path shows the honest error with `text` staying
empty. Full audit loop (only red = expected dirty tree), `e2e:reader-player` (H09),
G-E2E-CORE + kb-smoke + the new spec together (16 passed/1 skipped) all green. Rebuilt
public-demo.

## P6.2 IMPORT_PIPELINE_RECEIPTS

**Decision: dedup uses a real SHA-256 checksum (`crypto.subtle.digest`) of the imported
text/dataUrl, not name/size/mtime heuristics.** Why: name/size matching is exactly the
kind of "looks honest but isn't" shortcut this project's audits exist to catch - two files
with different names and the same content are real duplicates; two files that happen to
share a name/size aren't necessarily. A duplicate is never silently dropped or silently
auto-merged - it's stored, flagged `status: "duplicate-review"`, and surfaced in a new
Control "Дубликаты на рассмотрении" list requiring an explicit owner decision (merge or
keep both).

**Decision: the "import_receipt_artifact" is `recordProviderRun(state, "import", ...)`
with rich `details` (checksum, sourceId, duplicateOfSourceId), not a new top-level
collection.** Why: `providerRuns` already has exactly the shape needed (a generic
`details` object, already Object-Contract/receipt/capability-covered since P1-P2) -
adding a 48th collection would mean updating every audit that counts collections (47),
for a distinction (`import_receipt` vs `providerRun`) that's naming, not substance.

**Decision: chunked background import is a new, explicit "Импорт по строкам" action on
the universal capture input**, not a size-triggered change to existing single-file import
behavior. Why: a size/line-count heuristic on file import risked silently changing
behavior for a legitimate large prose document (many paragraphs, one per line) by
misreading it as "bulk items" - an explicit, separate action avoids guessing intent.
10 lines processed per commit, with a 30ms yield between chunks specifically so a
separate "Отмена" click (its own commit) gets a real chance to interleave and take effect
before the next chunk starts - proven by the e2e test actually cancelling mid-job, not
just after it happened to finish.

**Found a real receipt-coverage gap while wiring this up**: `STRONG_MUTATION_RULES`'
"merge" kind previously only matched `ghost.materialize` - a duplicate-resolution decision
(`source.merge`/`source.merge.dismissed`) wouldn't have been classified as anything and
would have gotten no receipt at all. Extended the rule's test to also match
`source.merge` so merge/keep-both decisions are receipted like every other strong
mutation.

**Found and diagnosed a test-only issue, not a product bug** (see
[[lifeos-normalize-state-gotcha]], now expanded): the bulk-import job appeared completely
stuck at 0 progress for 10+ seconds. Root cause: `store.commit()`'s promise only resolves
once the IndexedDB save actually completes, and saves serialize through one write queue -
several rapid prior actions (two file uploads + a merge decision) had queued up saves the
bulk-import commit was waiting behind, even though the UI had already re-rendered the new
job (the synchronous `emit()` inside `commit()` fires before the save). Confirmed via
temporary debug logging (and remembering to filter for it - the console listener was
initially only forwarding `type() === "error"`, hiding the plain `console.log` traces that
would have shown this immediately). Fixed the test with a `flushForTest()` call before the
bulk-import section, not the product.

**Verified end-to-end** with a new `output/playwright/import-pipeline.spec.mjs`: uploaded
two files with identical content under different names, confirmed a merge-review entry
appears with a real checksum-bearing import receipt, resolved it via "Объединить" and
confirmed the duplicate is soft-deleted; then pasted 300 lines, started the chunked
import, waited for real progress (not zero), cancelled it, and confirmed notes were
created for only part of the input (`0 < processed < total`) with `job.status ===
"cancelled"` - proving chunking and cancellation are both real, not simulated. Full audit
loop (only red = expected dirty tree), `audit:ledger`, G-E2E-CORE + kb-smoke + the new
spec together (16 passed/1 skipped) all green. Rebuilt public-demo.

## P6.3 ICS_EML_FILE_IMPORT

**Decision: both parsers are plain regex/line-based, no XML/MIME library** - .ics's
line-folding (RFC 5545: continuation lines start with a space/tab) and .eml's header
block are both simple enough to parse correctly with a small `unfoldIcsLines` helper
shared by both, rather than pulling in a calendar or mail-parsing dependency for a
narrowly-scoped file-only feature. Kept honest: unsupported constructs (recurring events,
multipart MIME attachments) are simply not extracted, not silently mis-parsed as
something else.

**Decision: parsed ICS day/time values are passed to the existing `addPlanBlock()` as
explicit `options.day`/`startTime`/`endTime`, confirmed to override `parseTaskSchedule`'s
own NLP date-guessing from the title text** (checked the source: `options.day ||
parseDateFromText(...)`) - so an event titled "Team sync" with a real DTSTART doesn't
accidentally get re-guessed from the word "sync" or similar. No changes needed to
`addPlanBlock` itself; this was purely confirming an existing precedence order.

**Decision: `.eml`'s parsed subject/from/date/body replaces the raw MIME dump as the
source's own `text`** (used by `createSourceNoteBody`), rather than keeping the raw email
untouched with parsed fields bolted on separately - a raw RFC822 dump with unparsed
`Content-Type`/boundary noise is not something an owner should have to read to find the
actual message.

**Decision: zero account/server access, by construction not just by policy** - both
parsers take only the `File` object's own text content (`file.text()`, already read
before any parser runs); there is no code path in either function that could reach a
mail/calendar server even accidentally, matching the plan's "без доступа к аккаунтам,
только файлы" requirement structurally, not just as a description.

**Verified end-to-end** with a new `output/playwright/ics-eml-import.spec.mjs`: a real
.ics file (VCALENDAR/VEVENT with DTSTART/DTEND/SUMMARY) produces a real planBlock with the
exact parsed day/start/end time and a receipt recording the event count; a real .eml file
produces a source whose note title and body reflect the parsed subject/body, not raw
headers. Full audit loop (only red = expected dirty tree), `e2e:calendar` (H08),
G-E2E-CORE + the new spec (14 passed/1 skipped) all green. Rebuilt public-demo.

## P6.4 OBSIDIAN_VAULT_BRIDGE

**Decision:** Implement the Obsidian bridge as scan -> preview -> explicit confirm/cancel,
mirroring the P6.2 merge-review pattern rather than importing on file-select. A folder
picker (`<input webkitdirectory multiple>`) reads every `.md` file via the File API only
(no filesystem access API, no account/server calls). `parseFrontmatter()` extracts YAML
`tags:` (both inline-array and list-item forms) and strips the frontmatter block from the
note body; wikilink count is a lightweight regex count (`[[...]]`), not a resolved link
graph, since full backlink resolution is out of scope for v1 (`docs/LIFEOS_V1_MASTER_BUILD_PLAN.md`
P6.4 explicitly stops at one-way sync). Vault name comes from `webkitRelativePath`'s first
path segment, falling back to "Obsidian vault" when unavailable (e.g. synthetic file
uploads without a real relative path).

**Found:** Confirming the import must go through `createRollbackSnapshot()` before creating
any notes (per gotcha #1, `budget`/`killSwitch`-style fields aren't the risk here — the risk
is committing 50-2000 notes with no undo path). Each imported note gets a new `obsidianPath`
field (the original relative path) so `buildObsidianExportFiles()` can round-trip notes back
to their original vault-relative paths on export, without inventing a new folder-mapping
scheme. Export builds a zip client-side via fflate's `esm/browser.js` build (same fix as
P6.1/P5.1 — the default `esm/index.mjs` imports `node:module` and breaks in-browser) and
triggers a real anchor-click download; no server round-trip.

**Verified end-to-end:** `output/playwright/obsidian-bridge.spec.mjs` writes two real `.md`
files (one with YAML frontmatter tags + a wikilink, one plain) into a real temp directory
and uploads it via `setInputFiles(dirPath)` against the real `webkitdirectory` input (in-memory
buffers are rejected by Playwright for `webkitdirectory` inputs, confirmed via a first failed
run - fixed by writing real files to a real temp dir). Scan preview shows the correct file/tag
count before any note exists; confirming creates exactly the right number of new notes with
the parsed tags and `obsidianPath` set, plus a rollback snapshot and a `source.import.obsidian`
receipt; the scan report clears after confirm. A second scan on a different folder is
cancelled and produces zero new notes. Export triggers a real `lifeos-obsidian-export.zip`
download. Full audit loop (only red = expected dirty tree), G-E2E-KB (`kb-smoke.spec.mjs`,
2 passed), G-E2E-CORE (13 passed/1 skipped) all green. Rebuilt public-demo.

## P6.5 SEMANTIC_SEARCH_GATED

**Decision:** Reuse the existing `state.ollama` provider passport rather than inventing a
separate embeddings-provider object - embeddings are just another capability of the same
local Ollama daemon, so `embeddingsStatus`/`embeddingsModel`/`lastEmbeddingsError` live
alongside the existing chat fields. Gating mirrors P5.1's chat pattern exactly: a real
`/api/embeddings` call only fires after the owner clicks "Тест эмбеддингов" (with a
`window.confirm`), and the semantic index is only built after that test reports
`embeddings_ok` - never spun up speculatively. The index itself
(`state.control.semanticIndex.vectors`) stores one real embedding per note, computed via
sequential `/api/embeddings` calls capped at 200 notes so a large vault can't hang the UI
on a single index-build click; per-note failures are skipped rather than aborting the whole
build (a bad note shouldn't block the rest of the vault from being searchable).

**Found:** Cosine similarity is computed for real (`cosineSimilarity()`, dot product over
vector norms) with a hard 0.15 floor - results below that are dropped rather than shown with
a low badge, because a fabricated-looking "12% match" is worse than not surfacing a result
at all (`Семантический поиск недоступен` is shown instead whenever the provider isn't
connected or the index is empty, never a silently-empty results list masquerading as "no
matches"). While building the e2e proof, a real product-adjacent test-authoring bug turned
up: `page.on("dialog", d => d.accept())` with no text silently no-ops LifeOS's `new-note`
prompt (`promptValue()` returns `""` and the action bails via `if (!title) return`), so all
of the test's later note edits were accidentally being applied to a pre-existing seeded
BYOK note instead of a new note - fixed by supplying the intended title to `dialog.accept()`
per `new-note` click (the same technique `kb-smoke.spec.mjs` already uses), not by changing
`new-note`'s behavior, which is correct as-is.

**Verified end-to-end:** `output/playwright/semantic-search.spec.mjs` proves, in order: (1)
semantic search is honestly unavailable before any embeddings work has happened; (2) a
mocked `/api/embeddings` 500 makes the embeddings test honestly fail
(`embeddingsStatus=provider_unavailable`), never faking success; (3) a working mock makes
the test genuinely pass; (4) two real notes on unrelated topics get indexed with mock
embeddings that diverge by topic; (5) building the index produces a real vector per note;
(6) querying "кофе" ranks the coffee note at 100% confidence and excludes the unrelated
mountain note by real cosine similarity, not a hardcoded result list. Full audit loop (only
red = expected dirty tree), G-E2E-CORE (13 passed/1 skipped), `kb-smoke.spec.mjs` (2
passed), `ollama-live-chat.spec.mjs` (still green, confirming the embeddings passport
addition didn't regress the existing chat passport) all green. Rebuilt public-demo.

## P7.1 TRASH_UNDO_GRACE

**Decision:** Rather than building a new soft-delete/restore mechanism, generalize what
already existed: `archiveSelectedControlObject()` + the per-kind `archive*()`/`restore*()`
pairs (notes, sources, tasks, reminders, habits, goals, plan blocks, and every
`V34_CONTROL_COLLECTIONS` kind) already flip a real `.deleted` flag with a real `updatedAt`
receipt. The legacy cockpit's `recoveryItems()` already aggregated all of that into one
list but was never wired into the live chat-first `ui/control.js` - only notes had a
Control-surface restore UI. Refactored `recoveryItems()` into `allTrashRows()` (full list,
sorted by `updatedAt` desc) with `recoveryItems()` now a thin `.slice(0, 12)` wrapper, so
both the legacy and live surfaces share one source of truth.

**Found:** "Undo the last commit" is implemented as "restore whichever trashed item has the
most recent `updatedAt`" (`undoLastTrashAction()`) rather than parsing `auditLog` entries by
type, because `addAudit()`'s `noteId` argument is the *owning* note for non-note kinds, not
the trashed object's own id - the audit log alone can't identify what to restore for e.g. a
trashed source or habit. The real per-collection `.deleted`/`updatedAt` state is the actual
source of truth for "what got deleted most recently," so building undo directly off
`allTrashRows()` is both simpler and more honest than reverse-engineering it from summary
strings. Grace expiry (`purgeExpiredTrashItems`, `TRASH_GRACE_DAYS=30`) runs inside
`normalizeState()` - the one place that already runs on every load/save - so a real hard
`delete state[collection][id]` happens automatically once 30 days have passed, with a single
summary audit entry (not one per item, to avoid audit-log spam on a large purge).

**Verified end-to-end:** `output/playwright/trash-undo-grace.spec.mjs` proves, on real
notes: (1) delete -> item appears in the unified Trash list with "30 дней" showing; (2)
"Отменить последнее удаление" restores it for real (`note.deleted === false`) and it leaves
the trash list; (3) a second note is restored via its own row's "Восстановить" button, not
just the "undo last" path; (4) a third note's "Удалить навсегда" makes it genuinely
unrecoverable (`state.notes[id] === undefined`); (5) a fourth note's timestamp is backdated
31 days via a new `backdateTrashItemForTest` test hook, and a real page reload (forcing
`normalizeState()` to run) hard-purges it for real, with the expected `control.trash.purge`
audit entry - no waiting 30 real days, no faked purge call. Full audit loop (only red =
expected dirty tree), G-E2E-CORE (13 passed/1 skipped), `kb-smoke.spec.mjs` (2 passed),
`audit:recovery-final` all green. Rebuilt public-demo.

## P7.2 EXPORT_ROUNDTRIP_PROOF

**Decision:** `importBackupFromInput()` already built a preview (a note + source summarizing
the file), explicitly because "Apply/merge is intentionally not silent" - but it never
actually restored anything, so there was no real roundtrip to prove. Rather than replace that
preview step, extended it: the parsed payload is now stashed in
`state.control.backupRestoreReport` alongside the existing preview note/source, and a new
explicit "Восстановить бэкап"/"Отменить" pair (mirroring the Obsidian scan-preview and
merge-review UI pattern already used twice this session) is the only path that actually
calls `applyBackupRestore()`. That function takes a `createRollbackSnapshot()` first, then
replaces the same `BACKUP_COLLECTION_KEYS` collections the export produces - never
`providers`/`environment`/`ollama`, which describe this device's runtime state, not vault
content that should round-trip.

**Found:** For "optional encrypted snapshot backup" (v34 §10.3), used AES-GCM with a
PBKDF2-SHA256-derived key (150k iterations) entirely via `SubtleCrypto` - no server, no new
dependency. An empty passphrase field keeps the existing plain-JSON export as the default
(never a silently-weakened "encryption"); a non-empty one produces a
`lifeosEncryptedBackup: true` envelope whose ciphertext contains no readable vault content.
Import detects that flag, prompts for a passphrase via `window.prompt`, and honestly rejects
(via the same `control.backup.reject` audit path already used for malformed JSON) on a wrong
passphrase or corrupted ciphertext - it never partially applies a backup it couldn't fully
decrypt/parse.

**Verified end-to-end:** `output/playwright/export-roundtrip.spec.mjs` proves three things
against real downloaded files (not mocked payloads): (1) a full vault export, followed by
`resetForTest()` to a genuinely empty vault, followed by importing that same file and
confirming the restore, brings back a note with byte-identical title and body - real
equivalence, not a summary match; (2) exporting the selected artifact from the inspector
downloads a file scoped to just that object; (3) an encrypted export's raw file contains no
trace of the note's title (proving it's actually encrypted, not just labeled so), a wrong
passphrase is rejected with a real `control.backup.reject` audit entry, and the correct
passphrase decrypts and restores the same note for real. Full audit loop (only red =
expected dirty tree), G-E2E-CORE (13 passed/1 skipped), `kb-smoke.spec.mjs` (2 passed) all
green. Rebuilt public-demo.

## P7.3 TWIN_RECOVERY_DRILL

**Decision:** `createPersonalTwinSnapshot()` previously only wrote a text summary ("47
notes / 12 sources / ...") into a linked note - genuinely honest about being "a local
summary artifact, not an external identity clone," but not an actual recovery mechanism, so
there was nothing for a "recovery drill" to prove. Rather than inventing a new snapshot
format, reused `buildRollbackStatePayload()` (the same whole-state clone `createRollbackSnapshot`
already uses) so a twin snapshot is now a genuine restore point, not just richer metadata.

**Found:** Naively embedding a full state clone inside every twin snapshot creates a real
compounding-size bug: snapshot N's payload contains a full copy of state, which itself
contains snapshot N-1 with *its* embedded payload, which contains snapshot N-2's payload,
and so on - each new snapshot would roughly double in size. Fixed by
`buildTwinSnapshotPayload()` stripping `.payload` from every *other* twin snapshot's entry
inside the embedded clone (keeping their title/summary/noteId metadata, since a restored
vault should still show its own snapshot history - just without further-nested recovery
data three levels removed from what anyone would actually restore). The new snapshot's own
metadata row is inserted into state *before* the payload is captured, so the embedded clone
correctly includes itself as a payload-less entry rather than needing special-case
exclusion logic.

**Verified end-to-end:** `output/playwright/twin-recovery-drill.spec.mjs` creates a real
note, takes a twin snapshot, confirms the snapshot's stored payload actually contains real
notes data (not just a summary string), then makes further changes (a second note -
standing in for "lost context" between the snapshot and now) and runs the actual recovery
drill: clicking "Восстановить контекст" brings back the first note and makes the second one
disappear, with a `twin.restore` audit entry as evidence. Full audit loop (only red =
expected dirty tree), G-E2E-CORE (13 passed/1 skipped), `kb-smoke.spec.mjs` (2 passed) all
green. Rebuilt public-demo.

## P8.1 PACK_MANIFEST_ENFORCE

**Decision:** `installMarketplacePack()` previously installed unconditionally - every pack
in `V34_MARKETPLACE_PACKS` was implicitly trusted just by being in the local registry array,
with no manifest shape enforced and no way to uninstall at all. Added a real Package
Contract: every pack manifest now declares `permissions`, `dataEffects`,
`uninstallSupported`, `rollbackSupported`, `trust`, and `compat.minSchemaVersion` alongside
the existing entities/fields/views/actions, and `validatePackManifest()` checks all of it
before `installMarketplacePack()` will proceed - an invalid manifest is rejected with a
`marketplace.install.reject` audit, never silently installed.

**Found:** Following the same scan→preview→confirm/cancel convention already used for
Obsidian import, merge review, and backup restore, added an explicit install-preview step
(`previewPackInstall`/`buildPackMigrationPreview`) rather than making "Установить локально"
install immediately - the plan specifically calls for "install preview includes migration
preview," and a one-click install couldn't show anything before committing. Uninstall
reused `createRollbackSnapshot()` (the same mechanism P7.1/P7.3 already lean on) rather than
inventing pack-specific undo logic, so "uninstall with rollback proven" is provable with the
existing rollback-restore path instead of new state-restore code.

**Verified end-to-end:** extended `tools/audit-seven-contracts.mjs` with a Package Contract
section (manifest field checks via `extractFunctionBody`, confirms `installMarketplacePack`
calls `validatePackManifest` and `uninstallMarketplacePack` calls `createRollbackSnapshot`
before mutating). `output/playwright/pack-manifest-enforce.spec.mjs` proves: the install
preview shows a real manifest-valid badge and real entity/field counts (not hardcoded
labels); confirming creates a real `systemDefinitions` entry with the manifest's actual
entities; uninstalling soft-deletes that system and the pack becomes "available" again, with
a real rollback snapshot recorded; restoring that snapshot genuinely un-deletes the system,
closing the loop on "uninstall with rollback proven." Full audit loop (only red = expected
dirty tree), G-E2E-CORE (13 passed/1 skipped), `kb-smoke.spec.mjs` (2 passed) all green.
Rebuilt public-demo.

## P8.2 TEN_STARTER_PACKS

**Decision:** The plan names 10 specific pack categories (Capture, Daily-Time, Work, Money,
Food-Health, Household, Travel, Learning-Media, Social, Builder-AI), but 4 packs already
existed, already pass P8.1's e2e test by name (`pack-manifest-enforce.spec.mjs` filters on
"CRM"), and already cover real ground: CRM (Social/Work-adjacent), Learning Hub
(Learning-Media), Smart-home dashboard (Household-adjacent), Project cockpit (Work).
Renaming or replacing them to force an exact 1:1 label match would churn working, tested
code for no functional gain - the plan's real intent ("доказательство выразительности") is
that the System Factory can express 10 *distinct life domains*, not that four specific
strings get renamed. Added 6 new packs (Capture, Daily-Time, Money, Food-Health, Travel,
Builder-AI) to reach 10 total, each following the exact same Package Contract shape P8.1
established (spread `PACK_MANIFEST_DEFAULTS` for the four that don't need bespoke
permissions, matching the smart-home pack's precedent for the one that does).

**Found:** No pack ships any seeded sample rows (no fake transactions, fake meals, fake
trips) - every pack is schema-only (entities/fields/views/actions), identical in kind to the
four that already passed `audit-no-hardcoded-sample.mjs`; verified the audit still passes
after adding six more schema-only manifests.

**Verified end-to-end:** `output/playwright/ten-starter-packs.spec.mjs` reads the pack
registry directly from state (not a hardcoded list of 10 names, so it can't silently drift
from what's actually installed), asserts exactly 10 packs exist, then installs *all ten*
through the real preview→confirm flow, verifying each produces a genuinely distinct
`systemDefinitions` entry with real entities from its own manifest - then uninstalls all ten
and verifies every one reverts (system soft-deleted, pack back to "available"). Full audit
loop (only red = expected dirty tree), G-E2E-CORE (13 passed/1 skipped), `kb-smoke.spec.mjs`
(2 passed), `pack-manifest-enforce.spec.mjs` (still green after the roster grew) all green.
Rebuilt public-demo.

## P9.1 HEALTH_REGISTRY_PANEL

**Decision:** `state.providers` already tracks a real per-subsystem status string for 14
providers (Ollama, mail, calendar sync, PDF/EPUB parsers, OCR/STT, smart home, etc.), each
with its own honest status vocabulary ("not-connected", "parser-required",
"permission-required", ...) - but that vocabulary is inconsistent across providers and
there was no single canonical view of "is everything OK." Rather than building a second,
separate health-tracking system that could drift from the real provider state,
`computeHealthRegistry()` is a pure derived view: it maps each provider's real status (plus
Ollama embeddings, semantic-index freshness, and Storage/IndexedDB headroom) into the
plan's 10-state canonical vocabulary, computed fresh on every render from
`buildNewShellContext()` - there is no `state.control.healthRegistry` to store or drift out
of sync.

**Found:** A literal "show every non-alive subsystem in Feed" would flood the feed with
"OCR requires config" / "mail not connected" on every fresh install, since most providers
start in an honest but unconfigured baseline state - directly contradicting this project's
own "no cockpit first screen" rule ([[lifeos-nav-decision]]-adjacent). `HEALTH_FEED_ALERT_STATES`
narrows Feed's banner to only `degraded`/`failed` - genuine regressions, not "hasn't been set
up yet." Control still shows the complete registry (all 10 states, all subsystems), since
that surface is explicitly the technical-proof view where "OCR requires config" is useful
signal, not noise.

**Verified end-to-end:** new `tools/audit-health.mjs` statically confirms all 10 canonical
states are declared, `computeHealthRegistry`/`healthRegistryAlerts` exist and are wired into
the live context (not just defined and unused), and both Control and Feed render their
respective sections. `output/playwright/health-registry.spec.mjs` proves the baseline case
first (Control shows a real `requires_config` row for the PDF parser; Feed shows no alert
banner at all), then triggers a real degradation - Ollama probe succeeds but `/api/generate`
genuinely fails (mocked 500) - and confirms the *same* real `degraded` state appears in both
Feed's alert banner and Control's registry row, proving there's one source of truth, not two.
Full audit loop (only red = expected dirty tree), G-E2E-CORE (13 passed/1 skipped),
`kb-smoke.spec.mjs` (2 passed) all green. Rebuilt public-demo.

## P9.2 FAILURE_INJECTION

**Decision:** Rather than mocking network requests again (already the technique for
Ollama/embeddings failures in P5.1/P6.5/P9.1), P9.2 needed failure injection that reaches
places network mocking can't: the actual `KnowledgeRepository.save()` write path and a
generic provider's status. Added `injectStorageFailureForTest(enabled)` (a flag checked at
the very top of `save()`, so a real throw happens on the real code path) and
`injectProviderFailureForTest(providerId)` (flips any real provider to "error" via a normal
commit) as test-only hooks on `window.__lifeosKnowledgeBase`, matching the existing
`backdateTrashItemForTest`/`resetForTest` convention.

**Found:** Writing the storage-failure test surfaced a genuine, previously-untested bug:
`ReactiveStore.persistCurrent()`'s catch block set `saveState = "error"` (correct) but then
`throw error` again. Every one of the ~195 `await store.commit(...)` call sites in the
codebase has no try/catch around it, so that rethrow became an unhandled promise rejection,
which the existing global `unhandledrejection` listener treats as fatal - calling
`renderError(bootError)` and replacing the entire UI with a crash screen. That is exactly
the opposite of what "isolate failures, keep the app alive" requires: a storage hiccup
would have taken down the whole interface, not just the storage indicator. Fixed by
removing the rethrow - the write-queue's `.then(task, task)` chaining already self-heals on
the next write regardless of whether the previous task's promise rejected, so nothing
downstream actually depended on that exception propagating.

**Verified end-to-end:** `output/playwright/failure-injection.spec.mjs` proves, against
real failures (not mocks): (1) after injecting a PDF-provider failure, Control's health row
and Feed's alert banner both show it, and a brand-new note can still be created normally;
(2) after injecting a storage failure, creating a note still updates the UI immediately
(the in-memory commit succeeds even though persistence doesn't), `#save-status` honestly
shows "ошибка", Control's storage health row shows "failed", and Today/Graph/Library all
stay fully navigable - the shell never disappears into a crash screen; (3) turning the
injected failure off lets the very next save succeed, with `#save-status` returning to
"сохранено" and every note created during the "outage" still present. Full audit loop (only
red = expected dirty tree), G-E2E-CORE (13 passed/1 skipped), `kb-smoke.spec.mjs` (2
passed), `health-registry.spec.mjs` (still green after the saveState threading change) all
green. Rebuilt public-demo.

## P10.1 FIRST_RUN_CALM

**Decision:** Rather than assuming empty states needed rework, audited them first: `ui/home.js`
already leads with a guided capture composer (placeholder text listing every input type,
5 quick-action buttons for task/expense/file/audio/book) and mini-summary cards that
navigate to Today/Money/Habits even when empty; `ui/today.js`'s empty "День спокойный"
state already carries its own "Добавить" button, and every sub-list (goals, timed tasks,
plan blocks) has its own inline add-form directly below it, not just descriptive text.
Found no genuine dead-end - a surface with literally no path forward - anywhere in the nine
primary surfaces, so no rework was needed; P10.1's real gap was the *missing proof* that
this holds across a continuous first-run journey, not isolated single-surface checks.

**Found:** `audit:home-complexity` and `audit:no-cockpit-first-screen` were already green
throughout this entire session (verified in every audit-loop run since P0) - they were
gates from earlier phases' work, not new for P10.1, so this package's job was to add the
missing *journey-level* proof the plan specifically asks for ("e2e «первые 10 минут»"),
not to re-derive gates that already exist.

**Verified end-to-end:** new `output/playwright/first-run-calm.spec.mjs` walks a genuinely
fresh vault through all 9 primary surfaces (inbox/today/calendar/finance/feed/systems/library/
graph/control) confirming each renders something real before any data exists, then performs
two different first captures (a scheduled task, then an expense) through the real guided
composer, confirming each produces exactly one human answer with one primary action and
that the resulting task genuinely appears in Today - proving continuity across the whole
nav, not just isolated surfaces. Full audit loop (only red = expected dirty tree), G-E2E-CORE
(13 passed/1 skipped), `kb-smoke.spec.mjs` (2 passed) all green. No app.js/ui changes this
package (audit-only + new e2e), so no public-demo rebuild was needed.
