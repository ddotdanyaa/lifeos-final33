# OWNER_RESCUE_RESUME_CAPSULE

Resume package loop from the current branch with:

1. Run `npm run verify`.
2. Run `npm run e2e:ux` after UI/IA edits.
3. Regenerate `docs/qc/OWNER_RESCUE_1000_RISK_LEDGER.csv` with `node tools/generate-owner-rescue-1000-ledger.mjs`.
4. Commit locally. Push only after owner provides GitHub auth/remote with `npm run release:push -- <repo-url>`.

Current hard block: GitHub auth/remote only. Product code work continues locally.
