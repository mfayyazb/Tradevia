import {
  owner,
  resultById,
  publicResult,
  apiError,
  db,
  InputError,
  payload,
  checkOrigin,
} from "@/lib/repository";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await owner(),
      { id } = await params;
    return Response.json(publicResult(await resultById(id, u.userId)));
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const u = await owner(),
      { id } = await params,
      body = await payload(request);
    if (
      typeof body.description !== "string" ||
      body.description.trim().length < 20 ||
      body.description.length > 500 ||
      typeof body.creator !== "string" ||
      body.creator.trim().length < 2 ||
      body.creator.length > 60
    )
      throw new InputError(
        "Enter a creator name (2–60 characters) and description (20–500 characters).",
      );
    const row = await db()
      .prepare("SELECT id FROM experiments WHERE id = ? AND owner = ?")
      .bind(id, u.userId)
      .first();
    if (!row) throw new InputError("Only your experiments can be published.");
    await db()
      .prepare(
        "UPDATE experiments SET published = 1, description = ?, creator = ? WHERE id = ? AND owner = ?",
      )
      .bind(body.description.trim(), body.creator.trim(), id, u.userId)
      .run();
    return Response.json({ published: true });
  } catch (e) {
    return apiError(e);
  }
}
