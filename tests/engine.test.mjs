import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sampleData,
  train,
  run,
  backtest,
  explain,
  newNetwork,
  rng,
  stateAt,
  scores,
} from "../lib/engine.ts";
const cfg = {
  name: "Test",
  algorithm: "DQN",
  seed: 42,
  episodes: 4,
  capital: 10000,
  fee: 0.001,
  asset: "AAPL",
};
test("synthetic data and training are deterministic", () => {
  assert.deepEqual(sampleData("AAPL"), sampleData("AAPL"));
  const bars = sampleData("AAPL").slice(0, 180);
  assert.deepEqual(train(bars, cfg), train(bars, cfg));
});
test("buy-and-hold accounting includes entry and final exit costs", () => {
  const bars = sampleData("AAPL"),
    net = newNetwork(rng(1));
  net.v = net.v.map((row) => row.map(() => 0));
  net.c = [0, 2, 0];
  const r = backtest(net, bars, cfg),
    start = Math.floor(bars.length * 0.8);
  const expected =
    (cfg.capital * (1 - cfg.fee) ** 2 * bars.at(-1).close) / bars[start].close;
  assert.ok(Math.abs(r.metrics.finalValue - expected) < 1e-7);
  assert.ok(Math.abs(r.metrics.totalReturn - r.metrics.baselineReturn) < 1e-8);
  assert.equal(r.metrics.trades, 2);
  assert.ok(r.metrics.costs > 0);
});
test("cash policy preserves capital, incurs no costs and has finite metrics", () => {
  const net = newNetwork(rng(3));
  net.v = net.v.map((row) => row.map(() => 0));
  net.c = [1, 0, 0];
  const { metrics } = backtest(net, sampleData("AAPL"), cfg);
  assert.equal(metrics.finalValue, cfg.capital);
  assert.equal(metrics.costs, 0);
  assert.equal(metrics.maxDrawdown, 0);
  assert.equal(metrics.sharpe, 0);
  assert.ok(Object.values(metrics).every(Number.isFinite));
});
test("state and learned checkpoint do not depend on test prices", () => {
  const bars = sampleData("MSFT").slice(0, 180),
    changed = structuredClone(bars);
  changed.slice(144).forEach((b) => (b.close *= 2));
  assert.deepEqual(stateAt(bars, 80, 0), stateAt(changed, 80, 0));
  assert.deepEqual(train(bars, cfg), train(changed, cfg));
});
test("SHAP is complete and integrated gradients matches output difference", () => {
  const net = newNetwork(rng(44)),
    x = [0.2, 0.3, -0.2, 0.4, 0.2, 1];
  for (const alg of ["DQN", "PPO"]) {
    const e = explain(net, x, alg, 1);
    assert.ok(e.completeness < 1e-10);
    assert.ok(
      Math.abs(
        e.ig.reduce((a, b) => a + b, 0) - (e.targetValue - e.baseValue),
      ) < 1e-4,
    );
    assert.ok([...e.shap, ...e.ig].every(Number.isFinite));
  }
});
test("PPO outputs a normalized policy and independent evaluation", async () => {
  const bars = sampleData("NVDA").slice(0, 180);
  const r = await run(bars, { ...cfg, algorithm: "PPO" });
  assert.ok(r.split.train[1] < r.split.validation[0]);
  assert.ok(r.split.validation[1] < r.split.test[0]);
  assert.equal(r.dataHash.length, 64);
  for (const d of r.decisions) {
    assert.ok(Math.abs(d.scores.reduce((a, b) => a + b, 0) - 1) < 1e-12);
    assert.ok(d.scores.every((p) => p >= 0 && p <= 1));
  }
  assert.ok(r.evaluation.agreement >= 0 && r.evaluation.agreement <= 100);
  assert.ok(r.evaluation.depth <= 3);
});
