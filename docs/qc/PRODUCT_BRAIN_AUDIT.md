# Product Brain Audit

Status: `P_PRODUCT_BRAIN_001` implemented locally and verified on 2026-06-26.

Checks represented:

- Runtime artifact graph exists through `PRODUCT_BRAIN_NODE_SPECS`.
- Root artifact is `LifeOS Product Brain`.
- Graph has `productBrain` filter.
- Edge reasons use `product-brain-*` labels.
- Control has `product-brain-control-card`.
- Chat has deterministic Product Brain answers via `answerProductBrainQuestion`.
- Library has `product-brain-library-card`.
- GitHub auth and remote are no longer treated as missing; push remains `HTTP_408_RETRY_REQUIRED`.

Evidence commands passed:

- `node --check app.js`
- `node --check output/playwright/product-brain.spec.mjs`
- `node --check tools/audit-product-brain.mjs`
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
- `npm run audit:product-brain`

Screenshots produced:

- `output/playwright/product-brain-library.png`
- `output/playwright/product-brain-graph.png`
- `output/playwright/product-brain-control.png`
- `output/playwright/product-brain-chat.png`
