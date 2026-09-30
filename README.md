# TradeXRL Lab

A working research MVP for discovering, training, sharing, backtesting and explaining reinforcement-learning trading agents. Built with React 19, TypeScript, Vinext, Recharts, Radix/shadcn, Lucide icons, Cloudflare Workers and D1.

## Implemented

- Marketplace: model cards, server-calculated equity curves, search, algorithm filters, sorting, bookmarks, shareable model links and comparison of up to three agents.
- Native DQN and PPO training with a compact 6 → 12 tanh → 3 network; deterministic seeds; validation-based checkpoint selection.
- Private server-side backtests with configurable capital, costs, asset and dataset. Model weights are never included in public API responses or reports.
- Daily OHLCV CSV import (150–1,500 rows), strict date/price validation, SHA-256 dataset fingerprints and chronological 60/20/20 splits.
- Saved per-user experiments, creator listings, safe JSON checkpoint import and authorization checks on private records.
- Return, Sharpe, Sortino, drawdown, orders, turnover, costs and a buy-and-hold baseline with matching fees.
- Decision inspector: state, action probabilities/Q-values, exact single-reference Shapley values, integrated gradients and local stability/perturbation diagnostics.
- Depth-limited policy tree, independent test action agreement, complexity metrics and separate surrogate backtests.
- Downloadable HTML reports (print to PDF), complete JSON reports and CSV decision logs.
- Browser WebMCP model-search tool with input validation.

## Run locally

Run all commands from the project root: `D:\projects\TradeXRL_Lab`.

Use Node 22.13+ (Node 24 recommended) and npm. The source is self-contained; the Sites plugin is not required to run it.

```sh
npm install
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_funny_sebastian_shaw.sql
npm run dev
```

Open the URL printed by the development server, normally `http://127.0.0.1:5173/`. The development-only sign-in uses a local test identity. Production identity is supplied by the Sites dispatcher. Do not expose the development server publicly. Apply each local migration only once. Production migration tracking is handled by Sites.

If a Windows npm launcher is broken, invoke its installed JavaScript CLI or run `node scripts/run-framework.mjs dev` / `node scripts/run-framework.mjs build` directly after dependencies are installed.

## Checks

```sh
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test tests/engine.test.mjs
node --experimental-strip-types scripts/api-smoke.mjs http://127.0.0.1:5173/
```

The smoke test is restricted to localhost and creates clearly named QA records in the local development database. It exercises normal local sign-in, persistence, model privacy, publication, bookmarks, data validation, DQN training, checkpoint import, explanations and cross-origin rejection.

Regenerate built-in model artifacts after changing the engine:

```sh
node --experimental-strip-types scripts/generate-samples.mjs
```

## Research protocol

`lib/engine.ts` is the independent, dependency-free mathematical engine. DQN uses epsilon-greedy exploration, replay and a periodically copied target network. PPO uses a learned critic, GAE, normalized advantages, a clipped policy objective and four update passes. These are compact reference implementations, not PyTorch/SB3 integrations or performance-tuned production algorithms.

State order: daily close return ×40; five-day momentum ×15; close/SMA20 gap ×20; 20-day return volatility ×60; relative volume minus one; current position. Continuous features are clipped to [-4,4]. Each state uses only available current and past bars. Actions are `[Hold, Buy, Sell]`: retain current position, enter a full long position, or move to cash. Trades execute at the current close; reward is the following bar's net portfolio change. Transaction fees apply on position changes and on final liquidation. No leverage or shorts.

Train/validation/test boundaries contain no transition crossing into the following partition. The best validation-return checkpoint is evaluated on the untouched test split. Daily Sharpe and Sortino use 252 observations per year and zero risk-free rate. Historical data validation is structural; the user must provide adjusted and trustworthy prices.

SHAP here means exact Shapley values over all 64 feature subsets relative to one zero baseline, rather than a distributional SHAP estimator. IG uses 64 midpoint integration samples with central finite differences. Targets are the selected action's Q-value (DQN) or probability (PPO). Local stability varies the baseline five times with seeded noise; rank ties have deterministic feature-order tie-breaking. Perturbation metrics are absolute changes in the same target. A zero/perturbed state need not be a plausible market state. The tree is fitted only to training trajectories; action agreement uses agent test states and financial fidelity uses the tree's own trading trajectory.

## Checkpoint interface

Import JSON with finite bounded weights: `w[12][6]`, `b[12]`, `v[3][12]`, `c[3]`. Forward pass: `h=tanh(w*state+b)`, outputs=`v*h+c`; PPO applies softmax, DQN uses outputs directly. Use the same feature order and preprocessing above. `predict_action(state)` is argmax of `action_scores(state)`.

Arbitrary `.pt` files, SB3 `.zip` files and executable adapters are not executed by the web service. Export a compatible network offline first. General framework adapters, queued GPU jobs and walk-forward experiments are future extensions.

## Storage and deployment

`db/schema.ts` defines experiments, datasets and bookmarks. Decisions, explanations' reproducible inputs, model parameters and evaluation artifacts are retained with the experiment; explanations are calculated on demand. Private experiments/datasets are owner-scoped. Published models expose only results and a server-side inference path. Published creator names are self-reported, not identity verification.

The application currently runs locally. Publishing the source repository does not deploy the website. An unpublished, owner-private Site registration is retained in `.openai/hosting.json` for a possible later deployment. `dist/server/index.js` is the Worker entry, `dist/client` contains public assets, and `dist/.openai/drizzle` contains production migrations. No secrets belong in source or archives.

## Current limits

All six built-in agents use **synthetic demonstration data**, generated with fixed seeds. They are not audited historical strategies. Import daily CSV data to run your own research. No service payments, broker integration, live trading, commercial multi-tenancy, code upload or investment-performance claims are provided. This version is an English research interface.

The marketplace remains inside the Site's current access policy; publishing a model does not make the Site public. Expansion into a public commercial marketplace needs billing, service entitlements, operational isolation and a separate deployment decision.

Icons: [Lucide](https://lucide.dev/license), ISC. Foundational references: [PPO](https://arxiv.org/abs/1707.06347), [Integrated Gradients](https://arxiv.org/abs/1703.01365).
