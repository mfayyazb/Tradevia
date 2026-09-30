import assert from "node:assert/strict";
import { sampleData, newNetwork, rng } from "../lib/engine.ts";
const base = process.argv[2];
if (!base) throw new Error("Pass the exact local preview URL.");
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("This smoke test is restricted to a local preview.");
const nativeFetch = globalThis.fetch;
const anonymous = await nativeFetch(new URL("/api/workspace", base));
assert.equal(anonymous.status, 401);
const signIn = await nativeFetch(
  new URL("/signin-with-chatgpt?return_to=/", base),
  { redirect: "manual" },
);
const cookie = signIn.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie, "Local preview sign-in must provide a cookie.");
globalThis.fetch = (input, options = {}) =>
  nativeFetch(input, {
    ...options,
    headers: { ...options.headers, Cookie: cookie },
  });
async function api(path, body, method = "POST") {
  const response = await fetch(
    new URL(path, base),
    body
      ? {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
  const data = await response.json();
  assert.ok(response.ok, JSON.stringify(data));
  return data;
}
const w = await api("/api/workspace");
assert.ok(Array.isArray(w.experiments));
const model = await api("/api/models/atlas");
assert.equal(model.network, undefined);
assert.equal(model.config.algorithm, "PPO");
const explanation = await api("/api/models/atlas/explain?decision=4");
assert.equal(explanation.shap.length, 6);
assert.ok(explanation.completeness < 1e-8);
const config = {
  ...model.config,
  name: "QA smoke · private backtest",
  episodes: 4,
};
const created = await api("/api/experiments", { config, modelId: "atlas" });
assert.ok(created.id);
assert.equal(created.result.network, undefined);
assert.ok(
  (await api("/api/workspace")).experiments.some((e) => e.id === created.id),
);
await api("/api/bookmarks", { id: "atlas", saved: true });
assert.ok((await api("/api/workspace")).saved.includes("atlas"));
await api("/api/bookmarks", { id: "atlas", saved: false });
await api(
  `/api/models/${created.id}`,
  {
    creator: "QA research",
    description: "Local integration check. Synthetic demonstration model.",
  },
  "PATCH",
);
assert.ok(
  (await api("/api/workspace")).models.some((m) => m.id === created.id),
);
const bad = await fetch(new URL("/api/experiments", base), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ config: { ...config, fee: -1 } }),
});
assert.equal(bad.status, 400);
const dataset = await api('/api/datasets',{name:'QA smoke daily dataset',asset:'AAPL',bars:sampleData('AAPL').slice(0,180)});
assert.ok((await api('/api/workspace')).datasets.some(d=>d.id===dataset.id));
const trained = await api('/api/experiments',{config:{...config,name:'QA smoke · trained DQN',algorithm:'DQN',datasetId:dataset.id,episodes:4}});
assert.equal(trained.result.learning.length,4);
assert.equal(trained.result.source,'QA smoke daily dataset');
const imported = await api('/api/experiments',{config:{...config,name:'QA smoke · imported checkpoint',algorithm:'DQN',episodes:4},checkpoint:newNetwork(rng(33))});
assert.equal(imported.result.learning.length,0);
const malformed = await fetch(new URL('/api/datasets',base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Invalid dataset',asset:'AAPL',bars:sampleData('AAPL').slice(0,180).reverse()})});
assert.equal(malformed.status,400);
const badIndex = await fetch(
  new URL("/api/models/atlas/explain?decision=99999", base),
);
assert.equal(badIndex.status, 400);
const cross = await fetch(new URL("/api/bookmarks", base), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "https://unrelated.example",
  },
  body: JSON.stringify({ id: "atlas", saved: true }),
});
assert.ok([401, 403].includes(cross.status));
console.log(
  JSON.stringify({
    passed: true,
    checks: [
      "workspace",
      "model privacy",
      "SHAP completeness",
      "backtest persistence",
      "bookmarks",
      "publication",
      "invalid config",
      "invalid decision",
      "origin boundary",
      "CSV dataset persistence",
      "DQN training",
      "checkpoint import",
      "invalid data ordering",
    ],
    localTestExperimentId: created.id,
  }),
);
