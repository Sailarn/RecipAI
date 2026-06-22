import { type NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { nearestVocab } from "@/lib/db/vocab-vector-search";
import { EmbedUnavailable, embed } from "@/lib/embed";
import { log } from "@/lib/telemetry";

type Item = { item: string; ua?: string | null };

export async function POST(req: NextRequest) {
  let body: { items?: Item[] };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }
  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return ApiError.badRequest("items required");
  }

  const startedAt = Date.now();
  let vectors: number[][];
  try {
    vectors = await embed(
      items.map((entry) => entry.item),
      "query",
    );
  } catch (caughtError) {
    if (caughtError instanceof EmbedUnavailable) {
      log("warn", "embed_match_degraded", { count: items.length });
      return NextResponse.json({
        matches: items.map(() => null),
        degraded: true,
      });
    }
    return ApiError.internal(caughtError, req);
  }

  try {
    const matches = await Promise.all(
      vectors.map((vector) => nearestVocab(vector)),
    );
    log("info", "embed_match_served", {
      count: items.length,
      matched: matches.filter(Boolean).length,
      ms: Date.now() - startedAt,
    });
    return NextResponse.json({ matches, degraded: false });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
