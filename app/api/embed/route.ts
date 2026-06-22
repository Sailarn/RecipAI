import { type NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { embedLocalOnly } from "@/lib/embed";
import { embedRequestSchema } from "@/lib/embed/request-schemas";
import { log } from "@/lib/telemetry";

export async function POST(req: NextRequest) {
  // Fail closed: an unset or empty secret rejects every caller rather than
  // leaving the raw model endpoint public. The only legitimate caller is the
  // http provider, which always sends the configured secret.
  const secret = process.env.EMBED_SHARED_SECRET ?? "";
  if (!secret || req.headers.get("x-embed-secret") !== secret) {
    return ApiError.unauthorized();
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return ApiError.invalidBody();
  }
  const parsed = embedRequestSchema.safeParse(raw);
  if (!parsed.success) return ApiError.invalidBody();
  const { texts, prefix = "query" } = parsed.data;

  const startedAt = Date.now();
  try {
    const vectors = await embedLocalOnly(texts, prefix);
    log("info", "embed_raw_served", {
      count: texts.length,
      ms: Date.now() - startedAt,
    });
    return NextResponse.json({ vectors });
  } catch (error) {
    return ApiError.internal(error, req, "Embedding model unavailable");
  }
}
