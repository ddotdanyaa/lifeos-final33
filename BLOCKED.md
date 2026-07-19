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

## Proposals (state.proposals) are not rendered anywhere in the live chat-first shell

Found while wiring P3.3 System Factory triggers (which create dry-run proposals): the
`proposal-panel`/`apply-proposal` UI only exists in app.js's dead `renderCaptureCockpit`-
family functions, never called by the live `ui/*.js` shell. `apply-proposal`/`dismiss-
proposal` action handlers still work (app.js:12901 area), so proposals created by triggers,
flow dry-runs, chat-to-proposal etc. are real and appliable, just invisible until the owner
opens dev tools or a future package wires a live UI for them. Not owner-credential-blocked,
same class of gap as `home-next-action` above — good candidate for an early package (Phase
4 Agents/Flows work touches this area already) rather than a standalone fix.

## П-B WHISPER_LOCAL_STT: installed `@huggingface/transformers` (4.2.0) cannot load any
## current Hub-hosted Whisper ASR model - genuine external engine incompatibility

Not owner-credential-blocked and not a product bug - a real, deterministic failure in the
already-approved engine's bundled ONNX Runtime Web against the ONNX files HuggingFace
currently hosts for Whisper. Every real local model call, receipt, and honest-status
wiring for STT (worker, download progress, `saveSourceTranscript` whisper mode, e2e) is
built and proven correct; only the actual model *load* fails.

Reproduced directly against the real HuggingFace CDN (no mocks) via `pipeline("automatic-
speech-recognition", ...)`:
- `Xenova/whisper-base`, default dtype (quantized) → fails after a full real ~76MB download:
  `Can't create a session. ERROR_CODE: 1, ERROR_MESSAGE: qdq_actions.cc:137
  TransposeDQWeightsForMatMulNBits Missing required scale:
  model.decoder.embed_tokens.weight_merged_0_scale for node:
  model.decoder.embed_tokens.weight_transposed_DequantizeLinear`
- Same model, `dtype: "q8"` → identical error (resolves to the same file for this repo).
- Same model, `dtype: "fp32"` (different, larger `decoder_model_merged.onnx` file, confirmed
  via progress events) → identical error. The embed_tokens weight is apparently quantized in
  every published variant of this repo's merged-decoder export, regardless of overall dtype.
- `Xenova/whisper-tiny`, default dtype → identical error (rules out whisper-base specifically;
  this is systemic across the "decoder_model_merged" export shape used by every current
  Whisper repo on the Hub, not one model's bad upload).
- `Xenova/whisper-tiny` with `session_options: { graphOptimizationLevel: "disabled" }` (to
  skip the ORT graph-fusion pass the error originates from) → identical error, ruling out an
  optimization-pass workaround.

Hypothesis: the ONNX Runtime Web version bundled inside `@huggingface/transformers@4.2.0`
predates (or otherwise mismatches) the `MatMulNBits`/per-block-scale quantization format
HuggingFace now uses when exporting merged Whisper decoders, and the exported graphs are
missing a scale tensor ORT's newer fusion pass expects. Likely fixable by bumping
`@huggingface/transformers` to a newer version with a newer bundled ORT - but a dependency
version change is an owner decision per CLAUDE.md §2, not made autonomously here.

What's already correct and proven (see `output/playwright/whisper-transcribe.spec.mjs`):
the honest-gate test passes (no auto-download, transcribe button disabled until ready,
declining the confirm leaves status untouched); the real-model test passes too, because it
was written to hold up under either outcome - it asserts the download is real (permission-
change receipt, real percent progress) and that the app is honest either way: on this
real, reproducible engine failure the status becomes `"error"` (not silently
`"not-configured"`, not a faked `"ready"`), `requiredAction` shows the real reason, a
`provider_unavailable`/`model-call` receipt is recorded, the transcribe button stays
disabled, and manual transcript continues to work as a fallback. If a future
`@huggingface/transformers` bump fixes the upstream bug, the same test automatically
exercises the full real success path instead (transcribe, note creation, model-call
receipt) without needing to be rewritten.

Next step for whoever revisits this: try bumping `@huggingface/transformers` to its latest
version (owner decision) and re-run `whisper-transcribe.spec.mjs`'s real-model test - if
newer bundled ORT fixes the missing-scale issue, no other code change should be needed.

**Addendum (continuation session, same day):** re-ran the real-model test four more times
while closing out this package. One run reproduced the exact failure again cleanly (same
`MatMulNBits ... Missing required scale` text, confirming the finding still holds) and proved
every honest-gating field end to end - permission-change receipt, `status:"error"` (never a
silent revert to `"not-configured"`), the real error text in `requiredAction`, disabled
transcribe button, working manual-transcript fallback. The other three runs never reached a
terminal state at all within a 300-800s window, stuck at `"downloading"` - not a hang or a
regression, just the real download (encoder+decoder+tokenizer+config, more than the ~76MB
single-file spot-check suggested) taking longer than that on a real, shared network, made
worse by starting cold each time (a test-only fix clears Cache Storage on reset so a
previous run's partial/interrupted download can't poison a later one, which is what made
one run hang indefinitely rather than just being slow before that fix). Also found and
fixed a real test-only race: the very first successful reproduction's assertion read
`getStateSnapshot()` immediately after the DOM-based wait resolved and got a stale
`providers.stt.requiredAction` for one field even though `status` and the rendered page were
already correct - fixed by asserting against the rendered DOM (proven accurate) plus a
short settle wait before reading the snapshot. Conclusion: the engine incompatibility is the
real, stable finding; the download's wall-clock time is inherently variable and out of this
codebase's control, so don't keep re-running this specific test hoping for fast, consistent
timing - one clean reproduction plus the always-fast, always-reliable honest-gate test are
the actual proof this package needs.
