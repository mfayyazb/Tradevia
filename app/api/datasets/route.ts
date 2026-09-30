import {
  owner,
  db,
  apiError,
  payload,
  checkOrigin,
  InputError,
} from "@/lib/repository";
import { barSchema } from "@/lib/validation";
import { z } from "zod";
import { assets } from "@/lib/catalog";
import { sampleData } from "@/lib/engine";
export async function GET(request: Request) {
  try {
    await owner();
    const asset = new URL(request.url).searchParams.get("asset") || "AAPL";
    if (!assets.includes(asset as any)) throw new InputError("Unknown asset.");
    const bars = sampleData(asset);
    return new Response(
      "date,open,high,low,close,volume\n" +
        bars
          .map((b) =>
            [b.date, b.open, b.high, b.low, b.close, b.volume].join(","),
          )
          .join("\n"),
      {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${asset}-synthetic.csv"`,
        },
      },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const u = await owner(),
      body = await payload(request);
    if (
      typeof body.name !== "string" ||
      body.name.trim().length < 3 ||
      body.name.length > 80 ||
      !assets.includes(body.asset)
    )
      throw new InputError(
        "Choose an asset and a dataset name (3–80 characters).",
      );
    const parsed = z.array(barSchema).min(150).max(1500).safeParse(body.bars);
    if (!parsed.success)
      throw new InputError(
        "Provide 150–1,500 rows with valid date, OHLC and positive volume values.",
      );
    const bars = parsed.data;
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i],
        d = new Date(b.date + "T00:00:00Z");
      if (
        !Number.isFinite(d.getTime()) ||
        d.toISOString().slice(0, 10) !== b.date ||
        b.high < Math.max(b.open, b.close) ||
        b.low > Math.min(b.open, b.close) ||
        b.low > b.high ||
        (i > 0 && bars[i - 1].date >= b.date)
      )
        throw new InputError(
          "Rows must have unique ascending dates and consistent OHLC prices.",
        );
    }
    const id = crypto.randomUUID();
    await db()
      .prepare(
        "INSERT INTO datasets (id,owner,name,asset,bars,created) VALUES (?,?,?,?,?,?)",
      )
      .bind(
        id,
        u.userId,
        body.name.trim(),
        body.asset,
        JSON.stringify(bars),
        new Date().toISOString(),
      )
      .run();
    return Response.json({ id }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
