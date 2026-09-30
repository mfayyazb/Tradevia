import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { catalog, type Listing } from "./catalog";
import { type Result, type Bar, sampleData } from "./engine";
import atlas from "@/data/atlas.json";
import sentinel from "@/data/sentinel.json";
import nexus from "@/data/nexus.json";
import vector from "@/data/vector.json";
import pulse from "@/data/pulse.json";
import prism from "@/data/prism.json";
export const builtins: Record<string, Result> = {
  atlas,
  sentinel,
  nexus,
  vector,
  pulse,
  prism,
} as Record<string, Result>;
export function db() {
  if (!env.DB)
    throw new Error("Research storage is unavailable. Please retry shortly.");
  return env.DB;
}
export async function owner() {
  const u = await getChatGPTUser();
  if (!u) throw new AccessError("Sign in to use your research workspace.");
  return u;
}
export class AccessError extends Error {}
export class InputError extends Error {}
export async function resultById(id: string, user: string): Promise<Result> {
  if (builtins[id]) return builtins[id];
  const row = await db()
    .prepare(
      "SELECT result FROM experiments WHERE id = ? AND (owner = ? OR published = 1)",
    )
    .bind(id, user)
    .first<{ result: string }>();
  if (!row) throw new InputError("Model or experiment not found.");
  return JSON.parse(row.result);
}
export async function datasetById(
  id: string | undefined,
  asset: string,
  user: string,
): Promise<{ bars: Bar[]; source: string }> {
  if (!id || id === "sample")
    return { bars: sampleData(asset), source: "Synthetic demonstration data" };
  const row = await db()
    .prepare(
      "SELECT bars, name, asset FROM datasets WHERE id = ? AND owner = ?",
    )
    .bind(id, user)
    .first<{ bars: string; name: string; asset: string }>();
  if (!row) throw new InputError("Dataset not found in your workspace.");
  if (row.asset !== asset)
    throw new InputError("Dataset asset does not match the experiment.");
  return { bars: JSON.parse(row.bars), source: row.name };
}
export function publicResult(r: Result) {
  const { network, ...rest } = r;
  return rest;
}
export function listing(
  id: string,
  r: Result,
  description: string,
  creator: string,
): Listing {
  return {
    id,
    name: r.config.name,
    algorithm: r.config.algorithm,
    asset: r.config.asset,
    style: "Community research",
    color: r.config.algorithm === "PPO" ? "emerald" : "blue",
    icon: r.config.algorithm === "PPO" ? "orbit" : "shield",
    creator,
    description,
    seed: r.config.seed,
    metrics: r.metrics,
    curve: r.decisions.map((d) => d.equity),
    sample: r.source.startsWith("Synthetic"),
    experimentId: id,
  };
}
export function apiError(error: unknown) {
  console.error("TradeXRL API:", error);
  return Response.json(
    {
      error:
        error instanceof AccessError || error instanceof InputError
          ? error.message
          : "Unable to complete this request. Your input is preserved; please retry.",
    },
    {
      status:
        error instanceof AccessError
          ? 401
          : error instanceof InputError
            ? 400
            : 503,
    },
  );
}
export async function payload(request: Request) {
  if (Number(request.headers.get("content-length")) > 500000)
    throw new InputError("File is too large (maximum 500 KB).");
  const text = await request.text();
  if (text.length > 500000)
    throw new InputError("File is too large (maximum 500 KB).");
  try {
    return JSON.parse(text);
  } catch {
    throw new InputError("Invalid JSON request.");
  }
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new AccessError("Cross-origin write rejected.");
}
