export const assets = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL"] as const;
export const catalog = [
  {
    id: "atlas",
    name: "Atlas Momentum",
    algorithm: "PPO",
    asset: "AAPL",
    style: "Momentum",
    color: "emerald",
    icon: "orbit",
    creator: "TradeXRL Research",
    description:
      "A patient approach to market momentum. Learns when to participate and when to stay in cash.",
    seed: 42,
  },
  {
    id: "sentinel",
    name: "Sentinel DQN",
    algorithm: "DQN",
    asset: "MSFT",
    style: "Adaptive allocation",
    color: "blue",
    icon: "shield",
    creator: "TradeXRL Research",
    description:
      "A value-based agent that weighs every buy, hold and sell decision against future rewards.",
    seed: 17,
  },
  {
    id: "nexus",
    name: "Nexus Alpha",
    algorithm: "PPO",
    asset: "NVDA",
    style: "Growth",
    color: "violet",
    icon: "network",
    creator: "TradeXRL Research",
    description:
      "Explores growth opportunities through a continuously updated, probabilistic trading policy.",
    seed: 73,
  },
  {
    id: "vector",
    name: "Vector Balance",
    algorithm: "DQN",
    asset: "AMZN",
    style: "Balanced",
    color: "amber",
    icon: "layers",
    creator: "TradeXRL Research",
    description:
      "Combines price, volume and volatility signals in a compact and fully inspectable neural agent.",
    seed: 31,
  },
  {
    id: "pulse",
    name: "Pulse Trader",
    algorithm: "PPO",
    asset: "GOOGL",
    style: "Trend following",
    color: "cyan",
    icon: "activity",
    creator: "TradeXRL Research",
    description:
      "A policy-gradient agent designed to learn changing price patterns one decision at a time.",
    seed: 91,
  },
  {
    id: "prism",
    name: "Prism Quant",
    algorithm: "DQN",
    asset: "AAPL",
    style: "Systematic",
    color: "rose",
    icon: "hexagon",
    creator: "TradeXRL Research",
    description:
      "A transparent baseline for systematic research, with decision-level attribution and policy rules.",
    seed: 108,
  },
] as const;
export type Listing = {
  id: string;
  name: string;
  algorithm: "DQN" | "PPO";
  asset: string;
  style: string;
  color: string;
  icon: string;
  creator: string;
  description: string;
  seed: number;
  metrics?: Metrics;
  curve?: number[];
  sample?: boolean;
  experimentId?: string;
};
export type Metrics = {
  totalReturn: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  trades: number;
  turnover: number;
  costs: number;
  finalValue: number;
  baselineReturn: number;
};
