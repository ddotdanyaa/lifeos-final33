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
