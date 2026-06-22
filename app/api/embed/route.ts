import { type NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { embedLocalOnly } from "@/lib/embed";
import { log } from "@/lib/telemetry";

export async function POST(req: NextRequest) {
  const secret = process.env.EMBED_SHARED_SECRET ?? "";
  if (secret && req.headers.get("x-embed-secret") !== secret) {
    return ApiError.unauthorized();
  }

  let body: { texts?: string[]; prefix?: "query" | "passage" };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }
  if (!Array.isArray(body.texts) || body.texts.length === 0) {
    return ApiError.badRequest("texts required");
  }

  const startedAt = Date.now();
  try {
    const vectors = await embedLocalOnly(body.texts, body.prefix ?? "query");
    log("info", "embed_raw_served", {
      count: body.texts.length,
      ms: Date.now() - startedAt,
    });
    return NextResponse.json({ vectors });
  } catch (error) {
    return ApiError.internal(error, req, "Embedding model unavailable");
  }
}
