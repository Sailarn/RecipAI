import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth/auth";
import { nearestVocab } from "@/lib/db/vocab-vector-search";
import { EmbedUnavailable, embed } from "@/lib/embed";
import { embedMatchRequestSchema } from "@/lib/embed/request-schemas";
import { enforceEmbedRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/telemetry";

export async function POST(req: NextRequest) {
  // Public route. Signed-in callers get the higher limit; everyone is capped so
  // model inference + pgvector work can't be driven without bound.
  const session = await auth.api.getSession({ headers: await headers() });
  const limited = await enforceEmbedRateLimit(req, session?.user.id);
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return ApiError.invalidBody();
  }
  const parsed = embedMatchRequestSchema.safeParse(raw);
  if (!parsed.success) return ApiError.invalidBody();
  const { items } = parsed.data;

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
