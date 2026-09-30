import { owner, resultById, apiError, InputError } from "@/lib/repository";
import { explain, rng } from "@/lib/engine";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await owner(),
      { id } = await params,
      r = await resultById(id, u.userId),
      index = Number(new URL(request.url).searchParams.get("decision") || 0);
    if (!Number.isInteger(index) || index < 0 || index >= r.decisions.length)
      throw new InputError("Invalid decision index.");
    const d = r.decisions[index],
      e = explain(r.network, d.state, r.config.algorithm, d.action),
      random = rng(72);
    const variants = Array.from(
      { length: 5 },
      () =>
        explain(
          r.network,
          d.state,
          r.config.algorithm,
          d.action,
          Array.from({ length: 6 }, () => (random() - 0.5) * 0.1),
        ).shap,
    );
    const rank = (v: number[]) =>
      v
        .map((a, i) => ({ v: Math.abs(a), i }))
        .sort((a, b) => b.v - a.v)
        .map((x) => x.i);
    const base = rank(e.shap),
      agreement =
        variants.reduce(
          (s, v) =>
            s +
            rank(v)
              .slice(0, 3)
              .filter((i) => base.slice(0, 3).includes(i)).length /
              3,
          0,
        ) / 5;
    const variance = e.shap.map((_, i) => {
      const avg = variants.reduce((s, v) => s + v[i], 0) / 5;
      return variants.reduce((s, v) => s + (v[i] - avg) ** 2, 0) / 5;
    });
    const correlation =
      variants.reduce(
        (s, v) =>
          s +
          1 -
          (6 *
            base.reduce(
              (sum, i, j) => sum + (j - rank(v).indexOf(i)) ** 2,
              0,
            )) /
            (6 * (36 - 1)),
        0,
      ) / 5;
    return Response.json({
      ...e,
      stability: {
        topKAgreement: agreement * 100,
        spearman: correlation,
        variance,
        backgrounds: 5,
      },
      method:
        "Exact single-reference Shapley values; 64-point integrated gradients; fixed zero baseline. Stability varies baseline ±0.05.",
    });
  } catch (e) {
    return apiError(e);
  }
}
