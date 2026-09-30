import {
  owner,
  db,
  apiError,
  payload,
  checkOrigin,
  InputError,
  datasetById,
  resultById,
  publicResult,
} from "@/lib/repository";
import { configSchema, networkSchema } from "@/lib/validation";
import { run } from "@/lib/engine";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const u = await owner(),
      body = await payload(request),
      parsed = configSchema.safeParse(body.config);
    if (!parsed.success)
      throw new InputError(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
    const config = parsed.data;
    let imported;
    if (body.modelId) {
      if (typeof body.modelId !== "string")
        throw new InputError("Invalid model.");
      const original = await resultById(body.modelId, u.userId);
      if (config.algorithm !== original.config.algorithm)
        throw new InputError("Algorithm must match the selected model.");
      imported = original.network;
    } else if (body.checkpoint) {
      const p = networkSchema.safeParse(body.checkpoint);
      if (!p.success)
        throw new InputError(
          "Checkpoint must be a finite 6 → 12 tanh → 3 network in the documented JSON format.",
        );
      imported = p.data;
    }
    const data = await datasetById(config.datasetId, config.asset, u.userId),
      result = await run(data.bars, config, data.source, imported),
      id = crypto.randomUUID();
    await db()
      .prepare(
        "INSERT INTO experiments (id,owner,name,result,created) VALUES (?,?,?,?,?)",
      )
      .bind(
        id,
        u.userId,
        config.name,
        JSON.stringify(result),
        new Date().toISOString(),
      )
      .run();
    return Response.json({ id, result: publicResult(result) }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
