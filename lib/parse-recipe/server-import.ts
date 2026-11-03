import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { ApiError } from "@/lib/api-errors";
import { PARSE_RATE_LIMIT } from "@/lib/api-limits";
import { PARSE_JOB_STATUS } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { api } from "@/lib/routes";
import { captureError } from "@/lib/telemetry";
import { findRecipeIdBySource } from "./find-recipe-by-source";
import { normalizeSourceUrl } from "./normalize-url";
import { findCachedParseResult } from "./parse-cache";
import { PARSER_VERSION } from "./parser-version";
import { saveParsedRecipeForUser } from "./save-parsed-recipe-server";
import {
  failStaleParseJobs,
  isStaleParseJob,
  STALE_JOB_ERROR,
} from "./stale-parse-jobs";

// Server-initiated link import for a signed-in user (the AI connector's
// import_recipe tool). Same pipeline as an in-app link import: the parse
// cache, a parse_jobs row, /api/parse-queue/process, and the server-side save
// into the user's library on completion.

export type ImportOutcome =
  | { status: "already_saved"; recipeId: string }
  | { status: "saved"; recipeId: string; jobId: string }
  | { status: "pending"; jobId: string }
  | { status: "rate_limited"; retryAfterSeconds: number };

export type ImportStatus =
  | { status: "pending" | "processing"; url: string | null }
  | { status: "done"; url: string | null; recipeId: string | null }
  | { status: "failed"; url: string | null; error: string | null };

/** Shares the per-user AI parse budget with in-app imports. Fails open. */
async function parseBudgetExceeded(userId: string): Promise<number | null> {
  const { limit, windowSeconds } = PARSE_RATE_LIMIT.USER;
  try {
    const result = await rateLimit(
      `parse:user:${userId}`,
      limit,
      windowSeconds,
    );
    return result.allowed ? null : result.resetSeconds;
  } catch (error) {
    ApiError.capture(error);
    return null;
  }
}

function triggerParseProcess(jobId: string): void {
  // `after` keeps a serverless function alive until the kick-off is sent.
  after(() =>
    fetch(
      `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}${api.parseQueueProcess}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      },
    )
      .then(() => undefined)
      .catch((error) =>
        captureError(error, { tags: { source: "mcp-import" } }),
      ),
  );
}

export async function importRecipeForUser(
  userId: string,
  url: string,
): Promise<ImportOutcome> {
  const existingId = await findRecipeIdBySource(userId, url);
  if (existingId) return { status: "already_saved", recipeId: existingId };

  const retryAfter = await parseBudgetExceeded(userId);
  if (retryAfter !== null) {
    return { status: "rate_limited", retryAfterSeconds: retryAfter };
  }

  const jobId = crypto.randomUUID();
  const normalizedUrl = normalizeSourceUrl(url);
  const cached = await findCachedParseResult(normalizedUrl);

  await db.insert(parseJobs).values({
    id: jobId,
    userId,
    url,
    normalizedUrl,
    ...(cached
      ? {
          status: PARSE_JOB_STATUS.DONE,
          result: cached,
          parserVersion: PARSER_VERSION,
        }
      : { status: PARSE_JOB_STATUS.PENDING }),
  });

  if (cached) {
    const saved = await saveParsedRecipeForUser({
      userId,
      parsed: cached,
      sourceUrl: url,
    });
    return { status: "saved", recipeId: saved.recipeId, jobId };
  }

  triggerParseProcess(jobId);
  return { status: "pending", jobId };
}

export async function getImportStatus(
  userId: string,
  jobId: string,
): Promise<ImportStatus | null> {
  const [job] = await db
    .select()
    .from(parseJobs)
    .where(and(eq(parseJobs.id, jobId), eq(parseJobs.userId, userId)))
    .limit(1);
  if (!job) return null;

  if (isStaleParseJob(job)) {
    await failStaleParseJobs(eq(parseJobs.id, jobId));
    return { status: "failed", url: job.url, error: STALE_JOB_ERROR };
  }
  if (job.status === PARSE_JOB_STATUS.DONE) {
    const recipeId = job.url
      ? await findRecipeIdBySource(userId, job.url)
      : null;
    return { status: "done", url: job.url, recipeId };
  }
  if (job.status === PARSE_JOB_STATUS.FAILED) {
    return { status: "failed", url: job.url, error: job.error };
  }
  return { status: job.status, url: job.url };
}
