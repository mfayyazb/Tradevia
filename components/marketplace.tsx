"use client";
import { useState, useEffect, useCallback } from "react";
import {
  api,
  TrainDialog,
  ModelDetail,
  Experiments,
  Datasets,
  Compare,
  PublishDialog,
  Documentation,
  Busy,
  type ResearchResult,
} from "./research";
import {
  Activity,
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Database,
  FlaskConical,
  GitCompareArrows,
  Hexagon,
  Layers3,
  LayoutGrid,
  List,
  LockKeyhole,
  Network,
  Orbit,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Toaster, toast } from "sonner";
import { type Listing } from "@/lib/catalog";

export const icons: Record<string, typeof Orbit> = {
  orbit: Orbit,
  shield: ShieldCheck,
  network: Network,
  layers: Layers3,
  activity: Activity,
  hexagon: Hexagon,
};
export const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
export function Sparkline({
  values,
  color = "var(--green)",
  large = false,
}: {
  values: number[];
  color?: string;
  large?: boolean;
}) {
  const lo = Math.min(...values) * 0.997,
    hi = Math.max(...values) * 1.003;
  const points = values
    .map(
      (v, i) =>
        `${(i / (values.length - 1)) * 500},${(1 - (v - lo) / (hi - lo)) * 110}`,
    )
    .join(" ");
  return (
    <svg
      viewBox="0 0 500 115"
      preserveAspectRatio="none"
      role="img"
      aria-label="Test period portfolio equity"
      className={large ? "sparkline large" : "sparkline"}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={large ? 2 : 2.4}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Picker({
  value,
  onChange,
  items,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function ModelCard({
  model,
  onOpen,
  onTest,
  onSave,
  saved = false,
  onCompare,
  selected = false,
}: {
  model: Listing;
  onOpen: () => void;
  onTest: () => void;
  onSave: () => void;
  saved?: boolean;
  onCompare: () => void;
  selected?: boolean;
}) {
  const Icon = icons[model.icon] || Orbit;
  return (
    <article className={`model-card ${selected ? "compare-selected" : ""}`}>
      <div className="card-top">
        <div className={`model-symbol ${model.color}`}>
          <Icon size={26} strokeWidth={1.65} />
        </div>
        <span className="model-type">{model.algorithm}</span>
        <button
          className={`icon-button bookmark ${saved ? "saved" : ""}`}
          onClick={onSave}
          aria-label={`${saved ? "Unsave" : "Save"} ${model.name}`}
        >
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <button className="model-title" onClick={onOpen}>
        {model.name}
      </button>
      <div className="creator">
        by {model.creator}
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <ShieldCheck size={14} />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {model.sample
              ? "Built-in research example"
              : "Published by a workspace member"}
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="model-description">{model.description}</p>
      <div className="tag-row">
        <span>{model.asset}</span>
        <span>{model.style}</span>
        <span className="explainable">
          <Workflow size={11} />
          Explainable
        </span>
      </div>
      <div className="card-metrics">
        <div>
          <span>Test return</span>
          <strong
            className={
              (model.metrics?.totalReturn ?? 0) >= 0 ? "positive" : "negative"
            }
          >
            {model.metrics ? pct(model.metrics.totalReturn) : "—"}
          </strong>
        </div>
        <div>
          <span>Sharpe ratio</span>
          <strong>{model.metrics?.sharpe.toFixed(2) ?? "—"}</strong>
        </div>
        <div>
          <span>Max. drawdown</span>
          <strong>
            {model.metrics ? `−${model.metrics.maxDrawdown.toFixed(2)}%` : "—"}
          </strong>
        </div>
      </div>
      {model.curve && (
        <Sparkline
          values={model.curve}
          color={
            (model.metrics?.totalReturn ?? 0) >= 0 ? "var(--green)" : "#cf6b77"
          }
        />
      )}
      <div className="card-bottom">
        <span className="free-label">
          <span />
          Free to test
        </span>
        <button
          className={`icon-button ${selected ? "saved" : ""}`}
          aria-label={`Compare ${model.name}`}
          onClick={onCompare}
        >
          <GitCompareArrows size={17} />
        </button>
        <button className="button small secondary" onClick={onTest}>
          <FlaskConical size={14} />
          Run backtest
        </button>
      </div>
    </article>
  );
}

export default function Marketplace({
  initialModels,
}: {
  initialModels: Listing[];
}) {
  const [view, setView] = useState("Marketplace"),
    [query, setQuery] = useState(""),
    [algorithm, setAlgorithm] = useState("all"),
    [sort, setSort] = useState("featured"),
    [tab, setTab] = useState("all"),
    [saved, setSaved] = useState<string[]>([]),
    [compare, setCompare] = useState<string[]>([]),
    [layout, setLayout] = useState("grid");
  const [workspace, setWorkspace] = useState<{
      experiments: any[];
      datasets: any[];
      models: Listing[];
      user: string;
    }>({ experiments: [], datasets: [], models: [], user: "My research" }),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [detail, setDetail] = useState<string | null>(null),
    [training, setTraining] = useState(false),
    [testModel, setTestModel] = useState<Listing | null>(null),
    [publishing, setPublishing] = useState<string | null>(null),
    [docs, setDocs] = useState(false);
  const reload = useCallback(async () => {
    setLoadError("");
    try {
      const w = await api("/api/workspace");
      setWorkspace(w);
      setSaved(w.saved);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload();
    const id = new URL(window.location.href).searchParams.get("model");
    if (id) setDetail(id);
  }, [reload]);
  const models = [...initialModels, ...workspace.models];
  const save = async (id: string) => {
    try {
      const next = !saved.includes(id);
      await api("/api/bookmarks", { id, saved: next });
      setSaved((s) => (next ? [...s, id] : s.filter((x) => x !== id)));
      toast.success(
        next
          ? "Model saved to your workspace"
          : "Model removed from saved items",
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const startTest = (m: Listing) => {
    setTestModel(m);
    setTraining(true);
  };
  const create = () => {
    setTestModel(null);
    setTraining(true);
  };
  const navigate = (name: string) => {
    setView(name);
    setTab(name === "Saved models" ? "saved" : "all");
  };
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "search_trading_models",
          title: "Search trading models",
          description:
            "Filter the visible marketplace by model name, asset, or strategy.",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
          execute: async (input: any) => {
            if (typeof input?.query !== "string" || input.query.length > 100)
              throw new Error(
                "query must be a string of at most 100 characters",
              );
            setView("Marketplace");
            setQuery(input.query);
            setTab("all");
            setAlgorithm("all");
            const matches = models.filter((m) =>
              [m.name, m.asset, m.description]
                .join(" ")
                .toLowerCase()
                .includes(input.query.toLowerCase()),
            );
            return {
              models: matches.map((m) => ({
                id: m.id,
                name: m.name,
                algorithm: m.algorithm,
                asset: m.asset,
              })),
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [workspace.models]);
  const filtered = models
    .filter(
      (m) =>
        (!query ||
          `${m.name} ${m.asset} ${m.description}`
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (algorithm === "all" || m.algorithm === algorithm) &&
        (tab !== "saved" || saved.includes(m.id)),
    )
    .sort((a, b) =>
      sort === "return"
        ? (b.metrics?.totalReturn ?? 0) - (a.metrics?.totalReturn ?? 0)
        : sort === "sharpe"
          ? (b.metrics?.sharpe ?? 0) - (a.metrics?.sharpe ?? 0)
          : 0,
    );
  const choose = (id: string) => {
    if (!compare.includes(id) && compare.length >= 3) {
      toast.info('Select up to three models for comparison.');
      return;
    }
    setCompare((s) =>
      s.includes(id)
        ? s.filter((x) => x !== id)
        : s.length < 3
          ? [...s, id]
          : s,
    );
  };
  const open = (m: Listing) => setDetail(m.id);
  return (
    <TooltipProvider>
      <SidebarProvider
        style={{ "--sidebar-width": "244px" } as React.CSSProperties}
      >
        <Sidebar className="app-sidebar">
          <SidebarHeader className="brand">
            <div className="brand-mark">
              <Activity size={23} />
            </div>
            <div>
              TradeXRL<span>LAB</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <div className="workspace-switch">
              <div className="workspace-icon">
                <Layers3 size={18} />
              </div>
              <div>
                Research workspace<small>Personal account</small>
              </div>
              <ChevronDown size={14} />
            </div>
            <div className="nav-label">DISCOVER</div>
            <nav>
              {[
                { name: "Marketplace", icon: LayoutGrid },
                { name: "Compare models", icon: GitCompareArrows },
              ].map((item) => (
                <button
                  key={item.name}
                  className={`nav-link ${view === item.name ? "active" : ""}`}
                  onClick={() => navigate(item.name)}
                >
                  <item.icon size={19} />
                  {item.name}
                  {item.name === "Marketplace" && (
                    <span className="nav-count">{models.length}</span>
                  )}
                </button>
              ))}
            </nav>
            <div className="nav-label">YOUR WORKSPACE</div>
            <nav>
              {[
                { name: "Experiments", icon: FlaskConical },
                { name: "Saved models", icon: Bookmark },
                { name: "Datasets", icon: Database },
              ].map((item) => (
                <button
                  key={item.name}
                  className={`nav-link ${view === item.name ? "active" : ""}`}
                  onClick={() => navigate(item.name)}
                >
                  <item.icon size={19} />
                  {item.name}
                </button>
              ))}
            </nav>
            <div className="sidebar-promo">
              <div className="promo-icon">
                <Sparkles size={20} />
              </div>
              <h3>Built something brilliant?</h3>
              <p>Give your trading agent a place to prove itself.</p>
              <button
                className="button sidebar-cta"
                onClick={() => {
                  navigate("Experiments");
                  if (!workspace.experiments.length) create();
                  else toast("Choose an experiment and select Publish.");
                }}
              >
                <Plus size={16} />
                Publish a model
              </button>
            </div>
          </SidebarContent>
          <SidebarFooter>
            <button className="nav-link" onClick={() => setDocs(true)}>
              <BookOpen size={18} />
              Documentation
            </button>
            <div className="account">
              <div className="avatar">MR</div>
              <div>
                {workspace.user}
                <small>Personal workspace</small>
              </div>
              <span className="plan">MVP</span>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="app-main">
          <header className="topbar">
            <div className="breadcrumbs">
              <SidebarTrigger />
              <span>Workspace</span>
              <ChevronRight size={14} />
              <strong>{view}</strong>
            </div>
            <div className="header-right">
              <span className="environment">
                <span />
                Research environment
              </span>
              <button
                className="icon-button"
                aria-label="About this MVP"
                onClick={() => setDocs(true)}
              >
                <CircleHelp size={19} />
              </button>
              <div className="avatar small-avatar">MR</div>
            </div>
          </header>
          <main className="main-content">
            {loadError && (
              <div role="alert" className="error-box workspace-error">
                {loadError}
                <button onClick={reload}>Retry</button>
              </div>
            )}
            {view === "Experiments" ? (
              loading ? (
                <Busy />
              ) : (
                <Experiments
                  experiments={workspace.experiments}
                  onOpen={setDetail}
                  onCreate={create}
                  onPublish={setPublishing}
                />
              )
            ) : view === "Datasets" ? (
              <Datasets datasets={workspace.datasets} onReload={reload} />
            ) : view === "Compare models" ? (
              <Compare
                models={models}
                selected={compare}
                onSelect={choose}
                onOpen={setDetail}
              />
            ) : (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">THE INTELLIGENCE MARKETPLACE</div>
                    <h1>Find your next edge.</h1>
                    <p>
                      Discover, understand, and test AI trading models. All in
                      one place.
                    </p>
                  </div>
                  <button className="button primary" onClick={create}>
                    <Plus size={17} />
                    Create experiment
                  </button>
                </div>
                <div className="feature-row">
                  <section className="featured">
                    <div className="featured-copy">
                      <div className="pill">
                        <Sparkles size={13} />
                        BUILT FOR CONVICTION
                      </div>
                      <h2>
                        Smart models.
                        <br />
                        Transparent decisions.
                      </h2>
                      <p>
                        Look beyond returns. See how your
                        <br className="desktop-only" /> next trading agent
                        actually thinks.
                      </p>
                      <button onClick={() => open(models[0])}>
                        Explore Atlas Momentum
                        <ChevronRight size={15} />
                      </button>
                    </div>
                    <div className="feature-chart">
                      <div className="feature-chart-label">
                        <span>ATLAS MOMENTUM</span>
                        <span className="chart-tag">PPO</span>
                      </div>
                      <strong>
                        {pct(models[0].metrics!.totalReturn)}
                        <small>test period return</small>
                      </strong>
                      <Sparkline
                        values={models[0].curve!}
                        large
                        color="#53d6b0"
                      />
                      <div className="chart-foot">
                        <span>Synthetic benchmark</span>
                        <span>Out-of-sample</span>
                      </div>
                    </div>
                  </section>
                  <section className="lab-intro">
                    <div className="lab-intro-head">
                      <div className="lab-icon">
                        <FlaskConical size={21} />
                      </div>
                      <span>THE LAB ADVANTAGE</span>
                    </div>
                    <h3>Test first. Decide with data.</h3>
                    <p>
                      Run a private backtest with your own assumptions. No
                      source code needed.
                    </p>
                    <div className="lab-steps">
                      <span>
                        <Check size={13} />
                        Trading costs included
                      </span>
                      <span>
                        <Check size={13} />
                        Decision-level explanations
                      </span>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => startTest(models[0])}
                    >
                      Try a model
                      <ChevronRight size={15} />
                    </button>
                  </section>
                </div>
                <div className="catalog-heading">
                  <Tabs value={tab} onValueChange={v => { setTab(v); setView(v === 'saved' ? 'Saved models' : 'Marketplace'); }}>
                    <TabsList variant="line">
                      <TabsTrigger value="all">
                        Explore models
                        <span className="count-badge">{models.length}</span>
                      </TabsTrigger>
                      <TabsTrigger value="saved">
                        Saved models
                        {saved.length > 0 && (
                          <span className="count-badge">{saved.length}</span>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <span className="catalog-note">
                    <ShieldCheck size={14} />
                    Inspectable. Reproducible. Yours to test.
                  </span>
                </div>
                <div className="filter-bar">
                  <div className="search-field">
                    <Search size={18} />
                    <input
                      aria-label="Search models"
                      placeholder="Search models, strategies, or assets..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <kbd>⌕</kbd>
                  </div>
                  <Picker
                    label="Algorithm"
                    value={algorithm}
                    onChange={setAlgorithm}
                    items={[
                      { value: "all", label: "All algorithms" },
                      { value: "PPO", label: "PPO" },
                      { value: "DQN", label: "DQN" },
                    ]}
                  />
                  <Picker
                    label="Sort models"
                    value={sort}
                    onChange={setSort}
                    items={[
                      { value: "featured", label: "Featured" },
                      { value: "return", label: "Highest return" },
                      { value: "sharpe", label: "Highest Sharpe" },
                    ]}
                  />
                  <div className="view-toggle">
                    <button
                      aria-label="Grid view"
                      aria-pressed={layout === "grid"}
                      className={layout === "grid" ? "selected" : ""}
                      onClick={() => setLayout("grid")}
                    >
                      <LayoutGrid size={17} />
                    </button>
                    <button
                      aria-label="List view"
                      aria-pressed={layout === "list"}
                      className={layout === "list" ? "selected" : ""}
                      onClick={() => setLayout("list")}
                    >
                      <List size={18} />
                    </button>
                  </div>
                </div>
                <div className="result-line">
                  <span>{filtered.length} models to explore</span>
                  <span>
                    <span className="sample-dot" />
                    Built-in models use synthetic market data
                  </span>
                </div>
                <div
                  className={`model-grid ${layout === "list" ? "list-layout" : ""}`}
                >
                  {filtered.map((m) => (
                    <ModelCard
                      key={m.id}
                      model={m}
                      onOpen={() => open(m)}
                      onTest={() => startTest(m)}
                      onSave={() => save(m.id)}
                      saved={saved.includes(m.id)}
                      selected={compare.includes(m.id)}
                      onCompare={() => choose(m.id)}
                    />
                  ))}
                </div>
                {filtered.length === 0 && (
                  <div className="empty-state">
                    <Search size={30} />
                    <h3>No models found</h3>
                    <p>
                      Try a different search or save a model to revisit it here.
                    </p>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setQuery("");
                        setAlgorithm("all");
                        setTab("all");
                      }}
                    >
                      Explore all models
                    </button>
                  </div>
                )}
              </>
            )}
            <footer className="content-footer">
              <span>
                <LockKeyhole size={13} />
                Your strategy stays yours. Your evidence speaks.
              </span>
              <span>
                Research MVP · Past simulated performance does not predict
                future returns.
              </span>
            </footer>
          </main>
        </SidebarInset>
        {compare.length > 0 && (
          <div className="compare-tray">
            <GitCompareArrows size={18} />
            <strong>{compare.length} models selected</strong>
            <button
              className="button primary small"
              onClick={() => setView("Compare models")}
            >
              Compare models
            </button>
            <button className="text-button" onClick={() => setCompare([])}>
              Clear
            </button>
          </div>
        )}
        <TrainDialog
          open={training}
          onClose={() => setTraining(false)}
          model={testModel}
          datasets={workspace.datasets}
          onComplete={(id) => {
            reload();
            setDetail(id);
          }}
        />
        <ModelDetail
          id={detail}
          onClose={() => {
            setDetail(null);
            const url = new URL(window.location.href);
            url.searchParams.delete("model");
            window.history.replaceState({}, "", url);
          }}
          onTest={(id, r) => {
            setDetail(null);
            startTest(
              models.find((m) => m.id === id) || {
                id,
                name: r.config.name,
                algorithm: r.config.algorithm,
                asset: r.config.asset,
                seed: r.config.seed,
                style: "Research",
                color: "emerald",
                icon: "orbit",
                creator: "You",
                description: "",
              },
            );
          }}
          onPublish={setPublishing}
        />
        <PublishDialog
          id={publishing}
          onClose={() => setPublishing(null)}
          onDone={() => {
            reload();
            setView("Marketplace");
            setTab("all");
          }}
        />
        <Documentation open={docs} onClose={() => setDocs(false)} />
        <Toaster richColors position="bottom-right" />
      </SidebarProvider>
    </TooltipProvider>
  );
}
