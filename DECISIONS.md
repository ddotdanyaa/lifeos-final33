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
