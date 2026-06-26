# Product Evidence Index

Product Brain screenshots:

- `output/playwright/product-brain-graph.png`
- `output/playwright/product-brain-control.png`
- `output/playwright/product-brain-chat.png`
- `output/playwright/product-brain-library.png`

Core commands passed on 2026-06-26:

- `node --check app.js`
- `npm run verify`
- `npm run e2e`
- `npm run e2e:owner`
- `npm run e2e:graph`
- `npm run e2e:ai-providers`
- `npm run e2e:product-brain`
- `npm run audit:no-hardcoded-sample`
- `npm run audit:buttons`
- `npm run audit:workspace-links`
- `npm run audit:ledger`
- `npm run audit:release-evidence`
- `npm run audit:owner-final`
- `npm run audit:product-brain`
- `npm run audit:human-ux-final`
- `npm run e2e:journeys`
- `git diff --check`

Release evidence:

- `gh auth status`: authenticated as `ddotdanyaa`.
- `git remote -v`: origin is `https://github.com/ddotdanyaa/lifeos-final33.git`.
- `git push`: full-history push was blocked by HTTP 408, not by missing owner auth.
- `npm run release:push -- https://github.com/ddotdanyaa/lifeos-final33.git --lite-git-snapshot`: pushed the remote branch.
- GitHub URL: `https://github.com/ddotdanyaa/lifeos-final33/tree/owner-usable-nonstop-rescue`.
- Omitted large evidence is documented in remote `docs/ops/GITHUB_RELEASE_OMITTED_FILES.md`.

Workspace 9+ evidence:

- `docs/qc/FINAL_UI_HUMAN_AUDIT.md` now requires and records 9+ scores.
- `tools/audit-human-ux-final.mjs` fails on any workspace score below 9.
- `output/playwright/final/final-calendar-week.png`
- `output/playwright/final/final-finance.png`
- `output/playwright/final/final-agents-flows.png`
