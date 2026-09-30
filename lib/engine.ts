import type { Metrics } from "./catalog";
export const FEATURES = [
  "Daily return",
  "5-day momentum",
  "Price / SMA 20",
  "20-day volatility",
  "Relative volume",
  "Position",
];
export const ACTIONS = ["Hold", "Buy", "Sell"];
export type Bar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
export type Network = {
  w: number[][];
  b: number[];
  v: number[][];
  c: number[];
};
export type Config = {
  algorithm: "DQN" | "PPO";
  seed: number;
  episodes: number;
  capital: number;
  fee: number;
  asset: string;
  name: string;
  datasetId?: string;
};
export type Decision = {
  date: string;
  state: number[];
  action: number;
  scores: number[];
  reward: number;
  equity: number;
  baseline: number;
  price: number;
  position: number;
};
export type Tree = {
  action: number;
  samples: number;
  feature?: number;
  threshold?: number;
  left?: Tree;
  right?: Tree;
};
export type Result = {
  config: Config;
  network: Network;
  metrics: Metrics;
  decisions: Decision[];
  learning: number[];
  tree: Tree;
  evaluation: {
    agreement: number;
    depth: number;
    nodes: number;
    usedFeatures: number;
    treeMetrics: Metrics;
  };
  dataHash: string;
  split: { train: string[]; validation: string[]; test: string[] };
  source: string;
};
const mean = (x: number[]) => x.reduce((a, b) => a + b, 0) / (x.length || 1);
const sd = (x: number[]) => Math.sqrt(mean(x.map((v) => (v - mean(x)) ** 2)));
const clip = (x: number, a = -4, b = 4) => Math.max(a, Math.min(b, x));
export const argmax = (x: number[]) => x.indexOf(Math.max(...x));
export function rng(seed: number) {
  let a = seed | 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function sampleData(asset: string): Bar[] {
  const k = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL"].indexOf(asset),
    random = rng(830 + k * 27);
  let p = 120 + k * 23;
  const rows: Bar[] = [];
  const date = new Date("2022-01-03T00:00:00Z");
  while (rows.length < 756) {
    if (date.getUTCDay() > 0 && date.getUTCDay() < 6) {
      const i = rows.length,
        open = p;
      const noise = (random() + random() + random() - 1.5) * 0.016;
      p *= Math.exp(0.00055 + Math.sin(i / 37 + k) * 0.0016 + noise);
      rows.push({
        date: date.toISOString().slice(0, 10),
        open,
        close: p,
        high: Math.max(open, p) * (1 + random() * 0.008),
        low: Math.min(open, p) * (1 - random() * 0.008),
        volume: Math.round(15000000 * (0.65 + random() * 0.8)),
      });
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return rows;
}
export function stateAt(bars: Bar[], i: number, pos: number) {
  const b = bars[i],
    prev = bars[i - 1];
  const window = bars.slice(i - 19, i + 1);
  const ret = window.slice(1).map((b, j) => b.close / window[j].close - 1);
  return [
    clip((b.close / prev.close - 1) * 40),
    clip((b.close / bars[i - 5].close - 1) * 15),
    clip((b.close / mean(window.map((x) => x.close)) - 1) * 20),
    clip(sd(ret) * 60),
    clip(b.volume / mean(window.map((x) => x.volume)) - 1),
    pos,
  ];
}
export function newNetwork(random: () => number, outputs = 3): Network {
  return {
    w: Array.from({ length: 12 }, () =>
      Array.from({ length: 6 }, () => (random() - 0.5) * 0.6),
    ),
    b: Array(12).fill(0),
    v: Array.from({ length: outputs }, () =>
      Array.from({ length: 12 }, () => (random() - 0.5) * 0.5),
    ),
    c: Array(outputs).fill(0),
  };
}
function forward(net: Network, x: number[]) {
  const h = net.w.map((row, j) =>
    Math.tanh(row.reduce((s, w, i) => s + w * x[i], net.b[j])),
  );
  return {
    h,
    y: net.v.map((row, j) => row.reduce((s, w, i) => s + w * h[i], net.c[j])),
  };
}
export function scores(net: Network, x: number[], alg: string) {
  const y = forward(net, x).y;
  if (alg === "DQN") return y;
  const e = y.map((v) => Math.exp(v - Math.max(...y))),
    s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}
function update(net: Network, x: number[], dy: number[], rate: number) {
  const { h } = forward(net, x);
  const dh = h.map(
    (v, j) => (1 - v * v) * dy.reduce((s, d, k) => s + d * net.v[k][j], 0),
  );
  net.v.forEach((row, k) => {
    row.forEach((_, j) => (row[j] -= rate * clip(dy[k]) * h[j]));
    net.c[k] -= rate * clip(dy[k]);
  });
  net.w.forEach((row, j) => {
    row.forEach((_, i) => (row[i] -= rate * clip(dh[j]) * x[i]));
    net.b[j] -= rate * clip(dh[j]);
  });
}
function position(action: number, old: number) {
  return action === 1 ? 1 : action === 2 ? 0 : old;
}
function step(
  bars: Bar[],
  i: number,
  pos: number,
  action: number,
  fee: number,
) {
  const next = position(action, pos);
  const factor =
    (1 - Math.abs(next - pos) * fee) *
    (1 + next * (bars[i + 1].close / bars[i].close - 1));
  return { next, reward: (factor - 1) * 100 };
}
function copy<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}
function splits(bars: Bar[]) {
  return {
    train: Math.floor(bars.length * 0.6),
    val: Math.floor(bars.length * 0.8),
  };
}
export function backtest(
  net: Network,
  bars: Bar[],
  cfg: Config,
  start = Math.floor(bars.length * 0.8),
  end = bars.length - 1,
  tree?: Tree,
) {
  let pos = 0,
    equity = cfg.capital,
    baseline = cfg.capital * (1 - cfg.fee),
    costs = 0,
    trades = 0,
    turnover = 0,
    peak = equity,
    mdd = 0;
  const decisions: Decision[] = [];
  for (let i = start; i < end; i++) {
    const x = stateAt(bars, i, pos),
      sc = scores(net, x, cfg.algorithm),
      action = tree ? treePredict(tree, x) : argmax(sc),
      next = position(action, pos),
      trade = Math.abs(next - pos);
    costs += equity * trade * cfg.fee;
    turnover += (equity * trade) / cfg.capital;
    trades += trade;
    let reward = step(bars, i, pos, action, cfg.fee).reward / 100;
    equity *= 1 + reward;
    baseline *= bars[i + 1].close / bars[i].close;
    if (i === end - 1) {
      costs += equity * next * cfg.fee;
      trades += next;
      turnover += (equity * next) / cfg.capital;
      equity *= 1 - next * cfg.fee;
      reward = (1 + reward) * (1 - next * cfg.fee) - 1;
      baseline *= 1 - cfg.fee;
    }
    peak = Math.max(peak, equity);
    mdd = Math.max(mdd, 1 - equity / peak);
    decisions.push({
      date: bars[i].date,
      state: x,
      action,
      scores: sc,
      reward,
      equity,
      baseline,
      price: bars[i].close,
      position: next,
    });
    pos = next;
  }
  const returns = decisions.map((d) => d.reward),
    mu = mean(returns),
    sigma = sd(returns),
    down = Math.sqrt(mean(returns.map((x) => Math.min(0, x) ** 2)));
  const metrics: Metrics = {
    totalReturn: (equity / cfg.capital - 1) * 100,
    sharpe: sigma ? (mu / sigma) * Math.sqrt(252) : 0,
    sortino: down ? (mu / down) * Math.sqrt(252) : 0,
    maxDrawdown: mdd * 100,
    trades,
    turnover,
    costs,
    finalValue: equity,
    baselineReturn: (baseline / cfg.capital - 1) * 100,
  };
  return { decisions, metrics };
}
export function train(
  bars: Bar[],
  cfg: Config,
): { network: Network; learning: number[] } {
  const random = rng(cfg.seed),
    net = newNetwork(random),
    critic = newNetwork(random, 1),
    split = splits(bars);
  let target = copy(net),
    best = copy(net),
    bestScore = -Infinity;
  const learning: number[] = [];
  const replay: {
    x: number[];
    a: number;
    r: number;
    nx: number[];
    done: boolean;
  }[] = [];
  for (let ep = 0; ep < cfg.episodes; ep++) {
    let pos = 0;
    let total = 0;
    const rollout: {
      x: number[];
      a: number;
      r: number;
      p: number;
      v: number;
      adv: number;
      target: number;
    }[] = [];
    for (let i = 20; i < split.train - 1; i++) {
      const x = stateAt(bars, i, pos),
        sc = scores(net, x, cfg.algorithm);
      let a = argmax(sc);
      if (
        cfg.algorithm === "DQN" &&
        random() < Math.max(0.06, 0.8 * (1 - ep / cfg.episodes))
      )
        a = Math.floor(random() * 3);
      if (cfg.algorithm === "PPO") {
        let v = random();
        a = 0;
        while (a < 2 && v > sc[a]) {
          v -= sc[a];
          a++;
        }
      }
      const transition = step(bars, i, pos, a, cfg.fee),
        next = transition.next,
        done = i === split.train - 2,
        reward = done
          ? ((1 + transition.reward / 100) * (1 - next * cfg.fee) - 1) * 100
          : transition.reward,
        nx = stateAt(bars, i + 1, next);
      total += reward;
      if (cfg.algorithm === "DQN") {
        replay.push({ x, a, r: reward, nx, done });
        if (replay.length > 2000) replay.shift();
        for (let b = 0; b < 3; b++) {
          const item = replay[Math.floor(random() * replay.length)],
            pred = forward(net, item.x).y;
          const expected =
            item.r +
            (item.done ? 0 : 0.95 * Math.max(...forward(target, item.nx).y));
          const dy = [0, 0, 0];
          dy[item.a] = pred[item.a] - expected;
          update(net, item.x, dy, 0.002);
        }
        if (i % 80 === 0) target = copy(net);
      } else
        rollout.push({
          x,
          a,
          r: reward,
          p: sc[a],
          v: forward(critic, x).y[0],
          adv: 0,
          target: 0,
        });
      pos = next;
    }
    if (cfg.algorithm === "PPO") {
      let gae = 0;
      for (let i = rollout.length - 1; i >= 0; i--) {
        const row = rollout[i],
          nv = rollout[i + 1]?.v ?? 0;
        gae = row.r + 0.95 * nv - row.v + 0.95 * 0.95 * gae;
        row.adv = gae;
        row.target = gae + row.v;
      }
      const avg = mean(rollout.map((x) => x.adv)),
        dev = sd(rollout.map((x) => x.adv)) || 1;
      for (let pass = 0; pass < 4; pass++)
        for (const row of rollout) {
          const p = scores(net, row.x, "PPO"),
            ratio = p[row.a] / Math.max(row.p, 1e-8),
            adv = (row.adv - avg) / dev;
          if (!((adv > 0 && ratio > 1.2) || (adv < 0 && ratio < 0.8))) {
            const dy = p.map(
              (v, j) => -adv * ratio * ((j === row.a ? 1 : 0) - v),
            );
            update(net, row.x, dy, 0.0007);
          }
          update(
            critic,
            row.x,
            [forward(critic, row.x).y[0] - row.target],
            0.001,
          );
        }
    }
    learning.push(total);
    const val = backtest(net, bars, cfg, split.train, split.val - 1).metrics
      .totalReturn;
    if (val > bestScore) {
      bestScore = val;
      best = copy(net);
    }
  }
  return { network: best, learning };
}
export function fitTree(rows: { x: number[]; a: number }[], depth = 0): Tree {
  const counts = [0, 0, 0];
  rows.forEach((r) => counts[r.a]++);
  const node: Tree = { action: argmax(counts), samples: rows.length };
  if (depth >= 3 || rows.length < 16 || Math.max(...counts) === rows.length)
    return node;
  let best = Infinity,
    bf = -1,
    bt = 0;
  const impurity = (r: typeof rows) => {
    const c = [0, 0, 0];
    r.forEach((x) => c[x.a]++);
    return (
      r.length * (1 - c.reduce((s, x) => s + (x / (r.length || 1)) ** 2, 0))
    );
  };
  for (let f = 0; f < 6; f++) {
    const values = rows.map((r) => r.x[f]).sort((a, b) => a - b);
    for (const q of [0.2, 0.4, 0.6, 0.8]) {
      const t = values[Math.floor(values.length * q)],
        l = rows.filter((r) => r.x[f] <= t),
        r = rows.filter((r) => r.x[f] > t);
      if (l.length < 5 || r.length < 5) continue;
      const score = impurity(l) + impurity(r);
      if (score < best) {
        best = score;
        bf = f;
        bt = t;
      }
    }
  }
  if (bf < 0) return node;
  return {
    ...node,
    feature: bf,
    threshold: bt,
    left: fitTree(
      rows.filter((r) => r.x[bf] <= bt),
      depth + 1,
    ),
    right: fitTree(
      rows.filter((r) => r.x[bf] > bt),
      depth + 1,
    ),
  };
}
export function treePredict(tree: Tree, x: number[]): number {
  return tree.feature === undefined
    ? tree.action
    : treePredict(
        x[tree.feature] <= tree.threshold! ? tree.left! : tree.right!,
        x,
      );
}
export function explain(
  net: Network,
  x: number[],
  algorithm: string,
  target: number,
  baseline = Array(6).fill(0),
) {
  const f = (s: number[]) => scores(net, s, algorithm)[target],
    factorial = [1, 1, 2, 6, 24, 120, 720];
  const values = Array.from({ length: 64 }, (_, mask) =>
    f(x.map((v, i) => (mask & (1 << i) ? v : baseline[i]))),
  );
  const shap = x.map((_, i) => {
    let value = 0;
    for (let mask = 0; mask < 64; mask++) {
      if (mask & (1 << i)) continue;
      const size = mask.toString(2).replace(/0/g, "").length;
      value +=
        ((factorial[size] * factorial[5 - size]) / factorial[6]) *
        (values[mask | (1 << i)] - values[mask]);
    }
    return value;
  });
  const ig = x.map((v, i) => {
    let integral = 0;
    for (let k = 0; k < 64; k++) {
      const point = x.map(
        (v, j) => baseline[j] + ((v - baseline[j]) * (k + 0.5)) / 64,
      );
      const plus = [...point],
        minus = [...point];
      plus[i] += 0.0001;
      minus[i] -= 0.0001;
      integral += (f(plus) - f(minus)) / 0.0002;
    }
    return ((v - baseline[i]) * integral) / 64;
  });
  const sorted = shap
      .map((v, i) => ({ v: Math.abs(v), i }))
      .sort((a, b) => b.v - a.v),
    top = sorted.slice(0, 2).map((v) => v.i),
    bottom = sorted.slice(-2).map((v) => v.i);
  const delta = (indices: number[]) =>
    Math.abs(
      f(x) - f(x.map((v, i) => (indices.includes(i) ? baseline[i] : v))),
    );
  return {
    shap,
    ig,
    baseValue: f(baseline),
    targetValue: f(x),
    topDelta: delta(top),
    bottomDelta: delta(bottom),
    completeness: Math.abs(
      shap.reduce((a, b) => a + b, 0) - (f(x) - f(baseline)),
    ),
    target,
  };
}
export async function run(
  bars: Bar[],
  cfg: Config,
  source = "Synthetic demonstration data",
  imported?: Network,
): Promise<Result> {
  if (bars.length < 150) throw new Error("At least 150 rows are required.");
  const learned = imported
    ? { network: imported, learning: [] }
    : train(bars, cfg);
  const split = splits(bars),
    result = backtest(learned.network, bars, cfg),
    trainDecisions = backtest(
      learned.network,
      bars,
      cfg,
      20,
      split.train - 1,
    ).decisions;
  const tree = fitTree(
      trainDecisions.map((d) => ({ x: d.state, a: d.action })),
    ),
    treeTest = backtest(
      learned.network,
      bars,
      cfg,
      split.val,
      bars.length - 1,
      tree,
    );
  const count = (t: Tree): number =>
      1 + (t.left ? count(t.left) + count(t.right!) : 0),
    depth = (t: Tree): number =>
      t.left ? 1 + Math.max(depth(t.left), depth(t.right!)) : 0,
    used = new Set<number>();
  const visit = (t: Tree) => {
    if (t.feature !== undefined) {
      used.add(t.feature);
      visit(t.left!);
      visit(t.right!);
    }
  };
  visit(tree);
  const bytes = new TextEncoder().encode(JSON.stringify(bars)),
    hash = await crypto.subtle.digest("SHA-256", bytes);
  return {
    ...learned,
    ...result,
    config: cfg,
    tree,
    evaluation: {
      agreement:
        mean(
          result.decisions.map((d) =>
            treePredict(tree, d.state) === d.action ? 1 : 0,
          ),
        ) * 100,
      depth: depth(tree),
      nodes: count(tree),
      usedFeatures: used.size,
      treeMetrics: treeTest.metrics,
    },
    dataHash: Array.from(new Uint8Array(hash))
      .map((x) => x.toString(16).padStart(2, "0"))
      .join(""),
    split: {
      train: [bars[20].date, bars[split.train - 1].date],
      validation: [bars[split.train].date, bars[split.val - 1].date],
      test: [bars[split.val].date, bars.at(-1)!.date],
    },
    source,
  };
}
