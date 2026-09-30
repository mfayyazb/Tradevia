import {
  owner,
  db,
  apiError,
  payload,
  checkOrigin,
  resultById,
  InputError,
} from "@/lib/repository";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const u = await owner(),
      body = await payload(request);
    if (typeof body.id !== "string" || typeof body.saved !== "boolean")
      throw new InputError("Invalid bookmark.");
    await resultById(body.id, u.userId);
    if (body.saved)
      await db()
        .prepare("INSERT OR IGNORE INTO bookmarks (owner,model) VALUES (?,?)")
        .bind(u.userId, body.id)
        .run();
    else
      await db()
        .prepare("DELETE FROM bookmarks WHERE owner = ? AND model = ?")
        .bind(u.userId, body.id)
        .run();
    return Response.json({ saved: body.saved });
  } catch (e) {
    return apiError(e);
  }
}
