import { owner, db, listing, apiError, publicResult } from "@/lib/repository";
import type { Result } from "@/lib/engine";
export async function GET() {
  try {
    const u = await owner();
    const [experiments, datasets, saved, published] = await Promise.all([
      db()
        .prepare(
          "SELECT id, name, created, published, result FROM experiments WHERE owner = ? ORDER BY created DESC LIMIT 100",
        )
        .bind(u.userId)
        .all(),
      db()
        .prepare(
          "SELECT id, name, asset, created FROM datasets WHERE owner = ? ORDER BY created DESC",
        )
        .bind(u.userId)
        .all(),
      db()
        .prepare("SELECT model FROM bookmarks WHERE owner = ?")
        .bind(u.userId)
        .all(),
      db()
        .prepare(
          "SELECT id, result, description, creator FROM experiments WHERE published = 1 ORDER BY created DESC LIMIT 100",
        )
        .all(),
    ]);
    return Response.json({
      user: u.fullName || "My research",
      experiments: experiments.results.map((row: any) => {
        const r = JSON.parse(row.result) as Result;
        return {
          id: row.id,
          name: row.name,
          created: row.created,
          published: row.published,
          config: r.config,
          metrics: r.metrics,
          evaluation: r.evaluation,
          source: r.source,
        };
      }),
      datasets: datasets.results,
      saved: saved.results.map((r: any) => r.model),
      models: published.results.map((row: any) =>
        listing(row.id, JSON.parse(row.result), row.description, row.creator),
      ),
    });
  } catch (e) {
    return apiError(e);
  }
}
