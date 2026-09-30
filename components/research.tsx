"use client";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Check,
  Database,
  Download,
  FileJson,
  FlaskConical,
  GitBranch,
  GitCompareArrows,
  Info,
  Loader2,
  Play,
  Plus,
  ShieldCheck,
  Upload,
  Workflow,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { assets, type Listing } from "@/lib/catalog";
import { ACTIONS, FEATURES, type Result, type Tree } from "@/lib/engine";
import { Picker, pct } from "./marketplace";
import { htmlReport } from "@/lib/report";
export type ResearchResult = Omit<Result, "network">;
export async function api(
  url: string,
  body?: unknown,
  method = "POST",
): Promise<any> {
  const r = await fetch(
    url,
    body === undefined
      ? undefined
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  let data: any;
  try {
    data = await r.json();
  } catch {
    throw new Error(
      "The research service returned an invalid response. Please retry.",
    );
  }
  if (!r.ok)
    throw new Error(data.error || "The request could not be completed.");
  return data;
}
export function download(
  name: string,
  data: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const money = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
export function Busy({ text = "Loading research…" }: { text?: string }) {
  return (
    <div className="busy">
      <Loader2 className="spin" size={23} />
      <span>{text}</span>
    </div>
  );
}
function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div role="alert" className="error-box">
      {message}
    </div>
  ) : null;
}
export function TrainDialog({
  open,
  onClose,
  model,
  datasets,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  model: Listing | null;
  datasets: any[];
  onComplete: (id: string) => void;
}) {
  const [name, setName] = useState("Momentum experiment"),
    [algorithm, setAlgorithm] = useState("PPO"),
    [asset, setAsset] = useState("AAPL"),
    [dataset, setDataset] = useState("sample"),
    [capital, setCapital] = useState(10000),
    [fee, setFee] = useState(0.1),
    [episodes, setEpisodes] = useState(16),
    [seed, setSeed] = useState(42),
    [mode, setMode] = useState("train"),
    [checkpoint, setCheckpoint] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setName(model ? `${model.name} · backtest` : "Momentum experiment");
      setAlgorithm(model?.algorithm || "PPO");
      setAsset(model?.asset || "AAPL");
      setSeed(model?.seed || 42);
      setDataset("sample");
      setError("");
      setCheckpoint(null);
      setMode("train");
    }
  }, [open, model]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!model && mode === "import" && !checkpoint)
        throw new Error("Choose a compatible checkpoint JSON file.");
      const result = await api("/api/experiments", {
        config: {
          name,
          algorithm,
          asset,
          capital,
          fee: fee / 100,
          episodes,
          seed,
          datasetId: dataset,
        },
        ...(model
          ? { modelId: model.id }
          : mode === "import"
            ? { checkpoint }
            : {}),
      });
      toast.success(model ? "Backtest complete" : "Experiment complete");
      onClose();
      onComplete(result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent className="research-dialog">
        <DialogHeader>
          <div className="dialog-icon">
            <FlaskConical size={24} />
          </div>
          <DialogTitle>
            {model
              ? "Put this model to the test."
              : "Start with a question. Train an agent."}
          </DialogTitle>
          <DialogDescription>
            {model
              ? `Run ${model.name} privately. Model weights stay on the server.`
              : "A reproducible experiment with independent training, validation and test periods."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field full">
              <Label htmlFor="experiment-name">Experiment name</Label>
              <Input
                id="experiment-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={3}
                maxLength={70}
                required
              />
            </div>
            {!model && (
              <div className="field full">
                <Tabs value={mode} onValueChange={setMode}>
                  <TabsList>
                    <TabsTrigger value="train">Train an agent</TabsTrigger>
                    <TabsTrigger value="import">Import checkpoint</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
            <div className="field">
              <Label>Algorithm</Label>
              {model ? (
                <div className="fixed-value">{model.algorithm}</div>
              ) : (
                <Picker
                  label="Training algorithm"
                  value={algorithm}
                  onChange={setAlgorithm}
                  items={["PPO", "DQN"].map((v) => ({ value: v, label: v }))}
                />
              )}
            </div>
            <div className="field">
              <Label>Asset</Label>
              <Picker
                label="Trading asset"
                value={asset}
                onChange={(v) => {
                  setAsset(v);
                  setDataset("sample");
                }}
                items={assets.map((v) => ({ value: v, label: v }))}
              />
            </div>
            <div className="field full">
              <Label>Market dataset</Label>
              <Picker
                label="Market dataset"
                value={dataset}
                onChange={setDataset}
                items={[
                  {
                    value: "sample",
                    label: `${asset} · synthetic demo · 756 daily bars`,
                  },
                  ...datasets
                    .filter((d) => d.asset === asset)
                    .map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            </div>
            <div className="field">
              <Label htmlFor="capital">Initial capital ($)</Label>
              <Input
                id="capital"
                type="number"
                min={100}
                max={10000000}
                required
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <Label htmlFor="fee">Transaction cost (%)</Label>
              <Input
                id="fee"
                type="number"
                min={0}
                max={5}
                step=".01"
                required
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
              />
            </div>
            {!model && mode === "train" && (
              <>
                <div className="field">
                  <Label htmlFor="episodes">Training episodes</Label>
                  <Input
                    id="episodes"
                    type="number"
                    min={4}
                    max={40}
                    required
                    value={episodes}
                    onChange={(e) => setEpisodes(Number(e.target.value))}
                  />
                </div>
                <div className="field">
                  <Label htmlFor="seed">Random seed</Label>
                  <Input
                    id="seed"
                    type="number"
                    min={0}
                    max={2147483647}
                    required
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                  />
                </div>
              </>
            )}
            {!model && mode === "import" && (
              <div className="field full upload-box">
                <FileJson size={23} />
                <Label htmlFor="checkpoint">
                  Compatible network checkpoint (.json)
                </Label>
                <input
                  id="checkpoint"
                  type="file"
                  accept=".json"
                  onChange={async (e) => {
                    try {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 50000)
                        throw new Error("Checkpoint must be under 50 KB.");
                      setCheckpoint(JSON.parse(await file.text()));
                      setError("");
                    } catch (err) {
                      setError((err as Error).message);
                      setCheckpoint(null);
                    }
                  }}
                />
                <small>
                  6 inputs → 12 tanh neurons → 3 action scores. Keys: w, b, v,
                  c. PyTorch/SB3 archives require offline conversion; executable
                  files are not accepted.
                </small>
              </div>
            )}
          </div>
          <div className="split-strip">
            <span>Train 60%</span>
            <span>Validation 20%</span>
            <span>Test 20%</span>
          </div>
          <p className="form-note">
            <Info size={14} />
            {dataset === "sample"
              ? "Synthetic prices for testing the workflow. These are not historical market returns."
              : "Use adjusted daily prices. Features use current and past rows only."}
          </p>
          <ErrorBox message={error} />
          <button className="button primary submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={16} /> : <Play size={15} />}{" "}
            {busy
              ? "Training and evaluating…"
              : model
                ? "Run private backtest"
                : mode === "import"
                  ? "Import and evaluate"
                  : "Train & evaluate"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function EquityChart({ result }: { result: ResearchResult }) {
  const points = [
    {
      date: "Start",
      equity: result.config.capital,
      baseline: result.config.capital,
    },
    ...result.decisions,
  ];
  return (
    <div className="equity-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 15, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="equity-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#249e76" stopOpacity={0.14} />
              <stop offset="100%" stopColor="#249e76" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#edf1ef" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#98a5a0", fontSize: 11 }}
            minTickGap={60}
            tickFormatter={(v) => (v === "Start" ? v : v.slice(5))}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
            tick={{ fill: "#98a5a0", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <ChartTooltip
            formatter={(v: any, name: any) => [
              money(Number(v)),
              name === "equity" ? "Agent" : "Buy & hold",
            ]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e0e8e3",
              fontSize: 12,
            }}
          />
          <Area
            type="linear"
            dataKey="baseline"
            stroke="#a1aeb5"
            strokeDasharray="4 4"
            fill="transparent"
            strokeWidth={1.4}
          />
          <Area
            type="linear"
            dataKey="equity"
            stroke="#218561"
            fill="url(#equity-gradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
function MetricGrid({ r }: { r: ResearchResult }) {
  return (
    <div className="detail-metrics">
      {[
        ["Total return", pct(r.metrics.totalReturn)],
        ["Sharpe ratio", r.metrics.sharpe.toFixed(2)],
        ["Max. drawdown", `−${r.metrics.maxDrawdown.toFixed(2)}%`],
        ["Portfolio value", money(r.metrics.finalValue)],
      ].map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
export function ModelDetail({
  id,
  onClose,
  onTest,
  onPublish,
}: {
  id: string | null;
  onClose: () => void;
  onTest: (id: string, r: ResearchResult) => void;
  onPublish: (id: string) => void;
}) {
  const [r, setR] = useState<ResearchResult | null>(null),
    [error, setError] = useState(""),
    [explanation, setExplanation] = useState<any>(null),
    [decision, setDecision] = useState(0),
    [method, setMethod] = useState("SHAP"),
    [loadingExplanation, setLoadingExplanation] = useState(false),
    [tab, setTab] = useState("performance");
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setR(null);
    setError("");
    setDecision(0);
    setTab("performance");
    api(`/api/models/${id}`)
      .then((r) => {
        if (!cancelled) setR(r);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  useEffect(() => {
    if (!id || !r) return;
    let cancelled = false;
    setLoadingExplanation(true);
    setExplanation(null);
    api(`/api/models/${id}/explain?decision=${decision}`)
      .then((e) => {
        if (!cancelled) setExplanation(e);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingExplanation(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, r, decision]);
  const report = () => {
    if (!r) return;
    download(
      `${r.config.name.replace(/[^a-z0-9]+/gi, "-")}-report.json`,
      JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          ...r,
          explanationExample: explanation,
          notes: [
            "Research only; no live execution.",
            "Sharpe and Sortino assume daily bars and zero risk-free rate.",
            "Weights omitted to protect the model owner.",
          ],
        },
        null,
        2,
      ),
    );
  };
  return (
    <Sheet open={!!id} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="detail-sheet" side="right">
        <SheetHeader>
          <SheetTitle>{r?.config.name || "Model research"}</SheetTitle>
          <SheetDescription>
            Inspect the evidence behind every decision.
          </SheetDescription>
        </SheetHeader>
        {!r && !error ? (
          <Busy />
        ) : error ? (
          <ErrorBox message={error} />
        ) : (
          r && (
            <div className="detail-inner">
              <div className="detail-meta">
                <span className="badge">{r.config.algorithm}</span>
                <span>{r.config.asset} · Daily</span>
                <span className="badge neutral">
                  {r.source.startsWith("Synthetic")
                    ? "Synthetic demo"
                    : "Uploaded dataset"}
                </span>
              </div>
              <div className="detail-actions">
                <button
                  className="button primary small"
                  onClick={() => onTest(id!, r)}
                >
                  <FlaskConical size={15} />
                  Run a backtest
                </button>
                <button
                  className="button secondary small"
                  onClick={() =>
                    r &&
                    download(
                      "experiment-report.html",
                      htmlReport(r, explanation),
                      "text/html",
                    )
                  }
                  disabled={!explanation}
                >
                  <Download size={15} />
                  Export report
                </button>
                <button
                  className="button secondary small"
                  onClick={report}
                  disabled={!explanation}
                >
                  <FileJson size={15} />
                  JSON
                </button>
                <button
                  className="button secondary small"
                  onClick={async () => {
                    try {
                      const url = new URL(window.location.href);
                      url.searchParams.set("model", id!);
                      await navigator.clipboard.writeText(url.toString());
                      toast.success("Model link copied");
                    } catch {
                      toast.error("Could not access the clipboard.");
                    }
                  }}
                >
                  Copy model link
                </button>
              </div>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="detail-tabs">
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="decisions">Decisions & XRL</TabsTrigger>
                  <TabsTrigger value="policy">Policy explorer</TabsTrigger>
                  <TabsTrigger value="setup">Configuration</TabsTrigger>
                </TabsList>
                <TabsContent value="performance">
                  <MetricGrid r={r} />
                  <div className="panel">
                    <div className="section-title">
                      <h3>Portfolio performance</h3>
                      <span>
                        <i />
                        Agent <i className="muted-dot" />
                        Buy & hold
                      </span>
                    </div>
                    <EquityChart result={r} />
                    <div className="chart-caption">
                      Independent test: {r.split.test.join(" — ")} · Transaction
                      and closing costs included
                    </div>
                  </div>
                  <div className="stat-table">
                    <div>
                      Buy & hold return
                      <strong>{pct(r.metrics.baselineReturn)}</strong>
                    </div>
                    <div>
                      Sortino ratio
                      <strong>{r.metrics.sortino.toFixed(2)}</strong>
                    </div>
                    <div>
                      Executed orders, including final close
                      <strong>{r.metrics.trades}</strong>
                    </div>
                    <div>
                      Transaction costs<strong>{money(r.metrics.costs)}</strong>
                    </div>
                    <div>
                      Turnover / initial capital
                      <strong>{r.metrics.turnover.toFixed(2)}×</strong>
                    </div>
                    <div>
                      Decisions logged<strong>{r.decisions.length}</strong>
                    </div>
                  </div>
                  <div className="notice">
                    <Info size={17} />
                    <p>
                      {r.source.startsWith("Synthetic")
                        ? "This experiment uses deterministic synthetic prices. Its returns are demonstration results, not historical performance."
                        : "User-supplied data; source and price adjustments have not been independently verified."}
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="decisions">
                  <div className="decision-picker">
                    <Label>Select a decision</Label>
                    <Picker
                      label="Decision timestamp"
                      value={String(decision)}
                      onChange={(v) => setDecision(Number(v))}
                      items={r.decisions.map((d, i) => ({
                        value: String(i),
                        label: `${d.date} · ${ACTIONS[d.action]} · ${money(d.equity)}`,
                      }))}
                    />
                  </div>
                  <div className="decision-summary">
                    <div>
                      <span>Action</span>
                      <strong className="positive">
                        {ACTIONS[r.decisions[decision].action]}
                      </strong>
                    </div>
                    <div>
                      <span>Execution price</span>
                      <strong>${r.decisions[decision].price.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Next-step reward</span>
                      <strong>{pct(r.decisions[decision].reward * 100)}</strong>
                    </div>
                  </div>
                  <div className="score-row">
                    {r.decisions[decision].scores.map((score, i) => (
                      <div
                        key={i}
                        className={
                          i === r.decisions[decision].action ? "chosen" : ""
                        }
                      >
                        <span>{ACTIONS[i]}</span>
                        <strong>
                          {r.config.algorithm === "PPO"
                            ? `${(score * 100).toFixed(1)}%`
                            : score.toFixed(4)}
                        </strong>
                        <small>
                          {r.config.algorithm === "PPO"
                            ? "Action probability"
                            : "Q-value"}
                        </small>
                      </div>
                    ))}
                  </div>
                  <div className="panel">
                    <div className="section-title">
                      <h3>
                        Why{" "}
                        {ACTIONS[r.decisions[decision].action].toLowerCase()}?
                      </h3>
                      <Tabs value={method} onValueChange={setMethod}>
                        <TabsList>
                          <TabsTrigger value="SHAP">SHAP</TabsTrigger>
                          <TabsTrigger value="IG">
                            Integrated gradients
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                    {loadingExplanation ? (
                      <Busy text="Explaining the selected decision…" />
                    ) : (
                      explanation && (
                        <>
                          <p className="muted-copy">
                            Contributions to{" "}
                            {r.config.algorithm === "PPO" ? "P" : "Q"}(
                            {ACTIONS[r.decisions[decision].action]}) relative to
                            the zero-feature baseline.
                          </p>
                          <div className="attribution-list">
                            {FEATURES.map((f, i) => {
                              const values =
                                  method === "SHAP"
                                    ? explanation.shap
                                    : explanation.ig,
                                v = values[i],
                                max = Math.max(
                                  ...values.map(Math.abs),
                                  0.00001,
                                );
                              return (
                                <div className="attribution-row" key={f}>
                                  <span>{f}</span>
                                  <div className="attribution-track">
                                    <div
                                      style={{
                                        width: `${(Math.abs(v) / max) * 100}%`,
                                        background:
                                          v >= 0 ? "#449b7a" : "#c4808a",
                                      }}
                                    />
                                  </div>
                                  <strong>
                                    {v >= 0 ? "+" : ""}
                                    {v.toFixed(4)}
                                  </strong>
                                </div>
                              );
                            })}
                          </div>
                          <div className="xrl-grid">
                            <div>
                              <span>Top-3 agreement</span>
                              <strong>
                                {explanation.stability.topKAgreement.toFixed(1)}
                                %
                              </strong>
                            </div>
                            <div>
                              <span>Rank correlation</span>
                              <strong>
                                {explanation.stability.spearman.toFixed(3)}
                              </strong>
                            </div>
                            <div>
                              <span>Top-2 removal Δ</span>
                              <strong>{explanation.topDelta.toFixed(4)}</strong>
                            </div>
                            <div>
                              <span>Bottom-2 removal Δ</span>
                              <strong>
                                {explanation.bottomDelta.toFixed(4)}
                              </strong>
                            </div>
                          </div>
                          <p className="form-note">
                            Stability and perturbation metrics refer to SHAP.
                            Five seeded baseline perturbations; top-k uses
                            absolute attributions. These are local diagnostics,
                            not a global quality score.
                          </p>
                        </>
                      )
                    )}
                  </div>
                  <div className="panel">
                    <h3>Observed state (scaled)</h3>
                    <div className="stat-table">
                      {FEATURES.map((f, i) => (
                        <div key={f}>
                          {f}
                          <strong>
                            {r.decisions[decision].state[i].toFixed(4)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() =>
                      download(
                        "decisions.csv",
                        "date,action,price,position,reward,equity\n" +
                          r.decisions
                            .map((d) =>
                              [
                                d.date,
                                ACTIONS[d.action],
                                d.price,
                                d.position,
                                d.reward,
                                d.equity,
                              ].join(","),
                            )
                            .join("\n"),
                        "text/csv",
                      )
                    }
                  >
                    <Download size={15} />
                    Export decision log
                  </button>
                </TabsContent>
                <TabsContent value="policy">
                  <div className="panel">
                    <div className="section-title">
                      <h3>
                        <GitBranch size={18} />
                        Global policy surrogate
                      </h3>
                      <span>Decision tree</span>
                    </div>
                    <p className="muted-copy">
                      A small tree fitted to the agent’s training decisions.
                      Agreement is measured on independent test states.
                    </p>
                    <div className="xrl-grid">
                      <div>
                        <span>Action agreement</span>
                        <strong>{r.evaluation.agreement.toFixed(1)}%</strong>
                      </div>
                      <div>
                        <span>Tree depth</span>
                        <strong>{r.evaluation.depth}</strong>
                      </div>
                      <div>
                        <span>Nodes</span>
                        <strong>{r.evaluation.nodes}</strong>
                      </div>
                      <div>
                        <span>Features used</span>
                        <strong>{r.evaluation.usedFeatures}</strong>
                      </div>
                    </div>
                    <TreeRules tree={r.tree} />
                  </div>
                  <div className="panel">
                    <h3>Financial fidelity</h3>
                    <div className="stat-table">
                      <div>
                        Agent return
                        <strong>{pct(r.metrics.totalReturn)}</strong>
                      </div>
                      <div>
                        Surrogate return
                        <strong>
                          {pct(r.evaluation.treeMetrics.totalReturn)}
                        </strong>
                      </div>
                      <div>
                        Agent Sharpe
                        <strong>{r.metrics.sharpe.toFixed(2)}</strong>
                      </div>
                      <div>
                        Surrogate Sharpe
                        <strong>
                          {r.evaluation.treeMetrics.sharpe.toFixed(2)}
                        </strong>
                      </div>
                    </div>
                    <p className="form-note">
                      The tree is backtested independently, including its own
                      position history and transaction costs.
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="setup">
                  <div className="panel">
                    <h3>Reproducibility record</h3>
                    <div className="stat-table">
                      {[
                        ["Algorithm", r.config.algorithm],
                        ["Data source", r.source],
                        ["Network", "6 inputs → 12 tanh → 3 outputs"],
                        ["Seed", String(r.config.seed)],
                        ["Episodes", String(r.config.episodes)],
                        [
                          "Transaction cost",
                          `${(r.config.fee * 100).toFixed(2)}% per order`,
                        ],
                        ["Action space", "Buy / Hold / Sell · long or cash"],
                        ["Reward", "Net portfolio return per step"],
                        ["Checkpoint selection", "Highest validation return"],
                        ["Train", r.split.train.join(" — ")],
                        ["Validation", r.split.validation.join(" — ")],
                        ["Test", r.split.test.join(" — ")],
                      ].map(([k, v]) => (
                        <div key={k}>
                          {k}
                          <strong>{v}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="hash">
                      <span>DATASET SHA-256</span>
                      <code>{r.dataHash}</code>
                    </div>
                  </div>
                  <div className="notice">
                    <ShieldCheck size={18} />
                    <p>
                      Features are constructed from past and current bars.
                      Orders execute at the current close; returns accrue over
                      the following bar. The final position is liquidated. No
                      leverage, shorting, market impact or live orders.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )
        )}
      </SheetContent>
    </Sheet>
  );
}
function TreeRules({ tree }: { tree: Tree }) {
  const rules: { path: string[]; action: number; samples: number }[] = [];
  const walk = (t: Tree, path: string[]) => {
    if (t.feature === undefined) {
      rules.push({ path, action: t.action, samples: t.samples });
      return;
    }
    walk(t.left!, [
      ...path,
      `${FEATURES[t.feature]} ≤ ${t.threshold!.toFixed(3)}`,
    ]);
    walk(t.right!, [
      ...path,
      `${FEATURES[t.feature]} > ${t.threshold!.toFixed(3)}`,
    ]);
  };
  walk(tree, []);
  return (
    <div className="tree-rules">
      {rules.map((rule, i) => (
        <div className="tree-rule" key={i}>
          <GitBranch size={17} />
          <div>
            <span>RULE {String(i + 1).padStart(2, "0")}</span>
            <p>
              {rule.path.length
                ? rule.path.join(" AND ")
                : "All observed states"}
            </p>
            <small>{rule.samples} training observations</small>
          </div>
          <strong className={`action-${rule.action}`}>
            {ACTIONS[rule.action]}
          </strong>
        </div>
      ))}
    </div>
  );
}
export function Experiments({
  experiments,
  onOpen,
  onCreate,
  onPublish,
}: {
  experiments: any[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onPublish: (id: string) => void;
}) {
  return (
    <>
      <div className="view-heading">
        <div className="eyebrow">YOUR RESEARCH, REPRODUCIBLE</div>
        <h1>Experiments</h1>
        <p>From a trading idea to evidence you can inspect and share.</p>
        <button className="button primary" onClick={onCreate}>
          <Plus size={16} />
          Create experiment
        </button>
      </div>
      {!experiments.length ? (
        <div className="empty-panel">
          <FlaskConical size={38} />
          <h2>Your first discovery starts here.</h2>
          <p>
            Train a PPO or DQN agent, or run a private backtest of a marketplace
            model.
          </p>
          <button className="button primary" onClick={onCreate}>
            <Plus size={16} />
            Create your first experiment
          </button>
        </div>
      ) : (
        <div className="panel table-panel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Experiment</TableHead>
                <TableHead>Algorithm</TableHead>
                <TableHead>Return</TableHead>
                <TableHead>Sharpe</TableHead>
                <TableHead>Tree agreement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {experiments.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <button className="table-name" onClick={() => onOpen(e.id)}>
                      {e.name}
                    </button>
                    <small>
                      {e.config.asset} ·{" "}
                      {new Date(e.created).toLocaleDateString()} ·{" "}
                      {e.source.startsWith("Synthetic")
                        ? "Synthetic"
                        : "Uploaded"}
                    </small>
                  </TableCell>
                  <TableCell>
                    <span className="badge">{e.config.algorithm}</span>
                  </TableCell>
                  <TableCell
                    className={
                      e.metrics.totalReturn >= 0 ? "positive" : "negative"
                    }
                  >
                    {pct(e.metrics.totalReturn)}
                  </TableCell>
                  <TableCell>{e.metrics.sharpe.toFixed(2)}</TableCell>
                  <TableCell>{e.evaluation.agreement.toFixed(1)}%</TableCell>
                  <TableCell>
                    <span className="badge neutral">
                      {e.published ? "Published" : "Private"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      className="button secondary small"
                      onClick={() =>
                        e.published ? onOpen(e.id) : onPublish(e.id)
                      }
                    >
                      {e.published ? "View" : "Publish"}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
export function Datasets({
  datasets,
  onReload,
}: {
  datasets: any[];
  onReload: () => void;
}) {
  const [name, setName] = useState(""),
    [asset, setAsset] = useState("AAPL"),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (file.size > 500000)
        throw new Error("CSV must be smaller than 500 KB.");
      const lines = (await file.text())
          .replace(/^\uFEFF/, "")
          .trim()
          .split(/\r?\n/),
        headers = lines
          .shift()!
          .toLowerCase()
          .split(",")
          .map((h) => h.trim().replace(/^"|"$/g, "")),
        required = ["date", "open", "high", "low", "close", "volume"];
      if (required.some((k) => !headers.includes(k)))
        throw new Error(
          "Required CSV columns: date, open, high, low, close, volume.",
        );
      const bars = lines
        .filter((l) => l.trim())
        .map((line) => {
          const cols = line
            .split(",")
            .map((s) => s.trim().replace(/^"|"$/g, ""));
          return Object.fromEntries(
            required.map((k) => [
              k,
              k === "date"
                ? cols[headers.indexOf(k)]
                : Number(cols[headers.indexOf(k)]),
            ]),
          );
        });
      await api("/api/datasets", { name, asset, bars });
      toast.success("Dataset imported");
      setName("");
      setFile(null);
      onReload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="view-heading">
        <div className="eyebrow">THE FOUNDATION OF EVERY EXPERIMENT</div>
        <h1>Market datasets</h1>
        <p>
          Bring your own daily OHLCV data, or explore with a reproducible
          sample.
        </p>
      </div>
      <div className="dataset-layout">
        <div className="panel">
          <h3>Built-in demonstration datasets</h3>
          <p className="muted-copy">
            756 synthetic daily bars per asset. Seeded generation; no external
            price feed.
          </p>
          {assets.map((a) => (
            <div className="dataset-row" key={a}>
              <div className="dataset-icon">
                <Database size={19} />
              </div>
              <div>
                <strong>{a}</strong>
                <small>Daily · 756 rows · 60 / 20 / 20 split</small>
              </div>
              <a
                className="button secondary small"
                href={`/api/datasets?asset=${a}`}
                download
              >
                <Download size={14} />
                CSV
              </a>
            </div>
          ))}
          {datasets.length > 0 && (
            <>
              <h3 className="mt-6">Your datasets</h3>
              {datasets.map((d) => (
                <div className="dataset-row" key={d.id}>
                  <Database size={19} />
                  <div>
                    <strong>{d.name}</strong>
                    <small>
                      {d.asset} · imported{" "}
                      {new Date(d.created).toLocaleDateString()}
                    </small>
                  </div>
                  <span className="badge neutral">Ready</span>
                </div>
              ))}
            </>
          )}
        </div>
        <form className="panel dataset-form" onSubmit={upload}>
          <div className="dialog-icon">
            <Upload size={23} />
          </div>
          <h3>Import your market data</h3>
          <p className="muted-copy">
            150–1,500 daily bars, ordered by date. Use adjusted OHLC prices with
            consistent units.
          </p>
          <div className="field">
            <Label htmlFor="dataset-name">Dataset name</Label>
            <Input
              id="dataset-name"
              required
              minLength={3}
              maxLength={80}
              placeholder="AAPL daily · adjusted prices"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <Label>Asset</Label>
            <Picker
              label="Dataset asset"
              value={asset}
              onChange={setAsset}
              items={assets.map((v) => ({ value: v, label: v }))}
            />
          </div>
          <div className="field upload-box">
            <Label htmlFor="dataset-file">OHLCV CSV</Label>
            <input
              id="dataset-file"
              type="file"
              required
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <small>
              date, open, high, low, close, volume
              <br />
              ISO dates (YYYY-MM-DD) · Maximum 500 KB
            </small>
          </div>
          <ErrorBox message={error} />
          <button className="button primary submit" disabled={busy}>
            {busy ? (
              <Loader2 className="spin" size={16} />
            ) : (
              <Upload size={16} />
            )}
            Import dataset
          </button>
        </form>
      </div>
    </>
  );
}
export function Compare({
  models,
  selected,
  onSelect,
  onOpen,
}: {
  models: Listing[];
  selected: string[];
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const [results, setResults] = useState<Record<string, ResearchResult>>({}),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setError("");
    Promise.all(
      selected.map(async (id) => [id, await api(`/api/models/${id}`)] as const),
    )
      .then((entries) => {
        if (live) setResults(Object.fromEntries(entries));
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [selected.join(",")]);
  const chosen = models.filter((m) => selected.includes(m.id));
  return (
    <>
      <div className="view-heading">
        <div className="eyebrow">LOOK AT THE WHOLE PICTURE</div>
        <h1>Compare the evidence.</h1>
        <p>
          Financial performance and explainability, side by side. Select up to
          three models.
        </p>
      </div>
      <div className="compare-choices">
        {models.map((m) => (
          <button
            key={m.id}
            className={`compare-chip ${selected.includes(m.id) ? "selected" : ""}`}
            onClick={() => onSelect(m.id)}
          >
            {selected.includes(m.id) ? <Check size={15} /> : <Plus size={15} />}{" "}
            {m.name}
          </button>
        ))}
      </div>
      <ErrorBox message={error} />
      {chosen.length < 2 ? (
        <div className="empty-panel">
          <GitCompareArrows size={38} />
          <h2>Select at least two models.</h2>
          <p>Choose models above, or add them from the marketplace.</p>
        </div>
      ) : (
        <>
          <div className="notice">
            <Info size={18} />
            <p>
              {new Set(chosen.map((m) => m.asset)).size > 1
                ? "These models trade different assets. Returns are not directly comparable; run them on the same dataset and configuration for a controlled comparison."
                : "For controlled research, confirm that test periods, fees and datasets match in the configuration records."}
            </p>
          </div>
          <div className="panel table-panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evaluation metric</TableHead>
                  {chosen.map((m) => (
                    <TableHead key={m.id}>
                      <button
                        className="table-name"
                        onClick={() => onOpen(m.id)}
                      >
                        {m.name}
                      </button>
                      <small>
                        {m.algorithm} · {m.asset}
                      </small>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  "Total return",
                  "Sharpe ratio",
                  "Sortino ratio",
                  "Max. drawdown",
                  "Executed orders",
                  "Transaction costs",
                  "Buy & hold",
                  "Tree action agreement",
                  "Tree Sharpe",
                  "Tree depth",
                  "Tree nodes",
                  "Data source",
                ].map((label, i) => (
                  <TableRow key={label}>
                    <TableCell>{label}</TableCell>
                    {chosen.map((m) => {
                      const r = results[m.id];
                      const values = r
                        ? [
                            pct(r.metrics.totalReturn),
                            r.metrics.sharpe.toFixed(2),
                            r.metrics.sortino.toFixed(2),
                            `${r.metrics.maxDrawdown.toFixed(2)}%`,
                            r.metrics.trades,
                            money(r.metrics.costs),
                            pct(r.metrics.baselineReturn),
                            `${r.evaluation.agreement.toFixed(1)}%`,
                            r.evaluation.treeMetrics.sharpe.toFixed(2),
                            r.evaluation.depth,
                            r.evaluation.nodes,
                            r.source,
                          ]
                        : [];
                      return (
                        <TableCell key={m.id}>{r ? values[i] : "…"}</TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </>
  );
}
export function PublishDialog({
  id,
  onClose,
  onDone,
}: {
  id: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [creator, setCreator] = useState(""),
    [description, setDescription] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="dialog-icon">
            <Workflow size={24} />
          </div>
          <DialogTitle>Let your evidence speak.</DialogTitle>
          <DialogDescription>
            List this experiment in this site’s marketplace. Other permitted
            visitors can inspect results and run tests; weights remain private.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api(`/api/models/${id}`, { creator, description }, "PATCH");
              toast.success("Model published to the marketplace");
              onDone();
              onClose();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="field">
            <Label htmlFor="creator">Creator or team</Label>
            <Input
              id="creator"
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              required
              minLength={2}
              maxLength={60}
            />
          </div>
          <div className="field">
            <Label htmlFor="description">Strategy description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={20}
              maxLength={500}
              rows={4}
              placeholder="Explain the model’s approach and its limitations."
            />
          </div>
          <div className="notice">
            <Info size={17} />
            <p>
              This MVP supports free model testing. Service subscriptions and
              payments are not enabled.
            </p>
          </div>
          <ErrorBox message={error} />
          <button className="button primary submit" disabled={busy}>
            {busy ? (
              <Loader2 className="spin" size={16} />
            ) : (
              <Upload size={16} />
            )}
            Publish model
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function Documentation({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="research-dialog">
        <DialogHeader>
          <DialogTitle>Research protocol</DialogTitle>
          <DialogDescription>
            What is calculated, and what the results mean.
          </DialogDescription>
        </DialogHeader>
        <div className="documentation">
          <h3>A compact, working research engine</h3>
          <p>
            Native TypeScript DQN uses experience replay and a target network.
            PPO uses a stochastic policy, a value critic, generalized advantage
            estimation and a clipped probability-ratio objective. Both use a 6 →
            12 tanh → 3 network.
          </p>
          <h3>Chronological evaluation</h3>
          <p>
            60% training, 20% checkpoint selection, 20% untouched test.
            Indicators only use current and earlier observations. Buy enters a
            full long position, sell moves to cash, and hold preserves the
            position. Costs apply on position changes and final liquidation.
            Sharpe and Sortino use 252 trading days and a zero risk-free rate.
          </p>
          <h3>Explanations with explicit targets</h3>
          <p>
            Exact single-reference Shapley values enumerate all 64 feature
            subsets. Integrated gradients uses 64 integration points and central
            finite-difference gradients. Targets are Q(action) for DQN and
            P(action) for PPO. A zero state is a diagnostic reference, not a
            plausible market scenario.
          </p>
          <h3>Quality, not just a colorful chart</h3>
          <p>
            Local SHAP stability compares five seeded background perturbations.
            Perturbation fidelity compares top-two and bottom-two feature
            removal. The CART-style tree fits training decisions, reports test
            action agreement, and is independently backtested. A simple or
            constant policy can have high agreement without being a useful
            trading strategy.
          </p>
          <h3>Model import</h3>
          <p>
            Safe JSON checkpoints expose arrays w[12][6], b[12], v[3][12], c[3].
            The output is Q-values for DQN and logits for PPO. Only finite
            bounded weights are accepted. Arbitrary code, .pt and SB3 .zip
            execution are intentionally not hosted.
          </p>
          <h3>MVP boundaries</h3>
          <p>
            Sample prices are synthetic. CSV uploads accept daily OHLCV;
            verification of data sources and corporate-action adjustments
            remains with the researcher. No live trading, broker connection,
            billing or GPU training. This is a research implementation, not a
            validated investment service.
          </p>
          <div className="reference-links">
            <a
              href="https://arxiv.org/abs/1707.06347"
              target="_blank"
              rel="noreferrer"
            >
              PPO paper
            </a>
            <a
              href="https://arxiv.org/abs/1703.01365"
              target="_blank"
              rel="noreferrer"
            >
              Integrated gradients
            </a>
            <a
              href="https://lucide.dev/license"
              target="_blank"
              rel="noreferrer"
            >
              Lucide icons · ISC
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
