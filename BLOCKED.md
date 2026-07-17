# LifeOS — Autonomous Session Blockers

Things skipped this session due to missing keys/auth/external services/local engines. Not waiting on these — moving on per instructions.

## market-owner.spec.mjs: missing `home-next-action` testid

Pre-existing failure, NOT caused by P0.2 work — verified by stashing all P0.2 changes and
re-running against the untouched baseline; it fails identically. `home-next-action` only
exists in app.js's dead `renderCaptureCockpit` (never called by the live `renderNewShell`
shell). Home surface (`ui/home.js`) was not touched in P0.2 (out of scope: P0.2's allowed
files were library/shell/components/kb-smoke only). Needs a small ui/home.js wire-up similar
to what P0.2 did for library/today/player/control/chat — good candidate for early Phase 1/2
work or a dedicated fix, tracked here so it isn't lost. Not owner-credential-blocked, just
not yet done.

## Mobile overflow pattern may recur on other workspaces

Found and fixed one instance (`.control-human-layout` had an unconditional
`grid-template-columns: minmax(420px, 1fr) 300px` that forced mobile horizontal overflow —
fixed in styles.css P0.2 commit). The same class-reuse pattern (`.knowledge-layout`,
`.agents-flow-layout`, `.reader-surface`, `.player-surface`, `.chat-thread-layout` all share
one base grid rule that could be overridden unconditionally elsewhere) should be swept in
P10.2 MOBILE_PWA_CONTINUITY to make sure no other surface has a similar latent overflow bug.
Not blocked on anything external — just deferred to stay in scope for P0.2.
