import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth/auth";
import { requireSession } from "@/lib/auth/require-session";
import { PARSE_JOB_STATUS } from "@/lib/db/schema";
import { normalizeSourceUrl } from "@/lib/parse-recipe/normalize-url";
import { PARSER_VERSION } from "@/lib/parse-recipe/parser-version";
import { enforceParseRateLimit } from "@/lib/rate-limit";
import { mintUploadToken } from "@/lib/upload/upload-token";

export async function GET(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  try {
    const jobs = await db
      .select({
        id: parseJobs.id,
        url: parseJobs.url,
        status: parseJobs.status,
        result: parseJobs.result,
        error: parseJobs.error,
        createdAt: parseJobs.createdAt,
      })
      .from(parseJobs)
      .where(eq(parseJobs.userId, authed.session.user.id))
      .orderBy(desc(parseJobs.createdAt))
      .limit(100);

    return NextResponse.json({ jobs });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = await enforceParseRateLimit(req, session?.user.id);
  if (limited) return limited;

  let body: { url?: string; pushEndpoint?: string };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { url, pushEndpoint } = body;
  if (!url) return ApiError.badRequest("URL required");

  const id = crypto.randomUUID();
  const normalizedUrl = normalizeSourceUrl(url);

  try {
    // Mint the upload token first. It depends on Redis; minting *after* the
    // insert means a Redis failure leaves an orphaned PENDING job the client
    // never processes (it got an error and never called /process). Token-first
    // keeps the enqueue atomic — a mint failure inserts nothing.
    const uploadToken = await mintUploadToken();

    // Result cache: if this URL was already parsed by the current pipeline,
    // clone the stored result into a DONE job instead of re-running Gemini.
    // The client flow is unchanged — its poll sees DONE immediately, and the
    // fire-and-forget /process call no-ops on an already-done job.
    const [cached] = await db
      .select({ result: parseJobs.result })
      .from(parseJobs)
      .where(
        and(
          eq(parseJobs.normalizedUrl, normalizedUrl),
          eq(parseJobs.status, PARSE_JOB_STATUS.DONE),
          eq(parseJobs.parserVersion, PARSER_VERSION),
          isNotNull(parseJobs.result),
          // Never serve an empty parse (0 ingredients and 0 instructions) — a
          // failed extraction shouldn't poison the cache for a URL.
          sql`(
            jsonb_array_length(coalesce(${parseJobs.result} -> 'ingredients', '[]'::jsonb)) > 0
            OR jsonb_array_length(coalesce(${parseJobs.result} -> 'instructions', '[]'::jsonb)) > 0
          )`,
        ),
      )
      .orderBy(desc(parseJobs.createdAt))
      .limit(1);

    await db.insert(parseJobs).values({
      id,
      userId: session?.user.id || null,
      url,
      normalizedUrl,
      pushEndpoint: pushEndpoint ?? null,
      ...(cached
        ? {
            status: PARSE_JOB_STATUS.DONE,
            result: cached.result,
            parserVersion: PARSER_VERSION,
          }
        : { status: PARSE_JOB_STATUS.PENDING }),
    });

    return NextResponse.json({
      jobId: id,
      uploadToken,
      cached: Boolean(cached),
      ...(cached ? { result: cached.result } : {}),
    });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
