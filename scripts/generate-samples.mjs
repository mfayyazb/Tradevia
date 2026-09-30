import { run, sampleData } from "../lib/engine.ts";
import { catalog } from "../lib/catalog.ts";
import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("data", { recursive: true });
for (const model of catalog) {
  const result = await run(sampleData(model.asset), {
    algorithm: model.algorithm,
    seed: model.seed,
    episodes: 16,
    capital: 10000,
    fee: 0.001,
    asset: model.asset,
    name: model.name,
  });
  writeFileSync(`data/${model.id}.json`, JSON.stringify(result));
  console.log(
    `${model.name}: ${result.metrics.totalReturn.toFixed(2)}% test return, ${result.metrics.trades} orders`,
  );
}
